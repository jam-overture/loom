import type { AskStanding, WillSay } from "./what-it-will-say"

/**
 * How the asks on the panel divide, and the one sentence that says so.
 *
 * ## The sentence this replaces, and why it had to go
 *
 * The arrival screen's claim was:
 *
 * > Loom weighs every ask before it lands, and writes down what it did.
 *
 * Every word true, and it is true of **every ask ever made**, which is why it
 * proved nothing about any of them. It is the same defect the hedge above the
 * button had on 1 October and was replaced for: a statement a visitor has no
 * way to check, three inches above five buttons that could have checked it.
 *
 * What is here instead is a count:
 *
 * > You can ask for 5 changes here. Loom will make 2 on its own, and ask you
 * > first about 3.
 *
 * **Nobody wrote the 2 or the 3.** They are `composeChange`'s own answers to
 * the five asks on the panel, run against the tree being rendered, under
 * `demoPolicy` (`what-it-will-say.ts`). A stranger who presses the green
 * button watches one of the 3 come true fifteen seconds later; a stranger who
 * presses *Re-theme the whole page* watches one of the 2. **It is the first
 * sentence on this surface that the next press checks.**
 *
 * ## Why a count, rather than a better promise
 *
 * Because the one thing a stranger cannot get from any other AI demonstration
 * is **different answers to different asks from the same system**. An AI
 * rewriting a page is the least novel thing here (`docs/rollout.md`). A
 * governed one declining to rewrite it until you say so is the product, and a
 * split is the smallest possible proof that the governing is real rather than
 * a wrapper around a yes.
 *
 * ## Plain language, and nothing removed
 *
 * The brief's standing direction for this surface: *plain language is the
 * default, the technical record is one click away, nothing is ever removed.*
 * This sentence has no runtime word in it — no stakes level, no rule id, no
 * `awaiting-confirmation`. The level is on the button's own verdict a line
 * below; the rule, the policy and the ceiling are on the card after the press;
 * the fingerprint is one disclosure under that. Nothing moved down a level
 * that a visitor could previously see.
 *
 * ## And the same sentence on the screen after the first press
 *
 * The count above is right on arrival and was the arrival screen's word for
 * word on every screen after it, which is a different claim to a visitor who
 * has pressed something. Both unattended presets are toggles, so an applied
 * one is applicable again in the other direction and comes straight back onto
 * the panel: a stranger who pressed *Re-theme the whole page*, watched the
 * page move, and read the sentence over the list was told there were **five**
 * changes to ask for, in the same words as before they pressed anything.
 * Literally true of the list, and read as *nothing I did counted*.
 *
 * So the first clause divides the same asks by **direction**:
 *
 * > You can ask for 4 more changes here, and put the last one back. Loom will
 * > make 2 on its own and ask you first about 3.
 *
 * **The second clause does not move, and that is the restraint this unit is.**
 * It counts verdicts over the rows on the panel, and the rows are what make it
 * checkable — two chips reading `GOES AHEAD` and three reading `ASKS YOU
 * FIRST` are still exactly what a stranger finds under it. The way back is one
 * of those five and the Gate weighs it like any other ask, which is the point
 * `what-each-row-says.ts` makes about leaving the chip alone. What the first
 * clause stops doing is offering it as a change still to make.
 *
 * The two clauses are two partitions of one set of five, by direction and by
 * verdict, and that is the same pair the row under them already carries: the
 * chip is the Gate's answer and the promise is what it does to the page.
 *
 * **`putsBack` is read off the verdicts this module was already handed.** It is
 * the Gate's own assessed delta compared against what the visitor's last change
 * moved (`put-back.ts`), reached one step earlier for the row and the lead
 * button on 7 October. Nothing new is computed, no argument was added, and the
 * sentence cannot disagree with the row under it because both read the same
 * field.
 *
 * ## When it says nothing
 *
 * - **No verdicts.** Nothing ran, so there is nothing to count, and the panel
 *   restores the fuller claim it has always had.
 * - **One ask.** A split of one is not a split, and the sentence would restate
 *   the verdict already sitting under that ask's own button in more words. The
 *   panel falls back for the same reason it does when a verdict is missing.
 *
 * Both are silence rather than a hedge, which is the restraint `willSayOf`
 * exercises one level up and `weighedOf` exercises one screen later.
 */

