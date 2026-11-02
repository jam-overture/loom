import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { themeGround, themeStyle } from "@jam-overture/loom/react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { DOCUMENT_THEME_HREF, DocumentTheme } from "../_components/document-theme"
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
 * The rule the document is given, held to the palette that is in the address.
 *
 * It is `browser-bar.test.tsx`'s subject one step out. The strip above the page
 * is one thing a stylesheet cannot reach; these are the other three — the
 * scrollbar beside the document, the canvas past the end of a short page, and
 * an unstyled form control — and they read one declaration, `color-scheme`,
 * which until today appeared **nought times in the served document** on every
 * palette this site offers.
 *
 * The same thing that makes this worth a file makes it hard: **nothing anybody
 * works on this site with can see it.** A desktop screenshot excludes the
 * scrollbar, the overscroll canvas only exists while a finger is dragging past
 * the end, and no other check in this route group reads the document element at
 * all. So the assertions here are of one shape — **the document and the page
 * agree about the palette** — asked four ways: against the palette the registry
 * resolves, against the variables the page's own root mounts, against the
 * colour the strip above it was told, and against every page of the site.
 *
 * The one thing it deliberately does not assert is the hoist. `precedence` is
 * what asks React to lift the rule into the head, and whether it arrives there
 * is React's behaviour in a document this route group does not render —
 * measured by hand off the production build and recorded in the report, which
 * is the same split `BrowserBar` was built under.
 */

const ORIGIN = "https://loom.example"

/**
 * A file beside this one, read off disk.
 *
 * The path goes through a parameter rather than being written at the call for
 * the two reasons `browser-bar.test.tsx` sets out at length, both of them Vite
 * rewriting `new URL(..., import.meta.url)` before this file runs: a literal
 * becomes an `http:` asset URL that `fileURLToPath` refuses, and an
 * interpolation is read as a glob and refuses the module at transform time.
 */
const here = (path: string): string => fileURLToPath(new URL(path, import.meta.url))

const rendered = (route: SiteRoute, theme: SiteThemeName) =>
  renderTree(treeFor(route, { theme }), { origin: ORIGIN })

/** The element the page emits, as markup, for a route served in a palette. */
const ruleFor = (route: SiteRoute, theme: SiteThemeName): string =>
  renderToStaticMarkup(<DocumentTheme theme={rendered(route, theme).theme} />)

/**
 * The CSS the element went out carrying.
 *
 * Read out of the markup rather than by calling `themeDocumentCss` a second
 * time, because a test that computed the expected text the way the component
 * does would pass on any palette and prove only that one function is
 * deterministic. That is the shape this lane filed on 8 October about a test
 * interpolating the constant it was meant to pin.
 */
const cssIn = (markup: string): string | undefined =>
  /<style[^>]*>([\s\S]*)<\/style>/.exec(markup)?.[1]

/** One declaration's value out of a rule, by property name. */
const declared = (css: string, property: string): string | undefined =>
  new RegExp(`(?:^|[;{\\s])${property}:\\s*([^;\\n]+)`).exec(css)?.[1]?.trim()

/** What the registry says the palette is, with nothing in between. */
const resolve = (theme: SiteThemeName) => {
  const resolved = siteThemes.resolve(SITE_THEMES[theme].selection)
  if (!resolved.ok) throw new Error(`loom: the site cannot resolve ${theme}`)

  return resolved.value
}

