const assert = require('assert')

const babelTransform = require('babel-core').transform
const outdent = require('outdent')

module.exports = function (plugin, code, filename, sourceRoot) {
  assert(Array.isArray(code))
  assert(code.length === 1)

  // outdent throws if the string doesn't have indentation
  const hasIndentation = /(\r\n|\r|\n)([ \t]*)(?:[^ \t\r\n]|$)/.test(code[0])
  code = hasIndentation ? outdent(code) : code[0]

  return babelTransform(code, {
    babelrc: false,
    filename: filename,
    sourceRoot: __dirname,
    plugins: [plugin, 'transform-es2015-modules-commonjs']
  }).code
}
