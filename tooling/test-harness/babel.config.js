const scope = require('./coverage-scope');

module.exports = function (api) {
  api.cache.using(() => process.env.RN_COVERAGE_JS);
  const plugins = [];
  if (process.env.RN_COVERAGE_JS === '1') {
    // Metro hands Babel the library's real path (the repository root), which
    // is outside this workspace. Root istanbul there, or the library is
    // silently left uninstrumented.
    plugins.push([
      'istanbul',
      { cwd: scope.repoRoot, include: scope.include, exclude: scope.exclude },
    ]);
  }
  return {
    presets: ['module:@react-native/babel-preset'],
    plugins,
  };
};
