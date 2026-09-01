import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { readingOf, type PlainLine } from "@/app/(portal)/_lib/vocabulary"

import { PlainSentence } from "./plain-sentence"

const LINE: PlainLine = {
  before: "Every change that has actually been made to ",
  subject: "t_seed1",
  after: ", newest first.",
}

describe("PlainSentence", () => {
  /**
   * The half a `readingOf` test cannot reach. The line can be perfectly
   * assembled and the component can still drop a piece, and the only thing that
   * notices is a reader.
   */
  it("renders exactly the sentence the line reads as", () => {
    const { container } = render(<PlainSentence line={LINE} />)

    expect(container.textContent).toBe(readingOf(LINE))
  })

  it("keeps the name monospace, because it is a name and not a word", () => {
    const { container } = render(<PlainSentence line={LINE} />)

    expect(container.querySelector(".font-mono")?.textContent).toBe("t_seed1")
  })

  /**
   * A name is never reworded, hyphenated or truncated on the way through. The
   * 22 August finding settled that identity is not technical detail: a reader
   * who cannot see which page they are on cannot act on what they are told
   * about it.
   */
  it("never rewrites the name it was given", () => {
    const { container } = render(
      <PlainSentence line={{ ...LINE, subject: "t_a_very_long_looking_identifier" }} />
    )

    expect(container.textContent).toContain("t_a_very_long_looking_identifier")
  })
})
