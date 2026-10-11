import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { readTrend, type TrendSpan } from "@/app/(portal)/_lib/trust-trend"

import { TrustTrend } from "./trust-trend"

/** Two fingerprints sharing a shape half, so a pair of them reads as one policy edited. */
const RULES = "abc123:1111111111111111"
const EDITED = "abc123:2222222222222222"

const spanWith = (over: Partial<TrendSpan> = {}): TrendSpan => ({
  judged: 20,
  gap: 0.3,
  observedRate: 0.5,
  meanConfidence: 0.8,
  unattributed: 0,
  rulesets: [RULES],
  unfingerprinted: 0,
  checkSets: [[]],
  unrecordedChecks: 0,
  from: "2026-10-01T00:00:00.000Z",
  to: "2026-10-05T00:00:00.000Z",
  ...over,
})

const draw = (now: TrendSpan, earlier: Parameters<typeof readTrend>[1], detail?: string) =>
  render(
    <TrustTrend
      trend={readTrend(now, earlier)}
      now={now}
      earlier={earlier}
      {...(detail === undefined ? {} : { detail })}
    />
  )

/**
 * A stretch with one of its ends missing, which `exactOptionalPropertyTypes`
 * makes a different thing from one whose end is `undefined` — and the former is
 * what a journal page with no timestamps actually produces.
 */
const without = (span: TrendSpan, end: "from" | "to"): TrendSpan => {
  if (end === "from") {
    const { from, ...rest } = span

    return rest
  }

  const { to, ...rest } = span

  return rest
}

