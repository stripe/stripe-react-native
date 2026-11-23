import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  checkPackedContents,
  entryPoints,
  exportSubpaths,
  parsePackDryRun,
} from '../checks/pack-check.mjs';

const readyPkg = (overrides = {}) => ({
  name: '@stripe/react-native-payments',
  status: 'ready',
  requiredFiles: [],
  subpaths: [],
  ...overrides,
});

const manifest = {
  'name': '@stripe/react-native-payments',
  'main': 'lib/commonjs/index',
  'types': 'lib/typescript/src/index.d.ts',
  'react-native': 'src/index',
  'exports': {
    '.': {
      types: './lib/typescript/src/index.d.ts',
      default: './lib/commonjs/index.js',
    },
    './checkout': {
      types: './lib/typescript/src/checkout/index.d.ts',
      default: './lib/commonjs/checkout/index.js',
    },
    './package.json': './package.json',
  },
  'codegenConfig': { jsSrcsDir: './src/specs' },
};

const files = [
  'package.json',
  'lib/commonjs/index.js',
  'lib/commonjs/checkout/index.js',
  'lib/typescript/src/index.d.ts',
  'lib/typescript/src/checkout/index.d.ts',
  'src/index.tsx',
  'src/specs/NativeStripeSdkModule.ts',
  'payments.podspec',
  'android/build.gradle',
];

const check = (overrides = {}) =>
  checkPackedContents({
    manifest,
    files,
    pkg: readyPkg(),
    exists: (p) => ['android/build.gradle', 'src', 'src/specs'].includes(p),
    topLevel: ['package.json', 'payments.podspec', 'src', 'android'],
    ...overrides,
  });

test('a complete package passes', () => {
  assert.deepEqual(check().errors, []);
});

test('a missing entry point fails', () => {
  const { errors } = check({
    files: files.filter((f) => f !== 'lib/commonjs/index.js'),
  });
  assert.ok(
    errors.some((e) => e.includes('main points at lib/commonjs/index'))
  );
  assert.ok(errors.some((e) => e.includes('exports[. default]')));
});

test('a broken subpath export fails', () => {
  const { errors } = check({
    files: files.filter((f) => !f.includes('checkout/')),
  });
  assert.ok(errors.some((e) => e.includes('exports[./checkout types]')));
  assert.ok(errors.some((e) => e.includes('exports[./checkout default]')));
});

test('a subpath the config expects but exports lacks fails', () => {
  const { errors } = check({
    pkg: readyPkg({ subpaths: ['./checkout', './embedded'] }),
  });
  assert.deepEqual(errors, [
    'subpath export ./embedded is missing from "exports" (has: ., ./checkout, ./package.json)',
  ]);
});

test('an unpacked podspec, Gradle file, codegen dir, or required file fails', () => {
  const { errors } = check({
    files: files.filter((f) => !/podspec|build\.gradle|specs/.test(f)),
    pkg: readyPkg({ requiredFiles: ['app.plugin.js'] }),
  });
  assert.deepEqual(errors.sort(), [
    'android/build.gradle is not in the package',
    'app.plugin.js is not in the package',
    'payments.podspec is not in the package',
    'src/specs is not in the package',
  ]);
});

test('test sources, build output, and tarballs must not ship', () => {
  const { errors } = check({
    files: [
      ...files,
      'android/src/test/java/FooTest.kt',
      'ios/Tests/FooTests.swift',
      'src/__tests__/foo.test.ts',
      'android/build/outputs/x.aar',
      'package.tgz',
    ],
  });
  assert.deepEqual(errors, [
    'android/src/test/java/FooTest.kt is in the package (Android test sources must not ship)',
    'ios/Tests/FooTests.swift is in the package (iOS test sources must not ship)',
    'src/__tests__/foo.test.ts is in the package (test sources must not ship)',
    'android/build/outputs/x.aar is in the package (native build output must not ship)',
    'package.tgz is in the package (a packed tarball must not ship)',
  ]);
});

test('colocated tests, every Android test source set, and iOS test folders must not ship', () => {
  const shipped = [
    'src/foo.test.ts',
    'src/components/Bar.spec.tsx',
    'lib/commonjs/foo.test.js',
    'lib/module/foo.test.js.map',
    'lib/typescript/src/foo.test.d.ts',
    'android/src/testDebug/java/X.kt',
    'android/src/testRelease/java/X.kt',
    'android/src/androidTestDebug/java/X.kt',
    'android/src/sharedTest/java/X.kt',
    'ios/Checkout/Tests/X.swift',
    'packages/payments/ios/Test/X.swift',
  ];
  const { errors } = check({ files: [...files, ...shipped] });
  assert.equal(errors.length, shipped.length);
  for (const file of shipped) {
    assert.ok(
      errors.some((e) => e.startsWith(`${file} is in the package`)),
      file
    );
  }
});

