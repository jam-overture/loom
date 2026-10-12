import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { primitiveTypeSchema } from "@jam-overture/loom"

import { unusedPieces } from "@/app/(portal)/_lib/app-view"
import { runtimeWordsIn } from "@/app/(portal)/_test/plain-language"

import { PieceTally } from "./piece-tally"

/**
 * Rows built here rather than taken off the registry.
 *
 * `pieceUsage(portalRegistry, [seedTree()])` used to be *every registered piece,
 * all of them used*, because the portal registered the four its seed is built
 * from. It registers the library as of 11 October, so that expression is now
 * four used and a hundred and three not — which is a fine fixture for one case
 * and the wrong one for every other. The cases are named here instead.
 */
const row = (type: string, name: string, count: number) => ({
  type: primitiveTypeSchema.parse(type),
  name,
  description: `the ${name.toLowerCase()}`,
  used: count,
})

/** Every piece in the list is on a page. */
const used = [row("loom.page", "Page", 1), row("loom.heading", "Heading", 2)]

/** Nothing in the list is on any page. */
const none = used.map((piece) => ({ ...piece, used: 0 }))

/**
 * A host that declined part of the library, which is what makes an unused piece
 * worth reporting as a finding. `missing` being non-empty is the discriminator —
 * see `unusedReading` in `_lib/app-view.ts`.
 */
const DECLINED = [{ type: "loom.faq", name: "Faq" }]

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
    const { container } = tally(none, DECLINED)

    expect(container.textContent).toContain("pieces are registered and nothing uses them")
    expect(container.textContent).not.toContain("×0")
  })

  /**
   * **And reads them the other way on an app that declined nothing**, which is
   * this deployment since 11 October. *103 pieces are registered and nothing
   * uses them* is every word true and the advice under it wrong: a one-page app
   * has not mislaid a hundred and three things. The names stay on screen either
   * way; only what they mean changes.
   */
  it("reads unused pieces as the library being larger when the app declined nothing", () => {
    const { container } = tally(none, [])

    expect(container.textContent).not.toContain("nothing uses them")
    expect(container.textContent).toContain("Loom ships")
    expect(container.textContent).toContain("nothing to do about the rest")
  })

  /**
   * And the names are not listed twice. On that reading they are not the news,
   * and a hundred of them in a panel is a wall.
   *
   * **Nothing is removed**: the piece is in the catalogue disclosure below,
   * under its registered name with its description. The plain name is the
   * surface word and the registered one is the record's, which is the division
   * this whole surface is built on rather than a shortfall in it.
   */
  it("leaves the names to the catalogue when they are not the finding", () => {
    const { container } = render(
      <PieceTally pieces={[row("loom.page", "Page", 1), row("loom.nav", "Nav", 0)]} missing={[]} library={null} />
    )
    const surface = container.cloneNode(true) as HTMLElement

    for (const one of [...surface.querySelectorAll("details")]) one.remove()

    expect(surface.textContent).not.toContain("Nav")
    expect(container.textContent).toContain("loom.nav")
  })

  it("says nothing of the sort when every registered piece is on a page", () => {
    const { container } = tally(used)

    expect(container.textContent).not.toContain("nothing uses")
  })

  it("puts one in the singular rather than making a reader read a 1", () => {
    const { container } = tally([used[0]!, { ...used[1]!, used: 0 }], DECLINED)

    expect(container.textContent).toContain("One piece is registered and nothing uses it")
  })

  /**
   * Neutral by construction. Registering fewer pieces is how a host keeps a page
   * on-brand, and the names go one click down because ninety of them is a list
   * rather than a sentence.
   */
  it("says how much of the library is turned on, with the names one click down", () => {
    const { container } = tally(used, DECLINED, "Loom ships 90 pieces.")
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
    expect(details.some((one) => one.textContent?.includes("loom.heading"))).toBe(true)
  })
})
