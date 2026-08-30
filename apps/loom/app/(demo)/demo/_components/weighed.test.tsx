import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { WEIGHED_QUESTIONS } from "@/app/(demo)/_lib/weighed"

import { Weighed } from "./weighed"

const ANSWERS = [
  {
    question: WEIGHED_QUESTIONS.damage,
    verdict: "Some risk",
    meaning: "Worth a look before you say yes, but nothing drastic.",
  },
  {
    question: WEIGHED_QUESTIONS.reversal,
    verdict: "Yes",
    meaning: "The 4 pieces it takes off the page are kept.",
  },
] as const

describe("the block that answers both", () => {
  it("prints each question and its answer", () => {
    render(<Weighed answers={ANSWERS} />)

    for (const answer of ANSWERS) {
      expect(screen.getByText(answer.question)).toBeTruthy()
      expect(screen.getByText(answer.meaning, { exact: false })).toBeTruthy()
    }
  })

  /**
   * A description list rather than two paragraphs, so a screen reader gets the
   * pairing rather than four sentences in a row.
   */
  it("pairs them, for a reader who cannot see the layout", () => {
    const { container } = render(<Weighed answers={ANSWERS} />)

    expect(container.querySelectorAll("dt")).toHaveLength(2)
    expect(container.querySelectorAll("dd")).toHaveLength(2)
  })

  it("keeps the two in the order they were asked", () => {
    const { container } = render(<Weighed answers={ANSWERS} />)
    const asked = [...container.querySelectorAll("dt")].map((term) => term.textContent)

    expect(asked).toEqual([WEIGHED_QUESTIONS.damage, WEIGHED_QUESTIONS.reversal])
  })
})
