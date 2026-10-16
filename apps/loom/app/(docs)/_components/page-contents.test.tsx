import { fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { ARTICLE_ID } from "@/app/(docs)/_lib/chrome"

import { PageContents } from "./page-contents"

const pathname = vi.hoisted(() => ({ current: "/docs/building-with-loom/theming" }))

vi.mock("next/navigation", () => ({ usePathname: () => pathname.current }))

/**
 * The contents of a page, on a screen with no room beside the page.
 *
 * Four things are held here, and the first two are the ones a reader would
 * notice in a day:
 *
 * 1. **Closed to start with, and the count is the reason to press it.** A
 *    reader on a phone came for the prose; the line has to earn the press.
 * 2. **It opens into the same rows the rail shows**, in the same order, linking
 *    at the same ids. There is one walk under both presentations
 *    (`use-page-sections.ts`), and this is the half of that which is checkable
 *    from the narrow side.
 * 3. **A navigation closes it**, which is `mobile-nav.tsx`' argument applied to
 *    a second panel in the same layout: both are mounted by the layout, so a
 *    boolean set on one page would still be set on the next one.
 * 4. **The mark is where the reader is when it opens**, rather than always the
 *    last row. That is the one behaviour this presentation has and the rail
 *    does not, so it is the one worth stubbing geometry for.
 *
 * jsdom lays nothing out, so unless a test says otherwise every heading reports
 * a top of 0 and the document has no height — which reads as *at the bottom of
 * the page*, where the rule marks the last section. `on-this-page.test.ts` is
 * where the geometry is argued with real numbers.
 */
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
  pathname.current = "/docs/building-with-loom/theming"
})

const WRITTEN_PAGE = `
  <h1 id="theming">Making it look like yours</h1>
  <h2 id="the-tokens">The tokens</h2>
  <h2 id="your-own-palette">Your own palette</h2>
  <h3 id="the-two-schemes">The two schemes</h3>
  <h2 id="where-to-go-next">Where to go next</h2>
`

const line = () => screen.getByRole("button", { name: /On this page/ })

const rowsOnScreen = (): readonly (string | null)[] => screen.getAllByRole("link").map((row) => row.textContent)

/** Put each heading where a test says it is, which jsdom will not do on its own. */
const headingsAt = (tops: Readonly<Record<string, number>>, documentHeight: number) => {
  for (const [id, top] of Object.entries(tops)) {
    const heading = document.getElementById(id)

    if (heading !== null) heading.getBoundingClientRect = () => ({ top, bottom: top + 40 }) as DOMRect
  }

  Object.defineProperty(document.documentElement, "scrollHeight", { value: documentHeight, configurable: true })
  Object.defineProperty(window, "scrollY", { value: 0, configurable: true })
}

