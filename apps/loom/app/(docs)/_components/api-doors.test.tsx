import { render, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import type { ApiDoor, ApiDoorway } from "@/app/(docs)/_lib/api/doors"
import type { PackageSpelling } from "@/app/(docs)/_lib/spelling"

import { ApiDoors } from "./api-doors"

/**
 * What the front door of the reference has to get right.
 *
 * The measurement is tested next door. What is checked here is the part a
 * reader meets: that every import is a link to its own page, that the three
 * sentences which change with the shape of the package say the true one, and
 * that a package which cannot embarrass itself — one door, no overlaps —
 * renders no band about doors it does not have.
 */

const door = (over: Partial<ApiDoor> = {}): ApiDoor => ({
  specifier: "@invented",
  slug: "root",
  summary: "What is behind the root import.",
  audience: "app",
  publishes: 100,
  writtenPages: 4,
  widest: true,
  ...over,
})

const doorway = (over: Partial<ApiDoorway> = {}): ApiDoorway => ({
  doors: [door(), door({ specifier: "@invented/b", slug: "b", publishes: 20, widest: false })],
  packageNames: 118,
  published: 120,
  pairs: 1,
  pairsSharingNothing: 0,
  overlapping: [{ a: "@invented", b: "@invented/b", names: 2 }],
  collisions: [],
  ...over,
})

const spelling = (over: Partial<PackageSpelling> = {}): PackageSpelling => ({
  british: ["Catalogued", "catalogueOf", "colour"],
  examples: ["catalogueOf", "colour"],
  ...over,
})

describe("the front door of the reference", () => {
  it("links every import to the page that documents it", () => {
    const { container } = render(<ApiDoors doorway={doorway()} spelling={spelling()} />)
    const list = within(container)

    expect(list.getAllByRole("link", { name: "@invented" })[0]?.getAttribute("href")).toBe(
      "/docs/api-reference/root"
    )
    expect(list.getAllByRole("link", { name: "@invented/b" })[0]?.getAttribute("href")).toBe(
      "/docs/api-reference/b"
    )
  })

  it("says how many names are behind each one, in the singular where there is one", () => {
    const { container } = render(
      <ApiDoors
        spelling={spelling()}
        doorway={doorway({
          doors: [
            door({ publishes: 1_040 }),
            door({ specifier: "@invented/b", slug: "b", publishes: 1, widest: false }),
          ],
        })}
      />
    )

    const said = container.textContent ?? ""

    expect(said).toContain("1,040 names")
    expect(said).toContain("1 name")
  })

  it("groups the imports by who writes them, and prints no heading over an empty group", () => {
    const { container } = render(
      <ApiDoors
        spelling={spelling()}
        doorway={doorway({
          doors: [
            door(),
            door({ specifier: "@invented/cli", slug: "cli", audience: "tooling", widest: false }),
          ],
        })}
      />
    )

    const headings = within(container).getAllByRole("heading")

    expect(headings.map((heading) => heading.textContent)).toEqual([
      "If you are building a page",
      "From a terminal, and from your tests",
      "No import has everything behind it",
      "Some of these names are spelled the British way",
    ])
  })

  it("names the widest door and the narrowest, with the package's own total", () => {
    const { container } = render(<ApiDoors doorway={doorway()} spelling={spelling()} />)
    const said = container.textContent ?? ""

    expect(said).toContain("118 names")
    expect(said).toContain("publishes 100 of them")
    expect(said).toContain("publishes 20")
  })

  it("counts the pairs that share nothing, in the words of the package it has", () => {
    const { container } = render(
      <ApiDoors
        doorway={doorway({ pairs: 120, pairsSharingNothing: 116, packageNames: 1_077 })}
        spelling={spelling()}
      />
    )

    const said = container.textContent ?? ""

    expect(said).toContain("120 pairs")
    expect(said).toContain("116 of them share no name at all")
  })

  it("lists the pairs that do overlap, and says nothing where none do", () => {
    const none = render(<ApiDoors doorway={doorway({ overlapping: [] })} spelling={spelling()} />)

    expect(none.container.textContent ?? "").not.toContain("overlap")

    const { container } = render(
      <ApiDoors
        spelling={spelling()}
        doorway={doorway({
          overlapping: [
            { a: "@invented", b: "@invented/b", names: 14 },
            { a: "@invented", b: "@invented/c", names: 1 },
          ],
        })}
      />
    )

    const said = container.textContent ?? ""

    expect(said).toContain("The 2 pairs that do overlap")
    expect(said).toContain("share 14 names")
    expect(said).toContain("share 1 name")
  })

  it("says a name means two things only where one does", () => {
    const none = render(<ApiDoors doorway={doorway()} spelling={spelling()} />)

    expect(none.container.textContent ?? "").not.toContain("two different things")

    const { container } = render(
      <ApiDoors
        spelling={spelling()}
        doorway={doorway({
          collisions: [{ name: "horizonOf", specifiers: ["@invented", "@invented/b"] }],
        })}
      />
    )

    const said = container.textContent ?? ""

    expect(said).toContain("One name here means two different things")
    expect(said).toContain("horizonOf")
  })

  /**
   * The one shape where a reader's guess is right. A package with no such door
   * must not print the sentence, because *this import is the only one that is
   * part of a bigger one* is a claim about the other fifteen.
   */
  it("names the door that is inside another, and only when there is one", () => {
    const none = render(<ApiDoors doorway={doorway()} spelling={spelling()} />)

    expect(none.container.textContent ?? "").not.toContain("is the one import")

    const { container } = render(
      <ApiDoors
        spelling={spelling()}
        doorway={doorway({
          doors: [
            door(),
            door({
              specifier: "@invented/b",
              slug: "b",
              publishes: 20,
              widest: false,
              insideOf: "@invented",
            }),
          ],
        })}
      />
    )

    expect(container.textContent ?? "").toContain("is the one import")
  })

  it("sends a reader who has a name to the search and one who has nothing to installation", () => {
    const { container } = render(<ApiDoors doorway={doorway()} spelling={spelling()} />)

    expect(
      within(container).getByRole("link", { name: "Installation" }).getAttribute("href")
    ).toBe("/docs/getting-started/installation")
    expect(container.textContent ?? "").toContain("Looking for one particular name?")
  })

  /**
   * The spelling band, and the two things it has to get right.
   *
   * It is the only place on this site that tells a reader why a page can say
   * *color* in a sentence and `colour` in the code beside it, so the sentence
   * is checked rather than the heading — and the count is the package's own,
   * grouped the way every other number on this page is.
   */
  it("says how many names carry a British spelling, and shows some of them as code", () => {
    const { container } = render(
      <ApiDoors
        doorway={doorway({ packageNames: 1_727 })}
        spelling={spelling({ british: Array.from({ length: 47 }, (_, index) => `n${index}`) })}
      />
    )

    const said = container.textContent ?? ""

    expect(said).toContain("47 of the 1,727 names in this package carry a British spelling")
    expect(said).toContain("The spelling is part of the name")
    expect(within(container).getByText("catalogueOf").tagName).toBe("CODE")
    expect(within(container).getByText("colour").tagName).toBe("CODE")
  })

  it("prints no such band for a package whose names are all spelled the American way", () => {
    const { container } = render(
      <ApiDoors doorway={doorway()} spelling={{ british: [], examples: [] }} />
    )

    expect(container.textContent ?? "").not.toContain("British")
  })
})

/**
 * Whether this site has written anything about an import, under the import.
 *
 * The answer that earns the line is nought, and it is only legible beside the
 * others — so both are checked, and the nought is checked for the words a
 * reader acts on rather than for the digit.
 */
describe("how much of the site writes about each import", () => {
  const said = (writtenPages: number): string => {
    const { container } = render(
      <ApiDoors doorway={doorway({ doors: [door({ writtenPages })] })} spelling={spelling()} />
    )

    return container.textContent ?? ""
  }

  it("says how many written pages name anything behind a door", () => {
    expect(said(4)).toContain("Named on 4 written pages")
  })

  it("says page rather than pages when there is one", () => {
    expect(said(1)).toContain("Named on 1 written page")
  })

  it("says plainly when no written page names anything behind a door", () => {
    expect(said(0)).toContain("No written page names anything published by this import.")
    expect(said(0)).not.toContain("Named on 0")
  })
})

/**
 * What a row shows a reader, and what it hands the search box.
 *
 * **These two are not the same thing and that is the whole of this block.** The
 * sentence under a specifier and the count beside it are both on the screen and
 * neither is in the index: the sentence because the contents file already
 * carries it under the page it is about, the count because nobody types a
 * number and the digit is read off another lane's package.
 *
 * It is asserted here, on the row, as well as on the index in
 * `search/generated.test.ts`, because the two failures are opposite. An index
 * assertion goes red if the attribute is **dropped**. A row assertion goes red
 * if the sentence or the count is **deleted** — which is the cheaper way to get
 * the same byte count, which is the mistake a saving measured in bytes would
 * congratulate, and which costs a reader the one line on this page that says
 * what an import is for.
 *
 * So the pair is the point rather than either half: *out of the index, and
 * still on the screen.*
 */
describe("a door's row", () => {
  const row = () => {
    const { container } = render(<ApiDoors doorway={doorway()} spelling={spelling()} />)

    return container
  }

  it("shows the reader the sentence and the count, both of them", () => {
    const said = row().textContent ?? ""

    expect(said).toContain("What is behind the root import.")
    expect(said).toContain("100 names")
  })

  it("keeps the sentence out of the index, because the page it is about has it", () => {
    /* Both doors in the fixture carry the same sentence, so this asks about
       the first of them rather than the only one. */
    const summary = within(row()).getAllByText("What is behind the root import.")[0]

    expect(summary?.getAttribute("data-search")).toBe("off")
  })

  it("keeps the count out of the index, because it is a label and not a query", () => {
    const count = within(row()).getAllByText(/^100\s+names$/)[0]

    expect(count?.getAttribute("data-search")).toBe("off")
  })

  /**
   * The specifier is the one part of a row a reader does type, so it stays
   * indexed — and it is the part that makes the row findable at all.
   */
  it("leaves the specifier in the index, which is what a reader types", () => {
    const link = within(row()).getAllByRole("link", { name: "@invented" })[0]

    expect(link?.getAttribute("data-search")).toBeNull()
    expect(link?.closest("[data-search='off']")).toBeNull()
  })
})
