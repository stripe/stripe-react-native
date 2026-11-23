import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { firstPackReport } from './pack-json.mjs';

const ENTRY_FIELDS = [
  'main',
  'module',
  'types',
  'typings',
  'react-native',
  'source',
  'browser',
];
const RESOLVE_SUFFIXES = [
  '',
  '.js',
  '.mjs',
  '.cjs',
  '.ts',
  '.tsx',
  '.d.ts',
  '.json',
  '/index.js',
  '/index.mjs',
  '/index.cjs',
  '/index.ts',
  '/index.tsx',
  '/index.d.ts',
];

const RUNTIME_DEPENDENCY_FIELDS = [
  'dependencies',
  'peerDependencies',
  'optionalDependencies',
];
const WORKSPACE_PROTOCOL = /^(workspace|catalog|link|portal|file):/;

const FORBIDDEN = [
  [/(^|\/)__tests__\//, 'test sources'],
  [/(^|\/)__fixtures__\//, 'test fixtures'],
  [/(^|\/)__mocks__\//, 'test mocks'],
  [/(^|\/)[^/]+\.(test|spec)(\.d)?\.[cm]?[jt]sx?(\.map)?$/, 'test sources'],
  [/(^|\/)ios\/(.+\/)?(Tests?|__tests__)\//, 'iOS test sources'],
  [
    /(^|\/)android\/src\/(test|androidTest|sharedTest)[A-Za-z0-9]*\//,
    'Android test sources',
  ],
  [/(^|\/)(android|ios)\/build\//, 'native build output'],
  [/(^|\/)android\/\.(gradle|cxx)\//, 'Gradle or CMake caches'],
  [/(^|\/)node_modules\//, 'node_modules'],
  [/^coverage\//, 'coverage reports'],
  [/\.tgz$/, 'a packed tarball'],
  [/(^|\/)\.DS_Store$/, 'Finder metadata'],
];

export function parsePackDryRun(stdout) {
  const report = firstPackReport(
    stdout,
    'npm pack --dry-run did not print a JSON report:'
  );
  return {
    filename: report.filename,
    size: report.size,
    files: report.files.map((file) => file.path),
  };
}

/**
 * Runs `npm pack --dry-run`, which lists exactly the files `npm publish`
 * would upload, without writing a tarball or contacting the registry.
 */
function listPackedFiles(dir) {
  const result = spawnSync(
    'npm',
    ['pack', '--dry-run', '--json', '--ignore-scripts'],
    { cwd: dir, encoding: 'utf8' }
  );
  if (result.status !== 0) {
    throw new Error(
      `npm pack --dry-run failed in ${dir} (exit ${result.status}):\n${result.stderr}`
    );
  }
  return parsePackDryRun(result.stdout);
}

const normalize = (target) => target.replace(/^\.\//, '');

function resolves(target, packed) {
  const base = normalize(target);
  if (base.includes('*')) {
    const pattern = new RegExp(
      `^${base
        .split('*')
        .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
        .join('.+')}$`
    );
    return [...packed].some((file) => pattern.test(file));
  }
  return RESOLVE_SUFFIXES.some((suffix) => packed.has(base + suffix));
}

function exportTargets(exportsField) {
  const rows = [];
  const walk = (value, subpath, conditions) => {
    if (typeof value === 'string') {
      rows.push({ subpath, conditions, target: value });
    } else if (Array.isArray(value)) {
      value.forEach((item) => walk(item, subpath, conditions));
    } else if (value && typeof value === 'object') {
      for (const [key, child] of Object.entries(value)) {
        if (key.startsWith('.')) walk(child, key, conditions);
        else walk(child, subpath, [...conditions, key]);
      }
    }
  };
  walk(exportsField, '.', []);
  return rows;
}

export function exportSubpaths(exportsField) {
  if (exportsField === undefined) return [];
  if (
    exportsField &&
    typeof exportsField === 'object' &&
    !Array.isArray(exportsField) &&
    Object.keys(exportsField).some((key) => key.startsWith('.'))
  ) {
    return Object.keys(exportsField);
  }
  return ['.'];
}

export function entryPoints(manifest) {
  const rows = [];
  for (const field of ENTRY_FIELDS) {
    if (typeof manifest[field] === 'string') {
      rows.push({ field, target: manifest[field] });
    }
  }
  if (typeof manifest.bin === 'string') {
    rows.push({ field: 'bin', target: manifest.bin });
  } else if (manifest.bin && typeof manifest.bin === 'object') {
    for (const [name, target] of Object.entries(manifest.bin)) {
      rows.push({ field: `bin.${name}`, target });
    }
  }
  for (const row of exportTargets(manifest.exports)) {
    const label = [row.subpath, ...row.conditions].join(' ');
    rows.push({ field: `exports[${label}]`, target: row.target });
  }
  return rows;
}

/**
 * Checks a packed file list against the manifest and the gate config.
 *
 * `exists(relativePath)` says whether a path exists in the package directory;
 * files that exist there and that a consumer needs (podspecs, the Expo
 * plugin, the Android build file, codegen specs) must also be packed.
 */
export function checkPackedContents({
  manifest,
  files,
  pkg,
  exists,
  topLevel,
}) {
  const errors = [];
  const notes = [];
  const packed = new Set(files);
  const isPacked = (target) => {
    const base = normalize(target).replace(/\/$/, '');
    return (
      packed.has(base) || files.some((file) => file.startsWith(`${base}/`))
    );
  };

  const entries = entryPoints(manifest);
  if (pkg.status === 'shell') {
    if (entries.length > 0 || exists('src')) {
      errors.push(
        `${pkg.name} is marked "shell" in the gate config but has ${
          entries.length > 0 ? 'entry points' : 'a src/ directory'
        }; set its status to "ready"`
      );
    }
    return { errors, notes };
  }

  if (
    !entries.some(
      (row) => row.field === 'main' || row.field.startsWith('exports')
    )
  ) {
    errors.push('declares no "main" or "exports" entry point');
  }
  for (const { field, target } of entries) {
    if (!resolves(target, packed)) {
      errors.push(`${field} points at ${target}, which is not in the package`);
    }
  }

  const subpaths = exportSubpaths(manifest.exports);
  for (const subpath of pkg.subpaths) {
    if (!subpaths.includes(subpath)) {
      errors.push(
        `subpath export ${subpath} is missing from "exports" (has: ${subpaths.join(', ') || 'none'})`
      );
    }
  }

  const required = new Set(pkg.requiredFiles);
  for (const file of topLevel) {
    if (file.endsWith('.podspec') || file === 'app.plugin.js') {
      required.add(file);
    }
  }
  if (exists('android/build.gradle')) required.add('android/build.gradle');
  const specs = manifest.codegenConfig?.jsSrcsDir;
  if (specs && exists(normalize(specs))) required.add(normalize(specs));
  for (const file of [...required].sort()) {
    if (!isPacked(file)) errors.push(`${file} is not in the package`);
  }

  for (const file of files) {
    for (const [pattern, what] of FORBIDDEN) {
      if (pattern.test(file)) {
        errors.push(`${file} is in the package (${what} must not ship)`);
        break;
      }
    }
  }

  for (const field of RUNTIME_DEPENDENCY_FIELDS) {
    for (const [name, range] of Object.entries(manifest[field] ?? {})) {
      if (WORKSPACE_PROTOCOL.test(range)) {
        errors.push(
          `${field}.${name} is "${range}"; npm publishes that range unresolved, so consumers cannot install it`
        );
      }
    }
  }

  if (manifest.private === true) {
    notes.push(
      '"private": true — npm publish refuses this package until the release work removes it'
    );
  }
  return { errors, notes };
}

export function checkPackage(pkg, repoRoot) {
  const dir = path.join(repoRoot, pkg.dir);
  const manifest = JSON.parse(
    fs.readFileSync(path.join(dir, 'package.json'), 'utf8')
  );
  const packedList = listPackedFiles(dir);
  const result = checkPackedContents({
    manifest,
    files: packedList.files,
    pkg,
    exists: (relative) => fs.existsSync(path.join(dir, relative)),
    topLevel: fs.readdirSync(dir),
  });
  return { ...result, ...packedList, manifest };
}
