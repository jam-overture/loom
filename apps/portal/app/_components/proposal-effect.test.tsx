import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import type { OperationEffect, ProposalEffect } from "@/lib/proposal-effect"

import { ProposalEffectView } from "./proposal-effect"

const operation = (over: Partial<OperationEffect> = {}): OperationEffect => ({
  verb: "reconfigure",
  subject: "loom.heading",
  place: ["loom.page", "loom.card"],
  detail: "1 value",
  changes: [{ key: "value", before: `"Ship faster"`, after: `"Ship safer"`, inert: false }],
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

describe("ProposalEffectView", () => {
  /** The before side is the whole point: the delta already says what it writes. */
  it("shows what a value is now beside what it would become", () => {
    render(<ProposalEffectView effect={effect()} />)

    expect(document.body.textContent).toContain(`"Ship faster"`)
    expect(document.body.textContent).toContain(`"Ship safer"`)
  })

  /**
   * An empty string and an unset key are different things to the runtime, and a
   * blank cell would render them identically.
   */
  it("names an absent value rather than leaving the cell blank", () => {
    render(
      <ProposalEffectView
        effect={effect({
          operations: [
            operation({ changes: [{ key: "tone", before: null, after: null, inert: false }] }),
          ],
        })}
      />
    )

    expect(document.body.textContent).toContain("not set")
    expect(document.body.textContent).toContain("cleared")
  })

  it("puts the place in labels a reader recognises", () => {
    render(<ProposalEffectView effect={effect()} />)

    expect(document.body.textContent).toContain("loom.page › loom.card")
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

    expect(announced.textContent).toContain("No node n_p9 in this tree.")
    expect(
      announced.compareDocumentPosition(container.querySelector("ol") as Element) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
  })

  it("says how far the tree has moved when the proposal is stale", () => {
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

    expect(screen.getByRole("status").textContent).toContain("revision 4, now at 7")
  })

  /**
   * The runtime's obstacle for a stale proposal is the revision mismatch, so
   * printing it beside the portal's own sentence says the same thing twice.
   */
  it("says the tree moved once, not once in each vocabulary", () => {
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

    expect(screen.getByRole("status").textContent).not.toContain("Delta targets")
  })

  /** Nothing else on the card would give this away: it looks like a change. */
  it("says when applying the change would leave the page exactly as it is", () => {
    render(
      <ProposalEffectView
        effect={effect({ operations: [operation({ inert: true })], inertCount: 1 })}
      />
    )

    expect(document.body.textContent).toContain("changes nothing")
    expect(document.body.textContent).toContain("applying this leaves the page as it is")
  })

  it("counts a partly inert proposal without claiming the whole of it is", () => {
    render(
      <ProposalEffectView
        effect={effect({
          operations: [operation({ inert: true }), operation()],
          inertCount: 1,
        })}
      />
    )

    expect(document.body.textContent).toContain("1 of 2 operations write what is already there")
    expect(document.body.textContent).not.toContain("leaves the page as it is")
  })

  /** An operation naming a node that is gone is why the whole delta is refused. */
  it("marks an operation whose node this tree does not have", () => {
    render(
      <ProposalEffectView
        effect={effect({
          applies: false,
          obstacle: "No node n_p9 in this tree.",
          operations: [operation({ missing: true, changes: [], detail: "this tree has no such node" })],
        })}
      />
    )

    expect(document.body.textContent).toContain("not in this tree")
  })

  it("previews the words an operation brings or takes", () => {
    render(
      <ProposalEffectView
        effect={effect({
          operations: [
            operation({ verb: "delete", changes: [], text: ["Ship faster", "Talk to us"] }),
          ],
        })}
      />
    )

    expect(document.body.textContent).toContain("“Ship faster” · “Talk to us”")
  })

  it("renders one row per operation, in the order they would be applied", () => {
    const { container } = render(
      <ProposalEffectView
        effect={effect({
          operations: [
            operation({ verb: "delete", subject: "loom.card", changes: [] }),
            operation({ verb: "add", subject: "loom.heading", changes: [] }),
          ],
        })}
      />
    )

    expect(
      Array.from(container.querySelectorAll("li"), (row) => row.querySelector("span")?.textContent)
    ).toEqual(["delete", "add"])
  })
})
