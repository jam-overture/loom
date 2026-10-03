import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { runtimeWordsIn } from "@/app/(portal)/_test/plain-language"
import type { UndoStanding } from "@/app/(portal)/_lib/undoing"

import { UndoStandingNote } from "./undo-standing"

const standing = (fields: Partial<UndoStanding> = {}): UndoStanding => ({
  undoable: false,
  obstacles: [],
  unexplained: false,
  ...fields,
})

const outOfTree = {
  label: "Putting the page back would not put everything back",
  meaning: "It takes a payment. Check whatever that part is wired to before you say yes.",
  technical: "out-of-tree-effect",
}

const overBudget = {
  label: "Too much would have to be kept to put it back",
  meaning: "Undoing this means putting back more than this project agreed to hold.",
  technical: "retention-budget-exceeded",
}

describe("UndoStandingNote", () => {
  /**
   * The ordinary case, and the one most worth asserting: a change that can be
   * undone gets nothing. The clause above it already says so, and the review
   * queue is long enough without a paragraph per card confirming that nothing
   * is wrong.
   */
  it("draws nothing for a change that can be undone", () => {
    const { container } = render(<UndoStandingNote standing={standing({ undoable: true })} />)

    expect(container.innerHTML).toBe("")
  })

  it("leads with the obstacle and then explains it", () => {
    const { container } = render(<UndoStandingNote standing={standing({ obstacles: [outOfTree] })} />)

    const sentence = container.querySelector("p")
    expect(sentence?.textContent).toContain("Putting the page back would not put everything back.")
    expect(sentence?.textContent).toContain("before you say yes")
    expect(sentence?.querySelector("strong")?.textContent).toBe(`${outOfTree.label}.`)
  })

  it("draws both obstacles rather than the first one", () => {
    const { container } = render(
      <UndoStandingNote standing={standing({ obstacles: [outOfTree, overBudget] })} />
    )

    expect([...container.querySelectorAll("strong")].map((mark) => mark.textContent)).toEqual([
      `${outOfTree.label}.`,
      `${overBudget.label}.`,
    ])
  })

  /**
   * The code belongs in the technical record on the card, not here. A reader
   * who has not opened a disclosure must meet no runtime string in this block,
   * which is the one property that makes this a plain-language note rather than
   * a reworded label with the old text underneath it.
   */
  it("prints no runtime code in the sentence a reader meets unasked", () => {
    const { container } = render(
      <UndoStandingNote standing={standing({ obstacles: [outOfTree, overBudget] })} />
    )

    expect(container.textContent).not.toContain("out-of-tree-effect")
    expect(container.textContent).not.toContain("retention-budget-exceeded")
    expect(runtimeWordsIn(container.textContent ?? "")).toEqual([])
  })

  it("says the record gave no reason, rather than drawing an empty list", () => {
    const { container } = render(<UndoStandingNote standing={standing({ unexplained: true })} />)

    expect(container.innerHTML).not.toBe("")
    expect(container.textContent).toContain("did not record why")
    expect(runtimeWordsIn(container.textContent ?? "")).toEqual([])
  })

  /**
   * An irreversible change was handed to a person, not refused. The mark says
   * *somebody has to decide this* and must not be the one a refusal wears, or
   * the card tells a reader the decision was already made for them.
   */
  it("wears the awaiting mark rather than the refusal one", () => {
    const { container } = render(<UndoStandingNote standing={standing({ obstacles: [outOfTree] })} />)

    const block = container.firstElementChild
    expect(block?.className).toContain("bg-awaiting")
    expect(block?.className).not.toContain("bg-rejected")
  })
})
