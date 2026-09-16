import type { LoomTree, NodeId, PrimitiveType } from "@loom/runtime"
import {
  mintViewKey,
  rollUp,
  VIEW_KEY_BYTES,
  type FunnelAnswer,
  type FunnelPair,
  type ReaderSignal,
  type ReaderSignalBatch,
  type ReaderTally,
  type Rollup,
} from "@loom/runtime/signals"

import { bandsOf, type Band } from "../outline"

/**
 * Twelve visits to the front door, and what the machinery makes of them.
 *
 * The page this feeds says what a deployment can learn from the people reading
 * it. Saying that with numbers somebody typed would be the same failure the
 * front door's own band exists to avoid: every claim on this site that can be
 * computed is computed, and a marketing page about measurement is the last
 * place to make an exception.
 *
 * So the visits are written down as **what each reader did**, and every number
 * the page prints comes out of `rollUp` — the same function the portal's screen
 * reads and the only one in the repository that turns signals into counters. The
 * arithmetic on the page is therefore not a description of the arithmetic; it is
 * the arithmetic, run while the page is being built.
 *
 * **Scripted, and the page says so where it prints them.** Nobody's actual visit
 * is in here and none could be: this deployment counts nothing, because counting
 * is off unless a host turns it on (0136). These are the same move as the front
 * door's five prepared requests — invented input, real machinery, and a sentence
 * beside it saying which half is which.
 *
 * Pure and deterministic. No clock, no randomness the caller cannot name, and
 * the ids come off the tree it is handed rather than being written here, so a
 * band that is renamed or removed fails loudly instead of quietly dropping out
 * of the readings.
 */

/**
 * How far down the page a reader got, and what they did on the way.
 *
 * `asFarAs` is the band they stopped at, and it stands for **everything above
 * it as well** — a reader who saw the eighth band scrolled past the seven before
 * it. That is a modelling choice rather than a property of signals, and it is
 * the honest one for a page read top to bottom: the alternative is writing out
 * eight band names per visit, which is a fixture nobody can check by eye.
 *
 * Everything else is named explicitly, because none of it can be inferred from
 * how far somebody scrolled.
 */
export type ScriptedVisit = {
  /** The last band that came into view. Every band above it came into view too. */
  readonly asFarAs: string
  /**
   * Seconds on screen, per band, for the bands this reader lingered on.
   *
   * A band they reached and are not listed against is recorded as
   * `PASSED_THROUGH_SECONDS`, because the alternative is recording nothing and
   * nothing is not what a browser reports: time on screen is accumulated for
   * anything visible at all, and a band is emitted the moment it has a whole
   * millisecond against it. A fixture where a scrolled-past band had no time on
   * it would be a fixture no page could produce.
   */
  readonly stayed?: Readonly<Record<string, number>>
  /** Bands in which they used a link, a button or a field. */
  readonly pressed?: readonly string[]
  /** Bands in which they opened something that had been closed. */
  readonly opened?: readonly string[]
}

/**
 * What a band a reader scrolled past has against it.
 *
 * Two seconds rather than nothing, for the reason on `ScriptedVisit.stayed`:
 * time on screen accumulates for anything visible, so the honest reading of
 * *they went past it* is a small number and not an absent one. It is named here
 * rather than buried in the minting so that the whole of the fixture is in the
 * two constants a reader of this file can see.
 */
export const PASSED_THROUGH_SECONDS = 2

/**
 * The visits, in the order they arrived.
 *
 * Written to be ordinary rather than flattering, which is the only way the band
 * is worth reading: most people stop before the end of a long page, a handful
 * read all of it, and one arrives and leaves immediately. A scripted set where
 * everybody reaches everything would produce a table of full marks and teach a
 * visitor nothing about what the measurement is for.
 */
export const SCRIPTED_VISITS: readonly ScriptedVisit[] = [
  { asFarAs: "The opening", stayed: { "The opening": 4 } },
  {
    asFarAs: "See it happen",
    stayed: { "The opening": 11, "See it happen": 26 },
    pressed: ["See it happen"],
  },
  {
    asFarAs: "See it happen",
    stayed: { "The opening": 8, "See it happen": 19 },
    pressed: ["See it happen"],
  },
  { asFarAs: "What this is for", stayed: { "The opening": 6, "What this is for": 14 } },
  {
    asFarAs: "See it happen",
    stayed: { "The opening": 9, "See it happen": 31 },
    pressed: ["See it happen"],
  },
  {
    asFarAs: "Questions",
    stayed: { "The opening": 7, "See it happen": 22, Questions: 18 },
    pressed: ["See it happen"],
    opened: ["Questions"],
  },
  { asFarAs: "The opening", stayed: { "The opening": 3 } },
  {
    asFarAs: "Where it is today",
    stayed: { "The opening": 10, "See it happen": 12, "Where it is today": 9 },
  },
  {
    asFarAs: "Keep going",
    stayed: { "The opening": 8, "See it happen": 24, Questions: 21, "Keep going": 16 },
    pressed: ["See it happen", "Keep going"],
    opened: ["Questions"],
  },
  { asFarAs: "What this is for", stayed: { "The opening": 5, "What this is for": 11 } },
  {
    asFarAs: "Keep going",
    stayed: { "The opening": 12, "See it happen": 17, "Keep going": 13 },
  },
  {
    asFarAs: "Questions",
    stayed: { "The opening": 6, "Questions": 27 },
    opened: ["Questions"],
  },
]

