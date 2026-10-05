import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

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
