import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { faultRows } from "@/app/(docs)/_lib/prompt/faults"
import { docsBareRequest, docsModelRequest } from "@/app/(docs)/_lib/prompt/request"

import { InterpretationFaults } from "./interpretation-faults"
import { ModelRequest, PromptCost } from "./model-request"

/**
 * Through the components rather than around them. The projections have their
 * own tests; what these assert is that everything those projections produce
 * actually reaches the page — an elision that were dropped in the markup would
 * be a printout claiming to be complete.
 */

const request = docsModelRequest("first-tree")

describe("the printed request", () => {
  it("prints every block, its explanation and its size", () => {
    const { container } = render(<ModelRequest id="first-tree" />)

    for (const block of request.blocks) {
      expect(container.textContent).toContain(block.title)
      expect(container.textContent).toContain(block.summary)
      expect(container.textContent).toContain(
        `${new Intl.NumberFormat("en-US").format(block.characters)} chars`
      )
    }
  })

  it("prints the page's own outline, ids and all", () => {
    const { container } = render(<ModelRequest id="first-tree" />)
    const tree = request.blocks.find((block) => block.id === "tree")

    for (const line of tree?.preview ?? []) {
      expect(container.textContent).toContain(line)
    }
  })

  it("says how much of a long block it hid, rather than trailing off", () => {
    const { container } = render(<ModelRequest id="first-tree" />)
    const primitives = request.blocks.find((block) => block.id === "primitives")

    expect(primitives?.elided).toBeDefined()
    expect(container.textContent).toContain(
      `… ${primitives?.elided?.count} more ${primitives?.elided?.noun}`
    )
  })
})

describe("what a request costs", () => {
  it("gives a row to every block and a total that is the sum", () => {
    const { container } = render(<PromptCost id="first-tree" />)
    const format = new Intl.NumberFormat("en-US")

    for (const block of request.blocks) {
      expect(container.textContent).toContain(format.format(block.characters))
    }

    expect(container.textContent).toContain(format.format(request.measurement.total))
  })

  it("prints the comparison the page's argument rests on", () => {
    const { container } = render(<PromptCost id="first-tree" />)

    expect(container.textContent).toContain("with nothing registered")
    expect(container.textContent).toContain(
      new Intl.NumberFormat("en-US").format(docsBareRequest("first-tree").total)
    )
  })

  it("counts the primitives this deployment really registered", () => {
    const { container } = render(<PromptCost id="first-tree" />)

    expect(container.textContent).toContain(`${request.registered.primitives} primitives`)
  })
})

describe("the seven ways a guess fails", () => {
  it("prints every code, its actor and the runtime's sentence", () => {
    const { container } = render(<InterpretationFaults />)

    for (const row of faultRows) {
      expect(container.textContent).toContain(row.code)
      expect(container.textContent).toContain(row.sentence)
    }
  })

  it("leads with the five actors, so the grouping is met before the codes", () => {
    const { container } = render(<InterpretationFaults />)
    const text = container.textContent ?? ""

    for (const fault of new Set(faultRows.map((row) => row.fault))) {
      expect(text).toContain(fault)
    }

    expect(text.indexOf("deployment")).toBeLessThan(text.indexOf("interpreter-misconfigured"))
  })
})
