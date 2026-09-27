import { EPISODE_RESOLUTION_KINDS } from "@jam-overture/loom/telemetry"
import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { docsTelemetry } from "@/app/(docs)/_lib/telemetry/corpus"
import { traceEpisode } from "@/app/(docs)/_lib/telemetry/reading"

import {
  AskEndings,
  ConfidenceCalibration,
  EpisodeTrace,
  EventTypeCount,
  ForgettingPlan,
  RecordedIntent,
} from "./telemetry"

/**
 * What the five blocks on *What every ask leaves behind* put on the screen.
 *
 * Every expectation recomputes what it wants from the corpus and compares,
 * rather than naming a number — the same rule the theming page's blocks follow.
 * A component that started printing its own arithmetic instead of the runtime's
 * would show up here as a diff, which is the only reason a documentation page
 * is allowed to print numbers at all.
 *
 * These are **async server components**, so each is awaited before it is
 * rendered. That is what `next build` does with them too.
 */

describe("the printed record", () => {
  it("shows the first intent whole, with no sentence in it", async () => {
    const { records } = await docsTelemetry()
    const first = records.find((record) => record.event.type === "intent-received")

    render(await RecordedIntent())

    const printed = screen.getByRole("code").textContent ?? ""

    expect(JSON.parse(printed)).toStrictEqual(first)
    expect(printed).toContain("utteranceLength")
    expect(printed).not.toContain("utterance\"")
    expect(printed).not.toContain("Add a closing line")
  })
})

describe("the traced ask", () => {
  it("lists every record of it in the order the journal wrote them", async () => {
    const { records, fold } = await docsTelemetry()
    const trace = traceEpisode(fold, records)

    render(await EpisodeTrace())

    /** The position is what makes "two requests, not one" checkable on the page. */
    const positions = screen.getAllByText(/^#\d+$/).map((element) => element.textContent)

    expect(positions).toStrictEqual(trace.records.map((record) => `#${record.seq}`))
    expect(screen.getAllByText("hold-confirmed").length).toBeGreaterThan(0)
  })

  it("says who asked and who allowed it, which are two different people", async () => {
    render(await EpisodeTrace())

    expect(screen.getByText("allowed by the maintainer")).toBeTruthy()
    expect(screen.getByText("the maintainer")).toBeTruthy()
    expect(screen.getByText(/user-instruction from the reader/)).toBeTruthy()
  })

  it("prints the ending the fold arrived at rather than the last record's name", async () => {
    const { fold } = await docsTelemetry()
    const episode = fold.episodes.find((candidate) =>
      candidate.proposals.some((proposal) => proposal.answer === "confirmed")
    )

    render(await EpisodeTrace())

    expect(screen.getByText("resolution.kind")).toBeTruthy()
    expect(screen.getAllByText(episode?.resolution.kind ?? "never").length).toBeGreaterThan(0)
  })
})

describe("the endings table", () => {
  it("has a row for every ending, including the ones with no count", async () => {
    const { tally } = await docsTelemetry()

    render(await AskEndings())

    for (const kind of EPISODE_RESOLUTION_KINDS) {
      const row = screen.getByText(kind).closest("div")

      expect(row, `no row for ${kind}`).not.toBeNull()
      expect(within(row as HTMLElement).getByText(String(tally.byResolution[kind]))).toBeTruthy()
    }
  })

  /**
   * The page's argument is that hiding a zero is how a table tells a
   * comfortable lie. Two endings did not occur, and both are on the screen.
   */
  it("prints the two endings that did not happen", async () => {
    render(await AskEndings())

    for (const kind of ["failed", "open"] as const) {
      const row = screen.getByText(kind).closest("div")

      expect(within(row as HTMLElement).getByText("0")).toBeTruthy()
    }
  })
})

describe("the calibration block", () => {
  it("reports nothing judged, and says how many it set aside", async () => {
    const { calibration } = await docsTelemetry()

    render(await ConfidenceCalibration())

    expect(screen.getByText("overall.judged").parentElement?.textContent).toContain("0")
    expect(screen.getByText("runtimeAuthored").parentElement?.textContent).toContain(
      String(calibration.runtimeAuthored)
    )
  })

  /**
   * The one substitution that would make this block wrong rather than merely
   * different: a gap of `0.00` reads as a perfectly calibrated model, and there
   * is no model here at all.
   */
  it("prints null for the gap rather than rounding an absent measurement to zero", async () => {
    render(await ConfidenceCalibration())

    const gap = screen.getByText("overall.gap").parentElement?.textContent ?? ""

    expect(gap).toContain("null")
    expect(gap).not.toContain("0.00")
  })
})

describe("the retention plan", () => {
  it("prints every number the runtime's plan carries", async () => {
    const { retention, horizon } = await docsTelemetry()

    render(await ForgettingPlan())

    expect(screen.getByText("horizon").parentElement?.textContent).toContain(horizon.slice(0, 10))

    for (const [name, value] of [
      ["forgets", retention.forgets],
      ["keptUnsettled", retention.keptUnsettled],
      ["keptBehind", retention.keptBehind],
      ["unsettledEpisodes", retention.unsettledEpisodes],
    ] as const) {
      expect(screen.getByText(name).parentElement?.textContent).toContain(String(value))
    }
  })
})

describe("the event-type count in the prose", () => {
  it("says how much of the vocabulary ten asks reached", async () => {
    const { records } = await docsTelemetry()
    const seen = new Set(records.map((record) => record.event.type)).size

    render(await EventTypeCount())

    expect(screen.getByText(`${seen} of 18`)).toBeTruthy()
  })
})
