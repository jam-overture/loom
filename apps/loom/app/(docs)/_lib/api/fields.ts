import { identifiersIn, publishedNames } from "./mentions"
import { apiEntries } from "./reference"

/**
 * **The names this package publishes *inside* a declaration, rather than as a
 * door.**
 *
 * `TreeDelta` is a door: it is an export, it has a page, and a reader who meets
 * it has somewhere to go. `baseRevision` is not. It is a line inside
 * `TreeDelta`, it has no page, and a reader who meets it in the first sentence
 * of a page has met a noun they cannot look up.
 *
 * The brief that governs this surface names three things in its example of the
 * failure — *a page that opens with `TreeDelta`, `baseRevision` and
 * `disposition` has lost the reader before it has said what any of them are
 * for.* `plain.ts` has held that rule since 31 October and **it caught one of
 * the three**, because what it reads is the set of published export names and
 * only `TreeDelta` is one. This module is the other two.
 *
 * ## Why this is not simply "the field names"
 *
 * Because most field names are ordinary English and a rule over all of them
 * would be a rule somebody turns off. Measured on 2 November, against the
 * reference as this branch has it — **the figures move whenever another lane
 * publishes, which is why not one of them is asserted anywhere**:
 *
 * | | how many |
 * | --- | --- |
 * | names the package publishes | 1,860 |
 * | names declared inside a published type, that are not exports | 826 |
 * | of those, a single short lowercase word | 429 |
 *
 * `code`, `data`, `body`, `name`, `kind`, `text`, `page`, `error`, `count`,
 * `theme`, `summary` and `title` are all in that set, and all of them are words
 * a plain-language opening legitimately uses. The published-export set was safe
 * to match on for a reason stated the day it was written — *an export name is
 * almost never ordinary English.* The field set is not safe for the same
 * reason, and the 31 October entry that filed this gap said the widening would
 * need a measurement rather than an argument.
 *
 * ## The fact that makes a subset safe
 *
 * **No English word is camelCase.** A name with a capital letter after a
 * lowercase one cannot be a word a sentence was reaching for — it is jargon by
 * construction, not jargon in somebody's opinion. That is the same *kind* of
 * claim as the one holding the export set up, and it is the shape this lane has
 * twice written down as the one to prefer: **an exception stated as a fact is
 * stronger than an exception stated as a list.**
 *
 * So what is read here is the camelCase half: **294 names**, of which 20 are
 * printed somewhere in this site's written prose today — `policyId` eight
 * times, `treeId` and `idFactory` seven each, and **`baseRevision` three** —
 * and **none of them in a summary, an opening or a heading.** The vocabulary is
 * live on these pages. It has simply never been handed to a reader who had not
 * met it, which is the same discipline `plain.ts` found over the export names
 * and the same absence of anything holding it.
 *
 * It also sidesteps a false positive the whole field set would have walked
 * into, and this is measured rather than hoped for: `loom` and `primitives` are
 * both field names on something this package publishes, so a rule over the
 * whole set fires on a summary that writes `` `@jam-overture/loom/primitives` ``
 * in backticks — four of the eleven hits the wide version produces are a
 * package specifier being read as prose. **No segment of any of the seventeen
 * specifiers is camelCase**, so the narrow rule cannot make that mistake.
 *
 * ## What stays out of reach, and it is half the brief's example
 *
 * **`disposition` is one lowercase word, so nothing here catches it.** It is a
 * field on `RuntimeEvent`, `RepairRequest`, `CompositionOutcome` and
 * `WriteOutcome`, it is exactly the unexplained noun the brief is complaining
 * about, and the rule that would catch it is the rule that also flags *body*
 * and *summary*. That is the honest state of this check: the brief's example
 * names three things and this site can now see two of them.
 *
 * The missing third is a per-name judgement, and a per-name judgement is a
 * list. If it is ever worth having, the measurement that would justify it is
 * how often a single-word field appears in an orientation — zero today, which
 * is why the cost of leaving it is nothing.
 */

