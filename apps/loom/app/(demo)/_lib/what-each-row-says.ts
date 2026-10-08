import type { AskStanding } from "./what-it-will-say"

/**
 * The Gate's answer to one ask, in the two or three words a row can carry.
 *
 * ## Why this is not the sentence
 *
 * `what-it-will-say.ts` has the same verdict as two sentences, and they are
 * right where they are — under the one green button, about the one press this
 * surface invites. Stacking four more of them down the rail would be the
 * record dumped on arrival, which is the failure this whole surface is written
 * against. A list wants a word.
 *
 * So the same three outcomes get a second, shorter form, and the discipline is
 * that **the short form never says anything the long one does not**: no stakes
 * level, no rule, no policy. What the row adds is not detail, it is *contrast*
 * — four rows, and the fact that they do not all read the same.
 *
 * ## The words
 *
 * - **Goes ahead** — the Gate applies it unattended. Not *"approved"*, which
 *   implies somebody looked, and not *"allowed"*, which implies a permission
 *   system a visitor would then go looking for.
 * - **Asks you first** — the Gate holds it. The second person is the whole
 *   point: the thing being governed is the visitor's page, and the one who
 *   gets asked is the one reading the row.
 * - **Won't do it** — the Gate refuses. Nothing on the shipped preset table
 *   reaches this against the starting page, and the word exists because a
 *   table somebody adds to can, and a missing case renders as a blank badge
 *   rather than as a failure.
 *
 * Forward tense throughout, like every string on this screen, and for the same
 * reason: none of it has happened.
 *
 * ## The tone, which is deliberately none
 *
 * These rows are **not** amber. Amber on this rail means *there is a question
 * open and it is yours* — the badge, the ring on the stage, the sticky
 * caution, the rule on the card. Nobody has asked for anything on the arrival
 * screen, and four amber marks for four questions that have not been raised
 * would make it look like a screen with work on it. The 1 October run settled
 * this for the lead's verdict and the argument is unchanged for a list of
 * them: the tone is earned by the press.
 */
export const STANDING_ROW: Readonly<Record<AskStanding, string>> = {
  "on-its-own": "Goes ahead",
  "asks-you": "Asks you first",
  refuses: "Won’t do it",
}

/**
 * What a press promises the page, when the preset's own promise has stopped
 * being true.
 *
 * ## The sentence this replaces, and why it is the only false one on the screen
 *
 * A preset's `promise` is written against the page as it shipped — *"Every
 * colour and typeface on the page changes at once"* — and both unattended
 * presets are toggles, so the second press of one moves the page back rather
 * than on. `availablePresets` plans against the tree as it stands and finds the
 * toggle applicable again, so the row returns to the list wearing the sentence
 * it wore on arrival, eleven pixels above a card reading *"Put it back" undoes
 * it*. `put-back.ts` has the measurement and the argument; what is needed here
 * is the sentence.
 *
 * **Only the promise moves.** The label is the ask and is still the ask. The
 * chip is the Gate's own verdict, reached by running this press against this
 * tree under this policy, and it is as true of a press that puts something back
 * as of any other — a change is still weighed, still allowed or held, still
 * written down. Swapping it for a direction word would trade a fact the Gate
 * produced for one the history did, and leave the count above the list
 * describing rows that no longer carry what it counted. The false sentence was
 * the one about the *page*, and it is the one that changes.
 *
 * ## The words
 *
 * The demo already says this about a change that has landed — *"The whole page
 * went back to how it looked"* on the card, *"Changed back"* on the mark — and
 * this is the same fact in the forward tense every string on this panel is
 * written in. No runtime vocabulary in it, no level, no rule: a row says what
 * the press does to the page, and *back where it was* is as plain as that gets.
 *
 * It names **your last change** rather than *the original page*, which is the
 * narrower claim and the only one that is checked: `reversesTheLastChange`
 * compares against the change immediately before, so a page carrying two
 * changes and a press reversing one of them has not come back to how it
 * started, and a sentence saying so would be visibly false on the stage beside
 * it.
 */
export const PUTS_IT_BACK = "Puts the page back to how it looked before your last change."

/**
 * The promise a row and the lead button print, which is the preset's own unless
 * the history has made it untrue.
 *
 * One function for both because they are one sentence in two sizes: the lead
 * carries it at `text-xs` under a green button and a row at `text-2xs` under a
 * label, and a surface where the big one told the truth and the small one did
 * not would be the same defect with a harder-to-find instance of it.
 */
export const promiseOf = (promise: string, putsBack: boolean | undefined): string =>
  putsBack === true ? PUTS_IT_BACK : promise
