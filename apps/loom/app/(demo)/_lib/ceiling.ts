import { ceilingFor, isAbove } from "@jam-overture/loom"

import { ASK_ORIGINS, STAKES } from "@/app/(portal)/_lib/vocabulary"

import type { ChangeRecord } from "./record"
import { demoPolicy } from "./session"

/**
 * The comparison the Gate actually made, said so that a stranger can do the sum.
 *
 * **Why the line exists at all.** `autoApplyCeiling` is keyed by origin and
 * `demoPolicy` sets `user-instruction` to `low`, so the Gate's verdict on the
 * demo's headline ask is one comparison: *these stakes against this origin's
 * ceiling*. The runtime says why an origin should have a ceiling in `policy.ts`
 * — "An explicit human instruction earns more latitude than an adaptation
 * nobody requested" — and it is one of the genuinely distinctive ideas here.
 * The card used to demonstrate it as a monospace `user-instruction` in its top
 * right corner: the runtime's code for the origin, untranslated, in the light,
 * on the first card a stranger ever reads. That code moved to the disclosure,
 * where the portal's History (`whoAsked`) and Activity (`describeAsk`) already
 * keep it, and this sentence took its place.
 *
 * **What it then got wrong, on both terms.** It read:
 *
 * > *Somebody using the site asked for this, and Loom will not let an ask like
 * > that land on its own above Low risk.*
 *
 * *The threshold, with no comparison.* `weighed.ts` prints the stakes three
 * lines above — *"Some risk"* — and this printed the ceiling — *"Low risk"* —
 * and nothing anywhere said which of the two was higher, or that they were
 * points on one scale at all. A visitor was handed both sides of an inequality
 * and left to guess the operator between them. Both levels now stand in one
 * sentence with the direction in it, which is the whole of what a card can do
 * about a comparison: show it being made.
 *
 * *And the wrong person.* `ASK_ORIGINS` is the portal's table and its phrasing
 * is right there — a review queue's reader is a colleague reading about
 * somebody else's ask, so *"Somebody using the site asked for this"* names a
 * third party correctly. **Here the third party is the reader.** They pressed
 * the button two seconds ago, the card says *"You said yes"* four lines below
 * (`answer.ts`), and between the two it told them about a stranger.
 *
 * That override is not a second vocabulary and the precedent is exact:
 * `answer.ts` takes `ANSWERS.confirmed` and overrides only the pronoun, for the
 * reason it gives — *"the two surfaces must agree on what a state is called and
 * cannot agree on who was in the room."* Same here. The **level** words stay
 * the portal's `STAKES`, because a visitor told *"Some risk"* and a reviewer
 * told the same thing three files away must be looking at one product; only
 * *who asked* is overridden, and only for the one origin this surface produces
 * (`actions.ts` writes `user-instruction` and nothing else). Every other origin
 * keeps the shared label, so a record from anywhere else reads as it does on
 * every other screen.
 *
 * **The ceiling is asked of the runtime rather than read off the policy.**
 * `ceilingFor` is the function the Gate itself calls, `?? "low"` default and
 * all, so a policy that names no ceiling for an origin cannot make this surface
 * claim a different one than the Gate applied. The comparison clause is gated
 * on a real `isAbove` for the same reason: the rule guarantees it today, and a
 * sentence asserting *higher* is a claim this module should be able to check
 * rather than inherit.
 *
 * **It is said only where the ceiling decided.** Seven of the eight rules never
 * consult it, and a card whose verdict was `within-policy` — nothing this
 * project watches for was involved — would be answering a question it was not
 * asked. This is the same restraint `answer.ts` exercises for the visitor's
 * yes: one sentence, on the one state where it is the missing term.
 */

export type CeilingNote = {
  /** The plain sentence, for the light. */
  readonly sentence: string
  /**
   * The same comparison in the runtime's words, for the disclosure: the level
   * and the origin it belongs to. Both, because a ceiling with no origin beside
   * it is a number that could have come from anywhere.
   */
  readonly technical: string
}

/**
 * Who asked, in the person this surface is written in.
 *
 * A demo session has exactly one person in it and they are the person reading
 * the card, so `user-instruction` — the only origin `actions.ts` writes — is
 * *them*. Every other origin falls through to the shared table: those describe
 * somebody or something that genuinely is not the reader, and the portal
 * already says them well.
 */
const whoAsked = (origin: ChangeRecord["origin"]): string =>
  origin === "user-instruction" ? "You asked for this yourself" : ASK_ORIGINS[origin].label

export const ceilingNote = (record: ChangeRecord): CeilingNote | undefined => {
  const { disposition } = record

  if (disposition === undefined) return undefined

  /** The one rule that reads the ceiling, and so the one card that needs it. */
  if (disposition.ruleCode !== "stakes-above-ceiling") return undefined

  /*
   * A record decided under some other policy would be told what *this* policy
   * allows, which is a confident and wrong account of a verdict this surface
   * did not produce. The demo runs one policy, so this is a guard against a
   * future rather than a live case — and the honest silence is cheaper than the
   * bug it forecloses.
   */
  if (disposition.policyId !== demoPolicy.policyId) return undefined

  const ceiling = ceilingFor(demoPolicy, record.origin)
  const stakes = record.stakes

  /*
   * The second term, and only when it really is above the first.
   *
   * `stakes-above-ceiling` guarantees it, which is exactly why the check is
   * here rather than assumed: the alternative is a card that says "came in
   * higher" because a rule code told it to, and the one thing this surface may
   * never do is narrate a comparison it did not make. A record with no
   * assessment on it gets the threshold alone, which is what this sentence said
   * before there was a second term to say.
   */
  const higher =
    stakes !== undefined && isAbove(stakes.level, ceiling)
      ? ` — and this one came in higher, at ${STAKES[stakes.level].label}.`
      : "."

  return {
    sentence: `${whoAsked(record.origin)}, so Loom may act on its own up to ${STAKES[ceiling].label}${higher}`,
    technical: `${ceiling}, for ${record.origin}`,
  }
}
