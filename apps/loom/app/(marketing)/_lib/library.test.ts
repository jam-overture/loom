import { describe, expect, it } from "vitest"

import { catalogueOf } from "@jam-overture/loom/sdk"

import { RESERVED_VOCABULARY } from "./copy"
import { LIBRARY_PARTS, partNameOf } from "./library"
import { siteRegistry } from "./registry"
import { uses } from "./words"

/**
 * The names the site prints for the parts it is built from.
 *
 * The property worth holding is **not** that the list contains any particular
 * name. It is that the list is the registry and not a copy of it: a part
 * registered by `Loom primitives` tomorrow is on this site without anybody in
 * this lane touching a file, and a part removed is off it. Every assertion here
 * is a version of that, which is why they all compare against `catalogueOf`
 * rather than against a fixture.
 */

const catalogue = catalogueOf(siteRegistry)

describe("the parts this site says come with it", () => {
  it("is one name per registered part, and nothing else", () => {
    expect(LIBRARY_PARTS).toHaveLength(catalogue.length)
  })

  it("names every one of them", () => {
    const missing = catalogue
      .map(({ type }) => partNameOf(type))
      .filter((name) => !LIBRARY_PARTS.includes(name))

    expect(missing).toEqual([])
  })

  /**
   * Two parts whose names collided would be printed twice and read as a
   * mistake. Nothing collides today and the projection is lossy enough that
   * something could: `loom.a-b` and `loom.a b` would both come out *A b*.
   */
  it("gives no two parts the same name", () => {
    expect([...new Set(LIBRARY_PARTS)]).toHaveLength(LIBRARY_PARTS.length)
  })

  it("is in the order somebody scanning for one would look", () => {
    expect(LIBRARY_PARTS).toEqual([...LIBRARY_PARTS].sort((a, b) => a.localeCompare(b)))
  })

  /**
   * The band prints these on a page of this site, so they are held to the one
   * rule every string on this site is held to. It is not a theoretical worry:
   * the library has registered `loom.spec`, and a part named for a schema, a
   * tree or a node is exactly the kind of name a framework reaches for.
   */
  it.each(RESERVED_VOCABULARY)("says nothing a visitor would have to look up: %s", (term) => {
    expect(uses(LIBRARY_PARTS.join(" "), term)).toBe(false)
  })

  /**
   * Sentence case over the whole name, and the prefix gone. Written against
   * the three shapes a type takes rather than against three literals, so a
   * fourth shape is a failure here rather than a surprise on the page.
   */
  it("reads a type as a reader would say it", () => {
    expect(partNameOf("loom.card")).toBe("Card")
    expect(partNameOf("loom.feature-grid")).toBe("Feature grid")
    expect(partNameOf("loom.perk-list-item")).toBe("Perk list item")
  })

  it("prints an initialism as one", () => {
    expect(partNameOf("loom.faq")).toBe("FAQ")
    expect(partNameOf("loom.faq-list")).toBe("FAQ list")
  })

  /**
   * The casing table is an exception and has to stay one. Every entry in it
   * has to be a name the projection actually produces, so a part renamed in
   * `src/` leaves a rule here that silences nothing rather than a quiet
   * special case nobody can find.
   */
  it("keeps no casing exception for a part that is not registered", () => {
    for (const name of ["FAQ", "FAQ list"]) {
      expect({ name, printed: LIBRARY_PARTS.includes(name) }).toEqual({ name, printed: true })
    }
  })
})
