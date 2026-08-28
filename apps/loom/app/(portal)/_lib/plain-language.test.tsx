import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"

import { citationsIn, surfaceText, unplainWordsIn } from "./plain-language"

describe("unplainWordsIn", () => {
  it("names the word it found rather than answering yes", () => {
    expect(unplainWordsIn("The delta was refused.")).toEqual(["delta"])
  })

  it("finds a word that has been made plural", () => {
    expect(unplainWordsIn("68 primitives are registered.")).toEqual(["primitive"])
  })

  it("does not care about the case, because a sentence can start with one", () => {
    expect(unplainWordsIn("Disposition: refused.")).toEqual(["disposition"])
  })

  /**
   * The property that decides whether this check survives its first month. A
   * word inside a longer word is not that word, and a check that thought
   * otherwise would flag every screen that mentions a node in "nodes" — or,
   * worse, "anode" — and be deleted by the third run that hit it.
   */
  it("matches whole words, so a longer word that contains one is left alone", () => {
    expect(unplainWordsIn("Registered in the deltaic floodplain.")).toEqual([])
    expect(unplainWordsIn("A schematic drawing.")).toEqual([])
  })

  it("is quiet about a sentence written for a person", () => {
    expect(
      unplainWordsIn("Three changes are waiting for your answer. Open a page to read them.")
    ).toEqual([])
  })
})

describe("citationsIn", () => {
  it("finds a decision record cited at a reader", () => {
    expect(citationsIn("Every write goes through one path (0017).")).toEqual(["0017"])
  })

  /**
   * A four-digit number in parentheses is a citation; the other numbers a
   * portal screen prints are not in parentheses at all, and a check that
   * flagged a year or a count would be turned off rather than obeyed.
   */
  it("leaves an ordinary number in prose alone", () => {
    expect(citationsIn("Revision 12, applied on 9 August 2026, 1647 tests.")).toEqual([])
  })
})

describe("surfaceText", () => {
  /**
   * The assertion the whole module exists for, and the one every earlier "this
   * is on the surface" test in this lane got wrong. A closed `<details>` keeps
   * its children in the document on purpose, so `textContent` cannot tell a
   * word a reader met from a word one click below them.
   */
  it("leaves out what a shut disclosure is holding", () => {
    const { container } = render(
      <div>
        <p>Three changes are waiting.</p>
        <TechnicalDetail>
          <p>disposition: refused</p>
        </TechnicalDetail>
      </div>
    )

    expect(container.textContent).toContain("disposition")
    expect(surfaceText(container)).toBe("Three changes are waiting. Technical details")
  })

  /**
   * The summary is the label on the disclosure and a reader meets it unasked,
   * so it is surface. A summary reading "disposition" would be exactly the leak
   * this is looking for, and dropping the whole `<details>` would hide it.
   */
  it("keeps the label a shut disclosure wears", () => {
    const { container } = render(
      <TechnicalDetail summary="How this was decided">
        <p>within-policy</p>
      </TechnicalDetail>
    )

    expect(surfaceText(container)).toBe("How this was decided")
    expect(surfaceText(container)).not.toContain("within-policy")
  })

  it("counts what an opened disclosure is showing", () => {
    const { container } = render(
      <details open>
        <summary>How this was decided</summary>
        <p>within-policy</p>
      </details>
    )

    expect(surfaceText(container)).toContain("within-policy")
  })

  /**
   * `sr-only` text is surface, and this is the case where getting it wrong
   * would be worst: the readers who depend on it are the ones for whom a
   * plain-language failure has no visual context to fall back on.
   */
  it("counts text that only a screen reader will reach", () => {
    const { container } = render(
      <p>
        Undo <span className="sr-only">revision 4</span>
      </p>
    )

    expect(surfaceText(container)).toBe("Undo revision 4")
  })

  it("leaves out what is hidden from everybody", () => {
    const { container } = render(
      <div>
        <p>Visible.</p>
        <p aria-hidden="true">Decorative.</p>
        <p hidden>Not rendered.</p>
      </div>
    )

    expect(surfaceText(container)).toBe("Visible.")
  })
})
