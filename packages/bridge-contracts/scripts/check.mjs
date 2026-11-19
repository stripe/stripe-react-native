#!/usr/bin/env node
// Static checks for the bridge contract fixtures: inventory against
// src/specs, fixture shape, iOS/Android parity of assertion keys, input
// coverage, and a type check of every fixture input against the spec types.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FUNCTION_MARKER,
  fixturesDir,
  leafPaths,
  listFixtureFiles,
  loadTypeScript,
  packageDir,
  readJson,
  readUntypedBoundaries,
  repoRoot,
} from './lib.mjs';

export function loadParsedFixtures(root = repoRoot) {
  const bridgeDir = path.join(root, 'packages/bridge-contracts');
  const inventory = readJson(path.join(bridgeDir, 'inventory.json'));
  const fixtures = [];
  for (const file of listFixtureFiles(path.join(bridgeDir, 'fixtures'))) {
    const where = path.relative(root, file);
    const family = path.basename(path.dirname(file));
    try {
      fixtures.push({ file, where, family, fixture: readJson(file) });
    } catch (error) {
      fixtures.push({
        file,
        where,
        family,
        fixture: null,
        parseError: error.message,
      });
    }
  }
  return { inventory, fixtures };
}

export function runBridgeFixtureChecks(parsed, { families } = {}) {
  const errors = [];
  const fail = (where, message) => errors.push(`${where}: ${message}`);
  const allowed = Array.isArray(families) ? new Set(families) : null;
  const scopedFixtures = allowed
    ? parsed.fixtures.filter((item) => allowed.has(item.family))
    : parsed.fixtures;

  const { entries, paramNames } = readUntypedBoundaries();
  const inventory = parsed.inventory;
  const required = new Map(entries.map((entry) => [entry.id, entry]));

  const PLATFORMS = ['ios', 'android'];
  const ALLOWED_KEYS = new Set([
    'method',
    'description',
    'platforms',
    'input',
    'expect',
    'platformOnly',
    'parityGaps',
    'covers',
    'unasserted',
    'skipTypecheck',
  ]);

  const fixtures = [];
  for (const item of scopedFixtures) {
    if (item.parseError) {
      fail(item.where, `invalid JSON: ${item.parseError}`);
      continue;
    }
    const { file, where, family, fixture } = item;
    const base = path.basename(file, '.json');
    fixtures.push({ file, where, family, fixture });

    for (const key of Object.keys(fixture)) {
      if (!ALLOWED_KEYS.has(key)) fail(where, `unknown top-level key "${key}"`);
    }
    const { method, input, expect } = fixture;
    if (typeof method !== 'string') {
      fail(where, '"method" must be a string');
      continue;
    }
    const entryId = method;
    const shortName = method
      .replace(/^component:/, '')
      .split('.')
      .pop();
    if (!base.startsWith(`${shortName}.`)) {
      fail(where, `file name must be <method>.<case>.json for ${method}`);
    }
    if (!paramNames[entryId]) {
      fail(where, `unknown method ${method}`);
    } else if (inventory[entryId] && inventory[entryId].family !== family) {
      fail(
        where,
        `${method} belongs to family "${inventory[entryId].family}", not "${family}"`
      );
    }
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      fail(where, '"input" must be an object keyed by parameter name');
    } else if (paramNames[entryId]) {
      const names = paramNames[entryId];
      for (const key of Object.keys(input)) {
        if (!names.includes(key)) {
          fail(where, `input "${key}" is not a parameter of ${method}`);
        }
      }
      const order = Object.keys(input).map((key) => names.indexOf(key));
      if (order.some((value, index) => index > 0 && value < order[index - 1])) {
        fail(
          where,
          `input keys must follow the spec order (${names.join(', ')})`
        );
      }
    }
    const platforms = fixture.platforms ?? PLATFORMS;
    if (
      !Array.isArray(platforms) ||
      platforms.length === 0 ||
      platforms.some((p) => !PLATFORMS.includes(p))
    ) {
      fail(
        where,
        '"platforms" must be a non-empty subset of ["ios", "android"]'
      );
      continue;
    }
    if (!expect || typeof expect !== 'object') {
      fail(where, '"expect" must be an object with ios, android, and shared');
      continue;
    }
    for (const key of Object.keys(expect)) {
      if (![...PLATFORMS, 'shared'].includes(key)) {
        fail(where, `unknown expect block "${key}"`);
      }
    }
    const shared = expect.shared ?? {};
    const ios = expect.ios ?? {};
    const android = expect.android ?? {};
    const blocks = { ios, android };
    for (const platform of PLATFORMS) {
      if (
        !platforms.includes(platform) &&
        Object.keys(blocks[platform]).length
      ) {
        fail(
          where,
          `expect.${platform} is set but the fixture skips ${platform}`
        );
      }
    }
    // A fixture for one platform of an entry that exists on both must record
    // each of its keys in parityGaps, so the other platform cannot lag silently.
    const entryPlatforms = inventory[entryId]?.platforms ?? PLATFORMS;
    for (const platform of platforms) {
      if (!entryPlatforms.includes(platform)) {
        fail(where, `${method} exists only on ${entryPlatforms.join(' and ')}`);
      }
    }
    if (platforms.length === 1 && entryPlatforms.length === 2) {
      const gaps = fixture.parityGaps ?? {};
      for (const key of Object.keys(blocks[platforms[0]])) {
        if (!(key in gaps)) {
          fail(
            where,
            `"${key}" is pinned only on ${platforms[0]}, but ${method} exists on both platforms; ` +
              'document it in parityGaps, or mark the entry single-platform in inventory.json'
          );
        }
      }
      for (const key of Object.keys(gaps)) {
        if (!(key in blocks[platforms[0]])) {
          fail(where, `parityGaps["${key}"] is not an assertion key`);
        }
      }
    }
    const allKeys = [
      ...Object.keys(shared),
      ...Object.keys(ios),
      ...Object.keys(android),
    ];
    if (allKeys.length === 0) fail(where, 'the fixture asserts nothing');

    // Parity: a key asserted on one platform only, or with different values
    // on each, must be documented, so a platform cannot lag silently.
    const platformOnly = fixture.platformOnly ?? {};
    const parityGaps = fixture.parityGaps ?? {};
    const documented = new Set();
    if (platforms.length === 2) {
      for (const key of Object.keys(shared)) {
        if (key in ios || key in android) {
          fail(where, `"${key}" is in shared and in a platform block`);
        }
      }
      for (const key of new Set([
        ...Object.keys(ios),
        ...Object.keys(android),
      ])) {
        const inBoth = key in ios && key in android;
        if (inBoth) {
          if (!(key in parityGaps)) {
            fail(
              where,
              `"${key}" differs between iOS and Android; move it to shared or document it in parityGaps`
            );
          }
        } else if (!(key in platformOnly) && !(key in parityGaps)) {
          fail(
            where,
            `"${key}" is asserted only on ${key in ios ? 'iOS' : 'Android'}; ` +
              'assert it in shared, or document it in platformOnly or parityGaps'
          );
        }
        documented.add(key);
      }
    } else if (Object.keys(shared).length) {
      fail(where, 'a single-platform fixture has no shared block');
    }
    for (const [name, map] of [
      ['platformOnly', platformOnly],
      ['parityGaps', parityGaps],
    ]) {
      for (const [key, reason] of Object.entries(map)) {
        if (typeof reason !== 'string' || reason.trim().length < 10) {
          fail(where, `${name}["${key}"] needs a reason`);
        }
        if (platforms.length === 2 && !documented.has(key)) {
          fail(where, `${name}["${key}"] is not a platform-only assertion key`);
        }
      }
    }
    if (platforms.length === 1 && !fixture.description) {
      fail(where, 'a single-platform fixture needs a description saying why');
    }

    // Input coverage: every input field is asserted somewhere.
    const covers = fixture.covers ?? {};
    const unasserted = fixture.unasserted ?? {};
    for (const [inputPath, key] of Object.entries(covers)) {
      if (!allKeys.includes(key)) {
        fail(
          where,
          `covers["${inputPath}"] names "${key}", which is not asserted`
        );
      }
    }
    for (const [inputPath, reason] of Object.entries(unasserted)) {
      if (typeof reason !== 'string' || reason.trim().length < 10) {
        fail(where, `unasserted["${inputPath}"] needs a reason`);
      }
    }
    if (input && typeof input === 'object') {
      for (const leaf of unassertedInputFields(
        input,
        shared,
        ios,
        android,
        covers,
        unasserted
      )) {
        const underParam = leaf.split('.').slice(1).join('.');
        fail(
          where,
          `input field "${leaf}" is not asserted; add an assertion key ending in ` +
            `"${underParam || leaf}", map it in covers, or explain it in unasserted`
        );
      }
    }

    if (
      fixture.skipTypecheck !== undefined &&
      (typeof fixture.skipTypecheck !== 'string' ||
        fixture.skipTypecheck.trim().length < 10)
    ) {
      fail(where, '"skipTypecheck" must be a reason string');
    }
  }

  const reconciliation = reconcileInventory(
    inventory,
    required,
    fixtures,
    allowed
  );
  for (const problem of reconciliation.problems) fail('inventory.json', problem);

  const parityListFile = path.join(packageDir, 'PARITY-GAPS.md');
  checkParityGapList(
    fixtures,
    fs.readFileSync(parityListFile, 'utf8'),
    fail,
    path.relative(repoRoot, parityListFile),
    allowed
  );
  typecheckInputs(fixtures, required, paramNames, fail);
  checkInventoryCanary(fail);
  checkUntypedBoundaryCanary(fail);
  checkParityGapCanary(fail);
  checkInputCoverageCanary(fail);

  const byFamily = {};
  for (const item of fixtures) {
    byFamily[item.family] = (byFamily[item.family] ?? 0) + 1;
  }
  const familyOrder = [
    ...new Set(Object.values(inventory).map((e) => e.family)),
  ].filter((family) => !allowed || allowed.has(family));
  console.log('Bridge contract fixtures');
  for (const family of familyOrder) {
    const ids = Object.keys(inventory).filter(
      (id) => inventory[id].family === family
    );
    const done = ids.filter((id) => reconciliation.coveredBy.has(id)).length;
    console.log(
      `  ${family.padEnd(22)} ${String(byFamily[family] ?? 0).padStart(3)} fixtures, ` +
        `${done}/${ids.length} entries pinned`
    );
  }
  console.log(
    `  ${required.size} untyped bridge entries; ` +
      `${[...required.keys()].filter((id) => reconciliation.coveredBy.has(id)).length} with fixtures, ${reconciliation.pending.length} pending`
  );
  if (errors.length) {
    console.error(`\n${errors.length} problem(s):`);
    for (const error of errors) console.error(`  - ${error}`);
    return 1;
  }
  return 0;
}

