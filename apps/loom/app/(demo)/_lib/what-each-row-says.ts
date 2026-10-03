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
