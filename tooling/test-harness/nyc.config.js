const scope = require('./coverage-scope');

module.exports = {
  'check-coverage': false,
  'cwd': scope.repoRoot,
  'include': scope.include,
  'exclude': scope.exclude,
  'sourceMap': true,
  'exclude-after-remap': true,
  'instrument': false,
  'reporter': ['lcov', 'json-summary', 'text-summary'],
};
