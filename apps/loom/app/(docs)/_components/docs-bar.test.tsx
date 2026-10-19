import { fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import {
  ARTICLE_ID,
  BAR_CONTROL_CLASS,
  RAIL_SCROLLER_SELECTOR,
  UNDER_HEADER_CLASS,
} from "@/app/(docs)/_lib/chrome"
import { docsOrder } from "@/app/(docs)/_lib/nav"

import { DocsBar } from "./docs-bar"

const pathname = vi.hoisted(() => ({ current: "/docs/building-with-loom/theming" }))

vi.mock("next/navigation", () => ({ usePathname: () => pathname.current }))

/**
 * The bar that stays with the reader, rendered and driven.
 *
 * Five things are held below, in roughly the order a reader would miss them:
 *
 * 1. **One panel at a time.** Two panels under one bar that each kept their own
 *    boolean would let a reader open the contents over the site's rail, and
 *    that is the defect this component's shape exists to make impossible.
 * 2. **A navigation closes whatever is open**, however the reader navigated.
 *    The bar is mounted by the layout and survives a route change, so the state
 *    is the address rather than a flag.
 * 3. **Whether there is a contents control is decided by the prop**, not by the
 *    walk. That is what puts the bar at its final height in the server's HTML,
 *    and a test is the only place it can be seen, because the walk finds the
 *    same answer a moment later on every page that has sections.
 * 4. **What it opens is the whole site**, which is the same claim the menu it
 *    replaces made: the rail is mounted rather than restated, so a phone reader
 *    reaches every page a desktop reader does.
 * 5. **The closed control names the section being read**, which is the one
 *    thing the disclosure above the article could not do and the reason this is
 *    worth the row it costs.
 *
 * jsdom lays nothing out, so unless a test says otherwise every heading reports
 * a top of 0 and the document has no height — which reads as *at the bottom of
 * the page*, where the rule marks the last section. `on-this-page.test.ts` is
 * where the geometry is argued with real numbers.
 */
const WRITTEN = "/docs/building-with-loom/theming"
const GENERATED = "/docs/api-reference/loom"

const WRITTEN_PAGE = `
  <h1 id="theming">Making it look like yours</h1>
  <h2 id="the-tokens">The tokens</h2>
  <h2 id="your-own-palette">Your own palette</h2>
  <h3 id="the-two-schemes">The two schemes</h3>
  <h2 id="where-to-go-next">Where to go next</h2>
`

const article = (inner: string) => {
  const main = document.createElement("main")
  main.id = ARTICLE_ID
  main.innerHTML = inner
  document.body.append(main)

  return main
}

/* Testing Library's cleanup removes what it rendered and knows nothing about an
   article a test put in the document by hand. */
afterEach(() => {
  for (const stale of document.querySelectorAll(`#${ARTICLE_ID}`)) stale.remove()
  pathname.current = WRITTEN
})

const bar = (pages: readonly string[] = [WRITTEN]) => render(<DocsBar pagesWithSections={pages} />)

const browse = () => screen.getByRole("button", { name: "Browse the documentation" })
const contents = () => screen.getByRole("button", { name: "On this page" })

const rail = () => screen.queryByRole("navigation", { name: "Documentation" })
const pageList = () => screen.queryByRole("navigation", { name: "On this page" })

const rowsOnScreen = (): readonly (string | null)[] =>
  [...(pageList()?.querySelectorAll("a[href]") ?? [])].map((row) => row.textContent)

/**
 * jsdom will not follow a link, and says so on stderr for every press. The
 * component's handler is on the React root above the node, so preventing the
 * default here stops the warning and changes nothing about what runs.
 */
const press = (element: Element) => {
  element.addEventListener("click", (event) => event.preventDefault(), { once: true })
  fireEvent.click(element)
}

/** Put each heading where a test says it is, which jsdom will not do on its own. */
const headingsAt = (tops: Readonly<Record<string, number>>, documentHeight: number) => {
  for (const [id, top] of Object.entries(tops)) {
    const heading = document.getElementById(id)

    if (heading !== null) heading.getBoundingClientRect = () => ({ top, bottom: top + 40 }) as DOMRect
  }

  Object.defineProperty(document.documentElement, "scrollHeight", { value: documentHeight, configurable: true })
  Object.defineProperty(window, "scrollY", { value: 0, configurable: true })
}

describe("what the bar holds before anything is pressed", () => {
  it("offers both questions, and has neither answer open", () => {
    article(WRITTEN_PAGE)
    bar()

    expect(browse().getAttribute("aria-expanded")).toBe("false")
    expect(contents().getAttribute("aria-expanded")).toBe("false")
    expect(rail()).toBeNull()
    expect(pageList()).toBeNull()
  })

  /* Closed, a panel's links are out of the document rather than merely out of
     sight: a hidden rail of forty-five pages is forty-five tab stops. */
  it("leaves no navigation links in the document while both panels are closed", () => {
    article(WRITTEN_PAGE)
    const { container } = bar()

    expect(container.querySelectorAll("a[href]")).toHaveLength(0)
  })

  it("says which section of the site the reader is in, without being pressed", () => {
    article(WRITTEN_PAGE)
    bar()

    expect(browse().textContent).toContain("Building with Loom")
  })

  /*
   * The accessible names are fixed while the visible words change with the
   * reader's position. A name that moved as somebody scrolled would be a
   * control a screen-reader user cannot learn.
   */
  it("keeps both accessible names fixed, whatever the labels say", () => {
    article(WRITTEN_PAGE)
    bar()

    expect(browse().getAttribute("aria-label")).toBe("Browse the documentation")
    expect(contents().getAttribute("aria-label")).toBe("On this page")
  })

  it("keeps the glyphs out of what is read aloud", () => {
    article(WRITTEN_PAGE)
    bar()

    for (const glyph of document.querySelectorAll("[aria-hidden]")) {
      expect(["☰", "×", "▸", "▾"]).toContain(glyph.textContent)
    }
  })
})

describe("whether there is a contents control at all", () => {
  /*
   * The prop decides, and this is the only place that can be seen. It is what
   * lets the server send the bar at its final height: the walk would find the
   * same answer, one paint later, after the prose had already moved.
   */
  it("is the prop's answer and not the walk's", () => {
    article(WRITTEN_PAGE)
    bar([])

    expect(screen.queryByRole("button", { name: "On this page" })).toBeNull()
    expect(browse()).toBeTruthy()
  })

  it("offers nothing about the page on a page with no sections to offer", () => {
    pathname.current = GENERATED
    article(`<h1 id="loom">loom</h1><section id="tree"><h2>The tree</h2></section>`)
    bar([WRITTEN])

    expect(screen.queryByRole("button", { name: "On this page" })).toBeNull()
  })

  /*
   * A generated reference page between 1024 and 1279 has neither control: the
   * site's rail is on screen and there is nothing in the page to list. The row
   * collapses on its own, and the border is the one thing that does not, so it
   * is the one thing the markup says explicitly.
   */
  it("stands its border down from 1024, where a page like that would leave an empty band", () => {
    pathname.current = GENERATED
    article(`<h1 id="loom">loom</h1>`)
    const { container } = bar([WRITTEN])

    expect(container.firstElementChild?.className).toContain("lg:border-b-0")
  })

  it("keeps the border where there is a control to put above the prose", () => {
    article(WRITTEN_PAGE)
    const { container } = bar()

    expect(container.firstElementChild?.className).not.toContain("lg:border-b-0")
  })
})

/**
 * Where the bar sits and how tall it is, on the rendered element.
 *
 * `chrome.test.ts` already says the file wears these classes and spells
 * neither; what it cannot say is that the class reaches the element, and a
 * class on the wrong div is a bar that scrolls away or has no height. Both
 * numbers are the stylesheet's (`globals.css`), which is what makes the
 * scrollport's inset a function of this control rather than a figure that
 * agreed with it on the day it was typed.
 */
describe("where the bar sits, and how tall its row is", () => {
  it("sticks under the header, at an offset it does not spell itself", () => {
    article(WRITTEN_PAGE)
    const { container } = bar()

    expect(container.firstElementChild?.className).toContain(UNDER_HEADER_CLASS)
  })

  /* The row is as tall as the controls in it and no taller, which is what lets
     it collapse to nothing where both have stood down. So the height is on the
     control. */
  it("takes its height from the controls, which take theirs from the chrome", () => {
    article(WRITTEN_PAGE)
    bar()

    expect(browse().className).toContain(BAR_CONTROL_CLASS)
    expect(contents().className).toContain(BAR_CONTROL_CLASS)
  })

  it("gives the row itself no height, so a width with no controls leaves no band", () => {
    pathname.current = GENERATED
    article(`<h1 id="loom">loom</h1>`)
    const { container } = bar([WRITTEN])

    expect(container.firstElementChild?.className).not.toContain(BAR_CONTROL_CLASS)
  })
})

describe("the two panels, and which of them is open", () => {
  it("opens the site's rail on a press, and closes it on the next one", () => {
    article(WRITTEN_PAGE)
    bar()

    fireEvent.click(browse())
    expect(browse().getAttribute("aria-expanded")).toBe("true")
    expect(rail()).toBeTruthy()

    fireEvent.click(browse())
    expect(browse().getAttribute("aria-expanded")).toBe("false")
    expect(rail()).toBeNull()
  })

  it("opens the page's contents on a press, and closes it on the next one", () => {
    article(WRITTEN_PAGE)
    bar()

    fireEvent.click(contents())
    expect(pageList()).toBeTruthy()

    fireEvent.click(contents())
    expect(pageList()).toBeNull()
  })

  /*
   * The property the component's shape exists for. Two booleans would let both
   * be open, and a reader who asked for the contents would get them over the
   * top of the site's rail.
   */
  it("closes the rail when the contents are asked for, and the other way round", () => {
    article(WRITTEN_PAGE)
    bar()

    fireEvent.click(browse())
    fireEvent.click(contents())

    expect(rail()).toBeNull()
    expect(pageList()).toBeTruthy()
    expect(browse().getAttribute("aria-expanded")).toBe("false")

    fireEvent.click(browse())

    expect(pageList()).toBeNull()
    expect(rail()).toBeTruthy()
  })

  it("says the rail's panel is the scroller, so the rail knows what to move", () => {
    article(WRITTEN_PAGE)
    const { container } = bar()

    fireEvent.click(browse())

    expect(container.querySelector(RAIL_SCROLLER_SELECTOR)).toBeTruthy()
  })

  it("bounds both panels, rather than laying their height into the page", () => {
    article(WRITTEN_PAGE)
    const { container } = bar()

    fireEvent.click(browse())
    expect(container.querySelector(RAIL_SCROLLER_SELECTOR)?.className).toContain("max-h-[70vh]")

    fireEvent.click(contents())
    expect(pageList()?.className).toContain("max-h-[60vh]")
  })
})

describe("what the rail in it opens on", () => {
  it("is the whole site, in reading order", () => {
    article(WRITTEN_PAGE)
    bar()

    fireEvent.click(browse())

    const hrefs = [...(rail()?.querySelectorAll<HTMLAnchorElement>("a[href]") ?? [])].map(
      (link) => new URL(link.href, "https://loom.test").pathname
    )

    expect(hrefs).toEqual(docsOrder.map((entry) => entry.href))
  })

  it("closes when any link in it is pressed", () => {
    article(WRITTEN_PAGE)
    bar()

    fireEvent.click(browse())
    const link = rail()?.querySelector("a[href]")

    expect(link).toBeTruthy()
    if (link !== null && link !== undefined) press(link)

    expect(rail()).toBeNull()
  })
})

describe("a navigation, however the reader made it", () => {
  /*
   * The bar is mounted by the layout, so a route change re-renders it rather
   * than remounting it. A boolean would still be set on the page the reader
   * arrived at, over a panel it is no longer about.
   */
  it("closes the contents, and the next page's control is closed too", () => {
    const first = article(WRITTEN_PAGE)
    const { rerender } = bar([WRITTEN, "/docs/the-runtime/what-the-gate-decides"])

    fireEvent.click(contents())
    expect(pageList()).toBeTruthy()

    first.remove()
    article(`<h1 id="g">The gate</h1><h2 id="what-it-decides">What it decides</h2>`)
    pathname.current = "/docs/the-runtime/what-the-gate-decides"
    rerender(<DocsBar pagesWithSections={[WRITTEN, "/docs/the-runtime/what-the-gate-decides"]} />)

    expect(pageList()).toBeNull()
    expect(contents().getAttribute("aria-expanded")).toBe("false")
  })

  it("closes the rail the same way", () => {
    article(WRITTEN_PAGE)
    const { rerender } = bar()

    fireEvent.click(browse())
    pathname.current = "/docs/getting-started/installation"
    rerender(<DocsBar pagesWithSections={[WRITTEN]} />)

    expect(rail()).toBeNull()
  })

  it("names the section of the site the reader has arrived in", () => {
    article(WRITTEN_PAGE)
    const { rerender } = bar()

    pathname.current = "/docs/getting-started/installation"
    rerender(<DocsBar pagesWithSections={[WRITTEN]} />)

    expect(browse().textContent).toContain("Getting started")
  })
})

describe("the contents it opens", () => {
  it("lists the page's sections, in the order the page has them", () => {
    article(WRITTEN_PAGE)
    bar()

    fireEvent.click(contents())

    expect(rowsOnScreen()).toEqual(["The tokens", "Your own palette", "The two schemes", "Where to go next"])
  })

  it("links each row at the heading's own id", () => {
    article(WRITTEN_PAGE)
    bar()
    fireEvent.click(contents())

    expect(screen.getByRole("link", { name: "Your own palette" }).getAttribute("href")).toBe("#your-own-palette")
  })

  it("leaves the page's title out, which the rail and the pager already name", () => {
    article(WRITTEN_PAGE)
    bar()
    fireEvent.click(contents())

    expect(screen.queryByRole("link", { name: "Making it look like yours" })).toBeNull()
  })

  it("sets a section inside a section further in than the sections themselves", () => {
    article(WRITTEN_PAGE)
    bar()
    fireEvent.click(contents())

    expect(screen.getByRole("link", { name: "The two schemes" }).className).toContain("pl-4")
    expect(screen.getByRole("link", { name: "The tokens" }).className).not.toContain("pl-4")
  })

  /*
   * A press scrolls the reader to a heading. A panel that closed at the same
   * moment would take its own height out from above them mid-scroll — which is
   * safe here only because the bar's height does not change, and is the reason
   * the panel is left open rather than dismissed.
   */
  it("stays open when a row is pressed", () => {
    article(WRITTEN_PAGE)
    bar()
    fireEvent.click(contents())

    const row = screen.getByRole("link", { name: "Your own palette" })
    press(row)

    expect(pageList()).toBeTruthy()
  })
})

describe("the section being read, which is what the closed control says", () => {
  it("is the label and the page's size before the reader has reached a heading", () => {
    article(WRITTEN_PAGE)
    headingsAt({ "the-tokens": 900, "your-own-palette": 1600, "the-two-schemes": 2000, "where-to-go-next": 2600 }, 9000)
    bar()

    expect(contents().textContent).toContain("On this page")
    expect(contents().textContent).toContain("4 sections")
  })

  it("says it in the singular on a page with one section", () => {
    article(`<h1 id="p">A page</h1><h2 id="only">The only one</h2>`)
    headingsAt({ only: 900 }, 9000)
    bar()

    expect(contents().textContent).toContain("1 section")
  })

  /*
   * The behaviour the disclosure above the article could not have, and the
   * reason this bar is worth a row of a phone's height: a reader fifteen
   * screens down is told which section they are in without pressing anything.
   */
  it("names the section whose heading last went past the reading line", () => {
    article(WRITTEN_PAGE)
    headingsAt({ "the-tokens": -900, "your-own-palette": 20, "the-two-schemes": 600, "where-to-go-next": 1400 }, 9000)
    bar()

    expect(contents().textContent).toContain("Your own palette")
    expect(contents().textContent).not.toContain("4 sections")
  })

  it("marks that same section in the list it opens", () => {
    article(WRITTEN_PAGE)
    headingsAt({ "the-tokens": -900, "your-own-palette": 20, "the-two-schemes": 600, "where-to-go-next": 1400 }, 9000)
    bar()

    fireEvent.click(contents())

    expect(screen.getByRole("link", { name: "Your own palette" }).getAttribute("aria-current")).toBe("location")
    expect(document.querySelectorAll('[aria-current="location"]')).toHaveLength(1)
  })
})
