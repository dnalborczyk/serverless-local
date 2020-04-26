'use strict' // eslint-disable-line

// UNCOMMENT FOR DEVELOPMENT:
//
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { resolve } = require('path')

// eslint-disable-next-line @typescript-eslint/no-var-requires
require('@babel/register')({
  configFile: resolve(__dirname, '../babel.config.js'),
  ignore: [/node_modules/],
})

module.exports = require('./index').default
