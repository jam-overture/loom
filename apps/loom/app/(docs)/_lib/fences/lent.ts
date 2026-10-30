import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import ts from "typescript"

import { calls } from "./calls"
import { compiledBaseName, CONTEXT_DIR } from "./compiled"
import { fencesOnPage, pagesWithFences } from "./extract"
import { importsBinding } from "./imports"
import { canCarryAnImport } from "./model"

/**
 * The names a page calls and never shows a reader how to get hold of.
 *
 * A context file lends a page the things its story assumes — a `session`, a
 * `db`, an `ids` factory the page made two sections ago. Those are the
 * narrator's, a reader is not expected to have them, and `../context/README.md`
 * says so. It also allows a second kind of lending, for a reason that was good:
 * a snippet must never be made to compile against an invented function, so a
 * context file that needs a name the runtime **really** provides has to import
 * the real one.
 *
 * **That rule asked whether the name was real. It never asked whether the
 * reader could get it.** So `what-the-gate-decides` — the last stop on the
 * arrival route, whose promise to a reader is `gatePolicySchema` — showed two
 * blocks calling `gatePolicySchema.parse(…)` with the import sitting in a file
 * no reader will ever see. Copy either block and you get
 * `gatePolicySchema is not defined`. Five names on three pages were in that
 * state, and the context files said so out loud in their own docblocks:
 * *"the page does not import it"*, *"the page introduces it in prose rather
 * than in an import"*. Nothing read those sentences as a fault, because the
 * block compiled — against a module the page is assembled with and a reader is
 * not.
 *
 * It is the 28 October defect one layer in. That day the install command was
 * missing a package the route walks a reader into importing; the package is
 * installed now and **the import itself was still missing**. Same shape, same
 * cause: a check that resolves names cannot see a fault whose whole content is
 * *a reader's file is not this one*.
 *
 * ## The rule
 *
 * **A name the runtime provides is the reader's to import, so the page shows
 * the import. A name the story lends is one the reader does not need, so the
 * context file declares it.**
 *
 * The one exception is a fact rather than a sentence: **you cannot write an
 * `import` in the middle of an object literal.** An `object-body` fence is, by
 * its own declaration, a fragment from inside a value, so a runtime name called
 * *only* from one may still be lent. {@link lentFaults} checks that excuse by
 * looking at the fences rather than taking the file's word for it, which is the
 * move `arrival/route.ts` makes for the pages the route walks past.
 *
 * **The excuse was one kind too wide for a day, and `function-body` was the
 * kind.** It read as the same fact — a fragment cannot carry an import — and it
 * is not: `program.ts` has lifted the imports out of a function body since it
 * was written, *"because a reader who is shown a handler wants to know where
 * `parseTree` came from"*, and the first block of *Rendering a tree* has opened
 * with three of them since the page existed. So the one name the excuse was
 * covering — `renderRequest`, on the arrival route's third stop — was not
 * excused by a fact at all. The repair is a line in the page, and it cost no
 * machinery, because the machinery was already there.
 *
 * A `sketch` is left out of the demand for the reason the word exists: it
 * carries an ellipsis and has already told the reader it is incomplete.
 */

export type LentName = {
  readonly section: string
  readonly page: string
  /** The name as the context file re-exports it. */
  readonly name: string
  /** The door it really comes from, as the context file writes it. */
  readonly specifier: string
  /** A type-only re-export, which a reader writes as `import type`. */
  readonly isType: boolean
  /**
   * The 1-based reading position of the first fence that calls it, and whether
   * that fence is one an import could have gone in. `undefined` when no fence
   * on the page calls it at all — which is scenery, and `compiled.test.ts`
   * already refuses it under *offers nothing its page does not use*.
   */
  readonly calledAt: number | undefined
  /** The first fence that calls it **and could have carried the import**. */
  readonly demandedAt: number | undefined
  /** The first fence at or before {@link demandedAt} that shows the import. */
  readonly shownAt: number | undefined
}

