import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { WEIGHED_QUESTIONS } from "@/app/(demo)/_lib/weighed"

import { WhatHappens } from "./what-happens"

/**
 * The point of this component is that it is readable by somebody who has read
 * nothing, so the test is about the words rather than the structure.
 *
 * The vocabulary list below is what the panel it replaced put in front of a
 * first-time visitor, unexplained, in its empty state. None of it is wrong and
 * every one of the terms still appears on the surface — on the record cards,
 * where a change has happened and the words have something to attach to. What
 * must not come back is meeting them *first*, in the one place a stranger looks
 * to find out what this page is.
 */
const NOT_YET_EARNED = [
  "proposal",
  "provenance",
  "rationale",
  "delta",
  "revision",
  "policy",
  "primitive",
  "tree",
  "gate",
]

describe("the three steps", () => {
  it("gives the sequence a visitor is about to live, in order", () => {
    render(<WhatHappens />)

    const steps = screen.getAllByRole("listitem")

    expect(steps.length).toBe(3)
    expect(steps[0]?.textContent).toContain("You ask")
    expect(steps[1]?.textContent).toContain("Loom decides")
    expect(steps[2]?.textContent).toContain("The record appears")
  })

  it("names the two axes without naming the machinery", () => {
    render(<WhatHappens />)

    expect(screen.getByText(/how much damage could this do/i)).toBeTruthy()
    expect(screen.getByText(/can it be taken back/i)).toBeTruthy()
  })

  /**
   * The promise and the answer, held to the same strings.
   *
   * This step said a change would be weighed on two questions, and for a
   * fortnight the card answered neither — the facts were on the record and one
   * click down, as `stakes: medium` and `undo carries: 4 nodes`. The gap is
   * closed by `_lib/weighed.ts`, and what keeps it closed is that both halves
   * read one constant. A reworded question here with an unchanged heading there
   * is exactly the drift that opened it.
   */
  it("asks the two questions the record answers, in the same words", () => {
    const { container } = render(<WhatHappens />)
    const words = container.textContent ?? ""

    expect(words).toContain(WEIGHED_QUESTIONS.damage)
    expect(words).toContain(WEIGHED_QUESTIONS.reversal)
  })

  it("uses no vocabulary it has not earned", () => {
    const { container } = render(<WhatHappens />)
    const words = (container.textContent ?? "").toLowerCase()

    expect(NOT_YET_EARNED.filter((term) => words.includes(term))).toEqual([])
  })

  /**
   * Numbered, and the number is a real element rather than a list marker: a
   * marker cannot be styled to carry the eye down three steps, and without that
   * these read as three unrelated claims instead of one sequence.
   */
  it("numbers the steps, and hides the numbers from a screen reader that already counts them", () => {
    const { container } = render(<WhatHappens />)
    const markers = [...container.querySelectorAll('[aria-hidden="true"]')]

    expect(markers.map((marker) => marker.textContent)).toEqual(["1", "2", "3"])
    expect(container.querySelector("ol")).toBeTruthy()
  })
})
