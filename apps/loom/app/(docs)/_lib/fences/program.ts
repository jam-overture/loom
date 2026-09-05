import ts from "typescript"

import { isCheckable, type Fence } from "./model"

/**
 * Turning a page into one program.
 *
 * A documentation page is a story, and the code in it is written the way a story
 * is: the first block builds a tree, a later one reads a field off that same
 * tree, and neither would stand up on its own. Compiling each block separately
 * would report *thirty* undefined names and none of them would be a real fault.
 *
 * So the unit is the **page**, not the block. Every compiled fence on a page is
 * appended, in reading order, into a single module — which is exactly the claim
 * the page is making: that a reader following along ends up with something that
 * works.
 *
 * Two things have to be repaired along the way, both of them consequences of
 * prose being written for a person:
 *
 * - **A page repeats an import.** `your-first-tree` imports
 *   `sequentialIdFactory` once to build a tree and again forty lines later to
 *   compare it with the random one, because a reader who arrives at the second
 *   block should not have to scroll up to know where the name came from. Read as
 *   one module that is a duplicate identifier, so imports are hoisted and merged
 *   rather than repeated.
 * - **Nothing may be left unused.** The application compiles with
 *   `noUnusedLocals`, and a page's last block usually declares something the
 *   page then talks about in prose rather than in code. Every top-level name the
 *   program declares is exported at the foot of the file, which is true — the
 *   page's names *are* its surface — and keeps the setting doing its real job on
 *   imports.
 */

const WHAT: Record<Fence["kind"], string> = {
  program: "a program",
  "object-body": "the inside of an object literal",
  "function-body": "the inside of a function",
  sketch: "abridged, and not compiled",
}

/**
 * Where a compiler error came from.
 *
 * A generated file's line numbers are its own, and the person reading the
 * failure needs the page's. The marker sits immediately above each block, so the
 * nearest one above an error names the fence it belongs to.
 */
const marker = (fence: Fence): string => `// page.mdx:${fence.line} — ${WHAT[fence.kind]}`

/**
 * What a fence contributes to the module.
 *
 * A block that is the inside of something gets the outside put back. The name
 * carries the line it came from so that two fragments on one page cannot
 * collide, and so a compiler error names a place in the page.
 *
 * A block that is the inside of a function may still open with the imports it
 * needs, because a reader who is shown a handler wants to know where
 * `parseTree` came from. Those are lifted out before the wrapper goes on: an
 * import inside a function body is a syntax error, and the page is not wrong to
 * show one.
 */
const unitFor = (fence: Fence): string => {
  if (fence.kind === "program") return `${marker(fence)}\n${fence.code}`

  // The inside of an object literal is not parseable on its own, so it is
  // wrapped exactly as written and left to the compiler in place.
  if (fence.kind === "object-body") {
    return `${marker(fence)}\nconst objectAtLine${fence.line} = {\n${fence.code}\n}`
  }

  const parsed = ts.createSourceFile(
    `fence.${fence.language}`,
    fence.code,
    ts.ScriptTarget.ESNext,
    true,
    fence.language === "tsx" ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  )

  const lifted: string[] = []
  const inside: string[] = []

  parsed.statements.forEach((statement) => {
    const text = fence.code.slice(statement.getFullStart(), statement.getEnd()).trim()

    if (ts.isImportDeclaration(statement)) lifted.push(text)
    else inside.push(fence.code.slice(statement.getFullStart(), statement.getEnd()))
  })

  const body = inside.join("").replace(/^\n+/, "").replace(/\s+$/, "")

  return [...lifted, `${marker(fence)}\nconst functionAtLine${fence.line} = async () => {\n${body}\n}`].join("\n")
}

type Imported = {
  readonly values: Set<string>
  readonly types: Set<string>
  defaultName?: string
  namespace?: string
}

const emptyImported = (): Imported => ({ values: new Set<string>(), types: new Set<string>() })

const specifierText = (element: ts.ImportSpecifier): string =>
  element.propertyName === undefined
    ? element.name.text
    : `${element.propertyName.text} as ${element.name.text}`

