import { ceilingFor } from "@loom/runtime"

import { ASK_ORIGINS, STAKES } from "@/app/(portal)/_lib/vocabulary"

import type { ChangeRecord } from "./record"
import { demoPolicy } from "./session"

/**
 * What an ask *from here* is allowed to do on its own — the missing half of the
 * one sentence the demo's primary path ends on.
 *
 * **The sentence with no referent.** Press the green button, meet the hold, and
 * the rule the Gate cited reads, in the portal's shared words:
 *
 * > *Riskier than a request from here is allowed to be without asking.*
 *
 * *From here* is the whole claim, and nothing on the card says what *here* is.
 * The one thing that did was a monospace `user-instruction` in the card's top
 * right corner — the runtime's code for the origin, unexplained, in the light,
 * on the first card a stranger ever reads.
 *
 * **It is not a label, it is an input to the verdict.** `autoApplyCeiling` is
 * keyed by origin and `demoPolicy` sets `user-instruction` to `low`, so the
 * Gate's comparison is *this origin's ceiling against these stakes* — the
 * runtime says so itself, in `policy.ts`: "An explicit human instruction earns
 * more latitude than an adaptation nobody requested." That is one of the ideas
 * this surface exists to demonstrate, and a visitor met it as a hyphenated
 * token they had no way to read.
 *
 * So the code leaves the light for the disclosure, where every other surface
 * already keeps it — the portal's History (`whoAsked`) and Activity
 * (`describeAsk`) both print the actor as the sentence and file the origin under
 * `technical` — and what takes its place in the light is the sentence it was
 * standing in for.
 *
 * **The ceiling is asked of the runtime rather than read off the policy.**
 * `ceilingFor` is the function the Gate itself calls, `?? "low"` default and
 * all, so a policy that names no ceiling for an origin cannot make this surface
 * claim a different one than the Gate applied.
 *
 * **It is said only where the ceiling decided.** Four of the eight rules never
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

  return {
    sentence: `${ASK_ORIGINS[record.origin].label}, and Loom will not let an ask like that land on its own above ${STAKES[ceiling].label}.`,
    technical: `${ceiling}, for ${record.origin}`,
  }
}