/**
 * A question about two bands of one page, which is the only shape a funnel is
 * allowed to have here (0146).
 *
 * `did` is two words rather than the machinery's kind because it is printed:
 * a question is read by whoever is deciding what to change, and *used something
 * in it* is what `activated` means to them.
 */
export type FunnelQuestion = {
  /** The band they had to reach for the question to be about them. */
  readonly from: string
  /** The band the second thing happened in. The same band is a fair question. */
  readonly to: string
  readonly did: "used something in it" | "got as far as it"
}

/**
 * The two this page asks.
 *
 * The first is the one the front door actually cares about — of the readers who
 * reached the band that lets you ask for a change, how many asked. The second
 * is deliberately across **two different bands**, because a funnel whose ends
 * are the same band would let a reader think that is all one can ask.
 */
export const FUNNEL_QUESTIONS: readonly FunnelQuestion[] = [
  { from: "See it happen", to: "See it happen", did: "used something in it" },
  { from: "See it happen", to: "Keep going", did: "got as far as it" },
]

/**
 * A band of the page by the name a reader would call it, or a build that stops.
 *
 * It throws, and the sentence names the band and lists what the page does have.
 * A visit written against a band that has since been renamed is the one failure
 * mode of a fixture keyed by name, and the two silent alternatives are both
 * worse: skipping the band drops a reader's whole visit out of the arithmetic,
 * and inventing an id files their signals under a band that does not exist.
 *
 * This is the same guard `the-rules.ts` puts on its ladder, for the same reason
 * — a page assembled from a list somewhere else should fail while it is being
 * built rather than go out incomplete.
 */
const bandNamed = (bands: readonly Band[], name: string): Band => {
  const found = bands.find((band) => band.name === name)

  if (found === undefined) {
    throw new Error(
      `loom: no band of the front door is called "${name}" — it has ${bands
        .map((band) => `"${band.name}"`)
        .join(", ")}`
    )
  }

  return found
}

/** A band, as the two fields every signal carries to say which one it is about. */
const addressOf = (band: Band): { readonly nodeId: NodeId; readonly type: PrimitiveType } => ({
  nodeId: band.id as NodeId,
  type: band.what as PrimitiveType,
})

/**
 * A view key this page can name, because the page is built the same way twice.
 *
 * `mintViewKey` takes its randomness as a parameter for exactly this — a caller
 * that has to be able to say which key it minted. A key here is a number in hex
 * and nothing else; it correlates the batches of one scripted visit and is never
 * printed, which is precisely what the real one does before it is dropped.
 */
const viewKeyFor = (visit: number): ReturnType<typeof mintViewKey> =>
  mintViewKey(() => Uint8Array.from({ length: VIEW_KEY_BYTES }, (_, byte) => (visit * 17 + byte) % 256))

/**
 * One visit, as the batch a browser would have sent.
 *
 * The signals are minted in the order the kinds are declared rather than the
 * order they would have happened in, because nothing downstream reads the order
 * — `rollUp` counts occurrences and distinct views — and a fixture that implied
 * otherwise would be making a claim this shape cannot carry.
 */
const batchFor = (page: LoomTree, visit: ScriptedVisit, index: number): ReaderSignalBatch => {
  const bands = bandsOf(page)
  const stop = bandNamed(bands, visit.asFarAs)
  const reached = bands.slice(0, bands.findIndex((band) => band.id === stop.id) + 1)

  const viewed: readonly ReaderSignal[] = reached.map((band) => ({
    kind: "viewed",
    ...addressOf(band),
    at: index,
  }))

  const dwelled: readonly ReaderSignal[] = reached.map((band) => ({
    kind: "dwelled",
    ...addressOf(band),
    ms: (visit.stayed?.[band.name] ?? PASSED_THROUGH_SECONDS) * 1000,
  }))

  const activated: readonly ReaderSignal[] = (visit.pressed ?? []).map((name) => ({
    kind: "activated",
    ...addressOf(bandNamed(bands, name)),
    at: index,
  }))

  const disclosed: readonly ReaderSignal[] = (visit.opened ?? []).map((name) => ({
    kind: "disclosed",
    ...addressOf(bandNamed(bands, name)),
    open: true,
    at: index,
  }))

  return {
    treeId: page.treeId,
    revision: page.revision,
    sentAt: index,
    view: viewKeyFor(index),
    signals: [...viewed, ...dwelled, ...activated, ...disclosed],
  }
}

