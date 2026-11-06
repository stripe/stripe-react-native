module.exports = {
  root: true,
  extends: ['@react-native', 'plugin:prettier/recommended'],
  plugins: ['import'],
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
      },
    },
  },
  rules: {
    'no-shadow': 'off',
    '@typescript-eslint/no-shadow': ['error'],
    'react/no-unstable-nested-components': [
      'warn',
      {
        allowAsProps: true,
      },
    ],
    'import/no-relative-packages': 'error',
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: [
              '@stripe/react-native-*/src',
              '@stripe/react-native-*/src/**',
              '@stripe/react-native-*/lib',
              '@stripe/react-native-*/lib/**',
            ],
            message: 'Import other packages through their public entry points.',
          },
        ],
      },
    ],
  },
};
