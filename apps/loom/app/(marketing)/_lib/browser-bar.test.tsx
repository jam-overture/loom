import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { themeGround } from "@jam-overture/loom/react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { BROWSER_BAR_META, BrowserBar } from "../_components/browser-bar"
import { renderTree, treeFor } from "./render"
import { siteThemes } from "./registry"
import {
  DEFAULT_THEME,
  SITE_ROUTES,
  SITE_THEME_NAMES,
  SITE_THEMES,
  type SiteRoute,
  type SiteThemeName,
} from "./site"

/**
 * The one colour this site is allowed to name, held to the palette that named
 * it.
 *
 * `<meta name="theme-color">` is outside the page in a way nothing else here is:
 * no stylesheet reaches it, no primitive renders it, and **nothing anybody
 * works on this site with can see it**. It is Chrome's address bar on an
 * Android phone and the area around the page on an iPhone — a desktop browser
 * ignores it, so does every screenshot this lane takes, and so does every other
 * check in this route group. A reader on a phone is the only person who ever
 * finds out.
 *
 * That combination is why this file exists and why it is longer than the
 * component. The failure it prevents is invisible to everyone except the
 * stranger the lane's exit condition is written about, and the version of it
 * that is *worse* than emitting nothing is emitting the wrong colour: a strip
 * that is the right way round and the wrong shade reads as a seam across the top
 * of the page, and the usual conclusion is that the phone does that.
 *
 * So the assertions are all of one shape — **the strip and the top of the page
 * are the same colour** — asked three ways: against the palette the registry
 * resolves, against the variable the page's own markup carries, and against
 * every page of the site.
 */

const ORIGIN = "https://loom.example"

/**
 * A file beside this one, read off disk.
 *
 * The path goes through a parameter rather than being written at the call, and
 * that is load-bearing in two separate ways — both of them Vite rewriting
 * `new URL(..., import.meta.url)` before this file ever runs, and neither of
 * them a runtime error that a stack trace explains:
 *
 * - **A literal** is rewritten into a resolved *asset* URL, so under the `dom`
 *   project — which every `.test.tsx` runs in — `fileURLToPath` is handed an
 *   `http:` address and throws `The URL must be of scheme file`.
 * - **An interpolation** is read by the `import-glob` plugin as a glob, which
 *   refuses the module at transform time: `Invalid glob: "..*\/page.tsx"`, and
 *   the suite does not run at all rather than running and failing.
 *
 * `(docs)/_components/callout.test.tsx` dodges the first the same way, without
 * saying so; this says so, because the obvious one-liner is wrong twice over
 * and neither failure names its cause.
 */
const here = (path: string): string => fileURLToPath(new URL(path, import.meta.url))

const rendered = (route: SiteRoute, theme: SiteThemeName) =>
  renderTree(treeFor(route, { origin: ORIGIN, theme }), { origin: ORIGIN })

/** The tag the page emits, as markup, for a route served in a palette. */
const barFor = (route: SiteRoute, theme: SiteThemeName): string =>
  renderToStaticMarkup(<BrowserBar theme={rendered(route, theme).theme} />)

/**
 * The `content` the tag went out with.
 *
 * Read out of the markup rather than off `themeGround` a second time, because a
 * test that computed the expected value the way the component does would pass
 * on any palette and prove only that one function is deterministic.
 */
const colourIn = (markup: string): string | undefined =>
  /content="([^"]+)"/.exec(markup)?.[1]

/** What the registry says the palette's canvas is, with nothing in between. */
const canvasOf = (theme: SiteThemeName): string => {
  const resolved = siteThemes.resolve(SITE_THEMES[theme].selection)
  if (!resolved.ok) throw new Error(`loom: the site cannot resolve ${theme}`)

  const slot = resolved.value.palette.slots["bg-canvas"]
  if (slot === undefined) throw new Error(`loom: ${theme} declares no bg-canvas`)

  return slot
}

