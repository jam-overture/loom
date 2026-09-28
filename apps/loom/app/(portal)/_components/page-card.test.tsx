import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import {
  buildElement,
  buildText,
  createTree,
  sequentialIdFactory,
  type LoomTree,
} from "@jam-overture/loom"

import { runtimeWordsIn } from "@/app/(portal)/_test/plain-language"
import type { PageName } from "@/app/(portal)/_lib/page-name"

import { PageCardLink, type PageCard } from "./page-card"

const tree = (heading: string): LoomTree => {
  const ids = sequentialIdFactory("card")

  return createTree(
    buildElement(ids, {
      type: "loom.page",
      children: [
        buildElement(ids, {
          type: "loom.heading",
          props: { level: 1 },
          children: [buildText(ids, heading)],
        }),
      ],
    }),
    ids
  )
}

const named = (treeId: string, name: string): PageName => ({ name, treeId, derived: true })

const card = (over: Partial<PageCard> = {}): PageCard => ({
  page: named("t_prices", "Autumn prices"),
  treeId: "t_prices",
  waiting: 0,
  unreadable: 0,
  version: 4,
  tree: tree("Autumn prices"),
  ...over,
})

describe("PageCardLink", () => {
  /**
   * Twice on screen and once to a screen reader, which is the arrangement this
   * card is for: the picture shows the page's own leading heading, and the name
   * under it is derived from that same heading (`page-name.ts`), so a sighted
   * reader sees one fact drawn and then named. The thumbnail is `aria-hidden`,
   * so the accessible name carries it exactly once.
   */
  it("names the page and keeps its id beside the name", () => {
    render(<PageCardLink card={card()} />)

    expect(screen.getAllByText("Autumn prices")).toHaveLength(2)
    expect(screen.getByText("t_prices")).toBeTruthy()

    const spoken = screen.getByRole("link").textContent ?? ""

    expect(spoken).toContain("t_prices")
    expect(screen.getByRole("link", { name: /Autumn prices/ })).toBeTruthy()
  })

  /**
   * `/portal/pages`' shape, and for the reason a screenshot established on
   * 27 September: Tailwind's preflight sets `a { text-decoration: inherit }`, so
   * a name-sized link beside a picture of the thing it names looks exactly like
   * the parts of the card that are not pressable.
   */
  it("makes the whole card the press", () => {
    render(<PageCardLink card={card({ waiting: 3 })} />)
    const link = screen.getByRole("link")

    expect(link.getAttribute("href")).toBe("/portal/pages/t_prices")
    expect(link.textContent).toContain("Autumn prices")
    expect(link.textContent).toContain("3 changes waiting for you")
    expect(link.className).toContain("no-underline")
  })

  /**
   * The three states `needsYouRank` distinguishes, drawn as three different
   * things. A card that drew *nothing is waiting* and *we could not find out*
   * identically is the defect 24 September fixed on `/portal/pages`, and the fix
   * does not transfer by itself.
   */
  it("tells a page with changes waiting from one with none", () => {
    render(<PageCardLink card={card({ waiting: 3 })} />)

    expect(screen.getByText("3 changes waiting for you")).toBeTruthy()
    expect(screen.queryByText("Nothing waiting")).toBeNull()
  })

  it("says nothing is waiting rather than showing no mark at all", () => {
    render(<PageCardLink card={card({ waiting: 0 })} />)

    expect(screen.getByText("Nothing waiting")).toBeTruthy()
  })

  it("tells a count that could not be read from a count of nothing", () => {
    render(<PageCardLink card={card({ waiting: null })} />)

    expect(screen.getByText(/couldn’t check what’s waiting/)).toBeTruthy()
    expect(screen.queryByText("Nothing waiting")).toBeNull()
  })

  it("says change rather than changes when there is one", () => {
    render(<PageCardLink card={card({ waiting: 1 })} />)

    expect(screen.getByText("1 change waiting for you")).toBeTruthy()
  })

  /** Counted, never folded into the answerable count — the 20 September rule. */
  it("marks the changes it could not read beside the ones it could", () => {
    render(<PageCardLink card={card({ waiting: 2, unreadable: 1 })} />)

    expect(screen.getByText("2 changes waiting for you")).toBeTruthy()
    expect(screen.getByText("1 can’t be read")).toBeTruthy()
  })

  /**
   * A page that could not be read and a page with nothing on it look identical
   * drawn, and are opposite facts. So one of them is said instead.
   */
  it("says it could not read the page rather than drawing an empty frame", () => {
    const { container } = render(<PageCardLink card={card({ tree: undefined })} />)

    expect(screen.getByText(/couldn’t read this page just now/)).toBeTruthy()
    expect(container.querySelector("[aria-hidden='true']")).toBeNull()
  })

  it("draws the page when it could be read", () => {
    const { container } = render(<PageCardLink card={card()} />)

    expect(container.querySelector("[aria-hidden='true']")).toBeTruthy()
    expect(screen.queryByText(/couldn’t read this page just now/)).toBeNull()
  })

  /** The page's own history in one number, in the portal's word rather than the runtime's. */
  it("says how much has happened to the page", () => {
    render(<PageCardLink card={card({ version: 4 })} />)

    expect(screen.getByText("4 changes so far")).toBeTruthy()
  })

  it("says change rather than changes for a page with one", () => {
    render(<PageCardLink card={card({ version: 1 })} />)

    expect(screen.getByText("1 change so far")).toBeTruthy()
  })

  /**
   * Every word this card writes, against the runtime's vocabulary — the words
   * inside the thumbnail are the reader's own page and are excluded by reading
   * the card's chrome rather than its picture.
   */
  it("says all of its own words without the runtime's vocabulary", () => {
    const { container } = render(
      <PageCardLink card={card({ waiting: null, unreadable: 2, tree: undefined })} />
    )

    expect(runtimeWordsIn(container.textContent ?? "", ["id"])).toEqual([])
  })
})
