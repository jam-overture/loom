import ts from "typescript"

import type { Fence } from "./model"

/**
 * The names a block **uses**, read as code rather than as text.
 *
 * A regular expression for a word is the obvious reader and it is wrong in both
 * directions. `\bit\b` matches the English word *it*, and *A primitive of your
 * own* has a doc comment inside a block that says *"it cannot invent `on
 * fire`"* — so a check reading for words would report that block as calling
 * `it` from `vitest` and demand an import for a sentence. The other direction
 * is the one that matters more: a name inside a string is not a call, and a
 * reader shown `const name = "createTree"` has not been shown a call to
 * anything.
 *
 * So the question is asked of the parse: **which identifiers does this block
 * read?** Comments and string literals hold no identifiers, and the positions
 * that merely *spell* a name — the key of an object literal, the part of an
 * expression after a dot, the names a declaration introduces — are not reads of
 * it either.
 *
 * `price` in `{ price: 1 }` and `ok` in `result.ok` are the two worth naming,
 * because both collide with something the runtime publishes. `api/mentions.ts`
 * makes the second exclusion for the same reason and says so: *"`result.ok` is a
 * property read on a value; the `ok` this package exports is the function that
 * made it. They share a spelling and nothing else."*
 *
 * **A fragment parses too.** `object-body` and `function-body` blocks are not
 * programs, and the parse of one is as full of syntax errors as the fence
 * declares it will be. That costs nothing here: an error-tolerant parse still
 * puts identifiers where they are, and the two things being excluded —
 * comments and strings — are lexical rather than grammatical.
 */

/** Positions where an identifier spells a name without reading one. */
const isWrittenRatherThanRead = (node: ts.Identifier): boolean => {
  const parent = node.parent

  if (parent === undefined) return false

  // `result.ok` and `loom.createTree` — the name after the dot is a property.
  if (ts.isPropertyAccessExpression(parent) && parent.name === node) return true
  if (ts.isQualifiedName(parent) && parent.right === node) return true

  // `{ price: 1 }` names a field. A shorthand `{ price }` reads one, so it stays.
  if (ts.isPropertyAssignment(parent) && parent.name === node) return true
  if (ts.isPropertySignature(parent) && parent.name === node) return true
  if (ts.isMethodDeclaration(parent) && parent.name === node) return true
  if (ts.isMethodSignature(parent) && parent.name === node) return true
  if (ts.isEnumMember(parent) && parent.name === node) return true

  // `const { price: amount } = props` renames; the left side is the field.
  if (ts.isBindingElement(parent) && parent.propertyName === node) return true

  // `<Stat value={1} />` — the attribute is the component's, not a name in scope.
  if (ts.isJsxAttribute(parent) && parent.name === node) return true

  // A name the block introduces is one it has, not one it needs.
  if (ts.isImportSpecifier(parent) || ts.isImportClause(parent) || ts.isNamespaceImport(parent)) return true
  if (ts.isExportSpecifier(parent)) return true
  if (ts.isVariableDeclaration(parent) && parent.name === node) return true
  if (ts.isParameter(parent) && parent.name === node) return true
  if (ts.isBindingElement(parent) && parent.name === node) return true
  if (ts.isFunctionDeclaration(parent) && parent.name === node) return true
  if (ts.isClassDeclaration(parent) && parent.name === node) return true
  if (ts.isInterfaceDeclaration(parent) && parent.name === node) return true
  if (ts.isTypeAliasDeclaration(parent) && parent.name === node) return true
  if (ts.isEnumDeclaration(parent) && parent.name === node) return true
  if (ts.isTypeParameterDeclaration(parent) && parent.name === node) return true
  if (ts.isLabeledStatement(parent) && parent.label === node) return true

  return false
}

/** Every name a block reads, each once. */
export const namesCalledIn = (code: string, language: Fence["language"]): ReadonlySet<string> => {
  const parsed = ts.createSourceFile(
    `fence.${language}`,
    code,
    ts.ScriptTarget.ESNext,
    true,
    language === "tsx" ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  )

  const found = new Set<string>()

  const walk = (node: ts.Node): void => {
    if (ts.isIdentifier(node) && !isWrittenRatherThanRead(node)) found.add(node.text)

    ts.forEachChild(node, walk)
  }

  walk(parsed)

  return found
}

/** Whether a block reads a name — and so needs to have been shown its door. */
export const calls = (name: string, code: string, language: Fence["language"]): boolean =>
  namesCalledIn(code, language).has(name)
