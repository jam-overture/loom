import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import type { SweepReading } from "@/app/(portal)/_lib/checkup-sweep"

import { SweepVerdict } from "./sweep-verdict"

const reading = (over: Partial<SweepReading> = {}): SweepReading => ({
  tone: "applied",
  label: "Everything adds up.",
  meaning: "Loom replayed every change and got back the page people are being served.",
  next: "Nothing to do.",
  checked: 3,
  addUp: 3,
  problems: 0,
  unanswered: 0,
  skipped: 0,
  total: 3,
  changesReplayed: 12,
  ...over,
})

describe("SweepVerdict", () => {
  it("says the answer, why it is the answer, and what to do now", () => {
    render(<SweepVerdict reading={reading()} />)

    expect(screen.getByText("Everything adds up.")).toBeTruthy()
    expect(screen.getByText(/replayed every change/u)).toBeTruthy()
    expect(screen.getByText("Nothing to do.")).toBeTruthy()
  })

  /**
   * The headline's own evidence. *"2 of your 9 pages don't add up"* is only
   * checkable by a reader who can see the nine, so the tally is on the surface
   * and never behind the disclosure.
   */
  it("shows the counts the headline is a claim about, unasked", () => {
    const { container } = render(<SweepVerdict reading={reading()} />)
    const tally = container.querySelector("dl")

    expect(tally).toBeTruthy()
    expect(tally?.textContent).toContain("Pages found")
    expect(tally?.textContent).toContain("Checked just now")
    expect(container.querySelector("details")?.contains(tally ?? null)).toBe(false)
  })

  /**
   * The three that are not a pass are drawn whenever they are non-zero, each
   * under its own heading. A reader counting the tally has to be able to see
   * where every page went.
   */
  it("gives each kind of not-a-pass its own figure", () => {
    const { container } = render(
      <SweepVerdict
        reading={reading({
          tone: "rejected",
          label: "2 of your pages don’t match their own history.",
          total: 9,
          checked: 5,
          addUp: 3,
          problems: 2,
          unanswered: 3,
          skipped: 1,
        })}
      />
    )
    const tally = container.querySelector("dl")?.textContent ?? ""

    expect(tally).toContain("Don’t add up")
    expect(tally).toContain("Reached no answer")
    expect(tally).toContain("Nothing to check against")
  })

  it("leaves out a figure that has nothing in it", () => {
    const { container } = render(<SweepVerdict reading={reading()} />)
    const tally = container.querySelector("dl")?.textContent ?? ""

    expect(tally).not.toContain("Reached no answer")
    expect(tally).not.toContain("Nothing to check against")
  })

  /**
   * The governing principle as a property: the runtime's account is present and
   * it is one click down, never further and never on the surface.
   */
  it("keeps the runtime's account behind the disclosure and nowhere else", () => {
    const { container } = render(<SweepVerdict reading={reading()} />)
    const details = container.querySelector("details")

    expect(details?.textContent).toContain("auditSnapshot")
    expect(details?.textContent).toContain("12 accepted deltas were replayed")

    details?.remove()
    expect(container.textContent).not.toContain("auditSnapshot")
    expect(container.textContent).not.toContain("snapshot")
  })

  it("counts one replayed change in the singular", () => {
    const { container } = render(<SweepVerdict reading={reading({ changesReplayed: 1, checked: 1 })} />)

    expect(container.querySelector("details")?.textContent).toContain(
      "1 accepted delta was replayed across 1 tree"
    )
  })

  /**
   * Color is a second channel and never the only one. A reader who cannot tell
   * the palette apart still reads which of the results this is, because the
   * result is in words.
   */
  it("says which result this is in words, not only in color", () => {
    const { container } = render(
      <SweepVerdict
        reading={reading({ tone: "rejected", label: "One of your pages doesn’t match its own history." })}
      />
    )

    expect(container.textContent).toContain("One of your pages doesn’t match its own history.")
  })
})
