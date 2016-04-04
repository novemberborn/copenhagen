import template from 'babel-template'
import * as t from 'babel-types'

import hashAst from '../lib/hash-ast'

const buildCreateCollector = template(`
  var COLLECTOR = CREATE_COLLECTOR(HASH);
  var COUNT_S = COLLECTOR.s;
  var COUNT_F = COLLECTOR.f;
`)

const buildStatementCount = template('COUNT_S(ID)')
const buildInvocationCount = template('COUNT_F(ID)')

const statementMatcher = `
  AssignmentExpression
  ReturnStatement
  VariableDeclaration
`.trim().split(/\s+/).join('|')

const addInstrumentation = {
  [statementMatcher] (path) {
    path.insertBefore(this.countStatement())
  },

  Function (path) {
    path.node.body.body.unshift(this.countInvocation())
  }
}

export default function () {
  return {
    visitor: {
      Program (path, state) {
        const { scope } = path
        const { ast, opts: { filename } } = state.file
        const { collectorModuleId = 'copenhagen/collector' } = state.opts

        const HASH = t.stringLiteral(hashAst(filename, ast))

        const COLLECTOR = t.identifier(scope.generateUid('collector'))
        const COUNT_S = t.identifier(scope.generateUid('s'))
        const COUNT_F = t.identifier(scope.generateUid('f'))

        let statementId = 0
        let fnId = 0
        path.traverse(addInstrumentation, {
          countStatement () {
            return buildStatementCount({
              COUNT_S,
              ID: t.numericLiteral(++statementId)
            })
          },

          countInvocation () {
            return buildInvocationCount({
              COUNT_F,
              ID: t.numericLiteral(++fnId)
            })
          }
        })

        const CREATE_COLLECTOR = state.addImport(collectorModuleId, 'createCollector')
        path.unshiftContainer('body', buildCreateCollector({
          COLLECTOR,
          COUNT_F,
          COUNT_S,
          CREATE_COLLECTOR,
          HASH
        }))
      }
    }
  }
}
