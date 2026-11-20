const path = require('path');

const repoRoot = path.resolve(__dirname, '../..');

// Library sources whose JS coverage the harness reports. Paths are relative
// to the repository root. Codegen specs and type-only modules are excluded,
// matching the Jest floors in coverage-floors.json.
const include = ['src/**/*.{ts,tsx}', 'packages/*/src/**/*.{ts,tsx}'];

const exclude = [
  '**/node_modules/**',
  '**/__tests__/**',
  '**/__fixtures__/**',
  '**/__mocks__/**',
  'src/specs/**',
  'src/types/**',
  'src/plugin/**',
  'packages/*/src/specs/**',
];

module.exports = { repoRoot, include, exclude };
