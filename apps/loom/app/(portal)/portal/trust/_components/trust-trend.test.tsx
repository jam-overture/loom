import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { readTrend, type TrendSpan } from "@/app/(portal)/_lib/trust-trend"

import { TrustTrend } from "./trust-trend"

const RULES = "abc123"

const spanWith = (over: Partial<TrendSpan> = {}): TrendSpan => ({
  judged: 20,
  gap: 0.3,
  observedRate: 0.5,
  meanConfidence: 0.8,
  unattributed: 0,
  rulesets: [RULES],
  unfingerprinted: 0,
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
    const { container } = draw(spanWith({ gap: 0.05 }), spanWith({ rulesets: ["other"] }))

    expect(screen.getByText(/isn.t about the AI/)).toBeTruthy()
    expect(container.querySelector("table")).toBeTruthy()
    expect(container.querySelector("details")?.textContent).toContain(
      "2 different recorded rulesets"
    )
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
