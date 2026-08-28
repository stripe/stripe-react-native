module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    function ModifyPackageJsonImportForTranspilation() {
      return {
        visitor: {
          ImportDeclaration(path) {
            let importResource = path.node.source.value ?? '';
            if (importResource.includes('../package.json')) {
              path.node.source.value = '../' + importResource;
            }
          },
        },
      };
    },
  ],
};
