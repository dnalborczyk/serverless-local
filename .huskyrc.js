'use strict'

module.exports = {
  hooks: {
    'pre-commit': 'npm run lint && npm run prettier',
    'pre-push': 'npm run lint && npm run prettier && npm run build && npm test',
  },
}
