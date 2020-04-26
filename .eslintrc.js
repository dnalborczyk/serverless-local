'use strict'

module.exports = {
  env: {
    es6: true,
    // jest globals
    jest: true,
    // Node.js global variables and Node.js scoping
    // http://eslint.org/docs/user-guide/configuring#specifying-environments
    node: true,
  },

  extends: [
    // 'plugin:prettier/recommended',

    'eslint:recommended',
    'eslint-config-airbnb-base',
    'plugin:@typescript-eslint/recommended',
    'prettier/@typescript-eslint',
    'plugin:prettier/recommended',
  ],

  // globals: {
  //   RUN_TEST_AGAINST_AWS: true,
  //   TEST_BASE_URL: true,
  // },

  parser: '@typescript-eslint/parser',

  // parserOptions: {
  //   ecmaVersion: 2018,
  //   sourceType: 'module',
  // },

  plugins: ['prettier', '@typescript-eslint'],

  rules: {
    'import/extensions': [
      'error',
      'always',
      {
        js: 'never',
        ts: 'never',
      },
    ],

    // import buffer explicitly
    'no-restricted-globals': [
      'error',
      {
        name: 'Buffer',
        message: "Import 'Buffer' from 'buffer' module instead",
      },
    ],

    // TODO FIXME turn off temporary, to make eslint pass
    //
    'class-methods-use-this': 'off',
    'import/extensions': 'off',
    'import/no-extraneous-dependencies': 'off',
    'import/no-unresolved': 'off',
    'import/order': 'off',
    'import/prefer-default-export': 'off',
    'lines-between-class-members': 'off',
    'no-console': 'off',
    'no-restricted-syntax': 'off',
    'no-underscore-dangle': 'off',
    'no-unused-expressions': 'off',
    '@typescript-eslint/ban-ts-ignore': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-empty-function': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
  },

  settings: {
    // https://github.com/alexgorbatchev/eslint-import-resolver-typescript
    'import/resolver': {
      typescript: {},
    },
  },
}
