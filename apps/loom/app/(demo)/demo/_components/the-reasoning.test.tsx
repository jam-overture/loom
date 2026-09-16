import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { WEIGHED_QUESTIONS, type WeighedAnswer } from "@/app/(demo)/_lib/weighed"

import { TheReasoning } from "./the-reasoning"

/**
 * Folded is not removed, and that is the whole of what this file checks.
 *
 * The maintainer's direction for this surface is *plain language is the
 * default, the technical record is one click away, **nothing is ever
 * removed***. A fold that dropped the rule, or lost the second answer, or
 * rendered a disclosure that opened on nothing would satisfy the first two
 * clauses and break the third — and it would look fine, because a shorter card
 * is what this change is for. So every assertion below is about the folded case
 * still containing what the open case contains.
 *
 * `<details>` renders its children in the DOM whether or not it is open, which
 * is why these can be read without opening anything — and is also the reason
 * the fold was built this way rather than with state: browser find-in-page
 * reaches inside a closed one.
 */

const ANSWERS: readonly WeighedAnswer[] = [
  {
    question: WEIGHED_QUESTIONS.damage,
    verdict: "Some risk",
    meaning: "Worth a look before you say yes, but nothing drastic.",
  },
  {
    question: WEIGHED_QUESTIONS.reversal,
    verdict: "Yes",
    meaning: "The 4 pieces it takes off the page are kept, so the exact opposite already exists.",
  },
]

const RULE = "A change this big is not something Loom may make on its own."
const CEILING = "You asked for this yourself, so Loom may act on its own up to Low risk."
const BRIEF = "Some risk, and you could undo it."

const ALL = { answers: ANSWERS, rule: RULE, ceiling: CEILING, brief: BRIEF } as const

describe("the gate's working, shown", () => {
  it("prints the two answers, the rule and the comparison with nothing to press", () => {
    const { container } = render(<TheReasoning {...ALL} reasoning="open" />)

    expect(screen.getByText(WEIGHED_QUESTIONS.damage)).toBeTruthy()
    expect(screen.getByText(WEIGHED_QUESTIONS.reversal)).toBeTruthy()
    expect(screen.getByText(RULE)).toBeTruthy()
    expect(screen.getByText(CEILING)).toBeTruthy()
    expect(container.querySelector("details")).toBeNull()
  })

  /**
   * The open case is a fragment so the three blocks stay direct children of the
   * card's own column. A wrapper here would change the spacing on every card in
   * the rail, which no assertion in `record-card.test.tsx` would catch.
   */
  it("does not put the three inside a container of its own", () => {
    const { container } = render(<TheReasoning {...ALL} reasoning="open" />)

    expect(container.children).toHaveLength(3)
  })
})

describe("the gate's working, folded", () => {
  it("is one disclosure", () => {
    const { container } = render(<TheReasoning {...ALL} reasoning="folded" />)

    expect(container.querySelectorAll("details")).toHaveLength(1)
  })

  /** The assertion this file was written for. */
  it("still contains every word the open card showed", () => {
    render(<TheReasoning {...ALL} reasoning="folded" />)

    expect(screen.getByText(WEIGHED_QUESTIONS.damage)).toBeTruthy()
    expect(screen.getByText(WEIGHED_QUESTIONS.reversal)).toBeTruthy()
    expect(screen.getByText(ANSWERS[1]!.meaning)).toBeTruthy()
    expect(screen.getByText(RULE)).toBeTruthy()
    expect(screen.getByText(CEILING)).toBeTruthy()
  })

  /**
   * The verdict is in the summary rather than a category like "Technical
   * details", so a visitor four cards down reads what the card concluded
   * without opening it, and clicks only for the working.
   */
  it("says what the working concluded, in the line you do not have to click", () => {
    const { container } = render(<TheReasoning {...ALL} reasoning="folded" />)

    expect(container.querySelector("summary")?.textContent).toContain(BRIEF)
  })

  /**
   * The panel is not all that is down there, and a disclosure that hid the rule
   * without saying so would be the one removal this surface does not allow
   * itself.
   */
  it("names the rule as being under the arrow too", () => {
    const { container } = render(<TheReasoning {...ALL} reasoning="folded" />)

    expect(container.querySelector("summary")?.textContent).toContain("the rule that read it")
  })

  /**
   * An ask that never reached assessment has no verdict to summarise, and a
   * summary inventing one would be the surface answering a question the runtime
   * never asked (`weighed.ts`).
   */
  it("names what is behind the arrow rather than claiming a verdict it was not given", () => {
    const { container } = render(<TheReasoning rule={RULE} reasoning="folded" />)

    expect(container.querySelector("summary")?.textContent).toContain("What Loom weighed")
    expect(screen.getByText(RULE)).toBeTruthy()
  })
})

describe("an ask with no working to show", () => {
  /**
   * A disclosure that opened on nothing is worse than no disclosure: it is a
   * promise of a record, on the one surface whose product is the record.
   */
  it("renders nothing at all, folded or open", () => {
    const { container: folded } = render(<TheReasoning reasoning="folded" />)
    const { container: open } = render(<TheReasoning reasoning="open" />)

    expect(folded.innerHTML).toBe("")
    expect(open.innerHTML).toBe("")
  })
})
