import { transform, transformFromAst } from 'babel-core'
import transformModules from 'babel-plugin-transform-es2015-modules-commonjs'

import addInstrumentation from './babel-plugins/add-instrumentation'
import generateReportingCode from './babel-plugins/generate-reporting-code'
import hashAst from './lib/hash-ast'

export function instrument ({
  filename,
  code: input,
  inputSourceMap = null,
  collectorModuleId = 'copenhagen/collector',
  additionalBabelPlugins = [transformModules]
}) {
  const { ast: initialAst } = transform(input, {
    babelrc: false,
    filename
  })
  const hash = hashAst(filename, initialAst)

  const { code, map } = transformFromAst(initialAst, input, {
    ast: false,
    babelrc: false,
    compact: false,
    filename,
    inputSourceMap,
    plugins: [[addInstrumentation, { collectorModuleId }], ...additionalBabelPlugins],
    sourceMaps: true
  })

  const { code: reportingCode } = transform(input, {
    ast: false,
    babelrc: false,
    compact: false,
    filename,
    plugins: [generateReportingCode, ...additionalBabelPlugins]
  })

  return {
    code,
    hash,
    map,
    reportingCode
  }
}
