import { describe, expect, it } from "vitest"

import { CHANGE_STATES, plainState, type ChangeState } from "@/app/(portal)/_lib/vocabulary"

import { demoState, invalidReport, stateReport } from "./report"

/**
 * The demo borrows the portal's vocabulary and must keep borrowing it: a
 * visitor told "Waiting on you" and a reviewer told `held` about the same
 * change would be two products, and the shared table is what stops that.
 *
 * What the demo cannot borrow is *where to go next*, because it is a different
 * place — no account, no History, no review queue, and the undo is a button on
 * the card. This suite is the seam between those two facts: the names must come
 * through unaltered, and no sentence may send a visitor somewhere this surface
 * does not have.
 *
 * It is also the alarm for a coupling that is real. `vocabulary.ts` is the
 * portal routine's file. If a portal run adds a second sentence naming a signed-
 * in page, this fails here rather than shipping a demo that tells strangers to
 * visit a page they cannot open.
 */

const STATES = Object.keys(CHANGE_STATES) as readonly ChangeState[]

/** Places this surface does not have, in the words the portal would name them. */
const NOWHERE_HERE = [/history/i, /review queue/i, /sign in/i, /signed in/i, /dashboard/i]

describe("the states the demo says out loud", () => {
  it("keeps every label, tone and technical name exactly as the shared table has them", () => {
    for (const state of STATES) {
      const shared = plainState(state)
      const demo = demoState(state)

      expect(demo.label).toBe(shared.label)
      expect(demo.tone).toBe(shared.tone)
      expect(demo.technical).toBe(shared.technical)
    }
  })

  it("never sends a visitor to a page this surface does not have", () => {
    const offending = STATES.filter((state) =>
      NOWHERE_HERE.some((elsewhere) => elsewhere.test(demoState(state).meaning))
    )

    expect(offending).toEqual([])
  })

  /**
   * The override earns its existence only while the sentence it replaces is
   * still the wrong one. If a portal run rewrites `applied` to stop naming
   * History, this fails and the override should be deleted rather than kept as
   * a second copy of a sentence that already agrees.
   */
  it("overrides applied because the shared sentence still points at History", () => {
    expect(plainState("applied").meaning).toMatch(/history/i)
    expect(demoState("applied").meaning).toContain("beside you")
    expect(demoState("applied").meaning).toContain("Put it back")
  })

  it("passes every other state through untouched", () => {
    for (const state of STATES.filter((each) => each !== "applied")) {
      expect(demoState(state).meaning).toBe(plainState(state).meaning)
    }
  })
})

describe("a form the server could not read", () => {
  /**
   * The two halves of the plain-language rule, on the one report that is not
   * about the runtime at all: the visitor is told nothing changed, and the
   * validator's own message — written for whoever wrote the form — stays behind
   * the disclosure rather than being shown as an explanation.
   */
  it("says nothing changed, and keeps the validator's words for the disclosure", () => {
    const report = invalidReport("baseRevision: expected number, received nan")

    expect(report.meaning).toContain("nothing on the page has changed")
    expect(report.headline).not.toContain("baseRevision")
    expect(report.meaning).not.toContain("baseRevision")
    expect(report.detail).toContain("baseRevision")
  })
})

describe("a state the runtime does not hand back as an outcome", () => {
  /**
   * Answering a hold is the only place the surface picks the state itself, so
   * it is the only place a second copy of a sentence could appear. It must come
   * off the same table as everything else.
   */
  it("takes its words from the table rather than writing its own", () => {
    const declined = stateReport("declined", "The proposal was not applied.", true)

    expect(declined.headline).toBe(demoState("declined").label)
    expect(declined.meaning).toBe(demoState("declined").meaning)
    expect(declined.tone).toBe(demoState("declined").tone)
    expect(declined.detail).toBe("The proposal was not applied.")
    expect(declined.recorded).toBe(true)
  })
})

describe("what the panel repeats", () => {
  /**
   * Everything the runtime narrated has a card under the panel carrying the
   * same sentence, so the panel must not print it too — that duplication is
   * what put the same green "Applied" on screen twice, forty pixels apart.
   * What never reached the runtime has no card and has to be said by the panel
   * or it is not said at all.
   */
  it("marks an ask that never reached the runtime as having no card", () => {
    expect(invalidReport("nothing was sent").recorded).toBe(false)
    expect(stateReport("already-answered", "already answered", false).recorded).toBe(false)
  })
})
