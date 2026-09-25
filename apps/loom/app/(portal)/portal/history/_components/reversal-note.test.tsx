import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import type { NodeId } from "@loom/runtime"

import type { Restoration, Reversal } from "@/app/(portal)/_lib/reversal"

import { ReversalNote } from "./reversal-note"

const restore = (before: string, subject: string, after: string): Restoration => ({
  before,
  subject,
  after,
})

const puts = (subject: string, what: string): Restoration =>
  restore("Puts ", subject, `'s ${what}.`)

const takesBack = (subject: string): Restoration =>
  restore("Takes ", subject, " back out again, along with anything now inside it.")

describe("ReversalNote", () => {
  /**
   * The joined reading, not the parts. Three defects on 24 August were a missing
   * space or full stop where two independently-held strings met, and every one
   * of them passed a `toContain` on either half — so a restoration is asserted
   * as the sentence a reader actually sees.
   */
  it("reads each restoration as one sentence, in the order the plan gave", () => {
    const reversal: Reversal = {
      kind: "revertable",
      restores: [puts("n_card", "variant back to “outlined”"), takesBack("n_added")],
      inverse: [],
      discards: [],
    }

    render(<ReversalNote reversal={reversal} />)

    expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      "Puts n_card's variant back to “outlined”.",
      "Takes n_added back out again, along with anything now inside it.",
    ])
  })

  /**
   * The heading is the one sentence on this screen that names the thing nothing
   * else in the ecosystem has: what a change replaced. It used to read `undoing
   * this would`, uppercase and 10px, as a label above a list.
   */
  it("names what the list is, as a sentence rather than as a label", () => {
    render(
      <ReversalNote
        reversal={{
          kind: "revertable",
          restores: [puts("n_card", "variant back to “outlined”")],
          inverse: [],
          discards: [],
        }}
      />
    )

    expect(screen.getByRole("heading").textContent).toBe("If you undo this, Loom puts back:")
  })

  /**
   * A contested undo is still offered (0035); the warning is what turns the
   * button from a promise into a decision, and it has to name the revisions so a
   * reviewer knows whose work is at stake before they press it.
   */
  it("warns, naming the versions, when undoing writes over later work", () => {
    const reversal: Reversal = {
      kind: "revertable",
      restores: [takesBack("n_card")],
      inverse: [],
      discards: [
        { revision: 4, nodeIds: [] as readonly NodeId[] },
        { revision: 6, nodeIds: [] as readonly NodeId[] },
      ],
    }

    render(<ReversalNote reversal={reversal} />)

    const warning = screen.getByText(/wipe out/)
    expect(warning.textContent).toContain("versions")
    expect(warning.textContent).toContain("4, 6")
    expect(warning.textContent).toContain("say yes")
  })

  /**
   * "revision 4" and "revisions 4, 6" differ by one letter and by a space that
   * has to survive a build. Asserted whole for the same reason as the
   * restorations: `toContain("version")` is true of the broken reading.
   */
  it("says version, singular, and keeps the space before the number", () => {
    render(
      <ReversalNote
        reversal={{
          kind: "revertable",
          restores: [takesBack("n_card")],
          inverse: [],
          discards: [{ revision: 4, nodeIds: [] as readonly NodeId[] }],
        }}
      />
    )

    expect(screen.getByText(/wipe out/).textContent).toContain("what version 4 did")
  })

  it("says nothing about writing over later work when the undo is clean", () => {
    const reversal: Reversal = {
      kind: "revertable",
      restores: [puts("n_card", "variant back to “outlined”")],
      inverse: [],
      discards: [],
    }

    render(<ReversalNote reversal={reversal} />)

    expect(screen.queryByText(/wipe out/)).toBeNull()
  })

  /** A revision whose delta touched nothing has nothing to restore, and says so. */
  it("reads an empty restore as restoring nothing rather than rendering a blank", () => {
    render(
      <ReversalNote reversal={{ kind: "revertable", restores: [], inverse: [], discards: [] }} />
    )

    expect(screen.getByText(/leaves the page exactly as it is now/)).toBeTruthy()
    expect(screen.queryByRole("listitem")).toBeNull()
  })

  /**
   * The reason a reader meets is the plain one. The runtime's own account of the
   * same block is not dropped — `RevisionRow` prints it under the disclosure —
   * but it is not what this note says.
   */
  it("shows a blocked reversal's plain reason and offers no restore list", () => {
    render(
      <ReversalNote
        reversal={{
          kind: "blocked",
          reason: "This one can’t be undone. Loom has no way to work out what the page looked like before it.",
          technical: "uninvertible: node-not-found",
        }}
      />
    )

    expect(screen.getByText(/can’t be undone/)).toBeTruthy()
    expect(screen.queryByText(/node-not-found/)).toBeNull()
    expect(screen.queryByRole("listitem")).toBeNull()
  })
})
