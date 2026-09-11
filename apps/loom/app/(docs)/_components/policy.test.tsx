import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { KNOB_GROUPS, KNOB_ORDER, policyKnobs } from "@/app/(docs)/_lib/policy/knobs"
import { COMPARISON_IDS, comparisonById } from "@/app/(docs)/_lib/policy/verdicts"

import { PolicyComparison, PolicyKnobs } from "./policy"

/**
 * What the two blocks owe a reader once the knobs and the verdicts are real.
 *
 * Both are checked next to the code that produces them; what is checked here is
 * the failure a generated block is prone to, which is printing some of what it
 * was handed. A knob card silently dropped is a policy field a deployment does
 * not know it has, and nothing else on this site would notice.
 */

describe("every knob, as a reader meets it", () => {
  it("shows one card per field, in reading order", () => {
    render(<PolicyKnobs />)

    const cards = document.querySelectorAll("[data-knob]")

    expect([...cards].map((card) => card.getAttribute("data-knob"))).toEqual([...KNOB_ORDER])
  })

  it("prints the shipped default beside every one of them", () => {
    render(<PolicyKnobs />)

    for (const knob of policyKnobs()) {
      const shipped = document.querySelector(`[data-shipped="${knob.field}"]`)

      expect(shipped?.textContent, `nothing was printed for ${knob.field}`).toBe(knob.shipped)
    }
  })

  it("heads each group with the question it answers", () => {
    render(<PolicyKnobs />)

    for (const group of KNOB_GROUPS) {
      expect(screen.getByText(group.title)).toBeDefined()
      expect(document.querySelector(`[data-knob-group="${group.id}"]`)).not.toBeNull()
    }
  })

  it("says of each group whether a deployment has to write it", () => {
    render(<PolicyKnobs />)

    for (const group of KNOB_GROUPS) {
      const said = document.querySelector(`[data-knob-group="${group.id}"] [data-yours]`)

      expect(said?.getAttribute("data-yours"), group.id).toBe(String(group.yours))
      expect(said?.textContent, group.id).toBe(group.yours ? "yours to write" : "ships with answers")
    }
  })
})

describe("a comparison, as a reader meets it", () => {
  it("shows both verdicts, with the Gate's own sentence under each", async () => {
    for (const id of COMPARISON_IDS) {
      const comparison = await comparisonById(id)

      const { unmount } = render(await PolicyComparison({ id }))

      const verdicts = document.querySelectorAll(`[data-comparison="${id}"] [data-verdict]`)

      expect([...verdicts].map((node) => node.getAttribute("data-verdict"))).toEqual(
        comparison.columns.map((column) => column.verdict.kind)
      )

      for (const column of comparison.columns) {
        const said = document.querySelector(`[data-said="${column.verdict.reasonCode}"]`)

        expect(said?.textContent, `${id} printed nothing for ${column.label}`).toBe(
          column.verdict.detail
        )
      }

      unmount()
    }
  })

  it("says what was asked for, once, in a person's words", async () => {
    const comparison = await comparisonById("what-you-protect")

    render(await PolicyComparison({ id: "what-you-protect" }))

    expect(screen.getByText(comparison.ask, { exact: false })).toBeDefined()
  })

  it("names the difference between the two columns rather than leaving it inferred", async () => {
    const comparison = await comparisonById("who-asked")

    render(await PolicyComparison({ id: "who-asked" }))

    for (const column of comparison.columns) {
      expect(screen.getByText(column.difference)).toBeDefined()
    }
  })
})