describe("the strip above the page", () => {
  it.each(SITE_THEME_NAMES)("on %s, is the palette's own canvas", (theme) => {
    expect(colourIn(barFor(SITE_ROUTES[0]!, theme))).toBe(canvasOf(theme))
  })

  /**
   * The independent half. `canvasOf` asks the theme registry and the component
   * asks `themeGround`, which are two readings of one palette — true of each
   * other by construction. This one asks the *page*: `themeStyle` mounts
   * `--loom-bg-canvas` on the root element the visitor is served, and the strip
   * is meant to look like that page continuing upward. If the two ever disagree
   * the seam is real and this is the only thing here that would say so.
   */
  it.each(SITE_THEME_NAMES)("on %s, matches the ground the page paints", (theme) => {
    const markup = renderToStaticMarkup(rendered(SITE_ROUTES[0]!, theme).element)
    const mounted = /--loom-bg-canvas:\s*([^;"]+)/.exec(markup)?.[1]?.trim()

    expect(mounted).toBeDefined()
    expect(colourIn(barFor(SITE_ROUTES[0]!, theme))).toBe(mounted)
  })

  it.each(SITE_ROUTES)("$path emits one, in every palette", (route) => {
    for (const theme of SITE_THEME_NAMES) {
      expect(barFor(route, theme)).toContain('name="theme-color"')
      expect(colourIn(barFor(route, theme))).toBe(canvasOf(theme))
    }
  })

  /**
   * Spelled out here, and the only string in this file that is.
   *
   * The first version of the assertion above interpolated `BROWSER_BAR_META`,
   * and the defect matrix caught it: misspelling the constant moved both sides
   * of the comparison and **all twenty-two tests stayed green** while every
   * page emitted a tag no browser reads. It is the same shape as the pair of
   * palette assertions `Loom primitives` found comparing one character to
   * itself on 6 October, and the lesson is the same — a name that comes from
   * outside this repository cannot be checked against our own copy of it.
   *
   * `theme-color` is the web platform's spelling, not ours to choose, so this
   * is the one place the literal belongs.
   */
  it("goes out under the name the browser actually reads", () => {
    expect(BROWSER_BAR_META).toBe("theme-color")
  })
})

/**
 * Why two constants could not have done this, measured rather than asserted.
 *
 * The form every article on the subject recommends is a `media` pair — one
 * colour for `prefers-color-scheme: light` and one for dark, served by the
 * browser without any JavaScript. On an ordinary site it is the right answer.
 * It is wrong here for two separate reasons, and these are both of them:
 * **the palettes are not all one appearance**, so a single constant is wrong on
 * one of them; and **the appearance is named by the address rather than by the
 * reader's machine**, so the pair answers a different question from the one the
 * page answered.
 */
describe("the palettes this site offers", () => {
  it("are not all light, which is what makes the tag worth emitting", () => {
    const schemes = SITE_THEME_NAMES.map((theme) => {
      const resolved = siteThemes.resolve(SITE_THEMES[theme].selection)

      return resolved.ok ? themeGround(resolved.value)?.colorScheme : undefined
    })

    expect(schemes).toContain("dark")
    expect(schemes).toContain("light")
  })

  it("do not all paint the same canvas", () => {
    const canvases = new Set(SITE_THEME_NAMES.map(canvasOf))

    expect(canvases.size).toBeGreaterThan(1)
  })

  /**
   * The default is light, so a reader who never touches the switcher is the one
   * reader the old behaviour was accidentally right for. That is worth holding:
   * it is the reason this defect survived as long as it did, and the reason a
   * fix that only ever got tried on the front door would have looked like a
   * no-op.
   */
  it("arrive on a light one, which is why nobody saw this", () => {
    const resolved = siteThemes.resolve(SITE_THEMES[DEFAULT_THEME].selection)

    expect(resolved.ok && themeGround(resolved.value)?.colorScheme).toBe("light")
  })
})

describe("when there is no colour to give", () => {
  /**
   * There is no fallback theme by design (0049), so *the tree named no theme* is
   * a state the component carries rather than a case it may guess at. An
   * unthemed page keeps the browser's own default, which is the same nothing it
   * had before this existed.
   *
   * The narrower case — a palette whose canvas `themeGround` declines to read —
   * is not reachable from this site and is not faked here: every registered
   * palette declares `bg-canvas` as hex and resolves, which the first describe
   * block measures for all three.
   */
  it("emits nothing at all rather than a guess", () => {
    expect(renderToStaticMarkup(<BrowserBar theme={undefined} />)).toBe("")
  })
})

/**
 * That the thing which cannot be seen is on every page, and keeps being.
 *
 * Nothing in this route group holds a page to rendering a tag it is supposed to
 * render — `announced.test.ts` was written because five of nine pages had
 * quietly stopped calling the share-card library, and `StructuredData` is on all
 * three pages today with nothing saying it must be. **A missing tag is not a
 * broken one**, which is the same class as the missing link this lane filed on
 * 7 October: every check about a tag is a check about a tag that exists.
 *
 * It reads the page sources rather than importing them, which is the one thing
 * available: a page of this site is an `async` component that calls
 * `servedOrigin()`, so no `vitest` run can mount one — the hole the demo lane
 * counted three times in September and October. A source read cannot tell what
 * the component does with the value; the assertions above do that, and this
 * holds the half they cannot see, which is *that a page calls it at all*.
 */
describe("every page of this site", () => {
  /**
   * The page file each route is answered by.
   *
   * Written out rather than built from `route.path`, for the same reason
   * `announced.test.ts` writes its own list out and then one reason more. The
   * shared reason is that the list being hand-written is safe only because the
   * first assertion below holds it to `SITE_ROUTES` in both directions, so a
   * fourth page cannot be added to the site and left out of this file.
   *
   * The extra reason is that building the path from `route.path` cannot be
   * done at all here: an interpolation inside `new URL` is a glob to Vite, and
   * `here` above says what that costs.
   */
  const PAGE_SOURCES: Readonly<Record<string, string>> = {
    "/": "../page.tsx",
    "/how-it-works": "../how-it-works/page.tsx",
    "/what-you-run": "../what-you-run/page.tsx",
  }

  const sourceOf = (route: SiteRoute): string =>
    readFileSync(here(PAGE_SOURCES[route.path]!), "utf8")

  it("has a page file named here, and names no page the site does not serve", () => {
    expect(Object.keys(PAGE_SOURCES).sort()).toEqual(SITE_ROUTES.map((one) => one.path).sort())
  })

  it.each(SITE_ROUTES)("$path renders the strip's tag", (route) => {
    expect(sourceOf(route)).toContain("<BrowserBar theme={rendered.theme} />")
  })

  /**
   * And hands it the theme off its *own* render. A page that resolved the
   * palette a second time to pass it could be serving one palette and declaring
   * another, which is precisely the drift the documentation site's transcribed
   * copy has a test to hold shut. Here there is one reading, and this is it.
   */
  it.each(SITE_ROUTES)("$path takes it off the render it served", (route) => {
    const source = sourceOf(route)

    expect(source).toContain("const rendered = await renderSitePage(")
    expect(source).not.toMatch(/BrowserBar[^/]*themeGround/)
  })
})

/**
 * The component names no colour, which is the rule the rest of this surface
 * lives under and the one this file's subject looks like an exception to.
 *
 * Comments are stripped first, the way `globals.test.ts` does it, because the
 * reasoning in that file has to be allowed to quote the value it is about —
 * `bold`'s canvas is the evidence for the whole change. What must not appear is
 * a colour in the *code*, which is what a shortcut to a constant would look
 * like on the day somebody takes one.
 */
describe("the component's own source", () => {
  const source = readFileSync(here("../_components/browser-bar.tsx"), "utf8")

  const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "")

  it("names no colour", () => {
    expect(code).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    for (const named of ["rgb", "hsl", "oklch", "white", "black"]) {
      expect(code).not.toContain(named)
    }
  })

  it("reads the ground through the published recipe", () => {
    expect(code).toContain('from "@jam-overture/loom/react"')
    expect(code).toContain("themeGround(theme)")
  })
})
