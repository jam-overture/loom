import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import type { Reversal } from "@/lib/reversal"

import { ReversalNote } from "./reversal-note"

const restore = (verb: string, subject: string, detail: string) => ({ verb, subject, detail })

describe("ReversalNote", () => {
  it("shows what undoing would restore, in the order the plan gave", () => {
    const reversal: Reversal = {
      kind: "revertable",
      restores: [
        restore("restores", "n_card", "variant to “outlined”"),
        restore("removes", "n_added", "what this change added, and anything under it"),
      ],
      discards: [],
    }

    render(<ReversalNote reversal={reversal} />)

    const lines = screen.getAllByRole("listitem").map((item) => item.textContent)
    expect(lines[0]).toContain("restores")
    expect(lines[0]).toContain("n_card")
    expect(lines[0]).toContain("variant to “outlined”")
    expect(lines[1]).toContain("removes")
  })

  /**
   * A contested undo is still offered (0035); the warning is what turns the
   * button from a promise into a decision, and it has to name the revisions so a
   * reviewer knows whose work is at stake before they press it.
   */
  it("warns, naming the revisions, when undoing writes over later work", () => {
    const reversal: Reversal = {
      kind: "revertable",
      restores: [restore("removes", "n_card", "what this change added, and anything under it")],
      discards: [
        { revision: 4, nodeIds: [] as never },
        { revision: 6, nodeIds: [] as never },
      ],
    }

    render(<ReversalNote reversal={reversal} />)

    const warning = screen.getByText(/writes over/)
    expect(warning.textContent).toContain("revisions")
    expect(warning.textContent).toContain("4, 6")
    expect(warning.textContent).toContain("confirm")
  })

  it("says nothing about writing over later work when the undo is clean", () => {
    const reversal: Reversal = {
      kind: "revertable",
      restores: [restore("restores", "n_card", "variant to “outlined”")],
      discards: [],
    }

    render(<ReversalNote reversal={reversal} />)

    expect(screen.queryByText(/writes over/)).toBeNull()
  })

  /** A revision whose delta touched nothing has nothing to restore, and says so. */
  it("reads an empty restore as restoring nothing rather than rendering a blank", () => {
    render(<ReversalNote reversal={{ kind: "revertable", restores: [], discards: [] }} />)

    expect(screen.getByText(/restore nothing/)).toBeTruthy()
    expect(screen.queryByRole("listitem")).toBeNull()
  })

  it("shows a blocked reversal's reason and offers no restore list", () => {
    render(
      <ReversalNote
        reversal={{ kind: "blocked", reason: "This change cannot be inverted (node-not-found)." }}
      />
    )

    expect(screen.getByText(/cannot be inverted/)).toBeTruthy()
    expect(screen.queryByRole("listitem")).toBeNull()
  })
})
