import { ANSWERS } from "@/app/(portal)/_lib/vocabulary"

import type { ChangeRecord } from "./record"

/**
 * The visitor's own half of the exchange, in words.
 *
 * The demo's best sixty seconds is a sequence: Loom proposes a change, the Gate
 * stops it, the visitor is asked, the visitor says yes, and the change lands.
 * Four of those five beats are on the card. The fourth was not, and it is the
 * only one the visitor performed.
 *
 * Read the two applied cards this surface can produce, side by side, as they
 * would stand without this module — in the rule sentences the portal's shared
 * vocabulary prints for them today, rather than the ones it printed when this
 * was written (`Loom portal`'s 1 September finding):
 *
 * > **Applied** · “Switch this page to the other palette.” · *This change is
 * > live on the page beside you.* · *Nothing this project watches for was
 * > involved, so it went ahead on its own.*
 *
 * > **Applied** · “Take the numbers band off the page.” · *This change is live
 * > on the page beside you.* · *A change this big is not something Loom may make
 * > on its own.*
 *
 * The first was made by Loom alone. The second was stopped, put to the visitor,
 * and applied only because they pressed a button. **Nothing on the second card
 * says so** — the rule sentence explains why it was held and then simply stops,
 * so the card reads as a change that was too risky to make and was made anyway.
 * A stranger who completes the demo's whole argument watches the record forget
 * the one part of it they were in.
 *
 * The fact was never missing from the record. `hold-confirmed` carries the
 * actor, `recordFromEvents` folds it onto `answeredBy`, and `pipeline.test.ts`
 * has asserted it arrives there since the day this surface was built. The
 * runtime is explicit about what the field is for — `commit.ts` sets it in one
 * place so that "the two records cannot disagree about who allowed this" (0029)
 * — and every other surface prints it: the portal's history says *allowed by*,
 * its activity screen says *`{who}` said yes.*, the docs' proposal box says
 * *allowed by*. The demo, the one surface whose whole job is to show a person
 * being asked, was the only one that dropped it.
 *
 * **Only the confirmation is said here, never the refusal**, and the asymmetry
 * is the point rather than an omission. A visitor who says no gets a card whose
 * badge reads *You said no* and whose sentence reads *You turned this change
 * down* — the answer **is** the outcome, so the shared table already says it
 * twice. A visitor who says yes gets a card that says *Applied*, which is what
 * an unasked change says too. Saying "you said no" a third time would be the
 * clutter this rail has been cut back from; saying "you said yes" once is the
 * difference between the two cards above.
 *
 * The words come off `(portal)/_lib/vocabulary`'s `ANSWERS`, and the one thing
 * overridden is the pronoun. That table says *Somebody looked at this and let
 * it through*, which is right in a review queue where the answerer may be a
 * colleague and wrong here, where a session has exactly one person in it and
 * they are the person reading the card. It is the same override, for the same
 * reason, that `report.ts` makes to `applied`'s meaning — the two surfaces must
 * agree on what a state is *called* and cannot agree on who was in the room.
 */

export type AnswerNote = {
  /** What the visitor did. Shown unasked, above the disclosure. */
  readonly label: string
  /** Why it mattered that they were the one who did it. */
  readonly meaning: string
  /** The runtime's word, and the actor it recorded. Belongs one click down. */
  readonly technical: string
}

/**
 * What a visitor did about this change, when they were asked and the change
 * went ahead — and nothing at all otherwise.
 *
 * `answeredBy` is set by exactly one path (`confirmHeld` and `discardHeld`), so
 * its presence already means the Gate held this and somebody answered. The
 * outcome is what says *which* answer, and only the affirmative one is missing
 * from the card.
 */
export const answerNote = (record: ChangeRecord): AnswerNote | undefined => {
  if (record.answeredBy === undefined || record.outcome !== "applied") return undefined

  const answer = ANSWERS.confirmed

  return {
    label: `You ${answer.label}`,
    meaning:
      "Loom held this change until you answered. Without that, nothing on the page would have moved.",
    technical: `${answer.technical} by ${record.answeredBy}`,
  }
}