const collectImport = (declaration: ts.ImportDeclaration, into: Map<string, Imported>): void => {
  const specifier = (declaration.moduleSpecifier as ts.StringLiteral).text
  const entry = into.get(specifier) ?? emptyImported()
  const clause = declaration.importClause

  if (clause !== undefined) {
    if (clause.name !== undefined) entry.defaultName = clause.name.text

    const { namedBindings } = clause

    if (namedBindings !== undefined && ts.isNamespaceImport(namedBindings)) {
      entry.namespace = namedBindings.name.text
    }

    if (namedBindings !== undefined && ts.isNamedImports(namedBindings)) {
      namedBindings.elements.forEach((element) => {
        const target = clause.isTypeOnly || element.isTypeOnly ? entry.types : entry.values
        target.add(specifierText(element))
      })
    }
  }

  into.set(specifier, entry)
}

/**
 * The merged imports, in the order the page first reached for each module.
 *
 * Type-only and value imports of the same module are emitted as two lines
 * rather than one mixed clause: `verbatimModuleSyntax` is on, so the difference
 * between them is load-bearing and worth keeping visible.
 */
const WIDTH = 110

/** One line where it fits, one name per line where it does not. */
const importLine = (prefix: string, names: readonly string[], specifier: string): string => {
  const sorted = [...names].sort()
  const single = `${prefix} { ${sorted.join(", ")} } from "${specifier}"`

  return single.length <= WIDTH ? single : `${prefix} {\n  ${sorted.join(",\n  ")},\n} from "${specifier}"`
}

const renderImports = (imports: Map<string, Imported>): readonly string[] =>
  [...imports.entries()].flatMap(([specifier, entry]) => {
    const lines: string[] = []
    const leading: string[] = []

    if (entry.defaultName !== undefined) leading.push(entry.defaultName)
    if (entry.namespace !== undefined) leading.push(`* as ${entry.namespace}`)

    if (entry.values.size > 0) {
      lines.push(importLine(`import ${leading.map((name) => `${name},`).join(" ")}`.trimEnd(), [...entry.values], specifier))
    } else if (leading.length > 0) {
      lines.push(`import ${leading.join(", ")} from "${specifier}"`)
    }

    if (entry.types.size > 0) lines.push(importLine("import type", [...entry.types], specifier))

    return lines
  })

type Declared = {
  readonly values: readonly string[]
  readonly types: readonly string[]
}

const namesInBinding = (name: ts.BindingName): readonly string[] => {
  if (ts.isIdentifier(name)) return [name.text]

  return name.elements.flatMap((element) =>
    ts.isBindingElement(element) ? namesInBinding(element.name) : []
  )
}

const declaredBy = (statement: ts.Statement): Declared => {
  if (ts.isVariableStatement(statement)) {
    return {
      values: statement.declarationList.declarations.flatMap((declaration) => namesInBinding(declaration.name)),
      types: [],
    }
  }

  if (ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) {
    return { values: statement.name === undefined ? [] : [statement.name.text], types: [] }
  }

  if (ts.isTypeAliasDeclaration(statement) || ts.isInterfaceDeclaration(statement)) {
    return { values: [], types: [statement.name.text] }
  }

  return { values: [], types: [] }
}

const unique = (names: readonly string[]): readonly string[] => [...new Set(names)]

const isExported = (statement: ts.Statement): boolean =>
  ts.canHaveModifiers(statement) &&
  ts.getModifiers(statement)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) === true

/** `a as b` binds `b`. The name that exists in the module is the one after `as`. */
const localName = (specifier: string): string => specifier.split(" as ").at(-1) ?? specifier

export type Assembly = {
  /** The module text, ready to be written to disk. */
  readonly source: string
  /** `tsx` when any fence on the page was, because one JSX block decides the file. */
  readonly extension: "ts" | "tsx"
  /** How many fences were compiled into it. */
  readonly compiled: number
}

export type ContextExport = {
  readonly name: string
  readonly isType: boolean
}

/**
 * Assemble one page's fences into a module.
 *
 * `contextImport` is the module specifier of the page's context file, if it has
 * one, and `contextExports` what that file offers. Only the names the page
 * actually uses are imported — an unused one would fail `noUnusedLocals`, which
 * is the check that keeps a context file from filling up with scenery.
 */