describe("TrustTrend", () => {
  /**
   * The verdict above is drawn in the same tones, so a screen where both
   * readings are bad shows two identical-looking panels. Without a heading the
   * second reads as the first repeating itself.
   */
  it("is headed, so it is not read as the verdict above it restated", () => {
    const { container } = draw(spanWith({ gap: 0.05 }), spanWith({ gap: 0.4 }))

    expect(container.querySelector("h2")?.textContent).toBe("Has it got better?")
  })

  it("leads with the plain reading and its next move, not with a number", () => {
    draw(spanWith({ gap: 0.05 }), spanWith({ gap: 0.4 }))

    expect(screen.getByText(/The AI has got better at judging itself/)).toBeTruthy()
    expect(screen.getByText(/doing less work than they were/)).toBeTruthy()
  })

  it("puts both stretches' own figures one click down, pass rates included", () => {
    const { container } = draw(spanWith({ gap: 0.05 }), spanWith({ gap: 0.4 }))

    const disclosure = container.querySelector("details")
    expect(disclosure).toBeTruthy()
    expect(disclosure?.textContent).toContain("mean claim")
    expect(disclosure?.textContent).toContain("survived")
    expect(disclosure?.textContent).toContain("1 October 2026 to 5 October 2026")
  })

  /*
   * The whole point of the section, asserted on the surface rather than only in
   * the reading: a reader must not be able to take the pass rate as the verdict.
   */
  it("says on the surface when the pass rate moved the other way from the verdict", () => {
    draw(
      spanWith({ gap: 0.4, observedRate: 0.8 }),
      spanWith({ gap: 0.05, observedRate: 0.4 })
    )

    expect(screen.getByText(/More changes went through/)).toBeTruthy()
    expect(screen.getByText(/not an improvement/)).toBeTruthy()
  })

  it("says the comparison does not compare pass rates, where the figures are", () => {
    const { container } = draw(spanWith({ gap: 0.05 }), spanWith({ gap: 0.4 }))

    expect(container.querySelector("details")?.textContent).toMatch(
      /does not compare the survival rates/
    )
  })

  it("draws no table at all when there is no earlier stretch to tabulate", () => {
    const { container } = draw(spanWith(), "none")

    expect(screen.getByText(/as far back as the record goes/)).toBeTruthy()
    expect(container.querySelector("table")).toBeNull()
  })

  it("keeps a failed read apart from an absent one, with the journal's own words down one", () => {
    const { container } = draw(spanWith(), "unreadable", "telemetry is unavailable: boom")

    expect(screen.getByText(/couldn.t look further back/)).toBeTruthy()
    expect(container.querySelector("details")?.textContent).toContain(
      "telemetry is unavailable: boom"
    )
    expect(container.querySelector("table")).toBeNull()
  })

  it("names the entries neither stretch could score rather than dropping them", () => {
    const { container } = draw(
      spanWith({ gap: 0.05, unattributed: 2 }),
      spanWith({ gap: 0.4, unattributed: 3 })
    )

    expect(container.querySelector("details")?.textContent).toMatch(
      /5 entries across the two belong to an ask that began before/
    )
  })

  it("says nothing about unscorable entries when there are none", () => {
    const { container } = draw(spanWith({ gap: 0.05 }), spanWith({ gap: 0.4 }))

    expect(container.querySelector("details")?.textContent).not.toMatch(/belong to an ask/)
  })

  it("counts one ruleset running across both stretches once", () => {
    const { container } = draw(spanWith({ gap: 0.05 }), spanWith({ gap: 0.4 }))

    expect(container.querySelector("details")?.textContent).toContain(
      "One recorded ruleset judged both stretches"
    )
  })

  it("still shows both stretches when it refuses to attribute the movement", () => {
    const { container } = draw(spanWith({ gap: 0.05 }), spanWith({ rulesets: [EDITED] }))

    expect(screen.getByText(/isn.t about the AI/)).toBeTruthy()
    expect(container.querySelector("table")).toBeTruthy()
    expect(container.querySelector("details")?.textContent).toContain(
      "2 different recorded rulesets"
    )
  })

  /*
   * The other half of *what judged these*, one click down beside the rulesets.
   * A reader told the rules held still has been told half of what they came for.
   */
  describe("what Loom was checking", () => {
    it("says a deployment that wired neither seam was judged by its rules alone", () => {
      const { container } = draw(spanWith({ gap: 0.05 }), spanWith({ gap: 0.4 }))

      expect(container.querySelector("details")?.textContent).toContain(
        "Both stretches were judged by the same checks: nothing beyond your rules."
      )
    })

    it("names the checks when there were some, in the portal's words", () => {
      const { container } = draw(
        spanWith({ gap: 0.05, checkSets: [["props", "bindings"]] }),
        spanWith({ gap: 0.4, checkSets: [["props", "bindings"]] })
      )

      expect(container.querySelector("details")?.textContent).toContain(
        "the settings check and the data check"
      )
    })

    it("says which stretch had which when they differ, so a reader knows where to look", () => {
      const { container } = draw(
        spanWith({ gap: 0.05, checkSets: [["props"]] }),
        spanWith({ gap: 0.4 })
      )

      expect(screen.getByText(/What Loom was checking changed in between/)).toBeTruthy()
      expect(container.querySelector("details")?.textContent).toContain(
        "This stretch was judged by the settings check; the one before it, by nothing beyond your rules."
      )
    })

    it("counts the judgments that recorded nothing rather than leaving them out", () => {
      const { container } = draw(
        spanWith({ gap: 0.05, unrecordedChecks: 2 }),
        spanWith({ gap: 0.4, unrecordedChecks: 1 })
      )

      expect(container.querySelector("details")?.textContent).toMatch(
        /A further 3 claims across the two recorded no checks at all/
      )
    })

    /**
     * The sentence a reader acts on, and the one the old screen got wrong: an
     * unrecorded check is not a change they have to go and find.
     */
    it("tells a check it cannot read apart from one that changed", () => {
      draw(spanWith({ gap: 0.05, unrecordedChecks: 1 }), spanWith({ gap: 0.4 }))

      expect(screen.getByText(/can.t show Loom was checking the same things/)).toBeTruthy()
      expect(screen.getByText(/Nothing to do, and nothing is wrong/)).toBeTruthy()
    })

    it("carries the refusal's own name for anything looking at the rendered screen", () => {
      const { container } = draw(
        spanWith({ gap: 0.05, checkSets: [["props"]] }),
        spanWith({ gap: 0.4 })
      )

      expect(container.querySelector("[data-trust-trend='checks-changed']")).toBeTruthy()
    })
  })

  it("says a stretch with no timestamps has none rather than printing half a range", () => {
    const { container } = draw(
      spanWith({ gap: 0.05 }),
      without(without(spanWith({ gap: 0.4 }), "from"), "to")
    )

    expect(container.querySelector("details")?.textContent).toContain("no dates recorded")
  })

  it("carries the reading's own name for anything looking at the rendered screen", () => {
    const { container } = draw(spanWith({ gap: 0.4 }), spanWith({ gap: 0.05 }))

    expect(container.querySelector("[data-trust-trend='further']")).toBeTruthy()
  })
})
