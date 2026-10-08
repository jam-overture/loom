import { fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { railScrollerAttr, RAIL_SCROLLER_SELECTOR } from "@/app/(docs)/_lib/chrome"
import {
  docsHref,
  docsLandingOf,
  docsOrder,
  docsPagesIn,
  docsSections,
} from "@/app/(docs)/_lib/nav"

import { Sidebar } from "./sidebar"

type DocsSource = (typeof docsSections)[number]["source"]

/**
 * The rail, rendered — which until now nothing did.
 *
 * It is the second half of this lane's 2 October finding, and the half that
 * matters most on this particular component. `nav.test.ts` holds the model
 * behind it about as hard as a model gets held here: every href unique, no
 * empty section, reading order, the pager's walk, a landing page's address and
 * that it is not listed twice. **Every one of those assertions stays green if
 * this component prints nothing at all** — and this component is the only way a
 * reader reaches any page of the site other than the one they are on.
 *
 * So what is below reads the rail back out of the document and holds it against
 * that model, in both directions. The order test is the one worth keeping in
 * mind while editing: the rail renders a section's own page on the section's
 * title and the rest underneath it, and `docsOrder` flattens a landing page
 * first — so the rail's links in document order are `docsOrder` exactly, and
 * that is a coincidence of two deliberate decisions rather than one fact.
 */

const pathname = vi.hoisted(() => ({ current: "/" }))

vi.mock("next/navigation", () => ({ usePathname: () => pathname.current }))

const railAt = (href: string, onNavigate?: () => void) => {
  pathname.current = href

  return render(<Sidebar {...(onNavigate ? { onNavigate } : {})} />)
}

/** Every link the rail draws, in the order a reader tabs through them. */
const linksOf = (container: HTMLElement): readonly HTMLAnchorElement[] => [
  ...container.querySelectorAll<HTMLAnchorElement>("a[href]"),
]

const hrefsOf = (container: HTMLElement): readonly string[] =>
  linksOf(container).map((link) => link.getAttribute("href") ?? "")

/**
 * jsdom will not follow a link and warns on stderr for every press that asks
 * it to. The component's handler is on the React root above the link, so
 * preventing the default here quiets the warning and changes nothing about what
 * runs.
 */
const press = (link: Element) => {
  link.addEventListener("click", (event) => event.preventDefault(), { once: true })
  fireEvent.click(link)
}

describe("the rail that is the only way to any of this", () => {
  it("is one navigation landmark, named", () => {
    railAt("/")

    expect(screen.getByRole("navigation", { name: "Documentation" })).toBeDefined()
  })

  /**
   * The count first and separately, because every loop below walks a list and
   * compares it to the page: a rail that printed nothing would satisfy a
   * membership check and an order check at the same time.
   */
  it("prints a link for every page the site has", () => {
    const { container } = railAt("/")

    expect(docsOrder.length).toBeGreaterThan(1)
    expect(hrefsOf(container)).toHaveLength(docsOrder.length)
  })

  it("reaches every page, and nowhere that is not a page", () => {
    const { container } = railAt("/")

    expect(new Set(hrefsOf(container))).toEqual(new Set(docsOrder.map((entry) => entry.href)))
  })

  it("prints them in reading order, which is the pager's order", () => {
    const { container } = railAt("/")

    expect(hrefsOf(container)).toEqual(docsOrder.map((entry) => entry.href))
  })

  it("calls every page by the name the model gives it", () => {
    const { container } = railAt("/")
    const titles = linksOf(container).map((link) => link.textContent ?? "")

    expect(titles).toEqual(docsOrder.map((entry) => entry.page.title))
  })

  it("names every section, in the order the sections are declared", () => {
    const { container } = railAt("/")
    const headings = [...container.querySelectorAll("nav > div")].map(
      (group) => group.firstElementChild?.textContent ?? ""
    )

    expect(docsSections.length).toBeGreaterThan(1)
    expect(headings).toEqual(docsSections.map((section) => section.title))
  })
})

/**
 * A section that is also a page.
 *
 * The rail is the one place the difference between a landing page and a page
 * inside a section shows: the section's own name is the link to it, and the
 * list underneath has nothing to repeat. Both halves are asserted from
 * `docsLandingOf` rather than by naming the API reference, so a second section
 * that grows a page of its own is covered on the day it does.
 */
describe("a section's name", () => {
  it("is a link where the section has a page of its own, and words where it has not", () => {
    const { container } = railAt("/")
    const groups = [...container.querySelectorAll("nav > div")]

    expect(groups).toHaveLength(docsSections.length)

    for (const [at, section] of docsSections.entries()) {
      const name = groups[at]?.firstElementChild
      const landing = docsLandingOf(section)
      const where = `"${section.title}"`

      if (landing === undefined) {
        expect(name?.tagName, `${where} has no page of its own`).toBe("P")
        continue
      }

      expect(name?.tagName, `${where} is a page`).toBe("A")
      expect(name?.getAttribute("href")).toBe(docsHref(section.slug, landing.slug))
    }
  })

  it("does not list that page a second time underneath itself", () => {
    const { container } = railAt("/")

    for (const section of docsSections) {
      const landing = docsLandingOf(section)

      if (landing === undefined) continue

      const href = docsHref(section.slug, landing.slug)
      const listed = [...container.querySelectorAll(`li a[href="${href}"]`)]

      expect(listed, `"${landing.title}" is listed under its own name`).toHaveLength(0)
      expect(hrefsOf(container).filter((at) => at === href)).toHaveLength(1)
    }
  })

  it("lists every page inside it, and only those", () => {
    const { container } = railAt("/")
    const lists = [...container.querySelectorAll("nav > div > ul")]

    for (const [at, section] of docsSections.entries()) {
      const inside = docsPagesIn(section)
      const rows = [...(lists[at]?.querySelectorAll("li a[href]") ?? [])]

      expect(rows.map((row) => row.getAttribute("href")), `"${section.title}"`).toEqual(
        inside.map((page) => docsHref(section.slug, page.slug))
      )
    }
  })
})

/**
 * Where the reader is.
 *
 * The component's own docblock states the rule twice: `aria-current` first so a
 * screen reader is told, and something that is not a shade of grey second so a
 * sighted reader is. Both halves are below, because the second is the one that
 * gets refactored away — the two greys either side of the mark are
 * `text-ink` and `text-ink-muted`, and a rail that marked the current page in
 * colour alone would look very nearly right.
 */
describe("the page a reader is on", () => {
  it("is marked for a screen reader, once", () => {
    const here = docsOrder[3]?.href ?? ""
    const { container } = railAt(here)
    const marked = linksOf(container).filter((link) => link.getAttribute("aria-current"))

    expect(marked).toHaveLength(1)
    expect(marked[0]?.getAttribute("href")).toBe(here)
    expect(marked[0]?.getAttribute("aria-current")).toBe("page")
  })

  it("is marked on the section's own name when that is the page", () => {
    const section = docsSections.find((candidate) => docsLandingOf(candidate) !== undefined)
    const landing = section === undefined ? undefined : docsLandingOf(section)

    expect(section, "no section has a page of its own").toBeDefined()

    const here = docsHref(section?.slug ?? "", landing?.slug ?? "")
    const { container } = railAt(here)
    const marked = linksOf(container).filter((link) => link.getAttribute("aria-current"))

    expect(marked).toHaveLength(1)
    expect(marked[0]?.getAttribute("href")).toBe(here)
    expect(marked[0]?.className).toContain("underline")
  })

  it("is marked by weight as well as by colour", () => {
    const here = docsOrder[3]?.href ?? ""
    const { container } = railAt(here)
    const bold = linksOf(container).filter((link) => link.className.includes("font-medium"))

    expect(bold).toHaveLength(1)
    expect(bold[0]?.getAttribute("href")).toBe(here)
  })

  it("marks nothing on a path the documentation does not have", () => {
    const { container } = railAt("/docs/getting-started/nowhere")

    expect(linksOf(container).filter((link) => link.getAttribute("aria-current"))).toHaveLength(0)
    expect(hrefsOf(container)).toHaveLength(docsOrder.length)
  })
})

/**
 * The face a generated section's pages are set in.
 *
 * The reference's pages are named after something a reader types — an import
 * specifier — and the rail sets them in the mono face the rest of the site sets
 * a specifier in. Held per section from `source` rather than by naming the
 * reference, and held in both directions: a written section's pages must *not*
 * be in it, or the rule is "everything is mono" and says nothing.
 */
describe("a page named after something a reader types", () => {
  it("is set in the mono face, and a written page is not", () => {
    const { container } = railAt("/")
    const lists = [...container.querySelectorAll("nav > div > ul")]
    const faces = new Map<DocsSource, readonly boolean[]>()

    for (const [at, section] of docsSections.entries()) {
      const rows = [...(lists[at]?.querySelectorAll("li a[href]") ?? [])]

      expect(rows.length, `"${section.title}" lists nothing`).toBeGreaterThan(0)
      faces.set(
        section.source,
        rows.map((row) => row.className.includes("font-mono"))
      )
    }

    expect(faces.get("generated")?.every(Boolean)).toBe(true)
    expect(faces.get("written")?.some(Boolean)).toBe(false)
  })
})

/**
 * Being dismissed.
 *
 * On a phone this rail lives inside `MobileNav`, which hands it a callback and
 * depends on every link in it calling that callback: a reader who taps a link
 * and is left with an open menu over the page they asked for has navigated and
 * cannot see that they did. The handler is spread in **two** places in this
 * component — a section's own name and a page under it — and the section's name
 * is the one that would be missed, so every link is pressed here rather than a
 * sample.
 */
describe("a link in the rail, pressed", () => {
  it("tells whoever is holding the rail, from every link it draws", () => {
    for (const [at, entry] of docsOrder.entries()) {
      const dismiss = vi.fn()
      const { container, unmount } = railAt("/", dismiss)
      const link = linksOf(container)[at]

      expect(link?.getAttribute("href"), `${entry.href} is not in the rail`).toBe(entry.href)
      press(link as HTMLAnchorElement)

      expect(dismiss, `pressing "${entry.page.title}" dismissed nothing`).toHaveBeenCalledOnce()
      unmount()
    }
  })

  it("is pressable with nobody holding it", () => {
    const { container } = railAt("/")

    for (const link of linksOf(container)) press(link)

    expect(hrefsOf(container)).toHaveLength(docsOrder.length)
  })
})

/**
 * Whether the mark is anywhere a reader can see it.
 *
 * Everything above this point is about the rail being *right*, and it was: the
 * current page has carried `aria-current` and a mint edge since the rail
 * shipped. It was also, for two thirds of the site, drawn below the bottom of
 * its own scroller — the rail holds 1,730 pixels of links in the 844 it shows
 * on a 1280×900 screen, so a reader arriving at *Decision records* from the
 * search box, the pager or a bookmark got a rail showing *Getting started*
 * with nothing highlighted on it. Measured with `pnpm shoot`'s `measure`
 * before any of this was written, and quoted in the report.
 *
 * **The arithmetic is not here.** `_lib/in-view.test.ts` holds it, in a
 * `.test.ts` that gets no document, because in this suite the extension
 * decides the environment. What is left for this file is the half that needs
 * one: the rail finding its own scroller, the row's top being measured from
 * the list rather than from the screen, and the effect running on the address
 * and not just on mount.
 *
 * jsdom lays nothing out, so the rail is laid out here: every row 32 tall in
 * document order, in a scroller showing 844 of them. The shape is the real
 * rail's and the numbers are a round version of the real ones — what is being
 * checked is which numbers reach the judgement, not what it does with them.
 */
const ROW = 32
const SHOWN = 844

const unlaidOut = HTMLAnchorElement.prototype.getBoundingClientRect

afterEach(() => {
  HTMLAnchorElement.prototype.getBoundingClientRect = unlaidOut
})

const railInside = (
  href: string,
  { scrollTop = 0, scroller = true }: { readonly scrollTop?: number; readonly scroller?: boolean } = {}
) => {
  const box = document.createElement("div")

  if (scroller) {
    for (const [name, value] of Object.entries(railScrollerAttr)) box.setAttribute(name, value)
  }

  document.body.append(box)
  box.scrollTop = scrollTop

  Object.defineProperty(box, "clientHeight", { value: SHOWN, configurable: true })
  Object.defineProperty(box, "scrollHeight", { value: docsOrder.length * ROW, configurable: true })
  box.getBoundingClientRect = () => ({ top: 0, height: SHOWN }) as DOMRect

  /* Viewport-relative, the way a browser reports it: the list's own offset, less the scroll. */
  HTMLAnchorElement.prototype.getBoundingClientRect = function (this: HTMLAnchorElement) {
    const rows = [...(this.closest("nav")?.querySelectorAll<HTMLAnchorElement>("a[href]") ?? [])]
    const seen = this.closest(RAIL_SCROLLER_SELECTOR)?.scrollTop ?? 0

    return { top: rows.indexOf(this) * ROW - seen, height: ROW } as DOMRect
  }

  pathname.current = href

  return { box, ...render(<Sidebar />, { container: box }) }
}

/** Where the list can go no further, which is where the last pages of the site end up. */
const BOTTOM = docsOrder.length * ROW - SHOWN

describe("the mark a reader cannot see", () => {
  it("brings the last page of the site into its scroller", () => {
    const { box } = railInside(docsOrder[docsOrder.length - 1]?.href ?? "")

    expect(BOTTOM).toBeGreaterThan(0)
    expect(box.scrollTop).toBe(BOTTOM)
  })

  it("leaves a rail alone when the page is already on screen", () => {
    const { box } = railInside(docsOrder[3]?.href ?? "")

    expect(box.scrollTop).toBe(0)
  })

  /**
   * The case the whole thing is in service of, and the one a reader would
   * notice: a reader who pressed a link *in* the rail is looking at the row
   * they pressed, and nothing may move under them.
   */
  it("does not move under a reader who scrolled it there", () => {
    const at = Math.floor(docsOrder.length / 2)
    const { box } = railInside(docsOrder[at]?.href ?? "", { scrollTop: at * ROW })

    expect(box.scrollTop).toBe(at * ROW)
  })

  /**
   * The row's top read from the list rather than from the screen.
   *
   * A rail already scrolled is the only state where the two differ, and the
   * number below is wrong by exactly the scroll if they are confused: the
   * answer is the bottom of the list either way, so this is asserted from a
   * row in the middle of it, where a correct reading and a viewport-relative
   * one give different answers.
   */
  it("measures a row in a scrolled rail from the top of the list", () => {
    const at = docsOrder.length - 4
    const { box } = railInside(docsOrder[at]?.href ?? "", { scrollTop: 100 })

    expect(box.scrollTop).toBe(Math.min(at * ROW + ROW + 48 - SHOWN, BOTTOM))
  })

  /**
   * A rail with nothing above it saying it scrolls does nothing at all, which
   * is the phone's panel before it was given a height — and the reason the
   * remedy there was to bound the panel rather than to scroll the document.
   */
  it("moves nothing where nothing says it is a scroller", () => {
    const { box } = railInside(docsOrder[docsOrder.length - 1]?.href ?? "", { scroller: false })

    expect(box.scrollTop).toBe(0)
  })

  it("moves nothing on a path the documentation does not have", () => {
    const { box } = railInside("/docs/getting-started/nowhere")

    expect(box.scrollTop).toBe(0)
  })

  /**
   * On the address and not on mount, because the rail is mounted by a layout
   * and survives every navigation inside the documentation. A rail that only
   * answered on mount would be right for a bookmark and wrong for every
   * client-side navigation, which is every way a reader gets around once they
   * are here.
   */
  it("answers a navigation, not only a first load", () => {
    const { box, rerender } = railInside(docsOrder[0]?.href ?? "")

    expect(box.scrollTop).toBe(0)

    pathname.current = docsOrder[docsOrder.length - 1]?.href ?? ""
    rerender(<Sidebar />)

    expect(box.scrollTop).toBe(BOTTOM)
  })
})
