import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import type { DeltaId, NodeId, ProposalId, TreeDelta, TreeId } from "@loom/runtime"
import type { StoredRevision } from "@loom/runtime/store"

import { RevisionRow } from "./revision-row"

const APPLIED_AT = "2026-08-09T12:00:00.000Z"

const deltaAt = (revision: number, operations: TreeDelta["operations"]): TreeDelta => ({
  deltaId: "d_1" as DeltaId,
  treeId: "t_1" as TreeId,
  baseRevision: revision - 1,
  operations,
})

const entryAt = (
  revision: number,
  extra: {
    readonly actor?: string
    readonly answeredBy?: string
    readonly operations?: TreeDelta["operations"]
  } = {}
): StoredRevision => ({
  treeId: "t_1" as TreeId,
  revision,
  proposalId: "p_7" as ProposalId,
  delta: deltaAt(revision, extra.operations ?? [{ op: "remove", nodeId: "n_gone" as NodeId }]),
  provenance: {
    origin: "user-instruction",
    ...(extra.actor === undefined ? {} : { actor: extra.actor }),
    interpreter: "scripted",
    authoredBy: "model",
    confidence: 0.8,
    interpretedAt: APPLIED_AT,
  },
  appliedAt: APPLIED_AT,
  ...(extra.answeredBy === undefined ? {} : { answeredBy: extra.answeredBy }),
})

const rowOf = (container: HTMLElement): HTMLElement => {
  const row = container.querySelector("li")

  if (row === null) throw new Error("the row did not render")

  return row
}

describe("RevisionRow", () => {
  it("carries the id a link points at, so a fragment lands on the right row", () => {
    const { container } = render(<RevisionRow stored={entryAt(4)} />)

    expect(rowOf(container).id).toBe("revision-4")
  })

  it("marks itself when it is the revision the reader was sent to, and not otherwise", () => {
    const anchored = render(<RevisionRow stored={entryAt(4)} anchored />)
    const marked = rowOf(anchored.container).className

    const plain = render(<RevisionRow stored={entryAt(5)} />)

    expect(marked).toContain("bg-surface-active")
    expect(rowOf(plain.container).className).not.toContain("bg-surface-active")
  })

  describe("provenance", () => {
    it("names who asked, in the words the reviewer will recognise", () => {
      render(<RevisionRow stored={entryAt(4, { actor: "alice" })} />)

      expect(screen.getByText("asked by").nextElementSibling?.textContent).toBe("alice")
    })

    it("falls back to the origin when nobody was named, rather than saying nobody", () => {
      render(<RevisionRow stored={entryAt(4)} />)

      expect(screen.getByText("asked by").nextElementSibling?.textContent).toBe("user-instruction")
    })

    /**
     * 0029: a revision with no `answeredBy` is either a change nobody had to
     * approve or one a host approved without naming anybody, and the revision
     * cannot tell those apart. "Allowed by nobody" would state one of them.
     */
    it("says nothing about approval when the revision does not know", () => {
      render(<RevisionRow stored={entryAt(4)} />)

      expect(screen.queryByText("allowed by")).toBeNull()
    })

    it("names the approver when there is one", () => {
      render(<RevisionRow stored={entryAt(4, { answeredBy: "bob" })} />)

      expect(screen.getByText("allowed by").nextElementSibling?.textContent).toBe("bob")
    })

    it("keeps the interpreter, the confidence and the proposal, because a record kept is a record shown", () => {
      render(<RevisionRow stored={entryAt(4)} />)

      expect(screen.getByText("interpreted by").nextElementSibling?.textContent).toBe("scripted")
      expect(screen.getByText("confidence").nextElementSibling?.textContent).toBe("0.80")
      expect(screen.getByText("proposal").nextElementSibling?.textContent).toBe("p_7")
    })
  })

  it("describes every operation the delta carried, in the portal's vocabulary", () => {
    const { container } = render(
      <RevisionRow
        stored={entryAt(4, {
          operations: [
            { op: "remove", nodeId: "n_gone" as NodeId },
            { op: "move", nodeId: "n_moved" as NodeId, parentId: "n_root" as NodeId, index: 0 },
          ],
        })}
      />
    )

    const described = [...rowOf(container).querySelectorAll("ul > li")].map(
      (item) => item.textContent
    )

    expect(described).toHaveLength(2)
    expect(described[0]).toContain("delete")
    expect(described[0]).toContain("n_gone")
    expect(described[1]).toContain("move")
  })

  it("stamps the time in a form a machine can read as well as a person", () => {
    const { container } = render(<RevisionRow stored={entryAt(4)} />)
    const time = container.querySelector("time")

    expect(time?.getAttribute("dateTime")).toBe(APPLIED_AT)
  })

  /**
   * Undo is offered on every revision, not only the newest (0032). The form is
   * wired to a server action, which a render test cannot run and does not try to
   * — what it holds down is that the revision the button would undo is the
   * revision the row is showing.
   */
  it("offers undo, naming the revision the row is about", () => {
    const { container } = render(<RevisionRow stored={entryAt(4)} />)
    const undo = within(rowOf(container)).getByRole("button", { name: "undo this change" })
    const form = undo.closest("form")

    expect(form?.querySelector<HTMLInputElement>('input[name="revision"]')?.value).toBe("4")
    expect(form?.querySelector<HTMLInputElement>('input[name="treeId"]')?.value).toBe("t_1")
  })

  /**
   * The reversal is what the undo would do, read before the click. With one, the
   * row shows the restore preview *and* keeps the button; without one it falls
   * back to the button alone, which is what it did before the preview existed.
   */
  describe("the reversal preview", () => {
    it("shows what undoing would restore, and still offers the button", () => {
      const { container } = render(
        <RevisionRow
          stored={entryAt(4)}
          reversal={{
            kind: "revertable",
            restores: [{ verb: "restores", subject: "n_card", detail: "variant to “outlined”" }],
            discards: [],
          }}
        />
      )

      expect(screen.getByText("variant to “outlined”")).toBeTruthy()
      expect(within(rowOf(container)).getByRole("button", { name: "undo this change" })).toBeTruthy()
    })

    /**
     * A change that cannot be undone hides the button rather than leaving it to
     * fail on a press — the reason takes its place (0019).
     */
    it("hides the button and shows the reason when the change cannot be undone", () => {
      const { container } = render(
        <RevisionRow
          stored={entryAt(4)}
          reversal={{ kind: "blocked", reason: "This change cannot be inverted (node-not-found)." }}
        />
      )

      expect(screen.getByText(/cannot be inverted/)).toBeTruthy()
      expect(within(rowOf(container)).queryByRole("button")).toBeNull()
    })

    it("falls back to the button alone when no reversal could be read", () => {
      const { container } = render(<RevisionRow stored={entryAt(4)} />)

      expect(within(rowOf(container)).getByRole("button", { name: "undo this change" })).toBeTruthy()
      expect(screen.queryByText("undoing this would")).toBeNull()
    })
  })
})
