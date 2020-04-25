'use strict'

// UNCOMMENT FOR DEVELOPMENT:
//
const { resolve } = require('path')

// eslint-disable-next-line import/no-extraneous-dependencies
require('@babel/register')({
  configFile: resolve(__dirname, '../babel.config.js'),
  ignore: [/node_modules/],
})

// eslint-disable-next-line import/no-unresolved
module.exports = require('./index').default
