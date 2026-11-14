import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import {
  baseBandCount,
  produceFailures,
  produceReaders,
} from "@/app/(docs)/_lib/live/pulling"

import { EveryWayAPullFails, OnePull, TheOneWait, ThreeReaders } from "./live-pages"

/**
 * What these four tables must not do is quietly show less than they know.
 *
 * `pulling.test.ts` holds the producers to the runtime. This holds the tables
 * to the producers, which is a different failure: a generated table that drops
 * a row looks completely fine, and the one on this page that matters most is
 * the failure table — a row missing from it is the page claiming fewer ways to
 * fail than there are, while every sentence around it still reads true.
 */

describe("OnePull", () => {
  it("shows the address it asked, with the path the client appends", async () => {
    render(await OnePull())

    expect(screen.getByText("https://loom.example.com/api/pages/live")).toBeTruthy()
    expect(screen.getByText(/\/api\/pages\/live appended by the client/)).toBeTruthy()
  })

  /**
   * The three counts are shown apart because they arrive apart. A table that
   * summed them would be hiding the one property the shape is for.
   */
  it("shows the pages, the rules and the forms as three rows", async () => {
    render(await OnePull())

    for (const row of ["Pages", "Segment rules", "Segment forms"]) {
      expect(screen.getByText(row), row).toBeTruthy()
    }
  })
})

describe("EveryWayAPullFails", () => {
  it("shows a row for every failure the producer produced", async () => {
    const failures = await produceFailures()
    const { container } = render(await EveryWayAPullFails())

    expect(container.querySelectorAll("tbody tr")).toHaveLength(failures.length)

    for (const failure of failures) {
      expect(container.querySelector(`[data-reason="${failure.reason}"]`), failure.reason).not.toBeNull()
    }
  })

  /**
   * The sentence the runtime returned, in the cell, not a paraphrase of it.
   *
   * This is the assertion that would have caught the shape 9 November's
   * finding is about: a table printing its own words about a failure keeps
   * reading true after the runtime's words change.
   */
  it("prints each runtime sentence verbatim", async () => {
    render(await EveryWayAPullFails())

    for (const failure of await produceFailures()) {
      expect(screen.getByText(failure.sentence), failure.reason).toBeTruthy()
    }
  })

  /** The claim the block exists for, in the caption and in every row. */
  it("says the reader got the page, in every row and in the caption", async () => {
    const failures = await produceFailures()
    const { container } = render(await EveryWayAPullFails())

    expect(screen.getByText(new RegExp(`page ${failures.length} times out of ${failures.length}`))).toBeTruthy()
    expect(container.querySelectorAll("tbody tr")).toHaveLength(
      screen.getAllByText("the page").length
    )
  })

  /** Both ceilings, because showing one would imply the table had waited the other. */
  it("names the ceiling it waited and the one a deployment waits", async () => {
    render(await EveryWayAPullFails())

    expect(screen.getByText(/waited 5ms rather than the 10s a deployment waits/)).toBeTruthy()
  })
})

describe("ThreeReaders", () => {
  /**
   * `getAllByText` for the context and not `getByText`, and the reason is the
   * argument of the third row: **two of these readers have the same context.**
   * The returning reader and the returning reader after the page moved are the
   * same person on two different days, and the table shows them being answered
   * differently. A unique-match assertion here would have been a test insisting
   * the page could not make the point it is making.
   */
  it("shows a row for each reader, with the context the server knew", async () => {
    const readers = await produceReaders()
    const { container } = render(await ThreeReaders())

    expect(container.querySelectorAll("tbody tr")).toHaveLength(readers.length)

    for (const reader of readers) {
      expect(screen.getByText(reader.who), reader.who).toBeTruthy()
      expect(screen.getAllByText(reader.context).length, reader.who).toBeGreaterThan(0)
    }
  })

  /**
   * The segment is named where there is one and *everybody* where there is
   * not, because `aud_everyone` is what no segment means and a blank cell
   * would read as a bug.
   */
  it("names the segment, or everybody", async () => {
    render(await ThreeReaders())

    expect(screen.getByText("filed under aud_returning")).toBeTruthy()
    expect(screen.getAllByText("filed under everybody")).toHaveLength(2)
  })

  /** The refused row carries the runtime's own refusal, and the other two carry none. */
  it("prints the refusal on the one row that has one", async () => {
    const stale = (await produceReaders())[2]
    const { container } = render(await ThreeReaders())

    expect(stale?.refusal).toBeDefined()
    expect(screen.getByText(stale?.refusal ?? "")).toBeTruthy()
    expect(container.querySelectorAll("[data-segment]")).toHaveLength(3)
  })

  /** The band counts are the arithmetic, so the insert is visible rather than asserted. */
  it("shows the form as one more band than the base page has", async () => {
    render(await ThreeReaders())

    expect(screen.getByText(`${baseBandCount() + 1} bands, the form's band first`)).toBeTruthy()
    expect(screen.getAllByText(`${baseBandCount()} bands`)).toHaveLength(2)
  })
})

describe("TheOneWait", () => {
  it("shows the first render waiting and the next one not", async () => {
    render(await TheOneWait())

    expect(screen.getByText("once, for the first pull")).toBeTruthy()
    expect(screen.getByText("no")).toBeTruthy()
    expect(screen.getByText("Pulls the door had been asked for")).toBeTruthy()
  })

  /**
   * The two columns **in order**, which is the whole of this table's argument.
   *
   * Swapping the headings left every assertion green: both cells of the first
   * row say the same number, and the two pills either side are each present
   * somewhere. So the table said the opposite of what the page says and no
   * case noticed. The headings are read in order, and the second row's cells
   * are tied to the column they sit in.
   */
  it("puts the first render before every render after it", async () => {
    const { container } = render(await TheOneWait())

    expect([...container.querySelectorAll("thead th")].map((th) => th.textContent)).toEqual([
      "",
      "The first render",
      "Every render after it",
    ])

    const rows = [...container.querySelectorAll("tbody tr")].map((row) =>
      [...row.querySelectorAll("td")].map((cell) => cell.textContent)
    )

    expect(rows[1]).toEqual(["Waited on the network", "once, for the first pull", "no"])
  })

  it("names what a silent Loom costs the first render", async () => {
    render(await TheOneWait())

    expect(screen.getByText(/ends that wait after 5s/)).toBeTruthy()
  })
})
