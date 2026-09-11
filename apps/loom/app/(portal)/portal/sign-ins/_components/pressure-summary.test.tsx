import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import type { SignInPressure } from "@/app/(portal)/_lib/auth/pressure"
import { describePressure, nextMove, pressureFacts } from "@/app/(portal)/_lib/signin-view"

import { PressureSummary } from "./pressure-summary"

const NOW = 1_700_000_000_000
const MINUTE = 60 * 1000

const pressure = (overrides: Partial<SignInPressure> = {}): SignInPressure => ({
  subjects: 0,
  failures: 0,
  locked: 0,
  lockedIsExact: true,
  longestWaitMs: 0,
  earliestFailureAt: null,
  latestFailureAt: null,
  counted: 0,
  ...overrides,
})

const quiet = pressure()

const counting = pressure({
  subjects: 2,
  failures: 3,
  counted: 2,
  latestFailureAt: NOW - 4 * MINUTE,
  earliestFailureAt: NOW - 20 * MINUTE,
})

const locking = pressure({
  subjects: 3,
  failures: 17,
  locked: 2,
  lockedIsExact: false,
  counted: 3,
  longestWaitMs: 7 * MINUTE,
  latestFailureAt: NOW - 30_000,
  earliestFailureAt: NOW - 40 * MINUTE,
})

/**
 * The first rendering test this component has ever had. It shipped on 26 August
 * with the rest of the sign-in survey, and every test behind it was a test of
 * the arithmetic or of the sentences — `pressure.ts` and `signin-view.ts` are
 * both well covered, and neither of them can see that the component dropped a
 * field, put the numbers above the words, or rendered a next move nobody wrote.
 */
describe("the sign-in pressure summary", () => {
  it("leads with what is happening, in a sentence", () => {
    render(<PressureSummary pressure={locking} now={NOW} />)

    const reading = describePressure(locking, NOW)

    expect(screen.getByText(reading.headline)).toBeInstanceOf(HTMLElement)
    expect(screen.getByText(reading.detail)).toBeInstanceOf(HTMLElement)
  })

  /**
   * The rule every other portal screen already follows and this one did not.
   * Asserted for all three states rather than the interesting one, because the
   * state a reader meets most often is the quiet one and "nothing to do" is an
   * answer that has to be given rather than implied by an empty screen.
   */
  it.each([
    ["quiet", quiet],
    ["counting", counting],
    ["locking", locking],
  ] as const)("tells a reader what to do when it is %s", (_name, subject) => {
    render(<PressureSummary pressure={subject} now={NOW} />)

    const move = nextMove(describePressure(subject, NOW).tone)

    expect(screen.getByText("What to do")).toBeInstanceOf(HTMLElement)
    expect(screen.getByText(move.label)).toBeInstanceOf(HTMLElement)
    expect(screen.getByText(move.meaning)).toBeInstanceOf(HTMLElement)
  })

  /**
   * Nothing is removed to make a screen simpler. Every number that used to be on
   * the surface is still rendered — find-in-page reaches inside a closed
   * `<details>`, which is why the disclosure is a `<details>` and not state — and
   * the record's own name for each is rendered beside it.
   */
  it("keeps every number, and every field name, one click down", () => {
    render(<PressureSummary pressure={locking} now={NOW} />)

    for (const fact of pressureFacts(locking, NOW)) {
      expect(screen.getByText(fact.label)).toBeInstanceOf(HTMLElement)
      expect(screen.getByText(fact.fields.join(", "))).toBeInstanceOf(HTMLElement)
    }

    expect(screen.getByText("at least 2")).toBeInstanceOf(HTMLElement)
    expect(screen.getByText("7 minutes")).toBeInstanceOf(HTMLElement)
  })

  /**
   * The half of the disclosure rule that a "nothing is removed" test cannot
   * check on its own: the numbers must be *behind* it rather than merely
   * present. A component that rendered the same seven rows on the surface would
   * pass the test above and fail the brief.
   */
  it("puts them behind a disclosure rather than on the surface", () => {
    const { container } = render(<PressureSummary pressure={locking} now={NOW} />)

    const details = container.querySelector("details")

    expect(details).not.toBeNull()
    expect(details?.open).toBe(false)
    expect(details?.textContent).toContain("Locked out right now")
    expect(details?.textContent).toContain("longestWaitMs")
  })

  /**
   * The defect the checkup screen shipped and this one was about to: a sentence
   * set in the colour and size of the lines above it is read as one more of
   * them. The next move is a response to the verdict, so it must not wear the
   * verdict's tone — a way out printed in the refusal colour reads as more
   * alarm.
   */
  it("does not print the next move inside the coloured verdict", () => {
    const { container } = render(<PressureSummary pressure={locking} now={NOW} />)

    const band = container.querySelector("[data-pressure]")

    expect(band).not.toBeNull()
    expect(band?.textContent).toContain(describePressure(locking, NOW).headline)
    expect(band?.textContent).not.toContain(nextMove("locking").label)
  })

  /**
   * Colour is never the only channel. The state is in the band's words and in a
   * data attribute a test can read; a reader who cannot tell the palette apart
   * loses nothing.
   */
  it("names the state in words as well as in colour", () => {
    const { container } = render(<PressureSummary pressure={quiet} now={NOW} />)

    expect(container.querySelector("[data-pressure]")?.getAttribute("data-pressure")).toBe("quiet")
    expect(screen.getByText("Nothing is being counted against anyone.")).toBeInstanceOf(HTMLElement)
  })

  /**
   * The state a fresh deployment shows, which is where a new person starts. It
   * used to be a row of zeroes and em dashes under one sentence.
   */
  it("reads as an answer rather than as an empty table when nothing has happened", () => {
    render(<PressureSummary pressure={quiet} now={NOW} />)

    expect(screen.getByText(nextMove("quiet").label)).toBeInstanceOf(HTMLElement)
    expect(screen.queryByText("—")).toBeNull()
  })
})
