import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../..'
);

test('js-tests keeps the bridge contract fixture check', () => {
  const yaml = fs.readFileSync(path.join(repoRoot, 'bitrise.yml'), 'utf8');
  const start = yaml.indexOf('\n  js-tests:\n');
  assert.notEqual(start, -1, 'expected a js-tests workflow');
  const next = yaml.slice(start + 1).search(/\n {2}[^ \n]/);
  const workflow = yaml.slice(
    start,
    next === -1 ? undefined : start + 1 + next
  );
  assert.match(
    workflow,
    /title: Run the Package Done Gate \(JS steps\)[\s\S]*GATE_SKIP_BUILD=1 yarn gate:package --all --skip=expo --bridge=js/
  );
});
