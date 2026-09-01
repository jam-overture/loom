import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { produceWriteEndings, WRITE_ENDING_ORDER } from "@/app/(docs)/_lib/write/endings"

import { WriteEndings } from "./write-endings"

/**
 * What the block owes a reader once the endings are real.
 *
 * The endings themselves are checked next to the code that produces them. What
 * is checked here is the failure a generated block is actually prone to:
 * printing some of what it was handed. A card silently dropped is an ending a
 * host does not know it has to handle, and nothing else on this site would
 * notice.
 */

const block = async () => {
  render(await WriteEndings())
}

describe("the seven endings, as a reader meets them", () => {
  it("shows one card per ending, in reading order", async () => {
    await block()

    const cards = document.querySelectorAll("[data-ending]")

    expect([...cards].map((card) => card.getAttribute("data-ending"))).toEqual(WRITE_ENDING_ORDER)
  })

  it("prints the runtime's own sentence on every one of them", async () => {
    const endings = await produceWriteEndings()

    await block()

    for (const ending of endings) {
      const said = document.querySelector(`[data-said="${ending.kind}"]`)

      expect(said?.textContent, `nothing was printed for ${ending.kind}`).toBe(ending.line)
    }
  })

  it("gives each ending a name a reader could repeat", async () => {
    const endings = await produceWriteEndings()

    await block()

    for (const ending of endings) {
      expect(screen.getByText(ending.title)).toBeDefined()
    }
  })
})
