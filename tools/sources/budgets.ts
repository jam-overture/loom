import { codeOnly } from "./code.js"

/**
 * The names an import statement brings in, read off blanked code.
 *
 * Only the clause is needed, and the specifier is a string, so it has already
 * been blanked by the time this reads the statement. That is not a loss: the
 * name below is exported from exactly one module in this repository, so
 * importing it says which module it came from.
 */
const IMPORT_CLAUSE = /import\s*\{([^}]*)\}\s*from/gu

const imported = (code: string): readonly string[] =>
  [...code.matchAll(IMPORT_CLAUSE)].flatMap((match) =>
    (match[1] ?? "").split(",").map((name) => name.trim())
  )

/**
 * Whether a suite reads every source in this repository through `files.ts`.
 *
 * **Keyed on the import rather than on the name**, because the name is not
 * reserved. `apps/loom/app/(portal)/every-screen.test.ts` declares an
 * `everySource` of its own that walks one route group and reads it while the
 * suite is collected rather than inside a test — another lane's file, and
 * outside what any test timeout governs. The import is what says *this suite
 * reads all of them, through the shared instrument*, which is the only thing
 * the budget is about.
 *
 * **Comments and strings are blanked first**, because the docblocks in this
 * directory quote their own imports and a quotation is not an import.
 */
export const sweepsEverySource = (source: string): boolean =>
  imported(codeOnly(source)).includes("everySource")

/**
 * Whether such a suite names no budget for the sweep.
 *
 * **This is the rule 0375 established, turned into something a suite cannot
 * quietly fall outside of.** Its budget — `sweepBudget(sources)`, twenty
 * milliseconds a source over a floor — replaced the fixed 5,000 ms default on
 * work that is the whole repository. Four of the five sweeps under this
 * directory took it and `mocks.test.ts` did not, so the one that did not took
 * the merge gate red under load on a branch measured to cost it half a
 * millisecond. That was the third instance of one fault in two weeks, and all
 * three were a whole file that named no budget at all.
 *
 * **The rule is per file, which is narrower than the fault it names.** A suite
 * that budgets one sweep and forgets a second one added later still passes
 * here. That half is closed by construction instead: the budget goes on the
 * `describe` that holds the sweeps, where Vitest hands it to every test inside,
 * so the next sweep written into one of those blocks inherits it rather than
 * having to ask for it.
 */
export const sweepsWithoutBudget = (source: string): boolean =>
  sweepsEverySource(source) && !codeOnly(source).includes("sweepBudget")
