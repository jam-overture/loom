import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { runtimeWordsIn } from "@/app/(portal)/_test/plain-language"
import { UNTITLED, type PageName } from "@/app/(portal)/_lib/page-name"
import { unreadablePage } from "@/app/(portal)/_lib/waiting"

import { UnreadablePages } from "./unreadable-pages"

/**
 * The list that replaced a count.
 *
 * What these pin is the reason it exists rather than its shape: a reader who
 * has been told part of the queue is missing can now find out *which* part and
 * go there. Before this the screen knew and did not say, which is the one
 * failure the plain-language rule is not about — nothing here is a rewording.
 */

const names = new Map<string, PageName>([
  ["t_1", { name: "Autumn arrivals", treeId: "t_1", derived: true }],
  ["t_2", { name: "Opening hours", treeId: "t_2", derived: true }],
])

const unavailable = (treeId: string, detail = "the pool is gone") =>
  unreadablePage(treeId, { code: "unavailable", detail })

const openDisclosures = (container: HTMLElement): void => {
  for (const details of container.querySelectorAll("details")) details.open = true
}

describe("the pages a sweep could not ask", () => {
  it("names each one, so the reader knows which page the warning is about", () => {
    render(<UnreadablePages pages={[unavailable("t_1"), unavailable("t_2")]} names={names} />)

    expect(screen.getByText("Autumn arrivals")).toBeTruthy()
    expect(screen.getByText("Opening hours")).toBeTruthy()
  })

  /**
   * Identity is both halves (22 August): the words say which page, the id is
   * what a reader quotes into a URL or a support thread. A row with only one of
   * them is the defect `PageName` exists to make impossible.
   */
  it("keeps the id beside the name rather than replacing it", () => {
    const { container } = render(<UnreadablePages pages={[unavailable("t_1")]} names={names} />)

    expect(container.textContent).toContain("Autumn arrivals")
    expect(container.textContent).toContain("t_1")
  })

  /**
   * The whole point. The notice this sits inside says "open the page you are
   * worried about", and until this list existed there was no way to act on it.
   */
  it("gives every row somewhere to go", () => {
    render(<UnreadablePages pages={[unavailable("t_1"), unavailable("t_2")]} names={names} />)

    const links = screen.getAllByRole("link")

    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/portal/pages/t_1",
      "/portal/pages/t_2",
    ])
  })

  /**
   * A page whose holds could not be read is the page most likely to have no
   * readable head either, so the row that most needs a name is the one most
   * likely not to have one. It falls back rather than rendering a blank.
   */
  it("still names a page it has no name for", () => {
    const { container } = render(<UnreadablePages pages={[unavailable("t_9")]} names={names} />)

    expect(container.textContent).toContain(UNTITLED)
    expect(container.textContent).toContain("t_9")
  })

  it("says why in plain words, unasked", () => {
    const { container } = render(<UnreadablePages pages={[unavailable("t_1")]} names={names} />)

    for (const details of container.querySelectorAll("details")) details.remove()

    expect(container.textContent).toContain("Loom couldn't read what's waiting on this page")
    expect(runtimeWordsIn(container.textContent ?? "")).toEqual([])
  })

  /**
   * The governing principle, from the other end: nothing was removed to make
   * the surface plain. The store's own account of every row is one click down.
   */
  it("keeps the store's own account of every row, one click down", () => {
    const { container } = render(
      <UnreadablePages
        pages={[unavailable("t_1", "connection refused"), unavailable("t_2", "timed out")]}
        names={names}
      />
    )

    const disclosure = container.querySelector("details")

    expect(disclosure).toBeTruthy()
    expect(disclosure?.textContent).toContain("the holding store is unavailable: connection refused")
    expect(disclosure?.textContent).toContain("the holding store is unavailable: timed out")
  })

  /**
   * One disclosure for the list and not one per row. The plain sentence is the
   * same sentence on every row, so a per-row disclosure would put the only
   * thing telling two rows apart behind as many clicks as there are rows —
   * which is the mistake the checkup's difference list already made and fixed.
   */
  it("opens the record once rather than once per row", () => {
    const { container } = render(
      <UnreadablePages pages={[unavailable("t_1"), unavailable("t_2")]} names={names} />
    )

    expect(container.querySelectorAll("details").length).toBe(1)
  })

  /**
   * The account is never allowed to stand in for the news. A reader who never
   * opens the disclosure must not be the reader who finds out nothing.
   */
  it("does not put the technical account on the surface", () => {
    const { container } = render(<UnreadablePages pages={[unavailable("t_1")]} names={names} />)

    for (const details of container.querySelectorAll("details")) details.remove()

    expect(container.textContent).not.toContain("the holding store is unavailable")
  })

  /**
   * The thing this screen genuinely cannot tell a reader, said rather than
   * guessed at. One `HoldError` code covers both "the store did not answer" and
   * "this deployment cannot read something it holds", and those want opposite
   * next moves — so the disclosure says the distinction is not available rather
   * than the surface implying one of them.
   */
  it("admits what the store's account does not distinguish", () => {
    const { container } = render(<UnreadablePages pages={[unavailable("t_1")]} names={names} />)

    openDisclosures(container)
    const disclosure = container.querySelector("details")

    expect(
      within(disclosure as HTMLElement).getByText(/could not be reached/u).textContent
    ).toContain("different things from you")
  })
})