export type Split = {
  /** How many asks reached a verdict — what the sentence counts over. */
  readonly total: number
  /** Of them, how many the Gate lets through unattended. */
  readonly onItsOwn: number
  /** How many it holds for the visitor. */
  readonly asksYou: number
  /** How many it refuses outright. */
  readonly refuses: number
  /**
   * Of them, how many would only put the visitor's last change back.
   *
   * Not a fourth standing: a way back has a verdict like every other ask and
   * is counted by `onItsOwn`, `asksYou` or `refuses` as well. This is the
   * other partition, and it is what the first clause divides on.
   */
  readonly putsBack: number
  /** The whole of it, in plain words, ready to print. */
  readonly sentence: string
}

/**
 * What each standing is called when it is being counted.
 *
 * Verbs rather than the row labels (`what-each-row-says.ts`'s job), because
 * this clause hangs off *Loom will …* and the row's does not hang off
 * anything. Keeping the two tables apart is what lets the row stay two words
 * while the sentence stays a sentence.
 */
const COUNTED: Readonly<
  Record<AskStanding, (n: number, all: boolean) => string>
> = {
  "on-its-own": (n, all) => `make ${all ? `all ${n}` : n} on its own`,
  "asks-you": (n, all) => `ask you first about ${all ? `all ${n}` : n}`,
  refuses: (n, all) => `refuse ${all ? `all ${n}` : n}`,
}

/** The order the clauses are read in, which is best news first. */
const ORDER: readonly AskStanding[] = ["on-its-own", "asks-you", "refuses"]

/**
 * Two clauses joined with *and*; three with commas and a final *and*.
 *
 * Three cannot happen on the shipped preset table — nothing in it is refused
 * against the starting page — and it is written anyway, because the table is a
 * list somebody will add to and a sentence that reads *make 2 on its own, ask
 * you first about 2 refuse 1* is the kind of defect nothing fails on.
 */
const joined = (clauses: readonly string[]): string =>
  clauses.length <= 2
    ? clauses.join(" and ")
    : `${clauses.slice(0, -1).join(", ")}, and ${clauses[clauses.length - 1]}`

/**
 * The first clause: what is on offer, divided by **direction**.
 *
 * Three shapes and the middle one is the whole of this unit.
 *
 * - **Nothing would put anything back**, which is every arrival screen and
 *   every screen after a change that spent its preset. Unchanged, character
 *   for character, which is the property this lane checks with a byte
 *   comparison rather than a reading.
 * - **Some would.** The forward asks are counted as *more*, which is a word
 *   only a visitor who has already pressed something can be offered, and the
 *   way back is named rather than counted with them.
 * - **All of them would.** Unreachable on the shipped preset table, and
 *   written for the reason the three-clause join below is: a table somebody
 *   adds to can reach it, and a sentence reading *you can ask for 0 more
 *   changes here* is the kind of defect nothing fails on.
 *
 * **Singular about the change rather than about the asks**, at every count.
 * *Put the last one back* names the visitor's last change, which there is
 * exactly one of however many presses would reverse it, and
 * `reversesTheLastChange` compares against that change and nothing earlier.
 */
const offeredClause = (total: number, putsBack: number): string => {
  if (putsBack === 0) return `You can ask for ${total} changes here.`

  const forward = total - putsBack
  if (forward === 0) return "You can put your last change back here."

  const more = forward === 1 ? "1 more change" : `${forward} more changes`
  return `You can ask for ${more} here, and put the last one back.`
}

export const howManyWaitForYou = (
  says: readonly WillSay[],
): Split | undefined => {
  if (says.length < 2) return undefined

  const count = (standing: AskStanding): number =>
    says.filter((said) => said.standing === standing).length

  const total = says.length
  const clauses = ORDER.map((standing) => ({ standing, n: count(standing) }))
    .filter(({ n }) => n > 0)
    .map(({ standing, n }) => COUNTED[standing](n, n === total))

  /**
   * Counted over the same answers the clauses are, so the two partitions of
   * the panel are taken from one list in one pass and cannot describe
   * different screens.
   */
  const putsBack = says.filter((said) => said.putsBack).length

  return {
    total,
    onItsOwn: count("on-its-own"),
    asksYou: count("asks-you"),
    refuses: count("refuses"),
    putsBack,
    sentence: `${offeredClause(total, putsBack)} Loom will ${joined(clauses)}.`,
  }
}
