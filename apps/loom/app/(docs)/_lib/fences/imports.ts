import ts from "typescript"

import type { Fence } from "./model"

/**
 * The doors a block shows a reader, read as code.
 *
 * Two checks on this site ask questions about a block's import lines and they
 * ask them of the same text: `lent.ts` wants *does this block show the import
 * that binds `gatePolicySchema`*, and `landing.ts` wants *which doors has a
 * reader been shown by the time they reach this block, from where they landed*.
 * Both were about to read the lines themselves, which is how four scanners came
 * to disagree about where a fence is (`spans.ts`).
 *
 * **The rule worth having in one place is that an import is what it binds, not
 * what it says.** `import { gatePolicySchema as schema }` is an import of
 * `schema`; a namespace import binds one name for a whole door; a default
 * import binds whatever the block chose to call it; and a block that merely
 * mentions a name inside a string is not showing anybody anything. A regular
 * expression gets every one of those wrong, and gets the last one wrong
 * silently — which is the direction that matters, because it would mark a
 * reader as served when they are not.
 */

/**
 * Which of the three shapes an import line has.
 *
 * Carried because a fault sentence is a line a reader could paste, and the
 * three are not interchangeable: `import postgres from "postgres"` is not
 * `import { postgres } from "postgres"`, and a check that printed the second
 * would be telling somebody to write a line that does not work.
 */
export type ImportForm = "named" | "default" | "namespace"

export type FenceImport = {
  /** The name the line binds, which is the name the block below it can call. */
  readonly name: string
  /** The door, exactly as the block writes it — the spelling a reader would type. */
  readonly specifier: string
  /** Written `import type`, which is how a reader has to write it back. */
  readonly isType: boolean
  readonly form: ImportForm
}

/** The line that would bind a name, written as a reader has to write it. */
export const importLineFor = (door: FenceImport): string => {
  const how = door.isType ? "import type" : "import"
  const bound =
    door.form === "named" ? `{ ${door.name} }` : door.form === "namespace" ? `* as ${door.name}` : door.name

  return `${how} ${bound} from "${door.specifier}"`
}

const parse = (code: string, language: Fence["language"]): ts.SourceFile =>
  ts.createSourceFile(
    `fence.${language}`,
    code,
    ts.ScriptTarget.ESNext,
    true,
    language === "tsx" ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  )

/** Every name a block's import lines bind, each with the door it came through. */
export const importsIn = (code: string, language: Fence["language"]): readonly FenceImport[] =>
  parse(code, language).statements.flatMap((statement): readonly FenceImport[] => {
    if (!ts.isImportDeclaration(statement)) return []
    if (!ts.isStringLiteral(statement.moduleSpecifier)) return []

    const clause = statement.importClause

    if (clause === undefined) return []

    const specifier = statement.moduleSpecifier.text
    const typeOnly = clause.isTypeOnly

    const bound = (name: string, isType: boolean, form: ImportForm): FenceImport => ({
      name,
      specifier,
      isType,
      form,
    })

    const defaulted = clause.name === undefined ? [] : [bound(clause.name.text, typeOnly, "default")]
    const bindings = clause.namedBindings

    if (bindings === undefined) return defaulted
    if (ts.isNamespaceImport(bindings)) {
      return [...defaulted, bound(bindings.name.text, typeOnly, "namespace")]
    }

    return [
      ...defaulted,
      ...bindings.elements.map((element) =>
        bound(element.name.text, typeOnly || element.isTypeOnly, "named")
      ),
    ]
  })

/** The names a block has put in scope for a reader copying it. */
export const namesBoundByImportsIn = (code: string, language: Fence["language"]): ReadonlySet<string> =>
  new Set(importsIn(code, language).map((entry) => entry.name))

/**
 * Whether a block shows the reader the import that binds a name.
 *
 * The question `lent.ts` asks of every name a context file lends, and the one
 * `landing.ts` asks of every door a page opens.
 */
export const importsBinding = (name: string, code: string, language: Fence["language"]): boolean =>
  namesBoundByImportsIn(code, language).has(name)