/** Every scripted visit, as the deliveries a deployment would have received. */
export const scriptedBatches = (page: LoomTree): readonly ReaderSignalBatch[] =>
  SCRIPTED_VISITS.map((visit, index) => batchFor(page, visit, index))

/** What a question's second half is, as the kind a signal of it would carry. */
const kindOf = (question: FunnelQuestion): "activated" | "viewed" =>
  question.did === "used something in it" ? "activated" : "viewed"

const pairsFor = (page: LoomTree): readonly FunnelPair[] => {
  const bands = bandsOf(page)

  return FUNNEL_QUESTIONS.map((question) => ({
    from: { nodeId: bandNamed(bands, question.from).id as NodeId, kind: "viewed" },
    to: { nodeId: bandNamed(bands, question.to).id as NodeId, kind: kindOf(question) },
  }))
}

/**
 * One band's line, with the page's own name for it attached.
 *
 * `ReaderTally` names a band by its id, which is right — a tally is about the
 * page and not about whoever is reading the tally — and useless to print. The
 * name comes from the same walk of the same page the signals were minted
 * against, which is what `bandsOf` gaining a band's kind was for.
 */
export type BandReading = {
  readonly band: string
  /** Page views that got this far, and the views there were in total. */
  readonly reached: number
  readonly views: number
  /** Time on screen, summed across every view. Seconds, rounded. */
  readonly seconds: number
  readonly pressed: number
  readonly opened: number
}

export type FrontDoorReadings = {
  /** Distinct page views the readings were computed over. */
  readonly views: number
  /** Bands in the order a reader meets them, which is the order they are printed in. */
  readonly bands: readonly BandReading[]
  /** The funnel questions, answered. */
  readonly funnels: readonly FunnelAnswer[]
  /** What the page's own arithmetic was run over, for the tests. */
  readonly rollup: Rollup
}

const tallyFor = (rollup: Rollup, band: Band): ReaderTally | undefined =>
  rollup.tallies.find((tally) => tally.nodeId === (band.id as NodeId))

/**
 * The front door, read by twelve scripted readers.
 *
 * Bands are returned in **page order** rather than in the order `rollUp`
 * produced them. A reader comparing the table against the page it is about is
 * counting down the page, and a table sorted by the most-read band would make
 * them count wrong — which is the same reasoning `outlineDiff` records for
 * keeping a page's order rather than sorting by what happened to it.
 *
 * Bands nothing was recorded about are left out rather than printed as zeroes.
 * A zero row invites the reader to wonder whether nobody saw it or nobody
 * measured it, and only one of those is true here.
 */
export const frontDoorReadings = (page: LoomTree): FrontDoorReadings => {
  const rollup = rollUp(scriptedBatches(page), { pairs: pairsFor(page) })

  const bands = bandsOf(page).flatMap((band): readonly BandReading[] => {
    const tally = tallyFor(rollup, band)

    return tally === undefined
      ? []
      : [
          {
            band: band.name,
            reached: tally.reached,
            views: rollup.views,
            seconds: Math.round(tally.dwellMs / 1000),
            pressed: tally.activations,
            opened: tally.opens,
          },
        ]
  })

  return { views: rollup.views, bands, funnels: rollup.funnels, rollup }
}

/**
 * A funnel's answer as the sentence the page prints, with both numbers in it.
 *
 * Never a bare percentage, and that is a rule rather than a preference: two of
 * two and two hundred of two hundred are the same rate and different news. It is
 * the rule the portal's own screen was built to, and a marketing page quoting a
 * rate without its denominator would be the one place on this site where a
 * number is allowed to flatter.
 */
export const funnelSentence = (question: FunnelQuestion, answer: FunnelAnswer): string =>
  question.did === "used something in it"
    ? `Of the ${answer.reached} readers who got as far as “${question.from}”, ${answer.converted} used something in it.`
    : `Of the ${answer.reached} readers who got as far as “${question.from}”, ${answer.converted} read on to “${question.to}”.`
