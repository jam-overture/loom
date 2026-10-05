import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import type { DeltaId, NodeId, ProposalId, TreeDelta, TreeId } from "@jam-overture/loom"
import type { StoredRevision } from "@jam-overture/loom/store"

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
    readonly authoredBy?: "model" | "runtime"
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
    authoredBy: extra.authoredBy ?? "model",
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

  /**
   * The five monospace pairs the row used to lead with are now one paragraph of
   * sentences, and the pairs themselves are behind the disclosure. Both halves
   * are asserted here: the sentence a reader meets, and the fact that not one
   * of the pairs left the page.
   */
  describe("who asked, and who let it through", () => {
    /**
     * The joined reading rather than either half. `who`, `allowed` and `sure`
     * are three independently-held sentences the row sets side by side, which is
     * the exact shape that shipped three dropped-word defects on 24 August.
     */
    it("reads as one paragraph, with the spaces between the sentences intact", () => {
      render(<RevisionRow stored={entryAt(4, { actor: "alice", answeredBy: "bob" })} />)

      expect(screen.getByText(/alice asked for this/).textContent).toBe(
        "alice asked for this. bob said yes to it. The AI says it is fairly sure."
      )
    })

    it("falls back to the act when nobody was named, rather than to a field name", () => {
      render(<RevisionRow stored={entryAt(4)} />)

      expect(screen.getByText(/Somebody using the site asked for this/).textContent).toBe(
        "Somebody using the site asked for this. The AI says it is fairly sure."
      )
    })

    /**
     * `asked by` used to fall back to the origin, which the pair beside it
     * prints anyway — so a revision nobody was named on showed the same value
     * twice under two labels promising different things. Found in a screenshot.
     */
    it("does not print the origin twice when there is nobody to name", () => {
      render(<RevisionRow stored={entryAt(4)} />)

      expect(screen.queryByText("asked by")).toBeNull()
      expect(screen.getByText("origin").nextElementSibling?.textContent).toBe("user-instruction")
    })

    /**
     * 0029: a revision with no `answeredBy` is either a change nobody had to
     * approve or one a host approved without naming anybody, and the revision
     * cannot tell those apart. "Allowed by nobody" would state one of them — and
     * so would a friendlier "nobody had to approve this", which is the form the
     * temptation takes during a plain-language pass.
     */
    it("says nothing about approval when the revision does not know", () => {
      render(<RevisionRow stored={entryAt(4)} />)

      expect(screen.queryByText(/said yes/)).toBeNull()
      expect(screen.queryByText(/nobody/i)).toBeNull()
      expect(screen.queryByText("allowed by")).toBeNull()
    })

    /**
     * An undo is a delta the runtime computed, and only a model grades itself
     * (0007). "The AI says it is very sure" over an inverse would attribute a
     * claim to a model that never made one.
     */
    it("does not put a confidence in the AI's mouth when the runtime wrote the change", () => {
      render(<RevisionRow stored={entryAt(4, { authoredBy: "runtime" })} />)

      expect(screen.queryByText(/The AI says/)).toBeNull()
      expect(screen.getByText(/worked this change out from the record/)).toBeTruthy()
    })

    it("keeps every pair it used to lead with, one click down", () => {
      render(<RevisionRow stored={entryAt(4, { actor: "alice", answeredBy: "bob" })} />)

      expect(screen.getByText("asked by").nextElementSibling?.textContent).toBe("alice")
      expect(screen.getByText("allowed by").nextElementSibling?.textContent).toBe("bob")
      expect(screen.getByText("origin").nextElementSibling?.textContent).toBe("user-instruction")
      expect(screen.getByText("interpreted by").nextElementSibling?.textContent).toBe("scripted")
      expect(screen.getByText("authored by").nextElementSibling?.textContent).toBe("model")
      expect(screen.getByText("confidence").nextElementSibling?.textContent).toBe("0.80")
      expect(screen.getByText("proposal").nextElementSibling?.textContent).toBe("p_7")
      expect(screen.getByText("applied").nextElementSibling?.textContent).toBe(APPLIED_AT)
    })
  })

  /**
   * The whole sentence per operation, because the delta's own verbs were what
   * this screen led with and `reconfigure n_head title` is three of the schema's
   * words. The technical reading is not gone — the test below finds it under the
   * disclosure.
   */
  it("reads every operation the delta carried as a sentence", () => {
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

    const described = [
      ...rowOf(container).querySelectorAll(":scope > ul > li"),
    ].map((item) => item.textContent)

    expect(described).toEqual([
      "Deleted n_gone and everything inside it.",
      "Moved n_moved inside n_root.",
    ])
  })

  it("keeps the delta's own verbs, one click down, beside the plain reading", () => {
    render(
      <RevisionRow
        stored={entryAt(4, { operations: [{ op: "remove", nodeId: "n_gone" as NodeId }] })}
      />
    )

    expect(screen.getByText("operations").nextElementSibling?.textContent).toBe("delete")
    expect(screen.getByText("and everything under it")).toBeTruthy()
  })

  /**
   * Not a spelling test. `Changed n_head title` is what the three-part shape
   * produced before the sentence was named as one, and it reads as a dropped
   * word rather than as a missing apostrophe.
   */
  it("keeps the possessive when a change names the settings it touched", () => {
    const { container } = render(
      <RevisionRow
        stored={entryAt(4, {
          operations: [
            {
              op: "configure",
              nodeId: "n_head" as NodeId,
              set: { title: "Welcome", level: 1 },
              unset: ["subtitle"],
            },
          ],
        })}
      />
    )

    expect(rowOf(container).querySelector(":scope > ul > li")?.textContent).toBe(
      "Changed n_head's title and level, and cleared its subtitle."
    )
  })

  it("stamps the time in a form a machine can read as well as a person", () => {
    const { container } = render(<RevisionRow stored={entryAt(4)} />)
    const time = container.querySelector("time")

    expect(time?.getAttribute("dateTime")).toBe(APPLIED_AT)
    expect(time?.textContent).toBe("9 August 2026 at 12:00 UTC")
  })

  /**
   * Undo is offered on every revision, not only the newest (0032). The form is
   * wired to a server action, which a render test cannot run and does not try to
   * — what it holds down is that the revision the button would undo is the
   * revision the row is showing.
   */
  it("offers undo, naming the revision the row is about", () => {
    const { container } = render(<RevisionRow stored={entryAt(4)} />)
    const undo = within(rowOf(container)).getByRole("button", { name: "Undo this change" })
    const form = undo.closest("form")

    expect(form?.querySelector<HTMLInputElement>('input[name="revision"]')?.value).toBe("4")
    expect(form?.querySelector<HTMLInputElement>('input[name="treeId"]')?.value).toBe("t_1")
  })

  /**
   * The reversal is what the undo would do, read before the click. With one, the
   * row shows the restore preview *and* keeps the button; without one it falls
   * back to the button alone, which is what it did before the preview existed.
   */
  /**
   * The gap this screen had and nothing else did. `ReversalNote` says what
   * undoing puts back, and every word of it is about the page — so a change
   * that took a payment has a perfectly clean reversal, and the undo button sat
   * over it with nothing said. The judgment reaches this row through the
   * journal (0225); what it says is the same sentence the review queue says.
   */
  describe("whether undoing would undo everything it did", () => {
    const clean = {
      kind: "revertable" as const,
      restores: [{ before: "Puts ", subject: "n_card", after: "'s variant back." }],
      inverse: [],
      discards: [],
    }

    it("warns above the button, after the note that says the page comes back", () => {
      const { container } = render(
        <RevisionRow
          stored={entryAt(4)}
          reversal={clean}
          undoing={{
            undoable: false,
            unexplained: false,
            obstacles: [
              {
                label: "Putting the page back would not put everything back",
                meaning: "Check what Card is wired to before you say yes.",
                technical: "out-of-tree-effect",
              },
            ],
          }}
        />
      )
      const read = rowOf(container).textContent ?? ""

      expect(read).toContain("Putting the page back would not put everything back")
      expect(read.indexOf("variant back")).toBeLessThan(read.indexOf("Putting the page back"))
      expect(read.indexOf("Putting the page back")).toBeLessThan(read.indexOf("Undo this change"))
    })

    /**
     * The button stays. A change that is irreversible *outside* the page is
     * still invertible inside it — 0016 guarantees the inverse — so hiding the
     * control would refuse something the runtime will do. The reader is told,
     * and decides, which is the same posture the page screen takes.
     */
    it("still offers the button, because the page itself does come back", () => {
      const { container } = render(
        <RevisionRow
          stored={entryAt(4)}
          reversal={clean}
          undoing={{
            undoable: false,
            unexplained: false,
            obstacles: [
              { label: "Too much would have to be kept", meaning: "Nine parts.", technical: "retention-budget-exceeded" },
            ],
          }}
        />
      )

      expect(within(rowOf(container)).getByRole("button", { name: "Undo this change" })).toBeTruthy()
    })

    it("says nothing extra for a change the Gate called undoable", () => {
      const { container } = render(
        <RevisionRow
          stored={entryAt(4)}
          reversal={clean}
          undoing={{ undoable: true, unexplained: false, obstacles: [] }}
        />
      )

      expect(rowOf(container).textContent).not.toContain("would not put everything back")
    })

    /**
     * The common case on every deployment with no journal, and the one the row
     * must be silent about: nothing was recorded, which is an answer rather
     * than a gap. What the screen could not *find out* is said once by the page.
     */
    it("says nothing when no judgment was recorded about the change", () => {
      const { container } = render(<RevisionRow stored={entryAt(4)} reversal={clean} />)

      expect(rowOf(container).textContent).not.toContain("would not put everything back")
      expect(within(rowOf(container)).getByRole("button", { name: "Undo this change" })).toBeTruthy()
    })
  })

  describe("the reversal preview", () => {
    it("shows what undoing would restore, and still offers the button", () => {
      const { container } = render(
        <RevisionRow
          stored={entryAt(4)}
          reversal={{
            kind: "revertable",
            restores: [
              { before: "Puts ", subject: "n_card", after: "'s variant back to “outlined”." },
            ],
            inverse: [],
            discards: [],
          }}
        />
      )

      expect(screen.getByText(/variant back to “outlined”/).textContent).toBe(
        "Puts n_card's variant back to “outlined”."
      )
      expect(within(rowOf(container)).getByRole("button", { name: "Undo this change" })).toBeTruthy()
    })

    /**
     * A change that cannot be undone hides the button rather than leaving it to
     * fail on a press — the reason takes its place (0019).
     */
    it("hides the button and shows the reason when the change cannot be undone", () => {
      const { container } = render(
        <RevisionRow
          stored={entryAt(4)}
          reversal={{
            kind: "blocked",
            reason: "This one can’t be undone. Loom has no way to work out what the page looked like before it.",
            technical: "uninvertible: node-not-found",
          }}
        />
      )

      expect(screen.getByText(/can’t be undone/)).toBeTruthy()
      /* The runtime's account of the same block is kept, one click down. */
      expect(screen.getByText("uninvertible: node-not-found")).toBeTruthy()
      expect(within(rowOf(container)).queryByRole("button")).toBeNull()
    })

    it("falls back to the button alone when no reversal could be read", () => {
      const { container } = render(<RevisionRow stored={entryAt(4)} />)

      expect(within(rowOf(container)).getByRole("button", { name: "Undo this change" })).toBeTruthy()
      expect(screen.queryByText(/If you undo this/)).toBeNull()
    })
  })
})
