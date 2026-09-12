import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import type { OperationEffect, ProposalEffect } from "@/app/(portal)/_lib/proposal-effect"

import { ProposalEffectView } from "./proposal-effect"

const operation = (over: Partial<OperationEffect> = {}): OperationEffect => ({
  op: "configure",
  verb: "reconfigure",
  subject: { name: "the heading “Ship faster”", nodeId: "n_h1" },
  label: "loom.heading",
  place: ["loom.page", "loom.card"],
  placeNames: ["the page", "the card"],
  detail: "1 value",
  into: null,
  before: null,
  from: null,
  changes: [{ key: "title", before: `"Ship faster"`, after: `"Ship safer"`, inert: false }],
  text: [],
  carries: null,
  missing: false,
  inert: false,
  ...over,
})

const effect = (over: Partial<ProposalEffect> = {}): ProposalEffect => ({
  operations: [operation()],
  applies: true,
  obstacle: null,
  baseRevision: 4,
  treeRevision: 4,
  stale: false,
  inertCount: 0,
  ...over,
})

/**
 * What a reviewer meets without asking.
 *
 * A closed `<details>` is still in the DOM — deliberately, so find-in-page
 * reaches it — which means `document.body.textContent` cannot tell "on the
 * surface" from "one click down". Every assertion about the plain-language rule
 * turns on that difference, so it gets a reading of its own.
 */
const surfaceOf = (container: HTMLElement): string => {
  const copy = container.cloneNode(true) as HTMLElement

  for (const disclosure of Array.from(copy.querySelectorAll("details"))) disclosure.remove()

  return copy.textContent ?? ""
}

const recordOf = (container: HTMLElement): string =>
  Array.from(container.querySelectorAll("details"), (one) => one.textContent ?? "").join(" ")

