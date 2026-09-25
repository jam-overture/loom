import { render, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import type { ApiDoor, ApiDoorway } from "@/app/(docs)/_lib/api/doors"

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

describe("the front door of the reference", () => {
  it("links every import to the page that documents it", () => {
    const { container } = render(<ApiDoors doorway={doorway()} />)
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
    ])
  })

  it("names the widest door and the narrowest, with the package's own total", () => {
    const { container } = render(<ApiDoors doorway={doorway()} />)
    const said = container.textContent ?? ""

    expect(said).toContain("118 names")
    expect(said).toContain("publishes 100 of them")
    expect(said).toContain("publishes 20")
  })

  it("counts the pairs that share nothing, in the words of the package it has", () => {
    const { container } = render(
      <ApiDoors doorway={doorway({ pairs: 120, pairsSharingNothing: 116, packageNames: 1_077 })} />
    )

    const said = container.textContent ?? ""

    expect(said).toContain("120 pairs")
    expect(said).toContain("116 of them share no name at all")
  })

  it("lists the pairs that do overlap, and says nothing where none do", () => {
    const none = render(<ApiDoors doorway={doorway({ overlapping: [] })} />)

    expect(none.container.textContent ?? "").not.toContain("overlap")

    const { container } = render(
      <ApiDoors
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
    const none = render(<ApiDoors doorway={doorway()} />)

    expect(none.container.textContent ?? "").not.toContain("two different things")

    const { container } = render(
      <ApiDoors
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
    const none = render(<ApiDoors doorway={doorway()} />)

    expect(none.container.textContent ?? "").not.toContain("is the one import")

    const { container } = render(
      <ApiDoors
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
    const { container } = render(<ApiDoors doorway={doorway()} />)

    expect(
      within(container).getByRole("link", { name: "Installation" }).getAttribute("href")
    ).toBe("/docs/getting-started/installation")
    expect(container.textContent ?? "").toContain("Looking for one particular name?")
  })
})
