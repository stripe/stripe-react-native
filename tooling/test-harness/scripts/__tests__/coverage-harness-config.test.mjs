import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

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

test('metro.config re-resolves singletons from the harness entry', () => {
  const metroPath = path.join(harnessDir, 'metro.config.js');
  delete require.cache[require.resolve(metroPath)];
  const metro = require(metroPath);
  const libraryFile = path.join(scope.repoRoot, 'src/index.ts');
  let resolvedFrom = null;
  const result = metro.resolver.resolveRequest(
    {
      originModulePath: libraryFile,
      resolveRequest: (ctx, moduleName) => {
        resolvedFrom = ctx.originModulePath;
        if (moduleName === 'react') {
          return { type: 'sourceFile', filePath: path.join(harnessDir, 'index.js') };
        }
        return null;
      },
    },
    'react',
    'ios'
  );
  assert.ok(result);
  assert.ok(
    resolvedFrom.startsWith(harnessDir),
    `expected harness entry origin, got ${resolvedFrom}`
  );
});
