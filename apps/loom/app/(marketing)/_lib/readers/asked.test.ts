import type { LoomNode } from "@loom/runtime"
import { READER_SIGNAL_KINDS } from "@loom/runtime/signals"
import { describe, expect, it } from "vitest"

import { bandsOf } from "../outline"
import { siteRegistry } from "../registry"
import { treeFor } from "../render"
import { DEFAULT_THEME, SITE_ROUTES } from "../site"

import { BAND_TYPES, CONTROL_TYPES, DISCLOSURE_TYPES, SITE_SIGNAL_TYPES } from "./asked"

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

const ORIGIN = "https://loom.example"

const pages = () =>
  SITE_ROUTES.map((route) => treeFor(route, { origin: ORIGIN, theme: DEFAULT_THEME }))

const typesIn = (node: LoomNode): readonly string[] =>
  node.kind === "element"
    ? [node.type, ...node.children.flatMap(typesIn)]
    : node.kind === "slot"
      ? node.children.flatMap(typesIn)
      : []

/** Every primitive type this site renders anywhere, on any of its pages. */
const RENDERED: ReadonlySet<string> = new Set(pages().flatMap((page) => typesIn(page.root)))

/** Every kind of band a reader of this site travels through, read off the pages. */
const BANDS: ReadonlySet<string> = new Set(
  pages().flatMap((page) => bandsOf(page).map((band) => band.what))
)

const ASKED_ABOUT: readonly string[] = [...BAND_TYPES, ...CONTROL_TYPES, ...DISCLOSURE_TYPES]

describe("what this site asks about its readers", () => {
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
   * the page are not readings* is a judgement (`asked.ts` has the reasoning, and
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
    })
  })
})