describe("the contents of a page, on a narrow screen", () => {
  it("is one line, closed, before a reader asks for anything", () => {
    article(WRITTEN_PAGE)
    render(<PageContents />)

    expect(line().getAttribute("aria-expanded")).toBe("false")
    expect(screen.queryAllByRole("link")).toEqual([])
  })

  /* Closed, the count is the only thing the line can offer. Without it a reader
     has to open it to find out whether it was worth opening. */
  it("says how many sections there are, which is the whole of what a closed line can say", () => {
    article(WRITTEN_PAGE)
    render(<PageContents />)

    expect(line().textContent).toContain("4 sections")
  })

  it("says it in the singular on a page with one section", () => {
    article(`<h1 id="p">A page</h1><h2 id="only">The only one</h2>`)
    render(<PageContents />)

    expect(line().textContent).toContain("1 section")
  })

  it("opens into the page's sections, in the order the page has them", () => {
    article(WRITTEN_PAGE)
    render(<PageContents />)

    fireEvent.click(line())

    expect(line().getAttribute("aria-expanded")).toBe("true")
    expect(rowsOnScreen()).toEqual(["The tokens", "Your own palette", "The two schemes", "Where to go next"])
  })

  it("links each row at the heading's own id", () => {
    article(WRITTEN_PAGE)
    render(<PageContents />)
    fireEvent.click(line())

    expect(screen.getByRole("link", { name: "Your own palette" }).getAttribute("href")).toBe("#your-own-palette")
  })

  it("leaves the page's title out, which the rail and the pager already name", () => {
    article(WRITTEN_PAGE)
    render(<PageContents />)
    fireEvent.click(line())

    expect(screen.queryByRole("link", { name: "Making it look like yours" })).toBeNull()
  })

  it("sets a section inside a section further in than the sections themselves", () => {
    article(WRITTEN_PAGE)
    render(<PageContents />)
    fireEvent.click(line())

    expect(screen.getByRole("link", { name: "The two schemes" }).className).toContain("pl-4")
    expect(screen.getByRole("link", { name: "The tokens" }).className).not.toContain("pl-4")
  })

  it("names itself, so it is one of two navigations a reader can tell apart", () => {
    article(WRITTEN_PAGE)
    render(<PageContents />)

    expect(screen.getByRole("navigation", { name: "On this page" }).tagName).toBe("NAV")
  })

  it("closes again on a second press", () => {
    article(WRITTEN_PAGE)
    render(<PageContents />)

    fireEvent.click(line())
    fireEvent.click(line())

    expect(line().getAttribute("aria-expanded")).toBe("false")
    expect(screen.queryAllByRole("link")).toEqual([])
  })

  /*
   * The property `mobile-nav.tsx` is built around, and the reason the state is
   * a page rather than a boolean. This is mounted by the layout, so it survives
   * a navigation: a reader who opens the list and then reaches another page from
   * the search dialog, a link in the prose or the wordmark would otherwise find
   * it open over a page it is no longer about.
   */
  it("is closed on the next page, however the reader got there", () => {
    const first = article(WRITTEN_PAGE)
    const { rerender } = render(<PageContents />)

    fireEvent.click(line())
    expect(line().getAttribute("aria-expanded")).toBe("true")

    first.remove()
    article(`<h1 id="g">The gate</h1><h2 id="what-it-decides">What it decides</h2>`)
    pathname.current = "/docs/the-runtime/what-the-gate-decides"
    rerender(<PageContents />)

    expect(line().getAttribute("aria-expanded")).toBe("false")
    expect(line().textContent).toContain("1 section")
  })

  it("renders nothing at all on a page whose headings are not places to land", () => {
    article(`<h1 id="loom">loom</h1><section id="tree"><h2>The tree</h2></section>`)
    const { container } = render(<PageContents />)

    expect(container.innerHTML).toBe("")
  })

  it("renders nothing when there is no page beside it", () => {
    const { container } = render(<PageContents />)

    expect(container.innerHTML).toBe("")
  })

  /*
   * **No row is marked, and this is the test that says so deliberately.**
   *
   * The rail marks the section the reader is in. A mark here could never light
   * up: the rule is *the last heading past the 120-pixel reading line*, and
   * this line sits above the page's title, so a reader who can see it is a
   * reader with no heading anywhere near the top of the window.
   * `page-contents.tsx` has the numbers. A mark was built and taken out, so
   * this holds the absence rather than leaving the next run to rebuild it.
   */
  it("marks no row, because a mark here is one that could never light up", () => {
    article(WRITTEN_PAGE)
    render(<PageContents />)

    fireEvent.click(line())

    expect(document.querySelectorAll('[aria-current="location"]')).toHaveLength(0)
    expect(screen.queryAllByRole("link")).toHaveLength(4)
  })

  /*
   * Where the reader is scrolled to makes no difference to what this renders,
   * which is the same claim from the other side: the rows are the page's
   * sections and nothing here is a function of the viewport.
   */
  it("renders the same rows wherever the reader is scrolled to", () => {
    article(WRITTEN_PAGE)
    render(<PageContents />)

    headingsAt({ "the-tokens": -900, "your-own-palette": -30, "the-two-schemes": 600, "where-to-go-next": 1400 }, 9000)
    fireEvent.click(line())

    expect(rowsOnScreen()).toEqual(["The tokens", "Your own palette", "The two schemes", "Where to go next"])
    expect(document.querySelectorAll('[aria-current="location"]')).toHaveLength(0)
  })
})
