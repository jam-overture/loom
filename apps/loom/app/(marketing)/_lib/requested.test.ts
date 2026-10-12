import { THEME_PROP_KEY } from "@jam-overture/loom/react"
import { describe, expect, it } from "vitest"

import { asRequested, sameSiteHrefs } from "./requested"
import { treeFor } from "./builders"
import { elementsIn } from "./measure"
import { HOME, HOW_IT_WORKS, SITE_THEMES, SITE_THEME_NAMES, WHAT_YOU_RUN } from "./site"

/**
 * The layer that puts the reader's palette back onto a page that does not carry
 * one.
 *
 * Until 12 October every builder took the palette as an argument and baked it
 * into twelve places — the root's variables and every link in the chrome. A
 * page like that cannot be stored, because *which palette* would the stored row
 * be in? So the stored page names no palette and no origin, and this module is
 * what a request does to it on the way out (0259).
 *
 * That makes this the one piece of the site that runs on **every** page view
 * and rewrites the tree while it does. The tests below are the shape of what it
 * is allowed to touch, and every one of them is a bug this had on the way in.
 */

const ROUTES = [HOME, HOW_IT_WORKS, WHAT_YOU_RUN] as const

const STORED = { origin: "", theme: "minimal", counting: false } as const

const hrefsIn = (tree: ReturnType<typeof treeFor>): readonly string[] =>
  elementsIn(tree.root).flatMap((element) => {
    const href = element.props["href"]

    return typeof href === "string" ? [href] : []
  })

describe("the palette a reader asked for", () => {
  it.each(SITE_THEME_NAMES)("%s lands on the root", (theme) => {
    const worn = asRequested(treeFor(HOME, STORED), { theme })

    expect(worn.root.props[THEME_PROP_KEY]).toEqual(SITE_THEMES[theme].selection)
  })

  /**
   * 0049's claim about what a re-theme is, held against the thing that now does
   * the re-theming.
   *
   * It is also the assertion that killed a feature: an earlier version marked
   * the footer's current palette with `current: true`, which is a prop below
   * the root, and this is the test that said no.
   */
  it.each(SITE_THEME_NAMES)("%s changes nothing below the root but the addresses", (theme) => {
    const stored = treeFor(HOME, STORED)
    const worn = asRequested(stored, { theme })

    const shapeOf = (tree: typeof stored) =>
      elementsIn(tree.root).map((element) => {
        const { href: _href, [THEME_PROP_KEY]: _theme, ...rest } = element.props

        return `${element.type}:${JSON.stringify(rest)}`
      })

    expect(shapeOf(worn)).toEqual(shapeOf(stored))
  })
})

describe("the addresses it rewrites", () => {
  it.each(ROUTES.map((route) => [route.path, route] as const))(
    "%s carries the palette on every one of its own links",
    (_path, route) => {
      const worn = asRequested(treeFor(route, STORED), { theme: "bold" })

      for (const href of sameSiteHrefs(worn)) {
        const named = new URL(href, "https://site.invalid").searchParams.get("theme")

        expect({ href, named: named === null ? "none" : named }).not.toEqual({
          href,
          named: "none",
        })
      }
    }
  )

  /**
   * The bug this had for an hour, and the reason it is pinned by address rather
   * than by count.
   *
   * The walk only mapped a node's `children` when the node was an element, and
   * the header's brand link lives in a **slot** — so the one link a reader sees
   * first was the one link that kept the default palette. Every other link on
   * the page was right, so no count would have caught it.
   */
  it("reaches a link inside a slot", () => {
    const worn = asRequested(treeFor(HOME, STORED), { theme: "editorial" })

    expect(hrefsIn(worn)).toContain("/?theme=editorial")
  })

  /**
   * The footer's switcher, which is the one place a link's palette is its
   * meaning rather than the reader's.
   */
  it("leaves a link that names its own palette alone", () => {
    const worn = asRequested(treeFor(HOW_IT_WORKS, STORED), { theme: "bold" })
    const offered = hrefsIn(worn).filter((href) => href.startsWith(`${HOW_IT_WORKS.path}?theme=`))

    /*
     * The distinct palettes offered, not the list — a link to the page the
     * reader is already on legitimately picks up their palette too, so there
     * are more of these hrefs than there are switcher links. What the switcher
     * being intact means is that all three palettes are still reachable from
     * it; overwriting them with the reader's would leave only one.
     */
    expect([...new Set(offered)].sort()).toEqual(
      SITE_THEME_NAMES.map((name) => `${HOW_IT_WORKS.path}?theme=${name}`).sort()
    )
  })

  /**
   * Another lane's address is not this site's to dress.
   *
   * `/docs`, `/demo` and `/portal` are paths on the same deployment and would
   * pass any `startsWith("/")` test — which is exactly what the first version
   * did, handing `/portal?theme=bold` to a route group that has never heard of
   * this site's palettes.
   */
  it.each(["/docs", "/demo", "/portal", "/lessons"])("leaves %s alone", (path) => {
    const worn = asRequested(treeFor(WHAT_YOU_RUN, STORED), { theme: "bold" })

    for (const href of hrefsIn(worn)) {
      if (href === path || href.startsWith(`${path}?`) || href.startsWith(`${path}#`)) {
        expect(href).toBe(path)
      }
    }
  })

  it("leaves somebody else's site alone", () => {
    const worn = asRequested(treeFor(WHAT_YOU_RUN, STORED), { theme: "bold" })

    for (const href of hrefsIn(worn).filter((candidate) => candidate.startsWith("http"))) {
      expect(href).not.toContain("theme=")
    }
  })
})
