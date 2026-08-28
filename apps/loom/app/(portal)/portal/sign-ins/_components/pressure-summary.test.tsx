import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import type { SignInPressure } from "@/app/(portal)/_lib/auth/pressure"
import { surfaceText, unplainWordsIn } from "@/app/(portal)/_lib/plain-language"

import { PressureSummary } from "./pressure-summary"

/**
 * The other half of the sweep.
 *
 * `plain-language.test.ts` reads source, so it sees every string a component
 * was *written* with and none of the ones assembled while it runs. This screen
 * is almost entirely the second kind — the headline, the detail and the answer
 * to "what do I do now" are all built in `signin-view.ts` from numbers — and it
 * is exactly where the leak was: "Every failure the throttle remembers…" and
 * "The throttle is doing its job:" were on screen and invisible to any check
 * that reads `.tsx` files.
 *
 * So this renders and asks `surfaceText`, which is the only thing in this route
 * group that can tell a word a reader met from a word one click below them.
 */

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

const busy = pressure({
  subjects: 3,
  failures: 17,
  locked: 2,
  counted: 3,
  longestWaitMs: 7 * MINUTE,
  latestFailureAt: NOW - 30_000,
  earliestFailureAt: NOW - 40 * MINUTE,
})

describe("PressureSummary", () => {
  /**
   * The assertion this whole run exists to make, on the state where it matters:
   * somebody is locked out, the operator is reading fast, and every word they
   * meet before they have clicked anything is a word written for them.
   */
  it("puts no word of the runtime's own vocabulary in front of a reader", () => {
    const { container } = render(<PressureSummary pressure={busy} now={NOW} />)

    expect(unplainWordsIn(surfaceText(container))).toEqual([])
  })

  it("says the same for a deployment nobody has knocked on", () => {
    const { container } = render(<PressureSummary pressure={pressure()} now={NOW} />)

    expect(unplainWordsIn(surfaceText(container))).toEqual([])
  })

  /**
   * The failure mode a "no jargon" check invites, and the one the brief warns
   * about in as many words: *if you ever find yourself deleting information to
   * make a screen simpler, you have misread this.* Passing by deletion has to
   * be as hard as passing by rewriting, so the record is asserted present in
   * the same breath as the surface is asserted plain.
   */
  it("keeps every raw field, one click down, including two the old table dropped", () => {
    render(<PressureSummary pressure={busy} now={NOW} />)

    for (const field of [
      "subjects",
      "failures",
      "locked",
      "lockedIsExact",
      "counted",
      "longestWaitMs",
    ]) {
      expect(screen.queryByText(field)).not.toBeNull()
    }
  })

  it("does not show the raw fields until they are asked for", () => {
    const { container } = render(<PressureSummary pressure={busy} now={NOW} />)

    expect(surfaceText(container)).not.toContain("lockedIsExact")
    expect(surfaceText(container)).toContain("How these numbers were worked out")
  })

  /**
   * Every number that was on the surface before is still on the surface. The
   * labels changed; what they label did not.
   */
  it("still answers all six questions the field table answered", () => {
    const { container } = render(<PressureSummary pressure={busy} now={NOW} />)
    const surface = surfaceText(container)

    expect(surface).toContain("Different callers")
    expect(surface).toContain("Failed attempts")
    expect(surface).toContain("Locked out now")
    expect(surface).toContain("Longest wait left")
    expect(surface).toContain("Most recent failure")
    expect(surface).toContain("Oldest one still counted")
  })

  /**
   * A label a reader has to decode from its value is the defect the history row
   * was fixed for on 25 August, and lower case is its tell — `callers counted`,
   * `failures held`, `locked now`. The disclosure's labels are deliberately
   * exempt: down there they are field names and are supposed to look like it.
   */
  it("labels the numbers like questions rather than like fields", () => {
    const { container } = render(<PressureSummary pressure={busy} now={NOW} />)
    const labels = [...container.querySelectorAll("dt")]
      .filter((label) => label.closest("details") === null)
      .map((label) => label.textContent ?? "")

    expect(labels.length).toBe(6)
    expect(labels.filter((label) => !/^[A-Z]/u.test(label))).toEqual([])
  })

  /**
   * The defect a screenshot found and this file's eight tests did not: six
   * multi-word labels set beside their values ran together into one line —
   * "Different callers 1 Failed attempts 5 Locked out now 0" — which reads as a
   * sentence instead of as six facts. Terse lower-case labels had been holding
   * that layout up, so making them plain broke it, and nothing said so.
   *
   * Pinned as the property rather than the class list: each pair is its own
   * column, so a label can never end up on the same line as the value before
   * it.
   */
  it("stacks each number under its own label rather than running them into a line", () => {
    const { container } = render(<PressureSummary pressure={busy} now={NOW} />)
    const pairs = [...container.querySelectorAll("dt")]
      .filter((label) => label.closest("details") === null)
      .map((label) => label.parentElement)

    for (const pair of pairs) {
      expect(pair?.className).toContain("flex-col")
    }
  })

  /**
   * "What do I do now?" — and specifically that the answer arrives *after* the
   * state and before the numbers, because a reader who has not yet been told
   * what is happening cannot use an instruction.
   */
  it("answers what to do, under the state and above the numbers", () => {
    const { container } = render(<PressureSummary pressure={busy} now={NOW} />)
    const surface = surfaceText(container)

    const state = surface.indexOf("locked out right now")
    const next = surface.indexOf("deliberately nothing to press")
    const numbers = surface.indexOf("Different callers")

    expect(state).toBeGreaterThan(-1)
    expect(next).toBeGreaterThan(state)
    expect(numbers).toBeGreaterThan(next)
  })

  /**
   * A floor reported as a total is the one number on this screen an operator
   * would act on, so the plain reading carries "at least" and the disclosure
   * says why it ever would. Asserted as the joined reading rather than the
   * halves, on the 25 August rule.
   */
  it("says a capped count is a floor, on the surface and in the record", () => {
    const { container } = render(
      <PressureSummary
        pressure={pressure({ subjects: 600, failures: 900, locked: 500, lockedIsExact: false, counted: 500 })}
        now={NOW}
      />
    )

    expect(surfaceText(container)).toContain("at least 500")
    expect(screen.queryByText(/is therefore a floor/u)).not.toBeNull()
  })
})
