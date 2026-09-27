import { existsSync, readFileSync } from "node:fs"
import { dirname, join, relative } from "node:path"
import { fileURLToPath } from "node:url"

import ts from "typescript"

import { publishedSpecifier } from "../packages"

import { moduleTitle } from "./groups"
import { apiSlugFor, type ApiGroup, type ApiKind, type ApiReference, type ApiSymbol } from "./model"
import { narrowerDoorsBySpecifier, type DoorFacts } from "./narrower"
import { standingBySpecifier } from "./standing"
import { doorReach, packagesNamedIn, peersOf, requirementsFor, type Peers, type ReadFile } from "./requires"

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

type ExportsMap = Readonly<Record<string, { readonly types?: string; readonly default?: string }>>

export type PublishedEntry = {
  readonly specifier: string
  readonly types: string
  /**
   * The JavaScript behind the same door, where the door has any.
   *
   * The declarations say what a consumer's *type-checker* sees. This is what
   * their *program* sees, and they are two files that can disagree. Nothing in
   * the reference is read from here — it is read from `types`, which is right,
   * because the reference describes a surface and not an implementation. It is
   * carried so that something can hold the two against each other, which is
   * `offered.ts`.
   *
   * `undefined` when the subpath publishes declarations and no implementation.
   * That is a door with nothing behind it, and it is a fault rather than a
   * shape to design around — so it is left as the absence it is and named
   * where the two files are compared.
   */
  readonly runtime: string | undefined
}

/**
 * The published doors, in the order `package.json` lists them.
 *
 * A subpath without a `types` condition is skipped rather than guessed at: it
 * publishes no declarations, so there is nothing to describe and pretending
 * otherwise would put an empty page in the rail.
 */
/** The package's own manifest, read once and asked two different questions. */
const manifestOf = (root: string): PackageManifest =>
  JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as PackageManifest

type PackageManifest = {
  readonly name?: string
  readonly exports?: ExportsMap
  readonly peerDependencies?: Readonly<Record<string, string>>
  readonly peerDependenciesMeta?: Readonly<Record<string, { readonly optional?: boolean }>>
}

/** What the package expects its host to install, for the band that says so. */
export const publishedPeers = (root: string = packageRoot): Peers => peersOf(manifestOf(root))

/**
 * Reading a built file, for the walk that works out what a door loads.
 *
 * Absence is `undefined` rather than a throw, because one caller treats a
 * missing file as a fault and the other treats it as an answer, and which of
 * those it is is not this function's to decide.
 */
export const builtFileReader: ReadFile = (path: string): string | undefined =>
  existsSync(path) ? readFileSync(path, "utf8") : undefined

