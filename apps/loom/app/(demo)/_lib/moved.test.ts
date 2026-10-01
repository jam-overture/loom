import { describe, expect, it } from "vitest"

import { movedOn } from "./moved"

/**
 * The predicate the whole unit turns on: a hold names a revision, and a hold
 * whose page has left that revision behind can never apply again.
 *
 * The runtime's own words for it are in `confirmHeld` — *"it is not stale
 * pending a retry, it is dead"* — and `pipeline.test.ts` holds this file to that
 * behavior end to end. What is checked here is only that the surface asks the
 * question the same way the runtime answers it: on equality of the two numbers,
 * and never on which is larger.
 */
describe("whether the page has moved past an ask", () => {
  it("says nothing about a hold judged against the page as it stands", () => {
    expect(movedOn(3, 3)).toBeUndefined()
  })

  it("says so, and carries both revisions, once the page has moved", () => {
    const note = movedOn(0, 2)

    expect(note?.at).toBe(0)
    expect(note?.now).toBe(2)
  })

  /**
   * The plain half names neither number and the technical half names both.
   * That is the rule this surface is built on, and it is worth a test rather
   * than a comment: `revision` is a word `what-happens.test.tsx` already forbids
   * this rail before it has been earned, and a sentence in the light saying
   * "revision 0" would put it on the first card a stranger reads.
   */
  it("keeps the revisions out of the sentence and in the disclosure", () => {
    const note = movedOn(0, 1)

    expect(note?.sentence).not.toMatch(/revision|\d/)
    expect(note?.technical).toBe("revision 0, and the page is at 1")
  })

  /**
   * And does not repeat the row it lands in. The disclosure labels it
   * `weighed at`; a value that opened *"weighed against…"* said the label twice.
   */
  it("does not say again what the row it sits in already says", () => {
    expect(movedOn(0, 1)?.technical).not.toMatch(/weighed/)
  })

  /**
   * On this surface the visitor is the only thing that can move the page — every
   * change comes from a button they pressed — so the sentence says so. An ask
   * that fails because of something you did is a different thing to be told from
   * an ask that fails for no visible reason.
   */
  it("tells the visitor it was their own change that did it", () => {
    expect(movedOn(0, 1)?.sentence).toMatch(/^You changed the page/)
  })
})
