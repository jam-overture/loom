import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { pieceUsage, unusedPieces } from "@/app/(portal)/_lib/app-view"
import { portalRegistry } from "@/app/(portal)/_lib/registry"
import { seedTree } from "@/app/(portal)/_lib/seed"
import { runtimeWordsIn } from "@/app/(portal)/_test/plain-language"

import { PieceTally } from "./piece-tally"

const used = pieceUsage(portalRegistry, [seedTree()])
const none = pieceUsage(portalRegistry, [])

const tally = (
  pieces = used,
  missing: readonly { readonly type: string; readonly name: string }[] = [],
  library: string | null = null
) => render(<PieceTally pieces={pieces} missing={missing} library={library} />)

describe("PieceTally", () => {
  it("counts how often each piece in use is used", () => {
    const { container } = tally()

    expect(container.textContent).toContain("Heading")
    expect(container.textContent).toContain("×2")
  })

  /**
   * Opposite shapes for opposite questions. For a piece in use the number is the
   * news; for a piece used nowhere the *name* is, and a single list with a `0` in
   * the corner buries the one row worth acting on among the ones that are fine.
   */
  it("names the pieces nothing uses, rather than printing a zero beside them", () => {
    const { container } = tally(none)

    expect(container.textContent).toContain("pieces are registered and nothing uses them")
    expect(container.textContent).not.toContain("×0")
  })

  it("says nothing of the sort when every registered piece is on a page", () => {
    const { container } = tally(used)

    expect(container.textContent).not.toContain("nothing uses")
  })

  it("puts one in the singular rather than making a reader read a 1", () => {
    const { container } = tally([used[0]!, { ...used[1]!, used: 0 }])

    expect(container.textContent).toContain("One piece is registered and nothing uses it")
  })

  /**
   * Neutral by construction. Registering fewer pieces is how a host keeps a page
   * on-brand, and the names go one click down because ninety of them is a list
   * rather than a sentence.
   */
  it("says how much of the library is turned on, with the names one click down", () => {
    const { container } = tally(used, [{ type: "loom.faq", name: "Faq" }], "Loom ships 90 pieces.")
    const details = container.querySelectorAll("details")

    expect(container.textContent).toContain("Loom ships 90 pieces.")
    expect([...details].some((one) => one.textContent?.includes("loom.faq"))).toBe(true)
  })

  it("says nothing about the library when it has nothing to say", () => {
    const { container } = tally(used, [], null)

    expect(container.textContent).not.toContain("Loom ships")
  })

  /**
   * The governing principle. The catalogue's own words are exactly what the model
   * is told (0013) and belong one click down; everything above that is a
   * reader's.
   */
  it("keeps the runtime's vocabulary behind the disclosures", () => {
    const { container } = tally(none)

    for (const details of [...container.querySelectorAll("details")]) details.remove()

    expect(runtimeWordsIn(container.textContent ?? "")).toEqual([])
  })

  it("keeps every piece's own line, unaltered, one click down", () => {
    const { container } = tally(used)
    const details = [...container.querySelectorAll("details")]

    expect(unusedPieces(used)).toEqual([])
    expect(details.some((one) => one.textContent?.includes("loom.card"))).toBe(true)
  })
})
