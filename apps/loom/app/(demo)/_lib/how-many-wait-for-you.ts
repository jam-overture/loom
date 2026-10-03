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

  return {
    total,
    onItsOwn: count("on-its-own"),
    asksYou: count("asks-you"),
    refuses: count("refuses"),
    sentence: `You can ask for ${total} changes here. Loom will ${joined(clauses)}.`,
  }
}
