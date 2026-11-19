import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

export const packageDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
);
export const repoRoot = path.resolve(packageDir, '..', '..');
export const fixturesDir = path.join(packageDir, 'fixtures');
const specsDir = path.join(repoRoot, 'src', 'specs');

const requireFromRoot = createRequire(path.join(repoRoot, 'package.json'));
let typescript;
export function loadTypeScript() {
  if (!typescript) typescript = requireFromRoot('typescript');
  return typescript;
}

export const FUNCTION_MARKER = '$function';

const MODULE_SPECS = {
  'NativeStripeSdkModule.ts': 'StripeSdk',
  'NativeOnrampSdkModule.ts': 'OnrampSdk',
};

/**
 * Reads src/specs and returns every bridge boundary that carries an untyped
 * value: TurboModule parameters typed UnsafeObject or Object, TurboModule
 * results typed UnsafeObject, and component specs with UnsafeMixed props or
 * event payloads, declared inline, as a type alias, or as an interface.
 */
export function readUntypedBoundaries(root = specsDir) {
  const ts = loadTypeScript();
  const entries = [];
  const paramNames = {};
  for (const file of fs.readdirSync(root).sort()) {
    if (!file.startsWith('Native') || !file.endsWith('.ts')) continue;
    const fullPath = path.join(root, file);
    const text = fs.readFileSync(fullPath, 'utf8');
    const source = ts.createSourceFile(
      fullPath,
      text,
      ts.ScriptTarget.Latest,
      true
    );
    const aliases = new Map();
    source.forEachChild((node) => {
      if (ts.isTypeAliasDeclaration(node)) {
        aliases.set(node.name.text, node.type.getText(source));
      } else if (ts.isInterfaceDeclaration(node)) {
        aliases.set(node.name.text, node.getText(source));
      }
    });
    const isUntyped = (typeText, marker) => {
      if (typeText.includes(marker)) return true;
      const names = typeText.match(/[A-Za-z_][A-Za-z0-9_]*/g) ?? [];
      return names.some((name) => aliases.get(name)?.includes(marker));
    };

    const moduleName = MODULE_SPECS[file];
    if (moduleName) {
      source.forEachChild((node) => {
        if (!ts.isInterfaceDeclaration(node) || node.name.text !== 'Spec') {
          return;
        }
        for (const member of node.members) {
          const signature = functionSignature(member);
          if (!signature) continue;
          const name = member.name.getText(source);
          const id = `${moduleName}.${name}`;
          paramNames[id] = signature.parameters.map((p) =>
            p.name.getText(source)
          );
          const untypedParams = signature.parameters
            .filter((p) => {
              const typeText = p.type?.getText(source) ?? '';
              return (
                isUntyped(typeText, 'UnsafeObject') ||
                /(^|[^A-Za-z])Object([^A-Za-z]|$)/.test(typeText)
              );
            })
            .map((p) => p.name.getText(source));
          if (untypedParams.length > 0) {
            entries.push({ id, kind: 'param', file, params: untypedParams });
          }
          const returnText = signature.type?.getText(source) ?? '';
          if (isUntyped(returnText, 'UnsafeObject')) {
            entries.push({ id: `${id}#result`, kind: 'result', file });
          }
        }
      });
    } else if (isUntyped(text, 'UnsafeMixed')) {
      const match = text.match(
        /codegenNativeComponent<NativeProps>\(\s*'([^']+)'/
      );
      if (!match) {
        throw new Error(`${file}: cannot find the codegenNativeComponent name`);
      }
      const props = [];
      source.forEachChild((node) => {
        if (
          ts.isInterfaceDeclaration(node) &&
          node.name.text === 'NativeProps'
        ) {
          for (const member of node.members) {
            const typeText = member.type?.getText(source) ?? '';
            if (isUntyped(typeText, 'UnsafeMixed')) {
              props.push(member.name.getText(source));
            }
          }
        }
      });
      entries.push({
        id: `component:${match[1]}`,
        kind: 'component',
        file,
        params: props,
      });
      paramNames[`component:${match[1]}`] = props;
    }
  }
  return { entries, paramNames };
}

function functionSignature(member) {
  const ts = loadTypeScript();
  if (ts.isMethodSignature(member)) return member;
  if (
    ts.isPropertySignature(member) &&
    member.type &&
    ts.isFunctionTypeNode(member.type)
  ) {
    return member.type;
  }
  return undefined;
}

export function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function listFixtureFiles(dir = fixturesDir) {
  const files = [];
  if (!fs.existsSync(dir)) return files;
  for (const family of fs.readdirSync(dir).sort()) {
    const familyDir = path.join(dir, family);
    if (!fs.statSync(familyDir).isDirectory()) continue;
    for (const file of fs.readdirSync(familyDir).sort()) {
      if (file.endsWith('.json')) files.push(path.join(familyDir, file));
    }
  }
  return files;
}

/**
 * Leaf paths of a JSON value. Arrays of primitives count as one leaf; empty
 * objects and arrays carry nothing to assert and have no leaves.
 */
export function leafPaths(value, prefix = '') {
  if (value === null || typeof value !== 'object') return [prefix];
  if (Array.isArray(value)) {
    if (value.length === 0) return [];
    if (value.every((item) => item === null || typeof item !== 'object')) {
      return [prefix];
    }
    return value.flatMap((item, index) =>
      leafPaths(item, prefix ? `${prefix}.${index}` : String(index))
    );
  }
  const keys = Object.keys(value);
  if (keys.length === 0) return [];
  return keys.flatMap((key) =>
    leafPaths(value[key], prefix ? `${prefix}.${key}` : key)
  );
}
