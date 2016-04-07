import test from 'ava'
import { transform as babelTransform } from 'babel-core'
import requireFromString from 'require-from-string'

import hashAst from '../lib/hash-ast'
import plugin from '../babel-plugins/generate-reporting-code'
import applyPlugin from './helpers/apply-plugin'

function transform (code) {
  return applyPlugin(plugin, code, 'foo.js', __dirname)
}

test('exports getInitialCoverage()', t => {
  const exports = requireFromString(transform``)
  t.true(typeof exports.getInitialCoverage === 'function')
})

test('exports the expected hash', t => {
  const { ast } = babelTransform('', {
    babelrc: false,
    filename: 'foo.js'
  })
  const hash = hashAst('foo.js', ast)

  const exports = requireFromString(transform``)
  t.true(exports.hash === hash)
})

function initialCoverage (code) {
  return requireFromString(transform(code)).getInitialCoverage('foo.js')
}

test('provides empty coverage for empty programs', t => {
  t.deepEqual(initialCoverage``, {
    path: 'foo.js',
    s: {},
    b: {},
    f: {},
    fnMap: {},
    statementMap: {},
    branchMap: {}
  })
})

test('covers empty function statements', t => {
  t.deepEqual(initialCoverage`function noop() {}`, {
    path: 'foo.js',
    s: {
      1: 0
    },
    b: {},
    f: {
      1: 0
    },
    fnMap: {
      1: {
        name: 'noop',
        line: 1,
        loc: {
          start: { line: 1, column: 0 },
          end: { line: 1, column: 16 }
        }
      }
    },
    statementMap: {
      1: {
        start: { line: 1, column: 0 },
        end: { line: 1, column: 18 }
      }
    },
    branchMap: {}
  })
})

test('generates anonymous function names', t => {
  t.deepEqual(initialCoverage`
    exports.foo = function () {}
    exports.bar = function () {}
  `.fnMap, {
    1: {
      name: '(anonymous_1)',
      line: 1,
      loc: {
        start: { line: 1, column: 14 },
        end: { line: 1, column: 26 }
      }
    },
    2: {
      name: '(anonymous_2)',
      line: 2,
      loc: {
        start: { line: 2, column: 14 },
        end: { line: 2, column: 26 }
      }
    }
  })
})

test('covers assignment expressions', t => {
  t.deepEqual(initialCoverage`exports.foo = function () {}`, {
    path: 'foo.js',
    s: {
      1: 0
    },
    b: {},
    f: {
      1: 0
    },
    fnMap: {
      1: {
        name: '(anonymous_1)',
        line: 1,
        loc: {
          start: { line: 1, column: 14 },
          end: { line: 1, column: 26 }
        }
      }
    },
    statementMap: {
      1: {
        start: { line: 1, column: 0 },
        end: { line: 1, column: 28 }
      }
    },
    branchMap: {}
  })
})

test('covers return statements', t => {
  t.deepEqual(initialCoverage`
    function foo () {
      return 'bar'
    }
  `, {
    path: 'foo.js',
    s: {
      1: 0,
      2: 0
    },
    b: {},
    f: {
      1: 0
    },
    fnMap: {
      1: {
        name: 'foo',
        line: 1,
        loc: {
          start: { line: 1, column: 0 },
          end: { line: 1, column: 16 }
        }
      }
    },
    statementMap: {
      1: {
        start: { line: 1, column: 0 },
        end: { line: 3, column: 1 }
      },
      2: {
        start: { line: 2, column: 2 },
        end: { line: 2, column: 14 }
      }
    },
    branchMap: {}
  })
})

test('covers variable declarations', t => {
  t.deepEqual(initialCoverage`
    var foo = 'bar'
  `, {
    path: 'foo.js',
    s: {
      1: 0
    },
    b: {},
    f: {},
    fnMap: {},
    statementMap: {
      1: {
        start: { line: 1, column: 0 },
        end: { line: 1, column: 15 }
      }
    },
    branchMap: {}
  })
})