/**
 * Inventory rows must match the untyped boundaries and the fixtures that pin
 * them. Returns the problems instead of recording them, so a canary can run
 * the same checks on synthetic input.
 */
function reconcileInventory(
  inventoryEntries,
  boundaries,
  fixtureItems,
  allowed = null
) {
  const problems = [];
  for (const id of boundaries.keys()) {
    if (!inventoryEntries[id]) {
      problems.push(
        `${id} has an untyped bridge value in src/specs but no inventory entry`
      );
    }
  }
  for (const id of Object.keys(inventoryEntries)) {
    if (!boundaries.has(id)) {
      problems.push(
        `${id} is listed but src/specs has no untyped value for it`
      );
    }
  }

  const coveredBy = new Map();
  const addCover = (id, item) => {
    if (!coveredBy.has(id)) coveredBy.set(id, []);
    coveredBy.get(id).push(item);
  };
  for (const item of fixtureItems) {
    const { method, expect = {} } = item.fixture;
    addCover(method, item);
    const keys = [
      ...Object.keys(expect.shared ?? {}),
      ...Object.keys(expect.ios ?? {}),
      ...Object.keys(expect.android ?? {}),
    ];
    if (keys.some((key) => key === 'result' || key.startsWith('result.'))) {
      addCover(`${method}#result`, item);
    }
  }
  const pending = [];
  for (const [id, entry] of Object.entries(inventoryEntries)) {
    if (allowed && !allowed.has(entry.family)) continue;
    const has = coveredBy.has(id);
    if (entry.pending && has) {
      problems.push(`${id} has fixtures; remove its "pending" note`);
    } else if (!entry.pending && !has) {
      problems.push(`${id} has no fixture`);
    }
    if (entry.pending) pending.push(id);
    if (['param', 'component'].includes(boundaries.get(id)?.kind) && has) {
      // Each untyped parameter or prop needs a fixture of its own method or
      // component that passes it.
      for (const param of boundaries.get(id).params) {
        if (
          !coveredBy
            .get(id)
            .some(
              (f) =>
                f.fixture.method === id &&
                f.fixture.input?.[param] !== undefined
            )
        ) {
          problems.push(`${id}: no fixture passes the untyped "${param}"`);
        }
      }
    }
  }
  return { problems, coveredBy, pending };
}

