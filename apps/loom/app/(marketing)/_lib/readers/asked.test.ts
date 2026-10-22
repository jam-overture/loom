import type { LoomNode } from "@jam-overture/loom"
import { READER_SIGNAL_KINDS } from "@jam-overture/loom/signals"
import { beforeAll, describe, expect, it } from "vitest"

import { bandsOf } from "../outline"
import { siteRegistry } from "../registry"
import { SERVED_STATE_COUNT, servedPages, type ServedPage } from "../served"
import { SITE_ROUTES } from "../site"

import {
  BAND_TYPES,
  COMPLETION_TYPES,
  CONTROL_TYPES,
  DISCLOSURE_TYPES,
  SITE_SIGNAL_TYPES,
} from "./asked"

/**
 * What this site asks to be told about its readers, held against what this site
 * actually is.
 *
 * The lists in `asked.ts` are pinned rather than computed, which is the right
 * way round and leaves exactly one hole: a list nothing checks goes stale
 * silently, and the symptom is a deployment quietly collecting nothing about a
 * band it now has. So the pages are walked here and the answers compared — the
 * arrangement #315's two passing mutations argued for, where the code names the
 * editorial choice and the test derives the fact.
 */

const typesIn = (node: LoomNode): readonly string[] =>
  node.kind === "element"
    ? [node.type, ...node.children.flatMap(typesIn)]
    : node.kind === "slot"
      ? node.children.flatMap(typesIn)
      : []

const ASKED_ABOUT: readonly string[] = [...BAND_TYPES, ...CONTROL_TYPES, ...DISCLOSURE_TYPES]

/**
 * **This file read the page as written until 22 October**, and the broadcaster
 * runs on the page as served.
 *
 * `treeFor` returns a route's tree before anything a request supplies, which is
 * three trees; `servedPages` returns the 75 trees this site is actually served
 * as, each route crossed with the 25 states a request can leave it in. Measured
 * on the day this moved, the difference is one primitive: **`loom.callout`** is
 * on this site and was on no tree this file had ever looked at. It is the panel
 * that reports what a request did, so it exists only after one.
 *
 * Nothing asks about `loom.callout` and no assertion here changed colour, which
 * is the point: a sweep shaped to the input of the thing a visitor gets had
 * been one primitive short of the site for as long as the record panel has
 * existed, and the only reason it never said anything wrong is that the one
 * thing it could not see is not a type these lists name. `served.ts` records
 * the same lesson for copy, and this is the seventh file to take it.
 */
describe("what this site asks about its readers", () => {
  let pages: readonly ServedPage[] = []

  /** Every primitive type this site renders anywhere, on any page, in any state. */
  let RENDERED: ReadonlySet<string> = new Set()

  /** Every kind of band a reader of this site travels through, read off the pages. */
  let BANDS: ReadonlySet<string> = new Set()

  beforeAll(async () => {
    pages = await servedPages()
    RENDERED = new Set(pages.flatMap((page) => typesIn(page.tree.root)))
    BANDS = new Set(pages.flatMap((page) => bandsOf(page.tree).map((band) => band.what)))
  })

  /**
   * Every rule below is *nothing on this site is X*, and a sweep that came back
   * with nothing satisfies all of them. So the sweep is held first, and to
   * something `served.ts` does not compute: that it reached every page of the
   * site, and that there are at least three of them.
   */
  it("read every page of this site, in every state it can be served in", () => {
    expect(pages).toHaveLength(SERVED_STATE_COUNT)
    expect([...new Set(pages.map((page) => page.route.path))].sort()).toEqual(
      [...SITE_ROUTES.map((route) => route.path)].sort()
    )
    expect(SITE_ROUTES.length).toBeGreaterThanOrEqual(3)
  })

  /**
   * The alarm a fifth kind trips.
   *
   * `completed` is the one already approved, and the day it lands this fails —
   * which is the moment somebody can still decide whether a form being
   * submitted is a thing this site wants to hear about and which primitives it
   * would be about. Without this, a new kind would be reported for *every*
   * addressed type, because a kind `types` does not name is unfiltered.
   */
  it("says something about every kind of signal the runtime has", () => {
    expect(Object.keys(SITE_SIGNAL_TYPES).sort()).toEqual([...READER_SIGNAL_KINDS].sort())
  })

  it("asks only about primitives this site is allowed to build with", () => {
    const registered = new Set<string>(siteRegistry.primitives.map((primitive) => primitive.type))

    for (const type of ASKED_ABOUT) {
      expect(registered.has(type), `${type} is not in the site's registry`).toBe(true)
    }
  })

  /**
   * A type asked about that nothing renders is a promise about a page that does
   * not exist. It is also how a list like this rots: a band renamed in one
   * place and left here reads as deliberate.
   */
  it("asks only about primitives this site actually renders", () => {
    for (const type of ASKED_ABOUT) {
      expect(RENDERED.has(type), `nothing on this site renders ${type}`).toBe(true)
    }
  })

  /**
   * The other direction, which is the one that catches a band added to a page
   * and not to the list: every band this site has is either asked about or is
   * one of the two chrome bands deliberately left out.
   *
   * They are named here rather than derived, because *the menu and the foot of
   * the page are not readings* is a judgment (`asked.ts` has the reasoning, and
   * the sticky bar is the half of it that would actually mislead a report). A
   * band type nobody has considered fails this and gets considered.
   */
  it("asks about every band of every page except the two chrome bands", () => {
    expect([...BANDS].sort()).toEqual([...BAND_TYPES, "loom.footer", "loom.nav"].sort())
  })

  it("asks nothing about a band it does not name", () => {
    expect(SITE_SIGNAL_TYPES).toEqual({
      viewed: [...BAND_TYPES],
      dwelled: [...BAND_TYPES],
      activated: [...CONTROL_TYPES],
      disclosed: [...DISCLOSURE_TYPES],
      completed: [...COMPLETION_TYPES],
    })
  })

  /**
   * The empty list is the site's answer to the fifth kind and it is only right
   * while the site has nothing to submit. Asserted from the pages rather than
   * from the list, so the day a band grows a form this says the list has
   * stopped being the answer — the alarm above cannot fire twice for one kind.
   *
   * ## It could not fire, from the day it was written until 22 October
   *
   * It asked `BANDS.has("loom.form")`, and `BANDS` is what `bandsOf` returns:
   * the types of `page.root.children`, which is the **top level of the page and
   * nothing under it**. A form is not a band. It goes inside a section, the way
   * every control on this site does, so the one thing this rule was written to
   * notice is the one thing that set could never hold — and `loom.form` is in
   * the starter registry, so a page builder could have rendered one any day
   * and this would have stayed green.
   *
   * Checked by putting a `loom.form` on the front door rather than by reading:
   * the rule as it stood passed with the form on the page, and the rule below
   * fails on it. It is the same shape as the `counting` hole closed in
   * `handed.test.ts` yesterday — a check written for a shape it cannot match —
   * and the fix is the same, which is to ask the question of the whole tree.
   *
   * `RENDERED` is every type on every page in every state, so a form anywhere,
   * including one that only appears after a visitor has asked for something,
   * is this list's business.
   */
  it("asks about no completions because there is nothing here to complete", () => {
    const submittable = ["loom.form", "loom.field"].filter(
      (type) => RENDERED.has(type) || ASKED_ABOUT.includes(type)
    )

    expect([submittable, [...COMPLETION_TYPES]]).toEqual([[], []])
  })
})
