/**
 * The plain-language rule, as one list, for the tests that enforce it.
 *
 * ## Why it exists
 *
 * > **Plain language is the default. The technical record is one click away.
 * > Nothing is ever removed.**
 *
 * The sharpest way this lane has found to hold that is not taste but a
 * property: *no sentence a screen shows unasked contains a word from the
 * runtime's vocabulary, and the technical reading beside it does*. It catches
 * the failure nobody notices, which is a rewrite that leaves one runtime word
 * behind.
 *
 * By 11 September that property was written out **four times** — a regex in
 * `_lib/audit-view.test.ts`, a second in `_lib/checkup-basis.test.ts`, a
 * hand-rolled word list in `_lib/effect-view.test.ts` using `toContain`, and a
 * fourth on a branch. Two copies of one rule is how a rule stops being one: a
 * word added to one list and not the others means the screens disagree about
 * what plain language is and no test fails. It was filed as a finding on
 * 2 September with exactly this module as the recommendation.
 *
 * ## Where it lives, and why not in `_lib/`
 *
 * It is a test concern, so it does not belong beside the production tables in
 * `_lib/vocabulary.ts` — a screen must never be able to import the list of
 * words it is being judged against and route around it. `apps/loom/test/` would
 * put it outside this route group, where six other lanes would be importing a
 * file this lane owns. `app/(portal)/_test/` is inside the lane and outside the
 * production graph, which is both of those problems answered.
 *
 * ## Using it
 *
 * `runtimeWordsIn` rather than a bare regex, because the failure message is the
 * point: `expect(runtimeWordsIn(sentence)).toEqual([])` names the word that
 * broke the rule, where `not.toMatch` only says that something did.
 */

/**
 * The runtime's own vocabulary, as the portal has to avoid saying it unasked.
 *
 * Every entry is a word the runtime and the decision records use precisely and
 * a reader has no reason to know. Inflections are listed rather than stemmed:
 * a suffix rule would catch `seeded` and `logged` and would also catch
 * `treatment`, and a list somebody has to read is worth more than a clever
 * pattern nobody trusts.
 */
export const RUNTIME_WORDS: readonly string[] = [
  "delta",
  "deltas",
  "fold",
  "folded",
  "folding",
  "folds",
  "gate",
  "id",
  "ids",
  "index",
  "insert",
  "log",
  "logs",
  "node",
  "nodes",
  "prop",
  "props",
  "reconfigure",
  "revision",
  "revisions",
  "schema",
  "seed",
  "seeds",
  "snapshot",
  "snapshots",
  "traversal",
  "tree",
  "trees",
]

/**
 * Every runtime word a sentence uses, in the order the list holds them.
 *
 * Bounded on both sides, which is what lets a sentence say *proposal* without
 * being accused of saying `prop`, and *treatment* without saying `tree`. The
 * comparison is case-insensitive because a word at the start of a sentence is
 * the same word.
 *
 * `except` is for the screens where a runtime word has genuinely become the
 * portal's own. `/portal/history` numbers its rows *revision 4* and the id is
 * on the surface by the 22 August rule, so a blanket ban would be the rule
 * enforcing the opposite of what it is for. It is deliberately a per-assertion
 * argument rather than a second list: an exemption that has to be written at
 * the point of use is one a reviewer sees.
 */
export const runtimeWordsIn = (
  sentence: string,
  except: readonly string[] = []
): readonly string[] =>
  RUNTIME_WORDS.filter(
    (word) =>
      !except.includes(word) && new RegExp(`(?<![A-Za-z])${word}(?![A-Za-z])`, "iu").test(sentence)
  )

/** The same question as a predicate, for a guard that asserts the record *does* use them. */
export const readsPlainly = (sentence: string, except: readonly string[] = []): boolean =>
  runtimeWordsIn(sentence, except).length === 0