/**
 * Every parityGaps entry starts with an id from PARITY-GAPS.md, and each row
 * there lists exactly the fixtures that use its id.
 */
function checkParityGapList(items, listText, report, where, allowed = null) {
  const rows = new Map();
  for (const line of listText.split('\n')) {
    const cells = line.split('|').map((cell) => cell.trim());
    if (!/^[GD]\d+$/.test(cells[1] ?? '')) continue;
    const listed = [...(cells[6] ?? '').matchAll(/`([^`]+\.json)`/g)].map(
      (match) => match[1]
    );
    rows.set(cells[1], new Set(listed));
  }
  const used = new Map();
  for (const item of items) {
    const name = path.relative(fixturesDir, item.file);
    for (const [key, reason] of Object.entries(item.fixture.parityGaps ?? {})) {
      const id = /^([GD]\d+): /.exec(reason)?.[1];
      if (!id) {
        report(
          item.where,
          `parityGaps["${key}"] must start with an id from ${where}, like "G3: "`
        );
      } else if (!rows.has(id)) {
        report(
          item.where,
          `parityGaps["${key}"] uses ${id}, which ${where} does not list`
        );
      } else {
        if (!used.has(id)) used.set(id, new Set());
        used.get(id).add(name);
      }
    }
  }
  const inScope = (name) =>
    !allowed || allowed.has(String(name).split(/[/\\]/)[0]);
  for (const [id, listed] of rows) {
    const listedScoped = new Set([...listed].filter(inScope));
    const actualScoped = new Set([...(used.get(id) ?? [])].filter(inScope));
    if (allowed && listedScoped.size === 0 && actualScoped.size === 0) continue;
    if (actualScoped.size === 0)
      report(where, `${id} is used by no fixture; remove the row`);
    for (const name of listedScoped) {
      if (!actualScoped.has(name))
        report(where, `${id} lists ${name}, which does not use ${id}`);
    }
    for (const name of actualScoped) {
      if (!listed.has(name))
        report(where, `${id} does not list ${name}, which uses ${id}`);
    }
  }
}

function requireProblem(problems, snippet, canary, fail) {
  if (!problems.some((problem) => problem.includes(snippet))) {
    fail(
      'scripts/check.mjs',
      `${canary}: the canary for ${snippet} was not reported`
    );
  }
}

/**
 * Fails unless inventory reconciliation reports a missing boundary, an entry
 * that is not a boundary, a pending entry that already has a fixture, and an
 * untyped parameter no fixture passes.
 */
function checkInventoryCanary(fail) {
  const boundaries = new Map([
    ['StripeSdk.canaryMissing', { kind: 'param', params: ['params'] }],
    ['StripeSdk.canaryPending', { kind: 'param', params: ['info'] }],
    ['StripeSdk.canaryParam', { kind: 'param', params: ['payload'] }],
  ]);
  const inventoryEntries = {
    'StripeSdk.canaryPending': { family: 'canary', pending: 'synthetic' },
    'StripeSdk.canaryParam': { family: 'canary' },
    'StripeSdk.canaryExtra': { family: 'canary' },
  };
  const fixtureItems = [
    {
      fixture: {
        method: 'StripeSdk.canaryPending',
        input: { info: { email: 'jenny@example.com' } },
        expect: { shared: { result: true } },
      },
    },
    {
      fixture: {
        method: 'StripeSdk.canaryParam',
        input: {},
        expect: { shared: { result: true } },
      },
    },
  ];
  const { problems } = reconcileInventory(
    inventoryEntries,
    boundaries,
    fixtureItems
  );
  requireProblem(
    problems,
    'StripeSdk.canaryMissing has an untyped bridge value in src/specs but no inventory entry',
    'inventory reconciliation',
    fail
  );
  requireProblem(
    problems,
    'StripeSdk.canaryExtra is listed but src/specs has no untyped value for it',
    'inventory reconciliation',
    fail
  );
  requireProblem(
    problems,
    'StripeSdk.canaryPending has fixtures; remove its "pending" note',
    'inventory reconciliation',
    fail
  );
  requireProblem(
    problems,
    'StripeSdk.canaryParam: no fixture passes the untyped "payload"',
    'inventory reconciliation',
    fail
  );
}

/**
 * Fails unless discovery reports a synthetic UnsafeObject parameter, its
 * result, an Object parameter, a parameter typed only through an alias, and
 * an UnsafeMixed component prop.
 */
function checkUntypedBoundaryCanary(fail) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bridge-boundary-'));
  try {
    fs.writeFileSync(
      path.join(dir, 'NativeStripeSdkModule.ts'),
      [
        "import type { TurboModule } from 'react-native';",
        "import { TurboModuleRegistry } from 'react-native';",
        'type CanaryPayload = UnsafeObject;',
        'export interface Spec extends TurboModule {',
        '  canaryProbe(params: UnsafeObject): Promise<UnsafeObject>;',
        '  canaryPlain(value: Object): void;',
        '  canaryAlias(params: CanaryPayload): void;',
        '}',
        "export default TurboModuleRegistry.getEnforcing<Spec>('StripeSdk');",
        '',
      ].join('\n')
    );
    fs.writeFileSync(
      path.join(dir, 'NativeCanaryView.ts'),
      [
        "import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';",
        'export interface NativeProps {',
        '  cardStyle: UnsafeMixed;',
        '}',
        "export default codegenNativeComponent<NativeProps>('CanaryView');",
        '',
      ].join('\n')
    );
    const discovered = readUntypedBoundaries(dir);
    const byId = new Map(discovered.entries.map((entry) => [entry.id, entry]));
    const probe = byId.get('StripeSdk.canaryProbe');
    if (probe?.kind !== 'param' || !probe.params?.includes('params')) {
      fail(
        'scripts/check.mjs',
        'untyped boundaries: the canary UnsafeObject parameter was not reported'
      );
    }
    if (byId.get('StripeSdk.canaryProbe#result')?.kind !== 'result') {
      fail(
        'scripts/check.mjs',
        'untyped boundaries: the canary UnsafeObject result was not reported'
      );
    }
    const plain = byId.get('StripeSdk.canaryPlain');
    if (plain?.kind !== 'param' || !plain.params?.includes('value')) {
      fail(
        'scripts/check.mjs',
        'untyped boundaries: the canary Object parameter was not reported'
      );
    }
    const alias = byId.get('StripeSdk.canaryAlias');
    if (alias?.kind !== 'param' || !alias.params?.includes('params')) {
      fail(
        'scripts/check.mjs',
        'untyped boundaries: the canary aliased parameter was not reported'
      );
    }
    const view = byId.get('component:CanaryView');
    if (view?.kind !== 'component' || !view.params?.includes('cardStyle')) {
      fail(
        'scripts/check.mjs',
        'untyped boundaries: the canary UnsafeMixed prop was not reported'
      );
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Fails unless the parity-gap list reports a missing id, an unknown id, an
 * unused row, a listed fixture that does not use the id, and a fixture the
 * row omits.
 */
function checkParityGapCanary(fail) {
  const where = 'PARITY-GAPS.md';
  const listText = [
    '| Id | Kind | Method | iOS | Android | Fixtures |',
    '| G1 | decision | StripeSdk.canary | one | two | `canary/listed.json` `canary/absent.json` |',
    '| G2 | decision | StripeSdk.canary | one | two | |',
    '| D3 | by design | StripeSdk.canary | one | two | `canary/matched.json` |',
    '',
  ].join('\n');
  const gap = (name, reason) => ({
    file: path.join(fixturesDir, name),
    where: name,
    fixture: { parityGaps: { key: reason } },
  });
  const problems = [];
  checkParityGapList(
    [
      gap('canary/listed.json', 'G1: synthetic listed fixture'),
      gap('canary/extra.json', 'G1: synthetic fixture the row omits'),
      gap('canary/unknown.json', 'G9: synthetic id missing from the table'),
      gap('canary/bare.json', 'synthetic reason with no gap id'),
      gap('canary/matched.json', 'D3: synthetic row that matches'),
    ],
    listText,
    (_where, message) => problems.push(message),
    where
  );
  requireProblem(
    problems,
    'parityGaps["key"] must start with an id from PARITY-GAPS.md',
    'parity gaps',
    fail
  );
  requireProblem(
    problems,
    'parityGaps["key"] uses G9, which PARITY-GAPS.md does not list',
    'parity gaps',
    fail
  );
  requireProblem(
    problems,
    'G2 is used by no fixture; remove the row',
    'parity gaps',
    fail
  );
  requireProblem(
    problems,
    'G1 lists canary/absent.json, which does not use G1',
    'parity gaps',
    fail
  );
  requireProblem(
    problems,
    'G1 does not list canary/extra.json, which uses G1',
    'parity gaps',
    fail
  );
  if (problems.some((problem) => problem.includes('canary/matched.json'))) {
    fail(
      'scripts/check.mjs',
      'parity gaps: the canary reported the fixture that matches its row'
    );
  }
}

/**
 * Type-checks each fixture input as the argument list of its TurboModule
 * method, or as the props of its component, using the public types the specs
 * reference. Excess-property checks catch fields the types do not declare.
 */
function typecheckInputs(fixtures, required, paramNames, fail) {
  const ts = loadTypeScript();
  const virtualFile = path.join(repoRoot, 'src', '__bridge_contracts__.ts');
  const lines = [
    "import type { Spec as StripeSdk } from './specs/NativeStripeSdkModule';",
    "import type { Spec as OnrampSdk } from './specs/NativeOnrampSdkModule';",
    // JSON cannot name enum members, so string enums become their values.
    // Spec params typed `Object` stay untyped; only a type that declares
    // Object's own members (and accepts Object) is that type.
    'type Json<T> = T extends string ? `${T}` : T extends (...args: any[]) => any ? T : "toString" extends keyof T ? (Object extends T ? any : { [K in keyof T]: Json<T[K]> }) : T extends object ? { [K in keyof T]: Json<T[K]> } : T;',
    // A wrong nested type inside an all-optional object must still fail, or
    // the Json<T> guard has widened.
    "const canary: Json<Parameters<StripeSdk['initPaymentSheet']>> = [{ paymentIntentClientSecret: 'pi_canary_secret_canary', merchantDisplayName: 'Canary', defaultBillingDetails: { name: 42 } }];",
    'void canary;',
  ];
  const canaryLine = lines.findIndex((line) => line.startsWith('const canary'));
  const componentAliases = new Map();
  const importProps = (entry) => {
    if (entry?.kind !== 'component' || componentAliases.has(entry.file)) return;
    const alias = `Props${componentAliases.size}`;
    componentAliases.set(entry.file, alias);
    lines.push(
      `import type { NativeProps as ${alias} } from './specs/${entry.file.replace(/\.ts$/, '')}';`
    );
  };
  for (const { fixture } of fixtures) {
    importProps(required.get(fixture.method));
  }
  const lineToFixture = new Map();
  fixtures.forEach((item, index) => {
    const { method, input, skipTypecheck } = item.fixture;
    if (skipTypecheck) return;
    if (!input || typeof input !== 'object' || !paramNames[method]) return;
    let declaration;
    const entry = required.get(method);
    if (entry?.kind === 'component') {
      declaration = `const fixture${index}: Json<Partial<${componentAliases.get(entry.file)}>> = ${toTs(input)};`;
    } else {
      const [moduleName, name] = method.split('.');
      const names = paramNames[method];
      const last = Math.max(...Object.keys(input).map((k) => names.indexOf(k)));
      const args = names
        .slice(0, last + 1)
        .map((param) =>
          param in input ? toTs(input[param]) : 'undefined as any'
        );
      declaration = `const fixture${index}: Json<Parameters<${moduleName}['${name}']>> = [${args.join(', ')}];`;
    }
    lines.push(declaration);
    lineToFixture.set(lines.length - 1, item);
    lines.push(`void fixture${index};`);
  });
  const sourceText = lines.join('\n');

  const configPath = path.join(repoRoot, 'tsconfig.json');
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, repoRoot);
  const options = { ...parsed.options, noEmit: true, noUnusedLocals: false };
  const host = ts.createCompilerHost(options);
  const getSourceFile = host.getSourceFile;
  host.getSourceFile = (fileName, languageVersion, ...rest) =>
    path.resolve(fileName) === virtualFile
      ? ts.createSourceFile(fileName, sourceText, languageVersion, true)
      : getSourceFile(fileName, languageVersion, ...rest);
  const fileExists = host.fileExists;
  host.fileExists = (fileName) =>
    path.resolve(fileName) === virtualFile || fileExists(fileName);
  const program = ts.createProgram([virtualFile], options, host);
  const diagnostics = ts
    .getPreEmitDiagnostics(program)
    .filter((d) => d.file && path.resolve(d.file.fileName) === virtualFile);
  let canaryCaught = false;
  for (const diagnostic of diagnostics) {
    const { line } = diagnostic.file.getLineAndCharacterOfPosition(
      diagnostic.start
    );
    const message = ts.flattenDiagnosticMessageText(
      diagnostic.messageText,
      ' '
    );
    if (line === canaryLine) {
      if (/'number' is not assignable to type 'string'/.test(message)) {
        canaryCaught = true;
        continue;
      }
    }
    const item = lineToFixture.get(line);
    fail(
      item ? item.where : path.relative(repoRoot, fixturesDir),
      `type check: ${message}`
    );
  }
  if (!canaryCaught) {
    fail(
      'scripts/check.mjs',
      'type check: the canary with a wrong nested type passed, so Json<T> no longer checks nested values'
    );
  }
}

/**
 * Input fields the assertion keys do not cover.
 *
 * A key covers a field when it asserts the input value at the field's whole
 * path under its parameter, either bare or under one observation root, so
 * roots may be named for what they hold rather than for the parameter. Case
 * and underscores are ignored, so postalCode matches postal_code. A key rooted
 * at another parameter covers nothing of this one. A field whose value the
 * mapper changes, renames, or drops is named in covers, and a covers key that
 * asserts only null does not cover a non-null field.
 */
function unassertedInputFields(
  input,
  shared,
  ios,
  android,
  covers,
  unasserted
) {
  const allKeys = [
    ...Object.keys(shared),
    ...Object.keys(ios),
    ...Object.keys(android),
  ];
  const blocks = [shared, ios, android];
  const asserts = (key, value) =>
    blocks.some(
      (block) =>
        key in block && JSON.stringify(block[key]) === JSON.stringify(value)
    );
  const assertsNonNull = (key) =>
    blocks.some((block) => key in block && block[key] !== null);
  const fold = (text) => text.toLowerCase().replace(/_/g, '');
  const misses = [];
  for (const leaf of leafPaths(input)) {
    if (!leaf) continue;
    const [param, ...segments] = leaf.split('.');
    const suffix = fold(segments.join('.'));
    const otherParams = Object.keys(input).filter((name) => name !== param);
    const inputValue = leaf
      .split('.')
      .reduce((value, segment) => value?.[segment], input);
    const matchesKey = allKeys.some(
      (key) =>
        (key === leaf ||
          (suffix !== '' &&
            (fold(key) === suffix ||
              fold(key.split('.').slice(1).join('.')) === suffix) &&
            !otherParams.includes(key.split('.')[0]))) &&
        asserts(key, inputValue)
    );
    const covered = Object.entries(covers).some(
      ([p, key]) =>
        (leaf === p || leaf.startsWith(`${p}.`)) &&
        (inputValue === null || assertsNonNull(key))
    );
    const waived = Object.keys(unasserted).some(
      (p) => leaf === p || leaf.startsWith(`${p}.`)
    );
    if (!matchesKey && !covered && !waived) misses.push(leaf);
  }
  return misses;
}

/**
 * Fails unless the matcher reports keys that must not count as coverage: one
 * that matches only the last two path segments, one rooted at another
 * parameter, a null assertion on a non-null field, a key deeper than one root
 * that ends with a top-level field's name, a key that asserts a value other
 * than the input, and a covers entry that names a null-only key.
 */
function checkInputCoverageCanary(fail) {
  const cases = [
    {
      name: 'a last-two-segments-only key',
      input: { params: { billing: { address: { postalCode: '94103' } } } },
      shared: { 'address.postalCode': '94103' },
      leaf: 'params.billing.address.postalCode',
    },
    {
      name: 'a key rooted at another parameter',
      input: {
        params: { email: 'jenny@example.com' },
        options: { setupFutureUsage: 'OffSession' },
      },
      shared: { 'options.email': 'jenny@example.com' },
      leaf: 'params.email',
    },
    {
      name: 'a null assertion on a non-null field',
      input: { params: { merchantDisplayName: 'Bridge Contracts, Inc.' } },
      shared: { merchantDisplayName: null },
      leaf: 'params.merchantDisplayName',
    },
    {
      name: 'a deeper key ending in a top-level field name',
      input: {
        params: {
          email: 'never',
          billingDetailsCollectionConfiguration: { email: 'never' },
        },
      },
      shared: {
        'configuration.billingDetailsCollectionConfiguration.email': 'never',
      },
      leaf: 'params.email',
    },
    {
      name: 'a key that asserts a value other than the input',
      input: { params: { merchantDisplayName: 'Bridge Contracts, Inc.' } },
      shared: { 'configuration.merchantDisplayName': 'Someone Else' },
      leaf: 'params.merchantDisplayName',
    },
    {
      name: 'a covers entry naming a null-only key',
      input: { options: { setupFutureUsage: 'OffSession' } },
      shared: { 'api.setup_future_usage': null },
      covers: { 'options.setupFutureUsage': 'api.setup_future_usage' },
      leaf: 'options.setupFutureUsage',
    },
  ];
  for (const item of cases) {
    const misses = unassertedInputFields(
      item.input,
      item.shared,
      {},
      {},
      item.covers ?? {},
      {}
    );
    if (!misses.includes(item.leaf)) {
      fail(
        'scripts/check.mjs',
        `input coverage: the canary for ${item.name} was not reported as unasserted`
      );
    }
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const familiesArg = process.argv.find((arg) => arg.startsWith('--families='));
  const status = runBridgeFixtureChecks(loadParsedFixtures(), {
    families: familiesArg
      ? familiesArg.slice('--families='.length).split(',').filter(Boolean)
      : undefined,
  });
  if (status !== 0) process.exit(status);
}

function toTs(value) {
  if (value === FUNCTION_MARKER) return '((() => undefined) as any)';
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(toTs).join(', ')}]`;
  return `{ ${Object.entries(value)
    .map(([key, item]) => `${JSON.stringify(key)}: ${toTs(item)}`)
    .join(', ')} }`;
}
