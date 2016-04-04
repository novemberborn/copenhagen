import template from 'babel-template'

import hashAst from '../lib/hash-ast'

const programBuilder = template(`
  function GET_INITIAL_COVERAGE () {
    var s = {};
    var b = {};
    var f = {};
    var fnMap = {};
    var statementMap = {};
    var branchMap = {};
    var report = {
      path: PATH,
      s: s,
      b: b,
      f: f,
      fnMap: fnMap,
      statementMap: statementMap,
      branchMap: branchMap
    };
    ADD_FUNCTIONS
    ADD_STATEMENTS
    return report;
  }
`)

const locBuilder = template(`
  return {
    start: {
      line: START_LINE,
      column: START_COLUMN
    },
    end: {
      line: END_LINE,
      column: END_COLUMN
    }
  }
`)

const fnMapAdditionBuilder = template(`
  f[ID] = 0
  fnMap[ID] = {
    name: NAME,
    line: LINE,
    loc: LOC
  }
`)

const statementMapAdditionBuilder = template(`
  s[ID] = 0
  statementMap[ID] = LOC
`)

const statementMatcher = `
  AssignmentExpression
  ReturnStatement
  VariableDeclaration
`.trim().split(/\s+/).join('|')

const addToMaps = {
  [statementMatcher] (path) {
    const { start, end } = path.node.loc
    this.addStatement(start, end)
  },

  FunctionDeclaration (path) {
    const {
      id: { name },
      loc: { start, end: definitionEnd },
      body: {
        loc: { start: end }
      }
    } = path.node

    this.addFn(name, start, end)
    this.addStatement(start, definitionEnd)
  },

  FunctionExpression (path) {
    const {
      loc: { start },
      body: {
        loc: { start: end }
      }
    } = path.node

    this.addFn(null, start, end)
  }
}

export default function ({ types: t }) {
  return {
    visitor: {
      Program (path, state) {
        if (!path.node.loc) return

        const { ast, opts: { filename } } = state.file

        const PATH = t.stringLiteral(filename)
        const HASH = t.stringLiteral(hashAst(filename, ast))

        const ADD_FUNCTIONS = []
        const ADD_STATEMENTS = []

        let anonCount = 0
        let fnId = 0
        let statementId = 0
        path.traverse(addToMaps, {
          addFn (name, start, end) {
            ADD_FUNCTIONS.push(...fnMapAdditionBuilder({
              ID: t.numericLiteral(++fnId),
              NAME: t.stringLiteral(name || `(anonymous_${++anonCount})`),
              LINE: t.numericLiteral(start.line),
              LOC: locBuilder({
                START_LINE: t.numericLiteral(start.line),
                START_COLUMN: t.numericLiteral(start.column),
                END_LINE: t.numericLiteral(end.line),
                END_COLUMN: t.numericLiteral(end.column)
              }).argument
            }))
          },

          addStatement (start, end) {
            ADD_STATEMENTS.push(...statementMapAdditionBuilder({
              ID: t.numericLiteral(++statementId),
              LOC: locBuilder({
                START_LINE: t.numericLiteral(start.line),
                START_COLUMN: t.numericLiteral(start.column),
                END_LINE: t.numericLiteral(end.line),
                END_COLUMN: t.numericLiteral(end.column)
              }).argument
            }))
          }
        })

        const GET_INITIAL_COVERAGE = t.identifier('getInitialCoverage')
        path.replaceWith(t.program(
          [
            programBuilder({
              ADD_FUNCTIONS,
              ADD_STATEMENTS,
              GET_INITIAL_COVERAGE,
              PATH
            }),
            t.exportNamedDeclaration(
              null,
              [
                t.exportSpecifier(GET_INITIAL_COVERAGE, GET_INITIAL_COVERAGE)
              ]
            ),
            t.exportNamedDeclaration(
              t.variableDeclaration(
                'var',
                [
                  t.variableDeclarator(t.identifier('hash'), HASH)
                ]
              ),
              []
            )
          ],
          [
            t.Directive(t.DirectiveLiteral('use strict'))
          ]
        ))
      }
    }
  }
}
