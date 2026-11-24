import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const gateDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..'
);
export const repoRoot = path.resolve(gateDir, '../..');
export const smokeDir = path.join(repoRoot, 'examples/expo-smoke');
export const PLATFORMS = ['ios', 'android'];

const STATUSES = ['shell', 'ready'];

export function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function loadConfig(file = path.join(gateDir, 'packages.json')) {
  const raw = readJson(file);
  const where = path.relative(repoRoot, file);
  const packages = [];
  for (const [name, entry] of Object.entries(raw.packages ?? {})) {
    if (!STATUSES.includes(entry.status)) {
      throw new Error(
        `${name}: "status" must be one of ${STATUSES.join(', ')} in ${where}`
      );
    }
    if (typeof entry.dir !== 'string') {
      throw new Error(`${name}: "dir" is required in ${where}`);
    }
    packages.push({
      name,
      alias: entry.alias ?? name,
      dir: entry.dir,
      status: entry.status,
      iosSources: entry.iosSources ?? [path.posix.join(entry.dir, 'ios')],
      families: entry.families ?? [],
      requiredFiles: entry.requiredFiles ?? [],
      subpaths: entry.subpaths ?? [],
      expo: entry.expo ?? null,
      expoSdk: entry.expoSdk,
    });
  }
  return { packages, notGated: raw.notGated ?? {} };
}

export function findPackage(packages, query, cwd = process.cwd()) {
  const match = packages.find(
    (pkg) => pkg.name === query || pkg.alias === query
  );
  if (match) return match;
  const dir =
    path
      .relative(repoRoot, path.resolve(cwd, query))
      .split(path.sep)
      .join('/') || '.';
  return packages.find((pkg) => pkg.dir === dir) ?? null;
}

/**
 * Names of packages under packages/ that the config neither gates nor lists
 * in "notGated". A new package must be added to the config before it can
 * pass the gate.
 */
export function unlistedPackages(
  { packages, notGated },
  packagesDir = path.join(repoRoot, 'packages')
) {
  const known = new Set([
    ...packages.map((pkg) => pkg.name),
    ...Object.keys(notGated),
  ]);
  return fs
    .readdirSync(packagesDir)
    .map((entry) => path.join(packagesDir, entry, 'package.json'))
    .filter((manifest) => fs.existsSync(manifest))
    .map((manifest) => readJson(manifest).name)
    .filter((name) => !known.has(name))
    .sort();
}
