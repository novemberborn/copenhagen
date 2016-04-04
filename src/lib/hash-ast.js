import md5Hex from 'md5-hex'

export default function hashAst (filename, ast) {
  return md5Hex([filename, JSON.stringify(ast.tokens)])
}
