import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { installCommands, whatYouNeed } from "@/app/(docs)/_lib/installing"

import { InstallCommand, WhatYouNeed } from "./installing"

/**
 * The first thing a stranger is told to type, and the table beside it.
 *
 * `installing.test.ts` holds the list against every import on the site in both
 * directions, and none of that notices if the block prints nothing — which is
 * the 2 October finding this lane has now met four times: a produced block
 * whose producer is tested hard and whose **printing** nothing looked at. A
 * silently empty install command is the worst instance of it available, since
 * the page it is on exists to carry one line.
 *
 * So this reads the words back out of the document, and every count below is
 * held against being more than one as well as against the list, because a list
 * that went empty would satisfy every loop at once.
 */

const command = () => render(<InstallCommand />).container
const table = () => render(<WhatYouNeed />).container

const cellsOf = (container: HTMLElement): readonly string[][] =>
  [...container.querySelectorAll("tbody tr")].map((row) =>
    [...row.querySelectorAll("td")].map((cell) => cell.textContent ?? "")
  )

describe("the install command", () => {
  it("prints the lines the list decides, and nothing else", () => {
    expect(installCommands().length).toBeGreaterThan(0)
    expect(command().querySelector("pre")?.textContent).toBe(installCommands().join("\n"))
  })

  it("names every package in the command, so an empty one cannot pass", () => {
    const printed = command().textContent ?? ""

    expect(printed).toContain("pnpm add")
    expect(printed).toContain("@jam-overture/loom")
    expect(printed).toContain("zod")
  })

  /* The copy button is `CodeBlock`'s, and it is the reason the command is
     rendered through it rather than as a styled div: this is a line a reader
     is meant to take away, not read. */
  it("is a block a reader can copy, like every fence on the site", () => {
    expect(command().querySelector("button")).not.toBeNull()
  })
})

describe("the table of what you need", () => {
  it("prints a row per group the list produces", () => {
    expect(whatYouNeed().length).toBeGreaterThan(1)
    expect(cellsOf(table())).toHaveLength(whatYouNeed().length)
  })

  it("can be named on a page that carries two tables", () => {
    expect(table().querySelectorAll("[data-needs]")).toHaveLength(1)
  })

  it("prints every package name, its sentence, and the page it is first used on", () => {
    const rows = cellsOf(table())

    for (const [at, row] of whatYouNeed().entries()) {
      for (const name of row.packages) expect(rows[at]?.[0], name).toContain(name)

      expect(rows[at]?.[1]).toBe(row.when)
      expect(rows[at]?.[2]).toBe(row.firstUsedOn?.title ?? "—")
    }
  })

  it("prints a second command only on the rows the first one leaves out", () => {
    const rows = cellsOf(table())

    for (const [at, row] of whatYouNeed().entries()) {
      if (row.add === undefined) expect(rows[at]?.[0], row.packages.join(" ")).not.toContain("pnpm add")
      else expect(rows[at]?.[0], row.packages.join(" ")).toContain(row.add)
    }
  })

  it("links the page a package is first used on", () => {
    const links = [...table().querySelectorAll("tbody a")].map((link) => link.getAttribute("href"))
    const wanted = whatYouNeed().flatMap((row) => (row.firstUsedOn === undefined ? [] : [row.firstUsedOn.href]))

    expect(wanted.length).toBeGreaterThan(1)
    expect(links).toEqual(wanted)
  })
})
