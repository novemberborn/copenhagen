import assert from 'assert'
import { runInNewContext } from 'vm'

import test from 'ava'
import { transform as babelTransform } from 'babel-core'

import hashAst from '../lib/hash-ast'
import plugin from '../babel-plugins/add-instrumentation'
import applyPlugin from './helpers/apply-plugin'

function run (code) {
  let created = false
  const exports = {}
  const traces = []

  const collector = {
    s (id) {
      traces.push(`s${id}`)
    },

    f (id) {
      traces.push(`f${id}`)
    }
  }

  runInNewContext(
    applyPlugin(plugin, code, 'foo.js', __dirname),
    {
      exports,
      require (mid) {
        assert(mid === 'copenhagen/collector')

        return {
          createCollector (hash) {
            assert(!created)
            created = hash

            return collector
          }
        }
      }
    },
    {
      filename: 'foo.js'
    }
  )

  return { exports, created, traces }
}

test('creates a collector with the expected hash', t => {
  const { ast } = babelTransform('', {
    babelrc: false,
    filename: 'foo.js'
  })
  const hash = hashAst('foo.js', ast)
  t.true(run``.created === hash)
})

test('respects directives', t => {
  try {
    // Strict mode in Node.js 0.12 doesn't seem to work when used in a vm
    // context. Just pass this test.
    runInNewContext('"use strict";foo="bar"')
    t.pass()
    return
  } catch (_) {}

  // Funny error checks because the code is run in a new context so the error's
  // constructor is different.
  t.throws(() => run`
    'use strict'
    foo = 'bar'
  `, err => err.name === 'ReferenceError')

  t.throws(() => run`
    (function () {
      'use strict'
      foo = 'bar'
    })()
  `, err => err.name === 'ReferenceError')
})

test('inserts unique variables', t => {
  const { exports, traces } = run`
    var _createCollector = 1
    var _collector = 2
    exports.check = function () {
      var _s = 3
      var _f = 4
      return [_createCollector, _collector, _s, _f]
    }
  `

  t.deepEqual([].slice.call(exports.check()), [1, 2, 3, 4])
  t.true(traces.length > 0)
})

test('instruments empty function declarations', t => {
  const { exports, traces } = run`
    function empty () {}
    exports.empty = empty
  `

  exports.empty()
  t.true(traces.pop() === 'f1')
})

test('instruments empty function expressions', t => {
  const { exports, traces } = run`
    exports.empty = function () {}
  `

  exports.empty()
  t.true(traces.pop() === 'f1')
})

test('instruments assignment expressions', t => {
  const { traces } = run`exports.empty = true`
  t.deepEqual(traces, ['s1'])
})

test('instruments variable declarations', t => {
  const { traces } = run`var foo = 'bar'`
  t.deepEqual(traces, ['s1'])
})

test('instruments return statements', t => {
  const { exports, traces } = run`
    exports.foo = function () {
      return 'bar'
    }
  `

  t.true(exports.foo() === 'bar')
  t.true(traces.pop() === 's2')
})
