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

  /**
   * Whose questions these are, and when they were asked. Without the heading a
   * visitor who has not read the rail meets two questions apparently put to
   * them — and on an answered card the portal's sentence for `medium` reads
   * *"Worth a look before you say yes"* under a badge saying **Applied**.
   */
  it("names the block, so the two answers read as Loom's working rather than a question", () => {
    render(<Weighed answers={ANSWERS} />)

    expect(screen.getByRole("heading", { name: /what Loom weighed/i })).toBeTruthy()
  })

  /**
   * A card list renders one of these per record, so an id inside would be a
   * dozen elements sharing one.
   */
  it("carries no id, because a page holds many of it", () => {
    const { container } = render(<Weighed answers={ANSWERS} />)

    expect(container.querySelectorAll("[id]")).toHaveLength(0)
  })
})