/**
 * A name declared on its own line inside a declaration.
 *
 * Read off the published signature as text, one line at a time, the way
 * `ApiCut` counts lines: *a member count means tracking brace depth through a
 * string this module otherwise treats as text — a parser where a line count
 * will do.* The same economy, and the same stated cost.
 *
 * **The cost is that a parameter name counts too.** A multi-line function type
 * declares `(\n  tree: LoomTree,\n  options: RenderOptions\n) => void`, and
 * those two lines look exactly like members. This does not try to tell them
 * apart, and the reason is that the reader does not need it to: somebody who
 * meets `idFactory` in the first sentence of a page is equally lost whether it
 * is a field of `RenderDependencies` or an argument to a function, and the
 * remedy — *say what it is for before you name it* — is the same either way.
 */
export const declaredNamesIn = (signature: string): readonly string[] =>
  signature
    .split("\n")
    .flatMap((line) => {
      const declared = /^\s+(?:readonly\s+)?([A-Za-z_$][A-Za-z0-9_$]*)\??\s*[:(]/.exec(line)

      return declared === null ? [] : [declared[1] ?? ""]
    })

/**
 * Whether a name cannot be a word a sentence was reaching for.
 *
 * A capital letter after a lowercase one. That is the whole rule, and it is a
 * fact about the spelling rather than an opinion about the word — which is the
 * only reason a check over 294 names is safe to point at thirty-five pages
 * nobody is going to re-read.
 */
export const isJargon = (name: string): boolean => /^[a-z][a-z0-9]*[A-Z]/.test(name)

/**
 * The kinds of declaration whose insides are a vocabulary.
 *
 * A `type`, an `interface` and a `class` describe a shape, and the names in
 * them are names a reader will meet. A `value`'s insides are its **contents**,
 * which is a different thing wearing the same syntax — and reading them is how
 * another package's internals end up in this site's rules. `LIBRARY_CLASS` is a
 * map of class names, so its keys are `railBody` and `coverLink`; a published
 * Drizzle column drags in `isAutoincrement`, `driverParam` and `notNull`.
 * Twenty-eight camelCase names come from that half and not one of them is a
 * word this documentation would ever write.
 */
const HOLDS_NAMES: ReadonlySet<string> = new Set(["type", "interface", "class"])

/**
 * The declarations a reader is only shown part of, so the gap is a number.
 *
 * `SIGNATURE_CAP` cuts a declaration that ran past 6,000 characters, and the
 * names below the cut are not in this file to be read. Published types are
 * cut — eleven of them on 2 November, hiding **514 lines that are not on the
 * page**, of which `RenderDiagnostic` alone is 162. Whatever those lines
 * declare is outside what this check can see, which is a limit worth a number
 * rather than a sentence: a name this module has never heard of is a name it
 * will not flag.
 */
export const cutDeclarations: readonly { readonly name: string; readonly hidden: number }[] =
  apiEntries.flatMap((entry) =>
    entry.groups.flatMap((group) =>
      group.symbols.flatMap((symbol) =>
        symbol.cut === undefined || !HOLDS_NAMES.has(symbol.kind)
          ? []
          : [{ name: symbol.name, hidden: symbol.cut.whole - symbol.cut.shown }]
      )
    )
  )

/**
 * Every camelCase name the published types declare inside themselves, less the
 * ones that are exports in their own right.
 *
 * The subtraction matters: `publishedNames` already covers those, `plain.ts`
 * already reports them as exports, and a name counted twice would be printed
 * twice in the one sentence an author reads.
 */
export const publishedFields: ReadonlySet<string> = new Set(
  apiEntries
    .flatMap((entry) =>
      entry.groups.flatMap((group) =>
        group.symbols.flatMap((symbol) =>
          HOLDS_NAMES.has(symbol.kind) ? declaredNamesIn(symbol.signature) : []
        )
      )
    )
    .filter((name) => isJargon(name) && !publishedNames.has(name))
)

/**
 * The published fields a piece of code holds — a fenced block, or one span
 * between backticks.
 *
 * `identifiersIn` is `api/mentions.ts`'s, deliberately, so this rule and the
 * export rule cannot come to disagree about what an identifier is. The case
 * that makes it load-bearing is the dot: `delta.baseRevision` shows a reader
 * where the name lives and is the one spelling neither rule should fire on,
 * exactly as `result.ok` is not the exported `ok`.
 */
export const publishedFieldsIn = (code: string): readonly string[] =>
  identifiersIn(code).filter((name) => publishedFields.has(name))
