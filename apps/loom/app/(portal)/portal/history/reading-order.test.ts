import { describe, expect, it } from "vitest"

import { portalFile, screenSource } from "@/app/(portal)/_lib/screen-source"

/**
 * The order a reader meets this screen in, pinned at the source.
 *
 * The third guard of this shape, after the page screen's and Activity's. Both
 * were written because a phone screenshot found a reading order that dozens of
 * component tests could not: every one of them renders a component rather than
 * the page, so none of them can see what order the page puts them in.
 *
 * What it pins here is that the screen says what it is before it lists what is
 * on it, and that the empty state — where a new person actually starts — keeps
 * something to do.
 */
const file = portalFile("portal", "history", "page.tsx")
const source = screenSource(file)

const rowFile = portalFile("portal", "history", "_components", "revision-row.tsx")
const rowSource = screenSource(rowFile)

describe("the history screen's reading order", () => {
  /**
   * A reader arriving here has been sent by a revision link or by the nav, and
   * in neither case have they been told what this screen is. Saying so is the
   * one sentence that makes the list below it mean anything — it is where "the
   * page as it stands keeps no record of what it replaced" is said out loud.
   */
  it("says what the screen is before it lists a single revision", () => {
    const heading = source.indexOf("<h1")
    const purpose = source.indexOf("what undoing it would put back")

    expect(heading).toBeGreaterThan(-1)
    expect(purpose).toBeGreaterThan(heading)
    expect(source.indexOf("<RevisionRow")).toBeGreaterThan(purpose)
  })

  /**
   * An empty state is the clearest instance of "what do I do now?", and this one
   * is what a fresh deployment shows. `StateNotice` has an `action` prop for
   * exactly this, and a screen that omits it leaves a new person on a dead end.
   */
  it("gives the empty state something to do", () => {
    const empty = source.slice(source.indexOf('tone="empty"'))

    expect(empty).toContain("action=")
    expect(empty).toContain("/portal/pages/")
  })

})

describe("a revision row's reading order", () => {
  /**
   * What happened, then who did it, then what undoing it would put back, then
   * the button, and only then the record. The row used to open with five
   * monospace pairs of field names, so the reader met `interpreted by scripted`
   * before they met the change itself.
   */
  it("puts what changed above who asked, and both above the technical record", () => {
    const changed = rowSource.indexOf("view.changes.map")
    const who = rowSource.indexOf("view.who")
    const technical = rowSource.indexOf("<TechnicalDetail")

    expect(changed).toBeGreaterThan(-1)
    expect(changed).toBeLessThan(who)
    expect(who).toBeLessThan(technical)
  })

  /**
   * The reversal is the reading that lets a reviewer decide whether to press the
   * button, so it has to arrive before the button. Finding out after the click
   * that an undo writes over later work is finding out too late.
   */
  it("shows what undoing would do before it offers the undo", () => {
    expect(rowSource.indexOf("<ReversalNote")).toBeLessThan(rowSource.indexOf("<UndoButton"))
  })

  /**
   * Nothing is ever removed. Every field the row used to print unasked is still
   * rendered — this is the check that a later simplification cannot quietly drop
   * one on its way past.
   */
  it("keeps every pair it used to lead with", () => {
    for (const kept of [
      "asked by",
      "allowed by",
      "interpreted by",
      "confidence",
      "proposal",
      "applied",
      "operations",
    ]) {
      expect(rowSource).toContain(`>${kept}<`)
    }
  })
})
