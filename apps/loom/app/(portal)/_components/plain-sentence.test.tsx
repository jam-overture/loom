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

  /**
   * A subject that has been named is words *and* an id, and the two are set
   * differently. This is the case the union in `PlainLine["subject"]` exists
   * for, and it is why widening that type broke three components at compile
   * time: each had its own `<span className="font-mono">` around the subject
   * and would have set the words in monospace along with the id.
   */
  describe("a subject that has been named", () => {
    const NAMED: PlainLine = {
      before: "Deleted ",
      subject: { name: "the card “Autumn arrivals”", nodeId: "n_seed9" },
      after: " and everything inside it.",
    }

    it("renders exactly the sentence the line reads as", () => {
      const { container } = render(<PlainSentence line={NAMED} />)

      expect(container.textContent).toBe(readingOf(NAMED))
      expect(container.textContent).toBe(
        "Deleted the card “Autumn arrivals” n_seed9 and everything inside it."
      )
    })

    it("sets only the id in monospace, so the words read as words", () => {
      const { container } = render(<PlainSentence line={NAMED} />)
      const mono = Array.from(container.querySelectorAll(".font-mono"), (el) => el.textContent)

      expect(mono).toEqual(["n_seed9"])
    })

    it("keeps the id on the line, never trading it for the name", () => {
      const { container } = render(<PlainSentence line={NAMED} />)

      expect(container.textContent).toContain("n_seed9")
    })
  })
})
