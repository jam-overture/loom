import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { partReading, type PartName as PartNameValue } from "@/app/(portal)/_lib/part-name"

import { PartName } from "./part-name"

const CARD: PartNameValue = { name: "the card “Autumn arrivals”", nodeId: "n_seed9" }

describe("PartName", () => {
  /**
   * The pairing is the whole component. `partReading` is the same two halves as
   * one string, and asserting the rendering against it is how the sentence and
   * the markup are stopped from disagreeing about the space between them.
   */
  it("renders exactly what the part reads as", () => {
    const { container } = render(<PartName part={CARD} />)

    expect(container.textContent).toBe(partReading(CARD))
  })

  /**
   * The rule this component exists to make structural rather than remembered.
   * The portal spent a fortnight printing only the id, and the fix for that is
   * not printing only the name: 22 August settled that identity is not
   * technical detail and does not go behind a disclosure.
   */
  it("never shows the name without the id", () => {
    const { container } = render(<PartName part={CARD} />)

    expect(container.textContent).toContain("the card “Autumn arrivals”")
    expect(container.textContent).toContain("n_seed9")
  })

  /**
   * The half that made widening `PlainLine["subject"]` worth doing. Setting a
   * named part in monospace would undo the naming — a reader skims monospace as
   * machinery and skips it, which is the whole reason an identifier is in it.
   */
  it("sets only the id in monospace, never the words", () => {
    const { container } = render(<PartName part={CARD} />)
    const mono = Array.from(container.querySelectorAll(".font-mono"), (el) => el.textContent)

    expect(mono).toEqual(["n_seed9"])
  })

  it("puts the words before the id, not after it", () => {
    const { container } = render(<PartName part={CARD} />)

    expect(container.textContent?.indexOf("the card")).toBeLessThan(
      container.textContent?.indexOf("n_seed9") ?? -1
    )
  })

  /** A name is never reworded or truncated on the way through. */
  it("never rewrites the name it was given", () => {
    const long = { name: "the heading “Everything you have ever wanted, and…”", nodeId: "n_h" }
    const { container } = render(<PartName part={long} />)

    expect(container.textContent).toBe(partReading(long))
  })
})
