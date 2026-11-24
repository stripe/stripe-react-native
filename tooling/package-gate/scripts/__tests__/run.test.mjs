import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { runLogged } from '../checks/run.mjs';

function capture(stream) {
  const chunks = [];
  const original = stream.write;
  stream.write = function write(chunk, encoding, callback) {
    chunks.push(chunk.toString());
    return original.call(stream, chunk, encoding, callback);
  };
  return {
    text: () => chunks.join(''),
    restore() {
      stream.write = original;
    },
  };
}

test('a failing command prints the log tail and does not echo it when quiet', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'run-logged-'));
  const logFile = path.join(dir, 'child.log');
  const stdout = capture(process.stdout);
  const stderr = capture(process.stderr);
  try {
    const status = await runLogged(
      process.execPath,
      ['-e', 'console.log("from-child-" + "marker"); process.exit(3)'],
      { cwd: dir, env: process.env, logFile, verbose: false }
    );
    assert.equal(status, 3);
    assert.match(stderr.text(), /failed after \d+s \(exit 3\)/);
    assert.match(stderr.text(), /from-child-marker/);
    assert.equal(stdout.text().includes('from-child-marker'), false);
  } finally {
    stdout.restore();
    stderr.restore();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('verbose forwards the child output', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'run-logged-'));
  const logFile = path.join(dir, 'child.log');
  const stdout = capture(process.stdout);
  try {
    const status = await runLogged(
      process.execPath,
      ['-e', 'process.stdout.write("from-child-" + "marker\\n")'],
      { cwd: dir, env: process.env, logFile, verbose: true }
    );
    assert.equal(status, 0);
    assert.match(stdout.text(), /from-child-marker/);
    assert.match(fs.readFileSync(logFile, 'utf8'), /from-child-marker/);
  } finally {
    stdout.restore();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
