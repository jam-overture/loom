import type { LoomTree } from "@jam-overture/loom"
import { describe, expect, it } from "vitest"

import { BAND } from "./bands"
import { bandsOf, outlineOf } from "./outline"
import { treeFor } from "./render"
import { DEFAULT_THEME, HOME } from "./site"

/**
 * The outline, held against the page it claims to describe.
 *
 * ## What it used to be, and what is left
 *
 * The outline had two halves. One listed the bands a page has; the other —
 * `outlineDiff` — said what a change had done to them, band by band, and was
 * the written half of the demonstration's record panel: *taken off the page*,
 * *not here when you arrived*, *moved up the page*.
 *
 * [0328](../../../../../decisions/0328-the-marketing-site-has-no-demonstration-and-no-mechanism-page.md)
 * removed the demonstration, so there is no change for the second half to
 * describe and the six cases that exercised it have gone with it. **The
 * `outlineDiff` export itself is deliberately left in place**, untested from
 * here: `docs/signals.md` plans a reading that compares two revisions of a
 * page, and a diff over two outlines is the shape that reading wants. Deleting
 * it would be this lane throwing away another lane's groundwork on the grounds
 * that nothing calls it today.
 *
 * What remains is the half that is about a page as written, which is the half
 * every page of this site still has.
 */

const front = (): LoomTree => treeFor(HOME, { theme: DEFAULT_THEME })

describe("the front door's outline", () => {
  const page = front()

  it("names the bands a visitor actually meets, in the order they meet them", () => {
    const names = outlineOf(page)

    expect(names[0]).toBe("The menu")
    expect(names[1]).toBe("The opening")
    expect(names[names.length - 1]).toBe("The foot of the page, and the way out")
    expect(names).toContain(BAND.chain)
    expect(names).toContain(BAND.install)
  })

  it("has a row for every band except the rules between them", () => {
    expect(outlineOf(page)).toHaveLength(bandsOf(page).length)
  })
})
