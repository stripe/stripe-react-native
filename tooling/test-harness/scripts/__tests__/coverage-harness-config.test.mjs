import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { formatScenarioToken } from '../harness-format.mjs';

const patchAdditions = (patch) =>
  patch
    .split('\n')
    .filter((line) => line.startsWith('+') && !line.startsWith('+++'))
    .map((line) => line.slice(1))
    .join('\n');

const harnessDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..'
);
const require = createRequire(path.join(harnessDir, 'package.json'));
const scope = require(path.join(harnessDir, 'coverage-scope.js'));

test('babel.config instruments library sources from the repository root', () => {
  const babelPath = path.join(harnessDir, 'babel.config.js');
  const previous = process.env.RN_COVERAGE_JS;
  process.env.RN_COVERAGE_JS = '1';
  delete require.cache[require.resolve(babelPath)];
  const babel = require(babelPath);
  const config = babel({
    cache: {
      using: (fn) => fn(),
    },
  });
  process.env.RN_COVERAGE_JS = previous;

  const istanbul = config.plugins.find((entry) => entry[0] === 'istanbul');
  assert.ok(istanbul, 'expected istanbul plugin when RN_COVERAGE_JS=1');
  assert.equal(istanbul[1].cwd, scope.repoRoot);
  assert.deepEqual(istanbul[1].include, scope.include);
  assert.deepEqual(istanbul[1].exclude, scope.exclude);
});

test('harness compiles the offline checkout fixture into the sdk pod', () => {
  const podfile = fs.readFileSync(path.join(harnessDir, 'ios/Podfile'), 'utf8');
  const postInstall = podfile.match(
    /:post_install => lambda do \|installer\|\n([\s\S]*?)\n {2}end,/
  );
  assert.ok(postInstall, 'expected a post_install lambda');
  assert.match(postInstall[1], /add_checkout_fixture_to_sdk\(installer\)/);
  assert.doesNotMatch(postInstall[1], /def add_checkout_fixture_to_sdk/);

  const helper = podfile.match(
    /def add_checkout_fixture_to_sdk\(installer\)\n([\s\S]*?)\nend\n/
  );
  assert.ok(helper, 'expected add_checkout_fixture_to_sdk');
  assert.match(helper[1], /HarnessCheckoutSession\.swift/);
  assert.equal(
    fs.existsSync(path.join(harnessDir, 'ios/HarnessCheckoutSession.swift')),
    true
  );
});

test('maestro waits for the flushed status text', () => {
  const yaml = fs.readFileSync(
    path.join(harnessDir, 'e2e/coverage-run.yaml'),
    'utf8'
  );
  assert.match(yaml, /visible: 'harness: flushed'/);
  assert.match(yaml, /text: 'OK'/);
  assert.doesNotMatch(yaml, /flushed\|flush-failed/);
  assert.doesNotMatch(yaml, /\.\*/);
});

test('App mounts CardField after initStripe', () => {
  const appPath = path.join(harnessDir, 'src/App.tsx');
  const source = fs.readFileSync(appPath, 'utf8');
  assert.match(
    source,
    /import \{ CardField \} from '@stripe\/stripe-react-native'/
  );
  assert.match(source, /scenario\.name === 'initStripe'/);
  assert.match(source, /\{stripeReady \? <CardField/);
});

test('coverage-run.yaml asserts exactly the scenario lines the harness can render', () => {
  const scenariosSource = fs.readFileSync(
    path.join(harnessDir, 'src/scenarios.ts'),
    'utf8'
  );
  const names = [...scenariosSource.matchAll(/^\s+name: '([^']+)',$/gm)].map(
    (match) => match[1]
  );
  const coverageRun = fs.readFileSync(
    path.join(harnessDir, 'e2e/coverage-run.yaml'),
    'utf8'
  );
  const patterns = [...coverageRun.matchAll(/^- assertVisible: '(.+)'$/gm)].map(
    (match) => match[1]
  );
  // Maestro rejects double-quoted, unquoted, and `text:` forms that this
  // single-quoted extract would otherwise ignore.
  const assertVisibleCount = coverageRun
    .split('\n')
    .filter((line) => /^\s*-?\s*assertVisible\b/.test(line)).length;
  assert.equal(assertVisibleCount, patterns.length);
  assert.ok(names.length > 0);
  assert.equal(names.length, scenariosSource.match(/^ {4}run: /gm).length);
  assert.equal(patterns.length, names.length + 1);
  // Maestro matches the whole element text. The harness renders a literal
  // token per scenario so the assertion does not depend on the result suffix.
  const tokens = names.map((name) => formatScenarioToken(name));
  for (const token of tokens) {
    assert.ok(
      patterns.includes(token),
      `no assertVisible in coverage-run.yaml matches "${token}"`
    );
  }
  assert.ok(patterns.includes('harness: flushed'));
  for (const pattern of patterns.filter((p) => p !== 'harness: flushed')) {
    assert.ok(
      tokens.includes(pattern),
      `assertVisible '${pattern}' matches no token the harness renders`
    );
  }
});

test('android debug host loads an embedded bundle instead of Metro', () => {
  const hostSource = fs.readFileSync(
    path.join(
      harnessDir,
      'node_modules/react-native-test-app/android/app/src/reacthost-0.76/java/com/microsoft/reacttetapp/react/MainReactNativeHost.kt'
    ),
    'utf8'
  );
  const isPackagerRunning = hostSource.slice(
    hostSource.indexOf('private fun isPackagerRunning')
  );
  const embeddedBundleGuard =
    /if \(reactBundleNameProvider\.bundleName != null\) \{\s*return false\s*\}/;
  assert.match(isPackagerRunning, embeddedBundleGuard);
  const debugReturn = isPackagerRunning.indexOf('return BuildConfig.DEBUG');
  const embeddedGuard = isPackagerRunning.indexOf(
    'reactBundleNameProvider.bundleName != null'
  );
  assert.ok(
    embeddedGuard !== -1 && debugReturn !== -1 && embeddedGuard < debugReturn,
    'embedded bundle must be chosen before BuildConfig.DEBUG forces the packager'
  );

  const patch = fs.readFileSync(
    path.join(
      harnessDir,
      '../../.yarn/patches/react-native-test-app-npm-4.4.12-dynamic-framework-deps.patch'
    ),
    'utf8'
  );
  assert.match(patchAdditions(patch), embeddedBundleGuard);
});