/**
 * Every `export … from` in a context file, which is every name it lends that is
 * not the story's own.
 *
 * Read with the compiler rather than a regular expression because the two forms
 * differ by a keyword in the middle (`export type { x } from`) and the name a
 * reader writes is the one after `as`.
 */
export const reExportsIn = (
  source: string,
  fileName: string
): readonly { readonly name: string; readonly specifier: string; readonly isType: boolean }[] => {
  const parsed = ts.createSourceFile(fileName, source, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS)

  return parsed.statements.flatMap((statement) => {
    if (!ts.isExportDeclaration(statement) || statement.moduleSpecifier === undefined) return []
    if (!ts.isStringLiteral(statement.moduleSpecifier)) return []

    const clause = statement.exportClause
    const specifier = statement.moduleSpecifier.text

    if (clause === undefined || !ts.isNamedExports(clause)) return []

    return clause.elements.map((element) => ({
      name: element.name.text,
      specifier,
      isType: statement.isTypeOnly || element.isTypeOnly,
    }))
  })
}

const contextSourceFor = (section: string, page: string): { source: string; fileName: string } | undefined => {
  const fileName = `${compiledBaseName(section, page)}.ts`
  const path = join(CONTEXT_DIR, fileName)

  return existsSync(path) ? { source: readFileSync(path, "utf8"), fileName } : undefined
}

/** What one page lends, resolved against the blocks on it. */
export const lentNamesOn = (section: string, page: string): readonly LentName[] => {
  const context = contextSourceFor(section, page)

  if (context === undefined) return []

  const fences = fencesOnPage(section, page)

  return reExportsIn(context.source, context.fileName).map((entry): LentName => {
    const callers = fences.flatMap((fence, at) =>
      calls(entry.name, fence.code, fence.language) && !importsBinding(entry.name, fence.code, fence.language)
        ? [{ fence, position: at + 1 }]
        : []
    )

    const demanded = callers.find(({ fence }) => canCarryAnImport(fence))

    const shown = fences.flatMap((fence, at) =>
      importsBinding(entry.name, fence.code, fence.language) && canCarryAnImport(fence) ? [at + 1] : []
    )

    return {
      section,
      page,
      name: entry.name,
      specifier: entry.specifier,
      isType: entry.isType,
      calledAt: callers[0]?.position,
      demandedAt: demanded?.position,
      shownAt: shown.find((position) => demanded === undefined || position <= demanded.position),
    }
  })
}

/** Everything every page on this site lends, in the site's own reading order. */
export const lentNames = (): readonly LentName[] =>
  pagesWithFences().flatMap((page) => lentNamesOn(page.sectionSlug, page.pageSlug))

/**
 * The sentence a reader would have hit, said to whoever broke it.
 *
 * One fault, and it names the block rather than the page: *this is where the
 * reader is standing when the name runs out.*
 */
export const lentFaults = (names: readonly LentName[]): readonly string[] =>
  names.flatMap((lent) => {
    if (lent.demandedAt === undefined || lent.shownAt !== undefined) return []

    // A type and a value break differently and a message that said one thing
    // for both would be wrong half the time: a missing value is a name at run
    // time, a missing type is a file that will not compile.
    const how = lent.isType ? "import type" : "import"
    const breaks = lent.isType
      ? `paste it into your own file and it does not compile`
      : `copy it and you get "${lent.name} is not defined"`

    return [
      `/docs/${lent.section}/${lent.page} shows a reader block ${lent.demandedAt} using ${lent.name}, ` +
        `and no block on the page before it carries ${how} { ${lent.name} } from "${lent.specifier}" — ` +
        breaks,
    ]
  })

/**
 * The names still lent, each with the fact that excuses it.
 *
 * Not a count and not a list anybody maintains: it is derived, so a sixth
 * arriving tomorrow appears here on its own and a fault arriving with it is
 * `lentFaults`'s. `../context/README.md` prints the same two rows in prose for
 * a reader of the directory.
 */
export const lentWithoutFault = (names: readonly LentName[]): readonly LentName[] =>
  names.filter((lent) => lent.calledAt !== undefined && lent.demandedAt === undefined)

export const LENT_NAMES: readonly LentName[] = lentNames()
