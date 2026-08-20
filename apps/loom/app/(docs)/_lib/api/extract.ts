import { existsSync, readFileSync } from "node:fs"
import { dirname, join, relative } from "node:path"
import { fileURLToPath } from "node:url"

import ts from "typescript"

import { moduleTitle } from "./groups"
import { apiSlugFor, type ApiEntry, type ApiGroup, type ApiKind, type ApiReference, type ApiSymbol } from "./model"

/**
 * The API reference, read off the package rather than written beside it.
 *
 * The source is the `exports` map in the runtime's `package.json` and the
 * declaration files it points at — which is to say, **exactly what a consumer
 * gets**. Not the source tree, which contains a great deal that is not
 * published; not a list somebody keeps; the doors the package actually opens
 * and what is behind each one.
 *
 * That is the whole argument for generating it. A hand-written reference is
 * wrong the first time someone adds an export and does not remember this file,
 * and nothing goes red when it happens. Here, adding an export changes the
 * generated reference, and a reference that has not been regenerated fails
 * `extract.test.ts`.
 *
 * Read at build time, never in the browser: this module opens files and loads
 * the TypeScript compiler. The pages import the generated JSON instead.
 */

const here = dirname(fileURLToPath(import.meta.url))

/** The repository root, six directories above `app/(docs)/_lib/api`. */
export const packageRoot = join(here, "..", "..", "..", "..", "..", "..")

/** The file the generator writes and the pages read. */
export const GENERATED_FILE = join(here, "reference.generated.json")

/**
 * How the reference is written down.
 *
 * Indented and newline-terminated, so a pull request that changes the public
 * surface shows *which* export moved rather than one very long line going red.
 * The generator and the test that checks it for drift both go through here, so
 * there is one definition of the file's shape rather than two that agree today.
 */
export const serializeReference = (reference: ApiReference): string =>
  `${JSON.stringify(reference, null, 2)}\n`

type ExportsMap = Readonly<Record<string, { readonly types?: string }>>

export type PublishedEntry = {
  readonly specifier: string
  readonly types: string
}

/**
 * The published doors, in the order `package.json` lists them.
 *
 * A subpath without a `types` condition is skipped rather than guessed at: it
 * publishes no declarations, so there is nothing to describe and pretending
 * otherwise would put an empty page in the rail.
 */
export const publishedEntries = (root: string = packageRoot): readonly PublishedEntry[] => {
  const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
    readonly name?: string
    readonly exports?: ExportsMap
  }

  const name = manifest.name ?? ""
  const exports = manifest.exports ?? {}

  return Object.entries(exports).flatMap(([subpath, condition]) => {
    const types = condition.types

    if (types === undefined) return []

    return [{ specifier: subpath === "." ? name : `${name}${subpath.slice(1)}`, types }]
  })
}

/** Past this, a signature stops being something a person reads. */
const SIGNATURE_CAP = 6000

/** A Zod schema's type, which is never the useful half of what it says. */
const ZOD_TYPE = /^(?:z\.)?Zod/

const isFunctionish = (node: ts.TypeNode | undefined): boolean =>
  node !== undefined && (ts.isFunctionTypeNode(node) || ts.isConstructorTypeNode(node))

const declaredTypeNode = (declaration: ts.Declaration): ts.TypeNode | undefined =>
  ts.isVariableDeclaration(declaration) ? declaration.type : undefined

const kindOf = (declaration: ts.Declaration): ApiKind => {
  if (ts.isTypeAliasDeclaration(declaration)) return "type"
  if (ts.isInterfaceDeclaration(declaration)) return "interface"
  if (ts.isClassDeclaration(declaration)) return "class"
  if (ts.isFunctionDeclaration(declaration)) return "function"

  const type = declaredTypeNode(declaration)

  if (type !== undefined && ZOD_TYPE.test(type.getText())) return "schema"
  if (isFunctionish(type)) return "function"

  return "value"
}

/**
 * A schema rendered short: its name, and the kind of schema it is.
 *
 * `z.ZodObject<{ deltaId: z.ZodBranded<…>; … }>` is five kilobytes of the same
 * information the `TreeDelta` type states in a form a person can read. So the
 * type arguments are dropped and an ellipsis says they were there.
 */
const schemaSignature = (name: string, type: ts.TypeNode): string => {
  const head = type.getText().split("<")[0] ?? type.getText()

  return `const ${name}: ${head}${type.getText().includes("<") ? "<…>" : ""}`
}

const LEADING_MODIFIERS = /^(?:export\s+)?(?:declare\s+)?/

const signatureOf = (name: string, declaration: ts.Declaration): string => {
  const type = declaredTypeNode(declaration)

  if (type !== undefined && ZOD_TYPE.test(type.getText())) return schemaSignature(name, type)
  if (ts.isVariableDeclaration(declaration)) return `const ${declaration.getText()}`

  return declaration.getText().replace(LEADING_MODIFIERS, "")
}

/**
 * The first paragraph of a doc comment, as one line of prose.
 *
 * One paragraph rather than all of them, because a reference is a place a
 * reader lands mid-question: the sentence that says what this is belongs on the
 * page, and the six paragraphs of reasoning behind it belong in the source,
 * which is where a reader who wants them is going anyway.
 */
const firstParagraph = (comment: string): string => {
  const trimmed = comment.trim()

  if (trimmed === "") return ""

  return (trimmed.split(/\n\s*\n/)[0] ?? "").replace(/\s+/g, " ").trim()
}

const summaryOf = (symbol: ts.Symbol, checker: ts.TypeChecker): string =>
  firstParagraph(ts.displayPartsToString(symbol.getDocumentationComment(checker)))