test('ios debug host loads an embedded bundle instead of Metro', () => {
  const hostSource = fs.readFileSync(
    path.join(
      harnessDir,
      'node_modules/react-native-test-app/ios/ReactTestApp/ReactInstance.swift'
    ),
    'utf8'
  );
  const initializer = hostSource.slice(
    hostSource.indexOf('private lazy var remoteBundleURLInternal'),
    hostSource.indexOf('override init()')
  );
  const embeddedBundleGuard =
    /if embeddedBundleURL\(\) != nil \{\s*return nil\s*\}/;
  assert.match(initializer, embeddedBundleGuard);
  assert.doesNotMatch(initializer, /#if DEBUG\s+ReactInstance\.jsBundleURL\(\)/);
  const embeddedGuard = initializer.indexOf('embeddedBundleURL() != nil');
  const packagerCall = initializer.indexOf('ReactInstance.jsBundleURL()');
  assert.ok(
    embeddedGuard !== -1 && packagerCall !== -1 && embeddedGuard < packagerCall,
    'embedded bundle must be chosen before jsBundleURL() contacts the packager'
  );

  const patch = fs.readFileSync(
    path.join(
      harnessDir,
      '../../.yarn/patches/react-native-test-app-npm-4.4.12-dynamic-framework-deps.patch'
    ),
    'utf8'
  );
  assert.match(patchAdditions(patch), embeddedBundleGuard);
});

test('metro.config re-resolves singletons from the harness entry', () => {
  const metroPath = path.join(harnessDir, 'metro.config.js');
  delete require.cache[require.resolve(metroPath)];
  const metro = require(metroPath);
  const libraryFile = path.join(scope.repoRoot, 'src/index.ts');
  let resolvedFrom = null;
  const resolveRequest = (ctx, moduleName) => {
    resolvedFrom = ctx.originModulePath;
    if (moduleName === 'react' || moduleName.startsWith('@babel/runtime/')) {
      return { type: 'sourceFile', filePath: path.join(harnessDir, 'index.js') };
    }
    return null;
  };
  const result = metro.resolver.resolveRequest(
    {
      originModulePath: libraryFile,
      resolveRequest,
    },
    'react',
    'ios'
  );
  assert.ok(result);
  assert.ok(
    resolvedFrom.startsWith(harnessDir),
    `expected harness entry origin, got ${resolvedFrom}`
  );

  resolvedFrom = null;
  const helper = metro.resolver.resolveRequest(
    {
      originModulePath: libraryFile,
      resolveRequest,
    },
    '@babel/runtime/helpers/interopRequireDefault',
    'ios'
  );
  assert.ok(helper);
  assert.ok(
    resolvedFrom.startsWith(harnessDir),
    `expected babel runtime to resolve from the harness, got ${resolvedFrom}`
  );
});

test('metro.config re-resolves blocked non-singletons from the harness entry', () => {
  const metroPath = path.join(harnessDir, 'metro.config.js');
  delete require.cache[require.resolve(metroPath)];
  const metro = require(metroPath);
  const libraryFile = path.join(
    scope.repoRoot,
    'src/components/AuBECSDebitForm.tsx'
  );
  const helperName = '@babel/runtime/helpers/interopRequireDefault';
  const helperPath = path.join(
    harnessDir,
    'node_modules/@babel/runtime/helpers/interopRequireDefault.js'
  );

  let resolvedFrom = null;
  const helper = metro.resolver.resolveRequest(
    {
      originModulePath: libraryFile,
      resolveRequest: (ctx, moduleName) => {
        resolvedFrom = ctx.originModulePath;
        if (moduleName === helperName) {
          return { type: 'sourceFile', filePath: helperPath };
        }
        return null;
      },
    },
    helperName,
    'android'
  );
  assert.equal(helper.filePath, helperPath);
  assert.ok(
    resolvedFrom.startsWith(harnessDir),
    `expected harness entry origin for ${helperName}, got ${resolvedFrom}`
  );
  assert.ok(
    helper.filePath.includes(
      `${path.sep}node_modules${path.sep}@babel${path.sep}runtime${path.sep}`
    )
  );

  resolvedFrom = null;
  const react = metro.resolver.resolveRequest(
    {
      originModulePath: libraryFile,
      resolveRequest: (ctx, moduleName) => {
        resolvedFrom = ctx.originModulePath;
        if (moduleName === 'react') {
          return {
            type: 'sourceFile',
            filePath: path.join(harnessDir, 'node_modules/react/index.js'),
          };
        }
        return null;
      },
    },
    'react',
    'android'
  );
  assert.ok(react);
  assert.ok(
    resolvedFrom.startsWith(harnessDir),
    `expected harness entry origin for react, got ${resolvedFrom}`
  );

  resolvedFrom = null;
  metro.resolver.resolveRequest(
    {
      originModulePath: libraryFile,
      resolveRequest: (ctx) => {
        resolvedFrom = ctx.originModulePath;
        return { type: 'sourceFile', filePath: libraryFile };
      },
    },
    '../specs/NativeAuBECSDebitForm',
    'android'
  );
  assert.equal(resolvedFrom, libraryFile);
});
