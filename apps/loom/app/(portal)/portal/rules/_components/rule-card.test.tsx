import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { NO_RECORD, type RuleRecord } from "@/app/(portal)/_lib/rule-record"
import type { PlainRule } from "@/app/(portal)/_lib/rules-view"

import { RuleCard } from "./rule-card"

/**
 * What a reader meets without asking, and what is one click down.
 *
 * A closed `<details>` is still in the DOM — deliberately, so browser
 * find-in-page reaches it — so `container.textContent` cannot tell the surface
 * from the record, and every assertion about the plain-language rule turns on
 * exactly that difference.
 *
 * This is the **third** copy of this pair, after `piece-card.test.tsx` and
 * `proposal-effect.test.tsx`. Copied again rather than shared for the reason the
 * second copy gives: both of those files are open on unmerged branches, and a
 * shared helper landing in three places at once is the collision this repository
 * has already paid for. The finding asking for one home is refreshed with this
 * run's count rather than restated.
 */
const surfaceOf = (container: HTMLElement): string => {
  const copy = container.cloneNode(true) as HTMLElement

  for (const disclosure of Array.from(copy.querySelectorAll("details"))) disclosure.remove()

  return copy.textContent ?? ""
}

const recordOf = (container: HTMLElement): string =>
  Array.from(container.querySelectorAll("details"), (one) => one.textContent ?? "").join(" ")

const rule = (over: Partial<PlainRule> = {}): PlainRule => ({
  id: "ceiling",
  title: "How much Loom may do without asking you",
  reading: "How far Loom may go on its own depends on who asked.",
  outcome: "requires-confirmation",
  rows: [{ of: "Somebody using your site", is: "up to changes with some risk in them" }],
  settings: [{ name: "autoApplyCeiling.user-instruction", value: "medium" }],
  code: "stakes-above-ceiling",
  ...over,
})

/**
 * The one entry with no outcome and no code. Written out rather than spread over
 * `rule()`: `exactOptionalPropertyTypes` distinguishes a property that is absent
 * from one set to `undefined`, and absent is what the measurement is.
 */
const measurement: PlainRule = {
  id: "how-risk-is-measured",
  title: "How Loom decides a change is risky in the first place",
  reading: "This one refuses nothing by itself.",
  rows: [],
  settings: [],
}

const asked = (over: Partial<RuleRecord> = {}): RuleRecord => ({
  ...NO_RECORD,
  fired: 2,
  saidYes: 2,
  ...over,
})

describe("RuleCard", () => {
  it("leads with what the rule does and what it would do", () => {
    const { container } = render(<RuleCard rule={rule()} record={NO_RECORD} />)
    const surface = surfaceOf(container)

    expect(surface).toContain("How much Loom may do without asking you")
    expect(surface).toContain("depends on who asked")
    expect(surface).toContain("Asks you first")
  })

  /**
   * The property that makes this screen worth opening on day one. Every other
   * screen in the portal is empty until somebody has asked for something; this
   * one still answers its question, and a card that hid itself for want of a
   * count would take that away.
   */
  it("says what the rule does before anything has ever run into it", () => {
    const { container } = render(<RuleCard rule={rule()} record={NO_RECORD} />)

    expect(surfaceOf(container)).toContain("This has not come up yet.")
  })

  it("puts the field names and the runtime's code one click down, not on the surface", () => {
    const { container } = render(<RuleCard rule={rule()} record={asked()} />)

    expect(surfaceOf(container)).not.toContain("stakes-above-ceiling")
    expect(surfaceOf(container)).not.toContain("autoApplyCeiling")
    expect(recordOf(container)).toContain("stakes-above-ceiling")
    expect(recordOf(container)).toContain("autoApplyCeiling.user-instruction")
    expect(recordOf(container)).toContain("medium")
  })

  /**
   * The caveat that makes the counts readable rather than misleading. One reason
   * is kept per decision, so every count on this screen is a lower bound — and a
   * reader who does not know that will read a small number as a rule that rarely
   * matters.
   */
  it("says the count is attributed to one rule and cannot be the whole of it", () => {
    const { container } = render(<RuleCard rule={rule()} record={asked()} />)

    expect(recordOf(container)).toContain("One reason is kept per decision")
    expect(recordOf(container)).toContain("lower bound")
  })

  it("says plainly when a rule has no setting behind it", () => {
    const { container } = render(
      <RuleCard rule={rule({ settings: [], code: "discards-later-work" })} record={NO_RECORD} />
    )

    expect(recordOf(container)).toContain("There is no setting for this one")
  })

  it("carries no badge and no code for the entry that decides nothing", () => {
    const { container } = render(
      <RuleCard rule={measurement} record={NO_RECORD} />
    )

    expect(surfaceOf(container)).not.toContain("Asks you first")
    expect(surfaceOf(container)).not.toContain("Turns the change down")
    expect(recordOf(container)).toContain("never recorded as a reason")
  })

  describe("the one thing it recommends", () => {
    it("says a rule may be stricter than needed after a run of approvals", () => {
      const { container } = render(
        <RuleCard rule={rule()} record={asked({ fired: 5, saidYes: 5 })} />
      )

      expect(surfaceOf(container)).toContain("It may be stricter than you need")
    })

    it("stays quiet on a rule somebody has ever said no to", () => {
      const { container } = render(
        <RuleCard rule={rule()} record={asked({ fired: 6, saidYes: 5, saidNo: 1 })} />
      )

      expect(surfaceOf(container)).not.toContain("stricter than you need")
    })

    /**
     * 0031 makes a reading of the runtime's own judgement a reader and never a
     * controller. The card may say what it sees; the thing it must never grow is
     * a button that changes a threshold from a browser.
     */
    it("offers nothing to press", () => {
      const { container } = render(
        <RuleCard rule={rule()} record={asked({ fired: 5, saidYes: 5 })} />
      )

      expect(container.querySelectorAll("button")).toHaveLength(0)
      expect(container.querySelectorAll("form")).toHaveLength(0)
      expect(container.querySelectorAll("input")).toHaveLength(0)
    })
  })
})
