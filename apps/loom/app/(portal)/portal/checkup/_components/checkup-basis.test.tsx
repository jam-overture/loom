import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import {
  buildElement,
  buildText,
  createTree,
  sequentialIdFactory,
  type LoomTree,
} from "@loom/runtime"

import { describeAudit } from "@/app/(portal)/_lib/audit-view"
import { assumptionOf } from "@/app/(portal)/_lib/checkup-basis"

import { CheckupBasis } from "./checkup-basis"

const pageOf = (labels: readonly string[]): LoomTree => {
  const ids = sequentialIdFactory("chk")

  return createTree(
    buildElement(ids, {
      type: "loom.page",
      children: labels.map((label) =>
        buildElement(ids, { type: "loom.prose", children: [buildText(ids, label)] })
      ),
    }),
    ids
  )
}

const drifted = (count: number) => {
  const stored = pageOf(Array.from({ length: count }, (_, index) => `line ${index}`))

  return { stored, replayed: { ...stored, root: { ...stored.root, children: [] } } }
}

const agreeing = (revision = 3) => describeAudit({ outcome: "agrees", revision, idReturns: [] })

const diverged = (revision: number) =>
  describeAudit({ outcome: "diverged", revision, ...drifted(revision), idReturns: [] })

const unreplayable = () =>
  describeAudit({
    outcome: "unreplayable",
    mismatch: { code: "revision-gap", expected: 3, found: 7 },
  })

describe("the basis of a checkup", () => {
  it("names all three inputs on the surface", () => {
    render(<CheckupBasis report={agreeing()} startingParts={10} />)

    expect(screen.getByRole("heading", { name: "What this check compared" })).toBeTruthy()

    for (const heading of ["Where it started", "What it replayed", "What it compared against"]) {
      expect(screen.getAllByText(heading).length, heading).toBeGreaterThan(0)
    }
  })

  it("prints the size of both things it read", () => {
    render(<CheckupBasis report={agreeing(3)} startingParts={10} />)

    expect(screen.getByText(/10 parts/u)).toBeTruthy()
    expect(screen.getByText(/3 changes/u)).toBeTruthy()
  })

  /**
   * The reason this component exists. An unreplayable fold stopped part-way, so
   * it replayed no number of changes anybody can print — and a basis reading
   * "it replayed 12 changes" under a verdict reading "nothing could be checked"
   * would be the same overclaim the unit was written to remove, one screen
   * lower down.
   */
  it("renders nothing at all when the fold compared nothing", () => {
    const { container } = render(<CheckupBasis report={unreplayable()} startingParts={10} />)

    expect(container.innerHTML).toBe("")
  })

  /**
   * The assumption is not technical detail. It is the correction: the screen
   * said two things went into the verdict when three did, and a reader who has
   * to open a disclosure to find that out has been told the same wrong thing
   * the sentence used to tell them.
   */
  it("puts the assumption on the surface rather than behind the disclosure", () => {
    const { container } = render(<CheckupBasis report={agreeing()} startingParts={10} />)

    const surface = screen.getByText(assumptionOf("agrees").plain)

    expect(surface).toBeTruthy()
    expect(container.querySelector("details")?.contains(surface)).toBe(false)
  })

  it("says what the assumption costs under a red verdict, not the green sentence", () => {
    render(<CheckupBasis report={diverged(2)} startingParts={10} />)

    expect(screen.getByText(assumptionOf("diverged").plain)).toBeTruthy()
    expect(screen.queryByText(assumptionOf("agrees").plain)).toBeNull()
  })

  /**
   * Nothing is removed. Every runtime reading of every input is on the screen,
   * inside one disclosure that reads on its own — including the one naming why
   * a starting shape cannot be inferred from the answer being checked.
   */
  it("keeps the runtime's reading of all four, one click down", () => {
    const { container } = render(<CheckupBasis report={agreeing(3)} startingParts={10} />)

    const details = container.querySelector("details")

    expect(details?.textContent).toContain("The seed handed to auditSnapshot")
    expect(details?.textContent).toContain("Revisions 1 to 3 of the log")
    expect(details?.textContent).toContain("The stored snapshot at revision 3")
    expect(details?.textContent).toContain(assumptionOf("agrees").technical)
  })

  it("never reverses a row or a column to place something", () => {
    const { container } = render(<CheckupBasis report={agreeing()} startingParts={10} />)

    expect(container.innerHTML).not.toContain("flex-row-reverse")
    expect(container.innerHTML).not.toContain("flex-col-reverse")
  })
})
