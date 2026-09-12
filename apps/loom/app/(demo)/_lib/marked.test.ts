import { describe, expect, it } from "vitest"

import type { NodeId } from "@loom/runtime"

import { markedPage, MARKED_APPLIED, MARKED_AWAITING, MARKED_MANY } from "./marked"
import type { Spotlight } from "./spotlight"

/**
 * What the rail says about the marks, and which card wears which of them.
 *
 * Held against the marks a page *drew* rather than against the changes that
 * asked to be marked, because those are two different counts and every failure
 * this file guards is in the gap between them: a sentence promising two marks
 * over a page carrying one, or a card wearing words the stage never drew.
 */

/** Node ids are branded, and a fixture is the one place they are written by hand. */
const id = (value: string): NodeId => value as NodeId

describe("what the rail says about the marks", () => {
  const spot = (nodeId: string, tone: "applied" | "awaiting", label: string): Spotlight => ({
    nodeId: id(nodeId),
    tone,
    label,
    placement: "inside",
    subject: "node",
  })

  it("says nothing at all when the page carries no mark", () => {
    const marked = markedPage([{ recordId: "i_1", spots: [] }])

    expect(marked.line).toBeUndefined()
    expect(marked.tone).toBeUndefined()
    expect(marked.words.size).toBe(0)
  })

  it("keeps its two one-mark sentences", () => {
    expect(markedPage([{ recordId: "i_1", spots: [spot("a", "applied", "Just changed")] }]).line).toBe(
      MARKED_APPLIED
    )
    expect(
      markedPage([{ recordId: "i_1", spots: [spot("a", "awaiting", "This would change")] }]).line
    ).toBe(MARKED_AWAITING)
  })

  /**
   * The count is of marks **drawn**, not of changes asking to be marked, and the
   * difference is a real state rather than a defensive one: the re-theme
   * configures the page root, and a ring around the whole stage points at
   * nothing, so a change can be worth marking and draw none. A rail promising two
   * marks over a page carrying one is this unit's own defect, reversed.
   */
  it("counts the marks the page drew, not the changes that wanted one", () => {
    const marked = markedPage([
      { recordId: "i_1", spots: [spot("a", "awaiting", "This would be removed")] },
      { recordId: "i_2", spots: [] },
    ])

    expect(marked.line).toBe(MARKED_AWAITING)
    expect(marked.words.size).toBe(0)
  })

  /**
   * And a card only ever wears words the page is wearing too. The pill on the
   * card is the chip off the band — one string, two places — so a card given a
   * label the stage never drew would send a visitor looking for a ring that is
   * not there.
   */
  it("gives a card its own mark's words and never another's", () => {
    const marked = markedPage([
      { recordId: "i_1", spots: [spot("a", "awaiting", "This would be removed")] },
      { recordId: "i_2", spots: [spot("b", "awaiting", "Something new would go here")] },
      { recordId: "i_3", spots: [] },
    ])

    expect(marked.line).toBe(MARKED_MANY)
    expect(marked.words.get("i_1")).toBe("This would be removed")
    expect(marked.words.get("i_2")).toBe("Something new would go here")
    expect(marked.words.has("i_3")).toBe(false)
  })

  /**
   * And the sentence that replaces *this* never names an ask, however many are
   * open. The words are already on the page and on the cards; a third copy in
   * the rail is a third place for one string to drift from itself, and a line
   * that grows a clause every time a visitor presses a button.
   */
  it("says the same thing for three questions as for two", () => {
    const many = markedPage([
      { recordId: "i_1", spots: [spot("a", "awaiting", "This would be removed")] },
      { recordId: "i_2", spots: [spot("b", "awaiting", "Something new would go here")] },
      { recordId: "i_3", spots: [spot("c", "awaiting", "This would move")] },
    ])

    expect(many.line).toBe(MARKED_MANY)
    expect(many.words.size).toBe(3)
  })

  /** One change drawing two marks still wears one pill: two would not tell it apart from anything. */
  it("wears the first of a change's marks, not all of them", () => {
    const marked = markedPage([
      {
        recordId: "i_1",
        spots: [spot("a", "awaiting", "This would change"), spot("b", "awaiting", "This would move")],
      },
      { recordId: "i_2", spots: [spot("c", "awaiting", "This would be removed")] },
    ])

    expect(marked.words.get("i_1")).toBe("This would change")
    expect(marked.words.size).toBe(2)
  })
})
