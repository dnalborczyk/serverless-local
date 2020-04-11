'use strict'

module.exports = {
  plugins: [
    // NOTE: typescript transform plugin MUST run before other ecmascript transforms!
    '@babel/plugin-transform-typescript',
    [
      '@babel/plugin-proposal-class-properties',
      {
        loose: true,
      },
    ],
    '@babel/plugin-proposal-dynamic-import',
    '@babel/plugin-proposal-nullish-coalescing-operator',
    '@babel/plugin-proposal-optional-chaining',
    '@babel/plugin-transform-modules-commonjs',
  ],
}
