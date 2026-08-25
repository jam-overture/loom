import { describe, expect, it } from "vitest"

import { ANSWERS } from "@/app/(portal)/_lib/vocabulary"

import { answerNote } from "./answer"
import type { ChangeRecord } from "./record"

/**
 * The one fact on this surface that only the visitor supplied.
 *
 * Everything else a card prints, Loom worked out: the delta, the stakes, the
 * rule, the revision. `answeredBy` is the record of a person pressing a button,
 * and it is the whole difference between "an AI changed a page" and "an AI
 * asked me before it changed a page". These assertions are about that
 * difference surviving.
 */

const RECORD: ChangeRecord = {
  recordId: "i_1",
  askedAt: "2026-08-25T09:00:00.000Z",
  utterance: "Take the numbers band off the page.",
  origin: "user-instruction",
  actor: "a demo visitor",
  outcome: "applied",
  revision: { produced: 1, replaced: 0 },
  answeredBy: "a demo visitor",
  repaired: false,
  touched: [],
}

describe("what the visitor answered", () => {
  it("says the visitor said yes, and that the change waited for them", () => {
    const note = answerNote(RECORD)

    expect(note?.label).toBe("You said yes")
    expect(note?.meaning).toMatch(/held this change until you answered/)
  })

  /**
   * The demo may say "you" where the shared table says "somebody", and it may
   * not invent a different verb for the same runtime event. A run that reworded
   * `ANSWERS.confirmed` in the portal and left this behind would have the two
   * surfaces calling one button-press two things.
   */
  it("takes the verb off the shared table rather than writing its own", () => {
    expect(answerNote(RECORD)?.label).toBe(`You ${ANSWERS.confirmed.label}`)
    expect(answerNote(RECORD)?.technical).toBe(`${ANSWERS.confirmed.technical} by a demo visitor`)
  })

  it("names the actor the runtime recorded, not the one who asked", () => {
    const note = answerNote({ ...RECORD, actor: "somebody else", answeredBy: "the reader" })

    expect(note?.technical).toBe("confirmed by the reader")
  })

  /**
   * A change nobody was asked about must not grow a sentence saying somebody
   * was. This is the assertion that would fail if the note were keyed on the
   * outcome alone: an auto-applied re-theme is `applied` too, and it is
   * precisely the card this one has to stay distinguishable from.
   */
  it("says nothing about a change that was never put to anybody", () => {
    const { answeredBy: _dropped, ...unasked } = RECORD

    expect(answerNote(unasked)).toBeUndefined()
  })

  /**
   * The refusal is left to the state, which already says it twice — in the
   * badge and in the sentence under it. See the asymmetry note in `answer.ts`:
   * a third "you said no" is clutter, and the missing one was always the yes.
   */
  it("leaves a change the visitor turned down to the state that already names it", () => {
    const { revision: _unapplied, ...declined } = RECORD

    expect(answerNote({ ...declined, outcome: "discarded" })).toBeUndefined()
  })

  it("says nothing while the change is still waiting on an answer", () => {
    const { answeredBy: _none, ...waiting } = RECORD

    expect(answerNote({ ...waiting, outcome: "awaiting-you", heldProposalId: "p_1" })).toBeUndefined()
  })
})