/** A doc comment with its fencing taken off: no opening `/**`, no `*` down the side. */
const undecorate = (block: string): string =>
  block
    .replace(/^\/\*\*/, "")
    .replace(/\*\/$/, "")
    .split("\n")
    .map((line) => line.replace(/^\s*\* ?/, "").trimEnd())
    .join("\n")

/** A comment ends, an empty line follows: the mark of a paragraph about the file. */
const DETACHED = /^[ \t]*\r?\n[ \t]*\r?\n/

/**
 * The paragraph a module opens with — read from the module's source, not from
 * its declarations, and this is the one place that is true.
 *
 * Almost every file in the runtime opens with a comment about *itself*,
 * separated from its first export by an empty line. That empty line is the
 * whole of the distinction: with it the comment is the module talking about
 * what it is for, without it the comment belongs to the export beneath it.
 *
 * **Declaration emit drops the empty line**, so by the time a comment reaches
 * `dist/` the distinction is gone and TypeScript reads a file's opening
 * paragraph as documentation for whatever export happens to be first — which is
 * how `TREE_SCHEMA_VERSION` comes to be described as "the persisted document".
 * So the blurb is read here from `src/`, where the convention still exists, and
 * a symbol whose doc comment turns out to *be* that blurb is left without one
 * rather than credited with the module's sentence.
 */
const moduleSummaryFrom = (module: string, root: string): string => {
  const candidates = [join(root, "src", `${module}.ts`), join(root, "src", module, "index.ts")]
  const source = candidates.find((path) => existsSync(path))

  if (source === undefined) return ""

  const text = readFileSync(source, "utf8")
  const start = text.indexOf("/**")
  const end = text.indexOf("*/", start)

  if (start === -1 || end === -1) return ""
  if (!DETACHED.test(text.slice(end + 2))) return ""

  return firstParagraph(undecorate(text.slice(start, end + 2)))
}

const resolveAlias = (symbol: ts.Symbol, checker: ts.TypeChecker): ts.Symbol =>
  (symbol.flags & ts.SymbolFlags.Alias) === 0 ? symbol : checker.getAliasedSymbol(symbol)

/** The declaring file, relative to the published root, with the extension dropped. */
const moduleOf = (declaration: ts.Declaration, typesRoot: string): string =>
  relative(typesRoot, declaration.getSourceFile().fileName)
    .replace(/\.d\.ts$/, "")
    .replace(/\\/g, "/")
    .replace(/\/index$/, "")

type Extracted = ApiSymbol & {
  readonly module: string
  /** Where in its own file it was declared, so a group can keep the author's order. */
  readonly position: number
}

const extractSymbol = (symbol: ts.Symbol, checker: ts.TypeChecker, typesRoot: string): Extracted | undefined => {
  const resolved = resolveAlias(symbol, checker)
  const declaration = resolved.declarations?.[0]

  if (declaration === undefined) return undefined

  const name = symbol.getName()
  const full = signatureOf(name, declaration)
  const truncated = full.length > SIGNATURE_CAP

  return {
    name,
    kind: kindOf(declaration),
    signature: truncated ? `${full.slice(0, SIGNATURE_CAP).trimEnd()}\n…` : full,
    truncated,
    summary: summaryOf(resolved, checker),
    module: moduleOf(declaration, typesRoot),
    position: declaration.getStart(),
  }
}

const groupSymbols = (symbols: readonly Extracted[], root: string): readonly ApiGroup[] => {
  const byModule = new Map<string, Extracted[]>()

  for (const symbol of symbols) {
    const bucket = byModule.get(symbol.module)

    if (bucket === undefined) byModule.set(symbol.module, [symbol])
    else bucket.push(symbol)
  }

  return [...byModule.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([module, bucket]) => {
      const summary = moduleSummaryFrom(module, root)

      return {
        module,
        title: moduleTitle(module),
        summary,
        symbols: bucket
          .sort((a, b) => a.position - b.position)
          .map((symbol) => ({
            name: symbol.name,
            kind: symbol.kind,
            signature: symbol.signature,
            truncated: symbol.truncated,
            summary: symbol.summary === summary ? "" : symbol.summary,
          })),
      }
    })
}

/**
 * Build the whole reference.
 *
 * Every declaration file is a root of one program, so a type shared by two
 * entry points is read once and says the same thing on both pages.
 */
export const extractReference = (root: string = packageRoot): ApiReference => {
  const entries = publishedEntries(root)
  const files = entries.map((entry) => join(root, entry.types))

  const program = ts.createProgram(files, {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    skipLibCheck: true,
    noEmit: true,
  })

  const checker = program.getTypeChecker()
  const typesRoot = join(root, "dist")

  const built: ApiEntry[] = entries.map((entry) => {
    const file = program.getSourceFile(join(root, entry.types))

    if (file === undefined) {
      throw new Error(
        `loom: ${entry.specifier} points at ${entry.types}, which is not there — build the runtime first`
      )
    }

    const moduleSymbol = checker.getSymbolAtLocation(file)

    if (moduleSymbol === undefined) {
      throw new Error(`loom: ${entry.types} declares no module, so ${entry.specifier} exports nothing`)
    }

    const symbols = checker
      .getExportsOfModule(moduleSymbol)
      .flatMap((symbol) => {
        const extracted = extractSymbol(symbol, checker, typesRoot)

        return extracted === undefined ? [] : [extracted]
      })

    return {
      specifier: entry.specifier,
      slug: apiSlugFor(entry.specifier),
      types: entry.types,
      groups: groupSymbols(symbols, root),
    }
  })

  return { entries: built }
}
