import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import type { TreeId } from "@jam-overture/loom"
import type { TreeListing } from "@jam-overture/loom/store"

import type { PageName } from "@/app/(portal)/_lib/page-name"

import { CheckupChoices } from "./checkup-choices"

const listing = (treeId: string, revision: number): TreeListing => ({
  treeId: treeId as TreeId,
  revision,
})

/** What the chooser above this component read. Rows are a pure function of it. */
const named = (...entries: readonly (readonly [string, string])[]): ReadonlyMap<string, PageName> =>
  new Map(entries.map(([treeId, name]) => [treeId, { name, treeId, derived: true }]))

const nothingNamed: ReadonlyMap<string, PageName> = new Map()

const all = () => true
const none = () => false

describe("CheckupChoices", () => {
  /**
   * The screen a new person actually meets first, and the one the redirection
   * names as the clearest instance of "every screen answers what do I do now".
   * An empty state with no way out of it is a dead end wearing a dashed border.
   */
  it("gives an empty deployment somewhere to go", () => {
    render(<CheckupChoices trees={[]} names={nothingNamed} checkable={all} />)

    const action = screen.getByRole("link", { name: /your pages/i })

    expect(action.getAttribute("href")).toBe("/portal/pages")
    expect(screen.getByText(/there is nothing to check/i)).toBeInstanceOf(HTMLElement)
  })

  it("does not make an empty deployment look like something to configure", () => {
    const { container } = render(
      <CheckupChoices trees={[]} names={nothingNamed} checkable={all} />
    )

    expect(container.textContent).toContain("There is nothing to set up.")
    expect(container.querySelector("[data-tone]")?.getAttribute("data-tone")).toBe("empty")
  })

  it("makes each checkable page a link that says what pressing it does", () => {
    render(
      <CheckupChoices
        trees={[listing("t_1", 3)]}
        names={named(["t_1", "Autumn arrivals"])}
        checkable={all}
      />
    )

    const row = screen.getByRole("link", { name: /check this page/i })

    expect(row.getAttribute("href")).toBe("/portal/checkup?tree=t_1")
    expect(row.textContent).toContain("3 changes to replay")
  })

  it("says one change in the singular, because a row that reads wrong reads as broken", () => {
    render(
      <CheckupChoices
        trees={[listing("t_1", 1)]}
        names={named(["t_1", "Autumn arrivals"])}
        checkable={all}
      />
    )

    expect(screen.getByRole("link", { name: /check this page/i }).textContent).toContain(
      "1 change to replay"
    )
  })

  /**
   * The rule this screen must never break. A page this host cannot check is
   * shown, unpressable, with the reason where the action would be — because a
   * chooser that quietly omitted it would look like a deployment where
   * everything checked out.
   */
  it("lists a page it cannot check rather than hiding it", () => {
    const { container } = render(
      <CheckupChoices
        trees={[listing("t_1", 3)]}
        names={named(["t_1", "Autumn arrivals"])}
        checkable={none}
      />
    )

    expect(container.textContent).toContain("t_1")
    expect(container.textContent).toContain("can’t be checked here")
    expect(screen.queryByRole("link")).toBeNull()
  })

  it("keeps the two apart in one list, so a mixed deployment reads correctly", () => {
    const checkable = (treeId: TreeId) => treeId === "t_1"

    render(
      <CheckupChoices
        trees={[listing("t_1", 1), listing("t_2", 2)]}
        names={named(["t_1", "Autumn arrivals"], ["t_2", "Winter sale"])}
        checkable={checkable}
      />
    )

    const links = screen.getAllByRole("link")

    expect(links).toHaveLength(1)
    expect(links[0]?.getAttribute("href")).toBe("/portal/checkup?tree=t_1")
  })

  it("leads each row with what the page is called, and keeps its id under it", () => {
    const { container } = render(
      <CheckupChoices
        trees={[listing("t_1", 3)]}
        names={named(["t_1", "Autumn arrivals"])}
        checkable={all}
      />
    )

    const text = container.textContent ?? ""

    expect(text).toContain("Autumn arrivals")
    expect(text).toContain("t_1")
    expect(text.indexOf("Autumn arrivals")).toBeLessThan(text.indexOf("t_1"))
  })

  /**
   * A name the chooser could not read must not cost a row. The page is still
   * listed, still linked, and still identified — which is the whole reason
   * `nameFrom` answers for an id that is not in the map.
   */
  it("lists a page it could not name, by its id", () => {
    const { container } = render(
      <CheckupChoices trees={[listing("t_1", 3)]} names={nothingNamed} checkable={all} />
    )

    expect(container.textContent).toContain("Untitled page")
    expect(container.textContent).toContain("t_1")
    expect(screen.getByRole("link", { name: /check this page/i })).toBeInstanceOf(HTMLElement)
  })

  /** A tree id reaches a URL, so it is encoded rather than concatenated. */
  it("encodes an id on its way into the link", () => {
    render(<CheckupChoices trees={[listing("t 1&x", 1)]} names={nothingNamed} checkable={all} />)

    expect(screen.getByRole("link").getAttribute("href")).toBe("/portal/checkup?tree=t%201%26x")
  })
})