test('ordinary sources that only mention test are allowed', () => {
  const ok = [
    'src/testing/helpers.ts',
    'src/contest.ts',
    'android/src/main/java/TestModeHelper.kt',
    'ios/TestModeHelper.swift',
  ];
  assert.deepEqual(check({ files: [...files, ...ok] }).errors, []);
});

test('workspace and catalog ranges in runtime dependencies fail', () => {
  const { errors } = check({
    manifest: {
      ...manifest,
      dependencies: { '@stripe/react-native-core': 'workspace:*' },
      peerDependencies: { react: 'catalog:' },
      devDependencies: { jest: 'catalog:' },
    },
  });
  assert.deepEqual(errors, [
    'dependencies.@stripe/react-native-core is "workspace:*"; npm publishes that range unresolved, so consumers cannot install it',
    'peerDependencies.react is "catalog:"; npm publishes that range unresolved, so consumers cannot install it',
  ]);
});

test('a package with no main or exports fails', () => {
  const { errors } = check({
    manifest: { name: 'x', types: 'lib/typescript/src/index.d.ts' },
  });
  assert.ok(errors.includes('declares no "main" or "exports" entry point'));
});

test('a shell passes only while it has no entry points or sources', () => {
  const shell = readyPkg({ status: 'shell' });
  assert.deepEqual(
    checkPackedContents({
      manifest: { name: 'x', private: true },
      files: ['package.json'],
      pkg: shell,
      exists: () => false,
      topLevel: ['package.json'],
    }).errors,
    []
  );
  const { errors } = check({ pkg: shell });
  assert.match(errors[0], /marked "shell".*set its status to "ready"/);
});

test('wildcard export targets need at least one packed match', () => {
  const wild = { name: 'x', exports: { './*': './lib/*.js' } };
  assert.deepEqual(
    check({
      manifest: wild,
      files: ['lib/a.js'],
      exists: () => false,
      topLevel: [],
    }).errors,
    []
  );
  assert.deepEqual(
    check({
      manifest: wild,
      files: ['lib/a.ts'],
      exists: () => false,
      topLevel: [],
    }).errors,
    ['exports[./*] points at ./lib/*.js, which is not in the package']
  );
});

test('a dry-run blob with a leading info line still parses', () => {
  const report = [
    {
      filename: 'stripe-react-native-0.0.0.tgz',
      size: 12,
      files: [{ path: 'package.json' }, { path: 'lib/commonjs/index.js' }],
    },
  ];
  const blob = `ℹ [module] notice before the pack report\n${JSON.stringify(report)}`;
  assert.deepEqual(parsePackDryRun(blob), {
    filename: 'stripe-react-native-0.0.0.tgz',
    size: 12,
    files: ['package.json', 'lib/commonjs/index.js'],
  });
});

test('an npm 11 object report still parses', () => {
  const report = {
    '@stripe/stripe-react-native': {
      filename: 'stripe-react-native-0.0.0.tgz',
      size: 12,
      files: [{ path: 'package.json' }, { path: 'lib/commonjs/index.js' }],
    },
  };
  const blob = `ℹ [module] notice before the pack report\n${JSON.stringify(report)}`;
  assert.deepEqual(parsePackDryRun(blob), {
    filename: 'stripe-react-native-0.0.0.tgz',
    size: 12,
    files: ['package.json', 'lib/commonjs/index.js'],
  });
});

test('invalid dry-run output with no JSON object fails', () => {
  assert.throws(
    () => parsePackDryRun('ℹ [module] notice\nthis is not json'),
    /did not print a JSON report/
  );
});

test('exportSubpaths and entryPoints read string and conditional exports', () => {
  assert.deepEqual(exportSubpaths('./index.js'), ['.']);
  assert.deepEqual(exportSubpaths({ import: './a.mjs' }), ['.']);
  assert.deepEqual(exportSubpaths(undefined), []);
  assert.deepEqual(
    entryPoints({
      bin: { tool: 'bin/tool.js' },
      exports: { import: './a.mjs' },
    }),
    [
      { field: 'bin.tool', target: 'bin/tool.js' },
      { field: 'exports[. import]', target: './a.mjs' },
    ]
  );
});
