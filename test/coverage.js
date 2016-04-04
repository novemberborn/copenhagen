import assert from 'assert'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { PassThrough } from 'stream'
import { runInNewContext } from 'vm'

import test from 'ava'
import proxyquire from 'proxyquire'
import requireFromString from 'require-from-string'

import { instrument } from '../instrument'
import { addCounts, collectUsageData } from '../coverage'

const run = (() => {
  const reload = proxyquire.noPreserveCache()

  return async (code, filename, exec) => {
    const collector = reload('../collector', {})
    const stream = collector.getStream()

    const exports = {}
    runInNewContext(
      code,
      {
        exports,
        require (mid) {
          assert(mid === 'copenhagen/collector')
          return collector
        }
      },
      { filename }
    )

    if (exec) {
      await exec(exports)
    }

    const result = new PassThrough()

    // Move the bytes from the collector stream to the result stream. End it in
    // a future turn so it can be fully consumed by collectUsageData()
    stream.pipe(result)
    setImmediate(() => {
      stream.unpipe(result)
      result.end()
    })

    return result
  }
})()

const prepare = fixture => {
  const filename = resolve('fixtures', fixture)
  const { code, hash } = instrument({
    code: readFileSync(filename, 'utf8'),
    filename
  })

  return { filename, code, hash }
}

test('collectUsageData() collects data from a single stream', async t => {
  const foo = prepare('foo.js')
  foo.stream = await run(foo.code, foo.filename, exports => {
    exports.foo()
  })
  const bar = prepare('bar.js')
  bar.stream = await run(bar.code, bar.filename)

  const stream = new PassThrough()
  foo.stream.pipe(stream)
  bar.stream.pipe(stream)

  const data = await collectUsageData(stream)
  t.true(Object.keys(data).length === 2)
  t.same(data[foo.hash], [
    { id: '1', type: 's' },
    { id: '3', type: 's' },
    { id: '5', type: 's' },
    { id: '1', type: 'f' },
    { id: '2', type: 's' }
  ])
  t.same(data[bar.hash], [
    { id: '1', type: 's' }
  ])
})

test('collectUsageData() collects data from multiple streams', async t => {
  const foo = prepare('foo.js')
  foo.stream = await run(foo.code, foo.filename, exports => {
    exports.foo()
  })
  const bar = prepare('bar.js')
  bar.stream = await run(bar.code, bar.filename)

  const data = await collectUsageData([foo.stream, bar.stream])
  t.true(Object.keys(data).length === 2)
  t.same(data[foo.hash], [
    { id: '1', type: 's' },
    { id: '3', type: 's' },
    { id: '5', type: 's' },
    { id: '1', type: 'f' },
    { id: '2', type: 's' }
  ])
  t.same(data[bar.hash], [
    { id: '1', type: 's' }
  ])
})

test('addCounts() updates a coverage report with usage data', async t => {
  const filename = resolve('fixtures/foo.js')
  const { code, hash, reportingCode } = instrument({
    code: readFileSync(filename, 'utf8'),
    filename
  })

  const stream = await run(code, filename, exports => {
    exports.foo()
    exports.foo()
    exports.bar()
  })

  const report = requireFromString(reportingCode).getInitialCoverage()
  const data = await collectUsageData(stream)
  addCounts(report, data[hash])

  const { s, b, f } = report
  t.same(s, {
    1: 1,
    2: 2,
    3: 1,
    4: 1,
    5: 1,
    6: 0
  })
  t.same(b, {})
  t.same(f, {
    1: 2,
    2: 1,
    3: 0
  })
})