export const assemble = (
  fences: readonly Fence[],
  header: string,
  context?: { readonly specifier: string; readonly exports: readonly ContextExport[] }
): Assembly => {
  const compiled = fences.filter(isCheckable)
  const body = compiled.map(unitFor).join("\n\n")
  const extension = compiled.some((fence) => fence.language === "tsx") ? "tsx" : "ts"

  const parsed = ts.createSourceFile(
    `fences.${extension}`,
    body,
    ts.ScriptTarget.ESNext,
    true,
    extension === "tsx" ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  )

  const imports = new Map<string, Imported>()
  const kept: string[] = []
  const values: string[] = []
  const types: string[] = []

  parsed.statements.forEach((statement) => {
    if (ts.isImportDeclaration(statement)) {
      collectImport(statement, imports)
      return
    }

    kept.push(body.slice(statement.getFullStart(), statement.getEnd()).trim())

    // A page that writes `export const stat = …` has already said it. Saying it
    // again at the foot of the file is a redeclaration, not a second export.
    if (isExported(statement)) return

    const declared = declaredBy(statement)
    values.push(...declared.values)
    types.push(...declared.types)
  })

  // Imported names are exported too, and that is deliberate. A page is allowed
  // to show an import on its own — `primitives` ends by pointing at the starter
  // library with one line and nothing else — and `noUnusedLocals` would call
  // that an error when what the reader needs is exactly that line. It costs
  // nothing: an import of something a module does not export is still a failure,
  // which is the thing worth catching.
  imports.forEach((entry) => {
    if (entry.defaultName !== undefined) values.push(entry.defaultName)
    if (entry.namespace !== undefined) values.push(entry.namespace)
    entry.values.forEach((name) => values.push(localName(name)))
    entry.types.forEach((name) => types.push(localName(name)))
  })

  const rest = kept.join("\n\n")
  const used = (name: string): boolean => new RegExp(`\\b${name}\\b`).test(rest)

  const contextNames = context === undefined ? [] : context.exports.filter((entry) => used(entry.name))
  const contextValues = contextNames.filter((entry) => !entry.isType).map((entry) => entry.name)
  const contextTypes = contextNames.filter((entry) => entry.isType).map((entry) => entry.name)

  // The page's own imports first and the story's last, which is the order the
  // rest of this repository writes them in: what a module depends on, then what
  // sits beside it.
  const preamble = [
    renderImports(imports).join("\n"),
    [
      ...(context !== undefined && contextValues.length > 0
        ? [importLine("import", contextValues, context.specifier)]
        : []),
      ...(context !== undefined && contextTypes.length > 0
        ? [importLine("import type", contextTypes, context.specifier)]
        : []),
    ].join("\n"),
  ].filter((part) => part !== "")

  const exported = [
    ...(values.length > 0 ? [`export { ${unique(values).join(", ")} }`] : []),
    ...(types.length > 0 ? [`export type { ${unique(types).join(", ")} }`] : []),
  ]

  const sections = [header, ...preamble, rest, exported.join("\n")].filter((part) => part !== "")

  return { source: `${sections.join("\n\n")}\n`, extension, compiled: compiled.length }
}

/** The exported names a context file offers, read from the file itself. */
export const contextExportsIn = (source: string, fileName: string): readonly ContextExport[] => {
  const parsed = ts.createSourceFile(fileName, source, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS)

  return parsed.statements.flatMap((statement) => {
    // `export { buildElement }` after importing it — how a context file hands a
    // page something the runtime really provides, rather than a stand-in for it.
    if (ts.isExportDeclaration(statement)) {
      const { exportClause, isTypeOnly } = statement

      if (exportClause === undefined || !ts.isNamedExports(exportClause)) return []

      return exportClause.elements.map((element) => ({
        name: element.name.text,
        isType: isTypeOnly || element.isTypeOnly,
      }))
    }

    if (!isExported(statement)) return []

    const declared = declaredBy(statement)

    return [
      ...declared.values.map((name) => ({ name, isType: false })),
      ...declared.types.map((name) => ({ name, isType: true })),
    ]
  })
}
