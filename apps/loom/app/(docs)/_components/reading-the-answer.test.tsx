import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { libraryReaders, readingFaults } from "@/app/(docs)/_lib/data/reading"
import { CLASSES_DRAWABLE } from "@/app/(docs)/_lib/data/shop"

import { BoundExample, LibraryReaders, ReadingFaults } from "./reading-the-answer"

/**
 * What these three blocks owe a reader.
 *
 * The facts behind them are checked beside the code that produces them. What is
 * checked here is the failure a generated block is prone to and nothing else
 * would see: showing some of what it was handed. A table that printed four of
 * five readers would be the page making a smaller claim than the registry
 * supports, and a count in a caption that disagreed with the rows under it is
 * the exact mistake this section was written to correct.
 */

describe("the readers in the library", () => {
  it("shows a row for every one of them", () => {
    render(<LibraryReaders />)

    expect([...document.querySelectorAll("tbody tr")]).toHaveLength(libraryReaders().length)
  })

  it("names each one, so a reader can go and look it up", () => {
    render(<LibraryReaders />)

    const printed = document.body.textContent ?? ""

    for (const reader of libraryReaders()) expect(printed).toContain(reader.type)
  })

  it("counts them in the caption with the same number as the rows", () => {
    render(<LibraryReaders />)

    const caption = document.querySelector("p")?.textContent ?? ""

    expect(caption).toContain(String(libraryReaders().length))
  })

  it("names its block, so a shot list and a test ask for it the same way", () => {
    render(<LibraryReaders />)

    expect(document.querySelector('[data-block="library-readers"]')).not.toBeNull()
  })

  it("says which of them place no regions rather than leaving the column blank", () => {
    render(<LibraryReaders />)

    const tally = [...document.querySelectorAll("tbody tr")].find((row) =>
      row.textContent?.includes("loom.tally")
    )

    expect(tally?.textContent).toContain("none")
    expect(tally?.textContent).toContain("yes")
  })
})

describe("the three faults", () => {
  it("shows one row per fault, tagged with the code it is filed under", async () => {
    const faults = await readingFaults()

    render(await ReadingFaults())

    const tagged = [...document.querySelectorAll("[data-fault]")].map((node) =>
      node.getAttribute("data-fault")
    )

    expect(tagged).toEqual(faults.map((fault) => fault.code))
  })

  it("names its block too", async () => {
    render(await ReadingFaults())

    expect(document.querySelector('[data-block="reading-faults"]')).not.toBeNull()
  })

  it("prints each fault's sentence whole", async () => {
    const faults = await readingFaults()

    render(await ReadingFaults())

    const printed = document.body.textContent ?? ""

    for (const fault of faults) expect(printed).toContain(fault.sentence)
  })
})

describe("the example that asks its deployment something", () => {
  it("draws the rows the shop answered, none of which are in the tree", async () => {
    render(await BoundExample({ id: "a-feed-reading-an-answer" }))

    const printed = document.body.textContent ?? ""

    expect(printed).toContain("Buttercream basics")
    expect(printed).toContain("Piping flowers")
  })

  it("draws neither of the two regions while the answer is a list with rows in it", async () => {
    render(await BoundExample({ id: "a-feed-reading-an-answer" }))

    /**
     * Read with the tree inspector taken out. Both sentences are *in the tree* —
     * that is the point of them being regions — so the frame's own
     * *show the tree* block prints them whatever the answer was, and a check
     * over the whole frame would be asking the wrong question.
     */
    const inspector = document.querySelector("[data-example] pre")

    expect(inspector?.textContent).toContain("Nothing in the diary just yet")

    inspector?.remove()

    const drawn = document.body.textContent ?? ""

    expect(drawn).not.toContain("Nothing in the diary just yet")
    expect(drawn).not.toContain("We cannot reach the diary")
  })

  it("shows no diagnostic strip, because the page it draws is sound", async () => {
    render(await BoundExample({ id: "a-feed-reading-an-answer" }))

    const printed = document.body.textContent ?? ""

    expect(printed).not.toContain("could not")
    expect(printed).not.toContain("rendered with none")
  })

  it("draws as many entries as the shop has named classes", async () => {
    render(await BoundExample({ id: "a-feed-reading-an-answer" }))

    /**
     * Counted off the list the feed drew rather than off the frame, since the
     * frame also holds the propose box and the tree inspector.
     */
    const entries = [...document.querySelectorAll("[data-example] li")]

    expect(entries.length).toBeGreaterThanOrEqual(CLASSES_DRAWABLE)
  })

  it("refuses an example that asks nothing, rather than resolving a tree with no questions", async () => {
    await expect(BoundExample({ id: "first-tree" })).rejects.toThrow(/asks nothing/)
  })

  it("refuses an id nobody registered", async () => {
    await expect(BoundExample({ id: "no-such-example" })).rejects.toThrow(/no documented example/)
  })
})