describe("ProposalEffectView", () => {
  it("asks the reader's own question rather than labelling the section", () => {
    const { container } = render(<ProposalEffectView effect={effect()} />)

    expect(surfaceOf(container)).toContain("What this would do to your page")
  })

  it("leads with what would happen, in a sentence", () => {
    const { container } = render(<ProposalEffectView effect={effect()} />)

    expect(surfaceOf(container)).toContain(
      "Changes the title of the heading “Ship faster” n_h1."
    )
  })

  /**
   * The rule, as one assertion. Everything the section used to print is still
   * rendered; none of it is what a reviewer meets first.
   */
  it("keeps the delta's own verb off the surface and in the record", () => {
    const { container } = render(<ProposalEffectView effect={effect()} />)

    expect(surfaceOf(container)).not.toContain("reconfigure")
    expect(recordOf(container)).toContain("reconfigure loom.heading — 1 value")
  })

  /** The before side is the whole point: the delta already says what it writes. */
  it("shows what a value is now beside what it would become", () => {
    const { container } = render(<ProposalEffectView effect={effect()} />)

    expect(surfaceOf(container)).toContain(`"Ship faster"`)
    expect(surfaceOf(container)).toContain(`"Ship safer"`)
  })

  /**
   * An empty string and an unset key are different things to the runtime, and a
   * blank cell would render them identically.
   */
  it("names an absent value rather than leaving the cell blank", () => {
    const { container } = render(
      <ProposalEffectView
        effect={effect({
          operations: [
            operation({ changes: [{ key: "tone", before: null, after: null, inert: false }] }),
          ],
        })}
      />
    )

    expect(surfaceOf(container)).toContain("nothing set")
    expect(surfaceOf(container)).toContain("taken away")
  })

  /**
   * The breadcrumb is prose now, and the labelled path it replaced is under the
   * disclosure rather than gone. One row naming one part two ways — *the card*
   * in the sentence and `loom.card` in monospace directly under it — is the
   * thing this pair of assertions exists to stop coming back.
   */
  it("says what the breadcrumb is a path to, in the voice of the sentence above it", () => {
    const { container } = render(<ProposalEffectView effect={effect()} />)

    expect(surfaceOf(container)).toContain("Inside the page › the card")
    expect(surfaceOf(container)).not.toContain("loom.page")
    expect(recordOf(container)).toContain("loom.page › loom.card")
  })

  /**
   * A refusal a reviewer reads *after* weighing the change has already cost them
   * the decision, so it is announced and it comes first in the DOM.
   */
  it("announces a proposal that would no longer apply, before the operations", () => {
    const { container } = render(
      <ProposalEffectView
        effect={effect({ applies: false, obstacle: "No node n_p9 in this tree." })}
      />
    )

    const announced = screen.getByRole("status")

    expect(announced.textContent).toContain("This would not work on the page as it stands.")
    expect(
      announced.compareDocumentPosition(container.querySelector("ol") as Element) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
  })

  it("keeps the runtime's account of a refusal, one click down", () => {
    const { container } = render(
      <ProposalEffectView
        effect={effect({ applies: false, obstacle: "No node n_p9 in this tree." })}
      />
    )

    expect(surfaceOf(container)).not.toContain("No node n_p9")
    expect(recordOf(container)).toContain("No node n_p9 in this tree.")
  })

  it("says how far the page has moved when the proposal is stale, and what to do", () => {
    render(
      <ProposalEffectView
        effect={effect({
          applies: false,
          stale: true,
          baseRevision: 4,
          treeRevision: 7,
          obstacle: "Delta targets revision 4 but the tree is at revision 7.",
        })}
      />
    )

    const announced = screen.getByRole("status")

    expect(announced.textContent).toContain("older version of this page")
    expect(announced.textContent).toContain("changed 3 times")
    expect(announced.textContent).toContain("Turn it down and ask again.")
  })

  /**
   * The runtime's obstacle for a stale proposal is the revision mismatch, so
   * printing it beside the portal's own sentence says the same thing twice.
   */
  it("says the page moved once, not once in each vocabulary", () => {
    const { container } = render(
      <ProposalEffectView
        effect={effect({
          applies: false,
          stale: true,
          baseRevision: 4,
          treeRevision: 7,
          obstacle: "Delta targets revision 4 but the tree is at revision 7.",
        })}
      />
    )

    expect(screen.getByRole("status").textContent).not.toContain("Delta targets")
    expect(recordOf(container)).toContain("Delta targets revision 4 but the tree is at revision 7.")
    expect(recordOf(container)).toContain(
      "judged against revision 4 · this page is at revision 7"
    )
  })

  /**
   * Both numbers, whether or not they are the problem: "judged against 6, page
   * is at 6" is the sentence that says a proposal is still current, and nothing
   * else on the card says it.
   */
  it("records both revision numbers on a proposal that would apply", () => {
    const { container } = render(
      <ProposalEffectView effect={effect({ baseRevision: 6, treeRevision: 6 })} />
    )

    expect(recordOf(container)).toContain(
      "judged against revision 6 · this page is at revision 6"
    )
  })

  /** Nothing else on the card would give this away: it looks like a change. */
  it("says when applying the change would leave the page exactly as it is", () => {
    const { container } = render(
      <ProposalEffectView
        effect={effect({ operations: [operation({ inert: true })], inertCount: 1 })}
      />
    )

    expect(surfaceOf(container)).toContain("No change")
    expect(surfaceOf(container)).toContain("saying yes would leave the page exactly as it is")
  })

  it("counts a partly inert proposal without claiming the whole of it is", () => {
    const { container } = render(
      <ProposalEffectView
        effect={effect({ operations: [operation({ inert: true }), operation()], inertCount: 1 })}
      />
    )

    expect(surfaceOf(container)).toContain("1 of these 2 steps writes what is already there")
    expect(surfaceOf(container)).not.toContain("Every part of this")
    /**
     * The step's own badge is scoped to the step. One inert step among two must
     * not read as a verdict on the proposal, which is exactly what it would if
     * the two sentences were worded alike.
     */
    expect(surfaceOf(container)).not.toContain("leave the page exactly as it is")
  })

  /** An operation naming a part that is gone is why the whole delta is refused. */
  it("marks a step whose part this page does not have, and says what that means", () => {
    const { container } = render(
      <ProposalEffectView
        effect={effect({
          applies: false,
          obstacle: "No node n_p9 in this tree.",
          operations: [
            operation({ missing: true, changes: [], detail: "this tree has no such node" }),
          ],
        })}
      />
    )

    expect(surfaceOf(container)).toContain("Not on this page")
    expect(surfaceOf(container)).toContain("isn't there any more")
    expect(surfaceOf(container)).not.toContain("not in this tree")
    expect(recordOf(container)).toContain("this tree has no such node")
  })

  it("says which way the words are travelling", () => {
    const { container } = render(
      <ProposalEffectView
        effect={effect({
          operations: [
            operation({
              op: "remove",
              verb: "delete",
              changes: [],
              carries: 1,
              text: ["Ship faster", "Talk to us"],
            }),
          ],
        })}
      />
    )

    expect(surfaceOf(container)).toContain(
      "The words it takes away: “Ship faster” · “Talk to us”"
    )
  })

  it("renders one step per operation, in the order they would be applied", () => {
    const { container } = render(
      <ProposalEffectView
        effect={effect({
          operations: [
            operation({
              op: "remove",
              verb: "delete",
              subject: { name: "the card “Autumn arrivals”", nodeId: "n_c1" },
              label: "loom.card",
              changes: [],
              carries: 1,
            }),
            operation({
              op: "insert",
              verb: "add",
              subject: { name: "the heading “Prices”", nodeId: "n_h9" },
              label: "loom.heading",
              into: "the band",
              changes: [],
              carries: 1,
            }),
          ],
        })}
      />
    )

    const steps = Array.from(
      (container.querySelector("ol") as HTMLElement).querySelectorAll(":scope > li > p:first-child"),
      (row) => row.textContent
    )

    expect(steps).toEqual([
      "Deletes the card “Autumn arrivals” n_c1, which has nothing inside it.",
      "Adds the heading “Prices” n_h9 at the end of the band.",
    ])
  })
})
