module.exports = {
  presets: ['module:metro-react-native-babel-preset'],
  plugins: [
    function ModifyPackageJsonImportForTranspilation() {
      return {
        visitor: {
          ImportDeclaration(path, _state) {
            const { node } = path;
            if (node.source.value === '../../package.json') {
              node.source.value = '../../../package.json';
            }
          },
        },
      };
    },
  ],
};
