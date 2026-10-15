import { render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { ARTICLE_ID } from "@/app/(docs)/_lib/chrome"

import { OnThisPage } from "./on-this-page"

const pathname = vi.hoisted(() => ({ current: "/docs/getting-started/quickstart" }))

vi.mock("next/navigation", () => ({ usePathname: () => pathname.current }))

/**
 * A page for the rail to read, in the document the rail will look in.
 *
 * The component's whole input is the article beside it, so a test of it is a
 * test of what it finds there. The markup is what `rehype-slug` emits for a
 * written page — an `h1` for the title and `h2`/`h3` with ids under it — and the
 * rail is rendered as the layout renders it, outside the article rather than in
 * it.
 */
const article = (inner: string) => {
  const main = document.createElement("main")
  main.id = ARTICLE_ID
  main.innerHTML = inner
  document.body.append(main)

  return main
}

/* Testing Library's own cleanup removes what it rendered and knows nothing
   about an article a test put in the document by hand. Without this the second
   test in the file reads the first test's page. */
afterEach(() => {
  for (const stale of document.querySelectorAll(`#${ARTICLE_ID}`)) stale.remove()
  pathname.current = "/docs/getting-started/quickstart"
})

const WRITTEN_PAGE = `
  <h1 id="quickstart">Quickstart</h1>
  <p>One file. One command.</p>
  <h2 id="what-you-need">What you need</h2>
  <h2 id="the-file">The file</h2>
  <h3 id="the-m-matters">The <code>m</code> matters</h3>
  <h2 id="where-to-go-next">Where to go next</h2>
`

const rowsOnScreen = (): readonly (string | null)[] => screen.getAllByRole("link").map((row) => row.textContent)

describe("the contents rail", () => {
  it("lists the page's sections, in the order the page has them", () => {
    article(WRITTEN_PAGE)
    render(<OnThisPage />)

    expect(rowsOnScreen()).toEqual(["What you need", "The file", "The m matters", "Where to go next"])
  })

  it("links each row at the heading's own id", () => {
    article(WRITTEN_PAGE)
    render(<OnThisPage />)

    expect(screen.getByRole("link", { name: "The file" }).getAttribute("href")).toBe("#the-file")
  })

  it("leaves the page's title out, which the rail and the pager already name", () => {
    article(WRITTEN_PAGE)
    render(<OnThisPage />)

    expect(screen.queryByRole("link", { name: "Quickstart" })).toBeNull()
  })

  it("names itself, so it is one of two navigations a reader can tell apart", () => {
    article(WRITTEN_PAGE)
    render(<OnThisPage />)

    expect(screen.getByRole("navigation", { name: "On this page" }).tagName).toBe("NAV")
  })

  it("sets a section inside a section further in than the sections themselves", () => {
    article(WRITTEN_PAGE)
    render(<OnThisPage />)

    expect(screen.getByRole("link", { name: "The m matters" }).className).toContain("pl-6")
    expect(screen.getByRole("link", { name: "The file" }).className).toContain("pl-3")
  })

  /*
   * The two pages in Architecture are the reason the rows are read out of the
   * document rather than compiled from the markdown: their headings are
   * rendered by a component, so a list built from `page.mdx` would leave them
   * out. This is that case in miniature — headings the page's own source does
   * not contain, which the rail finds because they are on the page.
   */
  it("finds a heading a component rendered, not only one the markdown wrote", () => {
    article(`
      <h1 id="what-it-costs-you">What it costs you</h1>
      <h2 id="eight-things">Eight things you can no longer do</h2>
      <section><h3 id="no-free-text">No free text</h3></section>
      <section><h3 id="no-new-words">No new words</h3></section>
    `)
    render(<OnThisPage />)

    expect(rowsOnScreen()).toEqual(["Eight things you can no longer do", "No free text", "No new words"])
  })

  it("skips a heading with no id, because pressing its row would go nowhere", () => {
    article(`<h2 id="kept">Kept</h2><h2>Unanchored</h2>`)
    render(<OnThisPage />)

    expect(rowsOnScreen()).toEqual(["Kept"])
  })

  /*
   * Every page of the API reference. Their ids are on the `<section>` around the
   * heading rather than on the heading, so nothing here matches — and those
   * pages carry a contents list of their own, two columns wide because it holds
   * sixty module names.
   */
  it("renders nothing at all on a page whose headings are not places to land", () => {
    article(`<h1 id="loom">loom</h1><section id="tree"><h2>The tree</h2></section>`)
    const { container } = render(<OnThisPage />)

    expect(container.innerHTML).toBe("")
  })

  it("renders nothing when there is no page beside it", () => {
    const { container } = render(<OnThisPage />)

    expect(container.innerHTML).toBe("")
  })

  /*
   * jsdom lays nothing out, so every heading reports a top of 0 — which is above
   * the reading line, so the last of them is the one being read. That is enough
   * to hold the one thing a test here can hold about the mark: that it is on
   * exactly one row, and that it is the attribute a screen reader is told rather
   * than a shade of grey. Which row the geometry picks is
   * `on-this-page.test.ts`' subject, where the numbers are real.
   */
  it("marks one row, and marks it for a screen reader as well as for the eye", () => {
    article(WRITTEN_PAGE)
    const { container } = render(<OnThisPage />)

    const marked = container.querySelectorAll('[aria-current="location"]')

    expect(marked).toHaveLength(1)
    expect(marked[0]?.textContent).toBe("Where to go next")
  })

  /*
   * The rail is mounted by the layout, so it survives every navigation inside
   * the documentation: the article underneath it is replaced without this
   * remounting. A rail that read the document once would go on listing the
   * previous page's sections from then on.
   */
  it("re-reads the page when the address changes under it", () => {
    const first = article(`<h2 id="installing">Installing</h2>`)
    const { rerender } = render(<OnThisPage />)

    expect(rowsOnScreen()).toEqual(["Installing"])

    first.remove()
    article(`<h2 id="the-gate">The Gate</h2>`)
    pathname.current = "/docs/the-runtime/what-the-gate-decides"
    rerender(<OnThisPage />)

    expect(rowsOnScreen()).toEqual(["The Gate"])
  })
})
