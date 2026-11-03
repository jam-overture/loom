import { existsSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

import { render, screen } from "@testing-library/react"
import { isValidElement, type ReactNode } from "react"
import { describe, expect, it } from "vitest"

import { minimalPalette } from "@jam-overture/loom"

import { NOT_FOUND_STYLESHEET_PATH } from "./_lib/shell/not-found-style"
import { GET } from "./not-found.css/route"
import NotFound from "./not-found"

/**
 * A path beside this file, on disk.
 *
 * Through a parameter rather than written at the call site, which is the
 * convention `(marketing)/_lib/document-theme.test.tsx` sets out at length:
 * Vite rewrites `new URL(..., import.meta.url)` before the file runs, turning a
 * literal into an `http:` asset URL that `fileURLToPath` refuses and an
 * interpolation into a glob that refuses the module at transform time.
 */
const beside = (path: string): string => fileURLToPath(new URL(path, import.meta.url))

/**
 * Every intrinsic element in what a component returned, by tag.
 *
 * `isValidElement` rather than a DOM walk, so the answer is about the component
 * and not about what a renderer did with it afterwards. A string `type` is an
 * intrinsic element — `div`, `html` — and a function or object `type` is
 * another component, which this does not descend into because this page has
 * none.
 */
const elementTypesIn = (node: ReactNode): readonly string[] => {
  if (Array.isArray(node)) return node.flatMap(elementTypesIn)
  if (!isValidElement(node)) return []

  const here = typeof node.type === "string" ? [node.type] : []
  const { children } = node.props as { readonly children?: ReactNode }

  return [...here, ...elementTypesIn(children)]
}

/**
 * The page a wrong address lands on.
 *
 * Until 6 October it was the only page of this product served in the browser's
 * own defaults, which `Loom marketing` photographed and filed. The tests below
 * are in two halves, and the second half is the one that matters: the words did
 * not change, and a future run that decides this page should *say* more will go
 * red rather than quietly turning a 404 into a site map.
 */
describe("the page that belongs to no surface", () => {
  it("says what it said before, and no more", () => {
    render(<NotFound />)

    expect(screen.getByRole("heading", { name: "Not found" })).toBeInstanceOf(HTMLElement)
    expect(document.body.textContent).toContain("There is nothing at this address.")
  })

  /**
   * Two ways out, and they are the same destination on purpose: a reader who
   * reads a wordmark as a home link has one, and a reader who does not is told
   * in words. Both go to the front door, which is the page whose job is to say
   * what is where — this one deliberately does not list the four surfaces.
   */
  it("offers the front door twice and names no surface", () => {
    const { container } = render(<NotFound />)

    const destinations = [...container.querySelectorAll("a")].map((link) => link.getAttribute("href"))

    expect(destinations).toEqual(["/", "/"])
    expect(document.body.textContent).not.toMatch(/\/(docs|demo|lessons|portal)/)
  })

  /**
   * The mark, and the reason it is drawn rather than linked: `fill` is left to
   * the cascade so the arms take the palette's ink. `app/icon.svg` in this
   * position would paint the hex it carries onto whatever paper the theme
   * supplied.
   */
  it("draws the mark inline, with four arms and no colour of its own", () => {
    const { container } = render(<NotFound />)

    const mark = container.querySelector("svg")

    expect(mark?.querySelectorAll("rect")).toHaveLength(4)
    expect(mark?.getAttribute("aria-hidden")).toBe("true")
    expect(mark?.innerHTML).not.toMatch(/fill=/)
  })

  /**
   * The wordmark is announced once. The mark is `aria-hidden` and the word is
   * the link's text, so a screen reader gets one link called *Loom* rather than
   * a link called *Loom Loom* or an unlabelled graphic beside it.
   */
  it("announces the wordmark once", () => {
    render(<NotFound />)

    expect(screen.getAllByRole("link", { name: "Loom" })).toHaveLength(1)
  })

  /**
   * **The page renders no document of its own**, and this is the regression
   * guard for the defect that was in the first draft of this unit.
   *
   * Next supplies the document for a page outside every route group. A page
   * here that renders `<html>` therefore has it *nested inside* Next's — which
   * a production build showed as `<body><div hidden></div><html lang="en">` —
   * and the theme reached the page only because the HTML parser merges a stray
   * `<html>`'s attributes onto the real element. jsdom cannot see that: React
   * hoists a rendered `<html>`'s attributes onto the real document element, so
   * every assertion about the outcome passed while the served markup was
   * invalid.
   *
   * **So this is asserted against what the component returns, not against a
   * DOM.** The first version of this guard asked the render container whether
   * it held an `<html>`, and a planted `<html>` left it green — React had
   * hoisted the element out of the container before the query ran, which is the
   * same hoist that hid the original defect. A rendered tree is the wrong
   * instrument for a question about what was rendered.
   */
  it("renders no document of its own", () => {
    const tags = elementTypesIn(NotFound())

    expect(tags.filter((tag) => ["html", "head", "body"].includes(tag))).toEqual([])
  })

  /**
   * **The dress is linked, not carried.** The rules were inline until 2
   * November, which put them in the flight payload of every page of every
   * surface — the boundary this component fills sits in the RSC tree of every
   * route, so what it returns is serialised whether or not anything 404s. The
   * assertion that the palette reaches `:root` has not gone anywhere; it moved
   * to the response that now carries it, below.
   *
   * `precedence` is what keeps this a fetch and not a flash: React waits for a
   * stylesheet it was given one for.
   */
  it("links its stylesheet at the address the route serves, and inlines none of it", () => {
    const { container } = render(<NotFound />)

    const linked = [...document.head.querySelectorAll("link[rel=stylesheet]")].map((element) => ({
      href: element.getAttribute("href"),
      precedence: element.getAttribute("data-precedence"),
    }))

    expect(linked).toContainEqual({ href: NOT_FOUND_STYLESHEET_PATH, precedence: "default" })
    expect(document.head.querySelectorAll("style")).toHaveLength(0)
    expect(`${document.head.innerHTML}${container.innerHTML}`).not.toContain(":root {")
  })

  /**
   * A route's address is its directory name, which no import can read — so the
   * one thing holding the link and the route together is a string, and this is
   * what holds the string to the tree. A renamed or deleted route would
   * otherwise serve the one page outside every layout in the browser's own
   * defaults, which is the defect this unit closed arriving by a new door.
   */
  it("is served by a route at exactly that address", () => {
    expect(existsSync(beside(join(".", NOT_FOUND_STYLESHEET_PATH, "route.ts")))).toBe(true)
  })

  /**
   * The theme arrives as a `:root` rule, which is where the declarations are
   * actually true: `:root` *is* the document element, so the canvas reaches the
   * overscroll area a phone exposes past the end of a short page.
   *
   * Asserted on the served body rather than on a rendered head, because that is
   * now where it is true. Both blocks in one response and in this order, so
   * there is no sequence in which the rules arrive without the theme they read.
   */
  it("serves the mounted palette and the page's own rules, in that order", async () => {
    const response = GET()
    const css = await response.text()

    expect(response.headers.get("content-type")).toBe("text/css; charset=utf-8")
    expect(css).toContain(":root {")
    expect(css).toContain(`--loom-bg-canvas: ${minimalPalette.slots["bg-canvas"]};`)
    expect(css).toContain(`color: ${minimalPalette.slots["fg-default"]};`)
    expect(css).toContain("color-scheme: light;")
    expect(css.indexOf(":root {")).toBeLessThan(css.indexOf(".not-found__way-out"))
  })

  /**
   * Every colour on this page arrives through the mounted theme, and none of it
   * is written into the markup.
   *
   * The sweep is of the markup rather than of the stylesheet, which carries the
   * literals and is where they belong — `not-found-style.test.ts` holds that
   * half. What this asserts is that nothing *else* names a colour: a hex on an
   * element or in an attribute would survive a re-theme, which is the one thing
   * a themed page cannot allow (0049).
   */
  it("writes no colour into its own markup", () => {
    const { container } = render(<NotFound />)

    expect(container.innerHTML).not.toMatch(/#[0-9a-f]{3,8}\b/i)
  })
})
