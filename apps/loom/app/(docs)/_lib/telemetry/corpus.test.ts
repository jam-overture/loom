import { EPISODE_RESOLUTION_KINDS, TELEMETRY_EVENT_TYPES } from "@jam-overture/loom/telemetry"
import { describe, expect, it } from "vitest"

import { docsTelemetry, DOCS_RETENTION } from "./corpus"

/**
 * The corpus is the page's only source of numbers, so these are the claims the
 * prose is allowed to make about it.
 *
 * Written against properties rather than against the numbers themselves
 * wherever a property will do: asserting `forgets === 14` would fail the day
 * somebody adds an eleventh ask, and would fail for a reason that is not a
 * defect. What must not change silently is the *shape* — that nothing is
 * dropped, that six endings are reached, that every retention number is
 * exercised, and that the clock is fixed. Where the page prints a number in
 * prose, the number is pinned here and nowhere else.
 */

describe("the corpus", () => {
  it("loses nothing on the way into the journal", async () => {
    const { dropped, fold } = await docsTelemetry()

    expect(dropped).toBe(0)
    expect(fold.unattributed).toHaveLength(0)
  })

  it("is a fixed clock, so the page prerenders the same bytes every build", async () => {
    const { records, now, horizon } = await docsTelemetry()
    const first = records.at(0)
    const last = records.at(-1)

    expect(first?.recordedAt).toBe("2026-07-01T09:00:10.000Z")
    expect(last?.recordedAt.slice(0, 10)).toBe("2026-07-29")
    expect(now).toBe("2026-08-01T09:00:00.000Z")
    expect(horizon).toBe("2026-07-18T09:00:00.000Z")
  })

  it("hands back records in ascending position, which every fold assumes", async () => {
    const { records } = await docsTelemetry()
    const positions = records.map((record) => record.seq)

    expect(positions).toStrictEqual([...positions].sort((left, right) => left - right))
    expect(new Set(positions).size).toBe(positions.length)
  })

  it("counts every resolution the runtime can reach, including the ones that did not happen", async () => {
    const { tally } = await docsTelemetry()

    expect(Object.keys(tally.byResolution).sort()).toStrictEqual([...EPISODE_RESOLUTION_KINDS].sort())

    const counted = Object.values(tally.byResolution).reduce((sum, count) => sum + count, 0)

    expect(counted).toBe(tally.episodes)
  })

  /**
   * The page's argument is that an ask ends in more ways than "yes" and "no",
   * and it is only worth reading if the corpus actually produces them. Six is
   * what ten asks against a three-node page can reach without a stub; a corpus
   * that quietly collapsed to two would leave the prose describing a table it
   * no longer shows.
   */
  it("reaches six of the eight endings, from asks a reader could have clicked", async () => {
    const { tally } = await docsTelemetry()
    const reached = EPISODE_RESOLUTION_KINDS.filter((kind) => tally.byResolution[kind] > 0)

    expect(reached).toStrictEqual([
      "committed",
      "refused",
      "awaiting-answer",
      "discarded",
      "not-interpreted",
      "not-writable",
    ])
  })

  it("exercises two thirds of the vocabulary the runtime can narrate", async () => {
    const { records } = await docsTelemetry()
    const seen = new Set(records.map((record) => record.event.type))

    expect(seen.size).toBe(12)
    expect(TELEMETRY_EVENT_TYPES.length).toBe(18)
  })

  it("keeps no utterance anywhere in sixty records", async () => {
    const { records } = await docsTelemetry()

    expect(JSON.stringify(records)).not.toContain("Add a closing line")
    expect(JSON.stringify(records)).not.toContain("utterance\"")

    const intents = records.flatMap((record) =>
      record.event.type === "intent-received" ? [record.event.intent] : []
    )

    expect(intents).not.toHaveLength(0)
    for (const intent of intents) expect(intent.utteranceLength).toBeGreaterThan(0)
  })

  /**
   * The page says calibration scores nothing here, and says *why*. Both halves
   * are load-bearing: if a proposal ever arrived claiming to be model-authored,
   * the report would fill in and the page's most important paragraph would be
   * describing something that is no longer on the screen.
   */
  it("produces no calibrated claim, because nothing in it was graded by a model", async () => {
    const { calibration, fold } = await docsTelemetry()
    const proposals = fold.episodes.flatMap((episode) => episode.proposals)

    for (const proposal of proposals) expect(proposal.provenance.authoredBy).toBe("runtime")

    expect(calibration.runtimeAuthored).toBe(proposals.length)
    expect(calibration.overall.judged).toBe(0)
    expect(calibration.overall.observedRate).toBeNull()
    expect(calibration.overall.gap).toBeNull()
    expect(calibration.byPolicy).toHaveLength(0)
  })

  it("holds an ask that a person answered, which is what the trace walks through", async () => {
    const { fold } = await docsTelemetry()
    const answered = fold.episodes.filter((episode) =>
      episode.proposals.some((proposal) => proposal.answer === "confirmed")
    )

    expect(answered).toHaveLength(1)
    expect(answered[0]?.resolution.kind).toBe("committed")
    expect(answered[0]?.proposals[0]?.answeredBy).toBe("the maintainer")
    expect(answered[0]?.proposals[0]?.provenance.actor).toBe("the reader")
  })

  /**
   * Every number in the retention plan is on the page with a sentence about
   * what it means, so every one of them has to be non-zero — a plan with three
   * zeroes would make three of those sentences unreadable.
   */
  it("plans a cut with all four numbers exercised", async () => {
    const { retention } = await docsTelemetry()

    expect(retention.before).not.toBeNull()
    expect(retention.forgets).toBeGreaterThan(0)
    expect(retention.keptUnsettled).toBeGreaterThan(0)
    expect(retention.keptBehind).toBeGreaterThan(0)
    expect(retention.unsettledEpisodes).toBe(1)
  })

  it("keeps back exactly the records the prefix rule cannot drop", async () => {
    const { retention, records, horizon } = await docsTelemetry()
    const candidates = records.filter((record) => record.recordedAt < horizon)

    expect(retention.forgets + retention.keptUnsettled + retention.keptBehind).toBe(
      candidates.length
    )
  })

  it("declares a policy the runtime would accept", async () => {
    expect(DOCS_RETENTION.maxAgeMs).toBeGreaterThanOrEqual(60 * 60 * 1000)
  })
})