describe("the rule the document is given", () => {
  it.each(SITE_THEME_NAMES)("on %s, is written for the document element", (theme) => {
    const css = cssIn(ruleFor(SITE_ROUTES[0]!, theme))

    expect(css).toBeDefined()
    expect(css!.trimStart().startsWith(":root {")).toBe(true)
  })

  /**
   * The selector is the whole change and the one part of it that could be
   * wrong while everything else here passed.
   *
   * `:root` **is** the document element. The same declarations on a wrapper
   * inside the document leave the browser's own light default on the scrollbar
   * and on the canvas past the end of the page — which is the state this site
   * shipped, and 0334's reason for refusing the one-line fix in the root
   * primitive. A rule that named `body`, `html body` or a class would carry the
   * right colour for the wrong element and no other assertion in this file
   * would notice.
   */
  it.each(SITE_THEME_NAMES)("on %s, names no element but the root", (theme) => {
    const selectors = [...cssIn(ruleFor(SITE_ROUTES[0]!, theme))!.matchAll(/([^{}]*)\{/g)].map(
      (match) => match[1]!.trim()
    )

    expect(selectors).toEqual([":root"])
  })

  it.each(SITE_THEME_NAMES)("on %s, says which way round the palette is", (theme) => {
    const css = cssIn(ruleFor(SITE_ROUTES[0]!, theme))!

    expect(declared(css, "color-scheme")).toBe(themeGround(resolve(theme))?.colorScheme)
  })

  /**
   * The case that was measured, named rather than derived.
   *
   * `bold` is the palette the defect was found on and the only one of the three
   * whose appearance is dark, so an arithmetic slip that reported every palette
   * light would satisfy the assertion above on two of three and this is the one
   * that would say so. The literal belongs here for the same reason
   * `theme-color` does in `browser-bar.test.tsx`: `dark` is the web platform's
   * word and not ours to choose.
   */
  it("on bold, which is the palette this was measured on, says dark", () => {
    expect(declared(cssIn(ruleFor(SITE_ROUTES[0]!, "bold"))!, "color-scheme")).toBe("dark")
  })

  it.each(SITE_THEME_NAMES)("on %s, paints the document the palette's own canvas", (theme) => {
    const css = cssIn(ruleFor(SITE_ROUTES[0]!, theme))!

    expect(declared(css, "background-color")).toBe(resolve(theme).palette.slots["bg-canvas"])
  })

  /**
   * The independent half, and the reason this is worth asserting twice.
   *
   * Everything above asks the registry or `themeGround`, which are two readings
   * of one palette and true of each other by construction. This one asks the
   * **page**: `themeStyle` mounts `--loom-bg-canvas` on the root element the
   * visitor is served, and the document is meant to look like that page
   * continuing past its edges. If the two ever disagree the seam is real, and
   * on a short page under `bold` it is a white band under a black page.
   */
  it.each(SITE_THEME_NAMES)("on %s, matches the ground the page itself paints", (theme) => {
    const markup = renderToStaticMarkup(rendered(SITE_ROUTES[0]!, theme).element)
    const mounted = /--loom-bg-canvas:\s*([^;"]+)/.exec(markup)?.[1]?.trim()

    expect(mounted).toBeDefined()
    expect(declared(cssIn(ruleFor(SITE_ROUTES[0]!, theme))!, "background-color")).toBe(mounted)
  })

  /**
   * And the third reading of the same colour, which is the strip above the page.
   *
   * The two tags are emitted by two components off one render, and they are the
   * document's two halves of one claim: the bar above the page and the canvas
   * past the end of it are the same colour as the page. Holding them to each
   * other here means a change to either one cannot quietly make them disagree,
   * which is the drift the documentation site's transcribed copy needs a test
   * to hold shut and this surface had no equivalent of.
   */
  it.each(SITE_THEME_NAMES)("on %s, agrees with the strip above the page", (theme) => {
    const ground = themeGround(resolve(theme))

    expect(ground?.backgroundColor).toBeDefined()
    expect(declared(cssIn(ruleFor(SITE_ROUTES[0]!, theme))!, "background-color")).toBe(
      ground?.backgroundColor
    )
  })

  /**
   * The ramps, which are the one place two defaults have to keep agreeing.
   *
   * `themeDocumentCss` mounts `fluid` ramps unless told otherwise and
   * `renderTree` asks for the same, because a render only mounts `fixed` ramps
   * for a caller that wants literals and nothing on this surface does (0283).
   * The two are separate defaults in separate modules, so a change to either
   * would leave the document carrying one set of lengths and the tree another
   * — invisible, because the variables the document's copy holds are read by
   * nothing inside the tree. This is what would say so.
   */
  it.each(SITE_THEME_NAMES)("on %s, mounts the variables the tree mounts", (theme) => {
    const css = cssIn(ruleFor(SITE_ROUTES[0]!, theme))!
    const mounted = themeStyle(resolve(theme)) as Readonly<Record<string, string>>

    for (const [name, value] of Object.entries(mounted)) {
      if (!name.startsWith("--")) continue
      expect(declared(css, name)).toBe(String(value))
    }
  })
})

/**
 * Why one constant could not have done this, measured rather than asserted.
 *
 * It is `browser-bar.test.tsx`'s argument about the `media` pair, and it holds
 * here for the narrower reason: a `color-scheme` written into `globals.css`
 * would be one word for three palettes, and one of the three disagrees with the
 * other two. The palettes are also named by the **address** rather than by the
 * reader's machine, so the form every article recommends answers a different
 * question from the one the page answered.
 */
describe("the palettes this site offers", () => {
  it("are not all one appearance, which is what makes the rule worth emitting", () => {
    const schemes = SITE_THEME_NAMES.map((theme) => themeGround(resolve(theme))?.colorScheme)

    expect(schemes).toContain("dark")
    expect(schemes).toContain("light")
  })

  /**
   * The default is light, so a reader who never touches the switcher is the one
   * reader the old behaviour was accidentally right for — the same reason the
   * strip above the page survived as long as it did, and the reason a fix tried
   * only on the front door in its default palette would have looked like a
   * no-op.
   */
  it("arrive on a light one, which is why nobody saw this", () => {
    expect(themeGround(resolve(DEFAULT_THEME))?.colorScheme).toBe("light")
  })
})

describe("when there is no palette to report", () => {
  /**
   * There is no fallback theme by design (0049), so *the tree named no theme* is
   * a state the component carries rather than a case it may guess at. An
   * unthemed page emits no rule and keeps the browser's own defaults, which is
   * the same nothing it had before this existed — and is strictly better than a
   * rule naming the house palette on a page wearing something else.
   */
  it("emits nothing at all rather than a guess", () => {
    expect(renderToStaticMarkup(<DocumentTheme theme={undefined} />)).toBe("")
  })
})

/**
 * That the thing which cannot be seen is on every page, and keeps being.
 *
 * The same hole `browser-bar.test.tsx` and `announced.test.ts` were written
 * against: **a missing tag is not a broken one**, and nothing else in this
 * route group holds a page to rendering something it draws nothing with. It
 * reads the page sources rather than importing them, which is the one thing
 * available — a page of this site is an `async` component that calls
 * `servedOrigin()`, so no `vitest` run can mount one. A source read cannot say
 * what the page does with the value; the assertions above do that, and this
 * holds the half they cannot see, which is *that a page calls it at all*.
 */
describe("every page of this site", () => {
  /**
   * The page file each route is answered by, written out rather than built from
   * `route.path` — an interpolation inside `new URL` is a glob to Vite, which
   * `here` above sets out. It is safe to hand-write only because the first
   * assertion holds it to `SITE_ROUTES` in both directions, so a fourth page
   * cannot be added to the site and left out of this file.
   */
  const PAGE_SOURCES: Readonly<Record<string, string>> = {
    "/": "../page.tsx",
    "/what-you-run": "../what-you-run/page.tsx",
    "/why-use-it": "../why-use-it/page.tsx",
  }

  const sourceOf = (route: SiteRoute): string =>
    readFileSync(here(PAGE_SOURCES[route.path]!), "utf8")

  it("has a page file named here, and names no page the site does not serve", () => {
    expect(Object.keys(PAGE_SOURCES).sort()).toEqual(SITE_ROUTES.map((one) => one.path).sort())
  })

  it.each(SITE_ROUTES)("$path gives the document its rule", (route) => {
    expect(sourceOf(route)).toContain("<DocumentTheme theme={rendered.theme} />")
  })

  /**
   * And off its *own* render. A page that resolved the palette a second time to
   * pass it could be serving one palette and declaring another to the document,
   * which is a white scrollbar beside a black page arrived at by a different
   * route than the one this change closes.
   */
  it.each(SITE_ROUTES)("$path takes it off the render it served", (route) => {
    const source = sourceOf(route)

    expect(source).toContain("const rendered = await renderSitePage(")
    expect(source).not.toMatch(/DocumentTheme[^/]*themeDocumentCss/)
  })
})

/**
 * The component names no colour, which is the rule the rest of this surface
 * lives under, and goes through the published function rather than assembling a
 * rule of its own.
 *
 * Comments are stripped first, the way `globals.test.ts` and
 * `browser-bar.test.tsx` both do it, because the reasoning in the component has
 * to be allowed to quote `bold`'s canvas — it is the evidence for the whole
 * change. What must not appear is a colour in the *code*.
 */
describe("the component's own source", () => {
  const source = readFileSync(here("../_components/document-theme.tsx"), "utf8")

  const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "")

  it("names no colour", () => {
    expect(code).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    for (const named of ["rgb", "hsl", "oklch", "white", "black"]) {
      expect(code).not.toContain(named)
    }
  })

  it("writes no CSS of its own", () => {
    expect(code).not.toContain(":root")
    expect(code).not.toContain("color-scheme")
  })

  it("reads the rule through the published recipe", () => {
    expect(code).toContain('from "@jam-overture/loom/react"')
    expect(code).toContain("themeDocumentCss(theme)")
  })

  /**
   * `precedence` is what asks React to lift the rule into the head. Without it
   * the `<style>` lands wherever it was written, which for a rule naming
   * `:root` is still applied — and is the one spelling of this change that
   * would work by accident today and stop working the moment anything renders
   * the page inside something else. The attribute is cheap to assert and the
   * hoist it buys is not assertable here, so this holds the request rather than
   * the outcome.
   */
  it("asks for the hoist rather than relying on where it was written", () => {
    expect(ruleFor(SITE_ROUTES[0]!, DEFAULT_THEME)).toContain('data-precedence="default"')
  })

  /**
   * One `href`, so React keeps one copy. One document is served in one palette,
   * which is why the name is a constant: an href carrying `bold` would be a
   * second encoding of the request that nothing reads back.
   */
  it("goes out under one name, so a document holds one copy", () => {
    expect(ruleFor(SITE_ROUTES[0]!, DEFAULT_THEME)).toContain(
      `data-href="${DOCUMENT_THEME_HREF}"`
    )
    expect(DOCUMENT_THEME_HREF).not.toMatch(/minimal|editorial|bold/)
  })
})