export const publishedEntries = (root: string = packageRoot): readonly PublishedEntry[] => {
  const manifest = manifestOf(root)

  const name = manifest.name ?? ""
  const exports = manifest.exports ?? {}

  return Object.entries(exports).flatMap(([subpath, condition]) => {
    const types = condition.types

    if (types === undefined) return []

    return [
      {
        /*
         * The name a reader could install, which is not always the name this
         * workspace resolves. The starter library is reached here at
         * `@jam-overture/loom/primitives` and ships as
         * `@jam-overture/loom-primitives`; the declarations behind the two are
         * one file, so the reference is read from the door the workspace has and
         * titled with the door a reader has. `_lib/packages.ts` carries why.
         */
        specifier: publishedSpecifier(subpath === "." ? name : `${name}${subpath.slice(1)}`),
        types,
        runtime: condition.default,
      },
    ]
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

/** A doc comment written inside a declaration, against the member it describes. */
const COMMENT_IN_CODE = /\/\*\*[\s\S]*?\*\//g

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

/** A decision record's number, as it is written everywhere in this repository. */
export const DECISION_NUMBER = /\b0\d{3}\b/

/**
 * A citation of a decision record, in the two shapes the runtime writes them.
 *
 * A parenthetical — `(0014)`, `(0053, 0055)`, `(see 0012)` — and a trailing
 * attribution clause — `, inherited from 0009`. Both are footnotes: lifting
 * them out leaves the sentence saying exactly what it said before.
 */
const CITATION =
  /(?:\s*\((?:see\s+)?0\d{3}(?:\s*(?:,|and)\s*0\d{3})*\))|(?:,\s+(?:inherited\s+from|per|following|see)\s+0\d{3}(?:\s*(?:,|and)\s*0\d{3})*)/g

/**
 * A doc comment as a stranger can read it — or nothing at all.
 *
 * **No decision-record number may reach a page.** The maintainer's rule, and it
 * is right: `(0007)` is a footnote to a document a reader of this site has
 * never seen and cannot open from here, so it reads as a defect in the sentence
 * rather than as a reference.
 *
 * Two things happen here and the second is the interesting one.
 *
 * A **citation** is a footnote, so it is lifted out: "the prop-validation seam,
 * inherited from 0009" says the same thing without its last four words, and
 * that is the shape most of them take.
 *
 * When the number is **part of the grammar** — "0049's three theme ids", "the
 * bar 0074 set" — there is nothing to lift. The sentence is written to somebody
 * who has read that record, and no rule here can turn it into one written to
 * somebody who has not. So the summary is **withheld**: the export renders with
 * its module's paragraph and its signature, which is less than it deserves and
 * is at least all true. Rewriting it here would mean this page paraphrasing the
 * package, which is the one thing a generated reference must never do — the
 * whole reason it can be trusted is that the words are the package's own.
 *
 * Withholding is deliberately self-retiring. Reword the comment in `src/` so it
 * reads without the number, and the sentence appears on the site at the next
 * regeneration with nothing here to update. The comments that need it are
 * listed in `FINDINGS.md` for the lanes that own them.
 */
/**
 * The same rule, applied inside a signature.
 *
 * A union or an object type carries doc comments against its own members, and
 * those cite records exactly as prose does — a reader meets `(0038)` in a code
 * block instead of in a sentence, which is no better.
 *
 * The **code is never touched**, only the comments in it: a citation is lifted
 * out, and a comment whose grammar needs the number is dropped whole, leaving
 * the member it described. A signature is the one thing on this page that must
 * be exactly what the package declares, so when the choice is between an
 * annotated declaration a reader cannot follow and a bare one they can, it is
 * the annotation that goes.
 */
export const readerFacingSignature = (signature: string): string => {
  const cleaned = signature.replace(COMMENT_IN_CODE, (comment) => {
    const cited = comment.replace(CITATION, "").replace(/\s+([.,;:])/g, "$1")

    return DECISION_NUMBER.test(cited) ? "" : cited
  })

  if (cleaned === signature) return signature

  return cleaned
    .split("\n")
    /** A line that held nothing but a dropped comment is not left behind as blank. */
    .filter((line) => line.trim() !== "")
    /** A comment lifted from mid-line leaves two spaces where there was one. */
    .map((line) => line.replace(/(\S) {2,}/g, "$1 ").trimEnd())
    .join("\n")
}

export const readerFacing = (summary: string): string => {
  /*
   * Closing punctuation only, and deliberately not the em dash: lifting
   * " (0014)" out of "object (0014). This" leaves " ." to tidy, while this
   * codebase writes a spaced " — " on purpose and a rule that tightened it
   * would rewrite every summary on the site, citation or not.
   */
  const cited = summary.replace(CITATION, "").replace(/\s+([.,;:])/g, "$1").trim()

  return DECISION_NUMBER.test(cited) ? "" : cited
}

const summaryOf = (symbol: ts.Symbol, checker: ts.TypeChecker): string =>
  readerFacing(firstParagraph(ts.displayPartsToString(symbol.getDocumentationComment(checker))))

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

  return readerFacing(firstParagraph(undecorate(text.slice(start, end + 2))))
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
    signature: readerFacingSignature(truncated ? `${full.slice(0, SIGNATURE_CAP).trimEnd()}\n…` : full),
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
  const peers = publishedPeers(root)

  const doors: DoorFacts[] = entries.map((entry) => {
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

    const reach = doorReach(entry, builtFileReader, root)
    const declared = packagesNamedIn(join(root, entry.types), builtFileReader)

    return {
      entry: {
        specifier: entry.specifier,
        slug: apiSlugFor(entry.specifier),
        types: entry.types,
        requires: requirementsFor(peers, reach.packages, declared),
        files: reach.files,
        /*
         * Filled on the second pass below. Which door is the narrow one is not
         * a fact about a door — it is a fact about a door and every other door
         * in the package, and the first of the sixteen cannot know it.
         */
        narrower: [],
        /*
         * And this one, for the same reason twice over: how much of the
         * package is behind this door is a fact about all sixteen of them.
         * `packageNames: 0` is the shape an unfilled pass would leave, and
         * `reference.ts` refuses a file carrying it rather than printing it.
         */
        standing: { packageNames: 0, otherDoors: 0, doorsSharingNothing: 0, widest: false, sharedWith: [], collisions: [] },
        groups: groupSymbols(symbols, root),
      },
      packages: reach.packages,
    }
  })

  const narrower = narrowerDoorsBySpecifier(doors)
  const standing = standingBySpecifier(doors.map(({ entry }) => entry))

  return {
    entries: doors.map(({ entry }) => {
      const stood = standing.get(entry.specifier)

      if (stood === undefined) throw new Error(`loom: ${entry.specifier} was measured against no other door`)

      return { ...entry, narrower: narrower.get(entry.specifier) ?? [], standing: stood }
    }),
  }
}
