import { parseReaderSignalBatch } from "@jam-overture/loom/signals"
import { describe, expect, it } from "vitest"

import { bandsOf } from "../outline"
import { homePageTree } from "../pages/home"
import { DEFAULT_THEME } from "../site"

import {
  BAND_QUESTION,
  bandSentence,
  frontDoorReadings,
  funnelSentence,
  FUNNEL_QUESTIONS,
  PASSED_THROUGH_SECONDS,
  scriptedBatches,
  SCRIPTED_VISITS,
} from "./visits"

/**
 * The fixture behind the readers page, and the arithmetic it is put through.
 *
 * The page's claim is *the visits are made up and the working is not*, and the
 * two halves need different assertions. The working is the runtime's, so what
 * is worth testing here is the **fixture's own honesty**: that every batch is a
 * shape a browser could actually have sent, that the visits line up with the
 * page they are about, and that the numbers the page prints are the ones that
 * come out rather than ones anybody chose.
 *
 * The sharpest of them is the first. A fixture typed into a test file is checked
 * by nothing but the type it was written against, and a `ReaderSignalBatch`
 * assembled by hand can satisfy TypeScript while being a batch the runtime would
 * refuse — an extra field, a dwell of zero, an empty batch. `parseReaderSignalBatch`
 * is the function a real endpoint uses on a real body, so running the fixture
 * through it is the difference between *this compiles* and *a browser could have
 * sent this*.
 */

const ORIGIN = "https://loom.example"

const page = () => homePageTree({ origin: ORIGIN, theme: DEFAULT_THEME })

describe("the scripted visits", () => {
  it("is twelve of them, which is what the page says it is", () => {
    expect(SCRIPTED_VISITS).toHaveLength(12)
  })

  /**
   * The one that makes the rest worth having. Every batch goes through the
   * parser an endpoint would run on it, so nothing in the fixture is a shape
   * only this repository's own types would accept.
   */
  it.each(scriptedBatches(page()).map((batch, index) => [index, batch] as const))(
    "visit %i is a batch the runtime would accept from a stranger",
    (_index, batch) => {
      const parsed = parseReaderSignalBatch(batch)

      expect(parsed.ok ? "accepted" : parsed.error.issues).toBe("accepted")
    }
  )

  it("names only bands the front door actually has", () => {
    const names = new Set(bandsOf(page()).map((band) => band.name))
    const named = SCRIPTED_VISITS.flatMap((visit) => [
      visit.asFarAs,
      ...Object.keys(visit.stayed ?? {}),
      ...(visit.pressed ?? []),
      ...(visit.opened ?? []),
    ])

    expect(named.filter((name) => !names.has(name))).toEqual([])
  })

  /**
   * A band named in a visit that the front door no longer has is the one way a
   * fixture keyed by name can rot, so it fails loudly and says what the page
   * does have. Checked because the alternative — a `find` returning nothing and
   * a visit quietly dropping out of every number on the page — is exactly the
   * silent failure this site keeps finding in its own copy.
   */
  it("stops the build rather than skipping a band it cannot find", () => {
    const withGhost = { ...page(), root: { ...page().root, children: [] } }

    expect(() => scriptedBatches(withGhost)).toThrow(/no band of the front door is called/)
  })

  it("reaches a band by scrolling past every band above it", () => {
    const bands = bandsOf(page())
    const batches = scriptedBatches(page())

    for (const [index, visit] of SCRIPTED_VISITS.entries()) {
      const reached = (batches[index]?.signals ?? [])
        .filter((signal) => signal.kind === "viewed")
        .map((signal) => signal.nodeId)
      const stopped = bands.findIndex((band) => band.name === visit.asFarAs)

      expect(reached).toEqual(bands.slice(0, stopped + 1).map((band) => band.id))
    }
  })

  /**
   * A band on screen for any measurable time is reported, so a reached band with
   * nothing against it is a reading no page could produce.
   */
  it("gives every band a reader reached some time on screen", () => {
    for (const batch of scriptedBatches(page())) {
      const viewed = batch.signals.filter((signal) => signal.kind === "viewed")
      const dwelled = batch.signals.filter((signal) => signal.kind === "dwelled")

      expect(dwelled.map((signal) => signal.nodeId)).toEqual(viewed.map((signal) => signal.nodeId))
      for (const signal of dwelled) {
        if (signal.kind === "dwelled") expect(signal.ms).toBeGreaterThanOrEqual(PASSED_THROUGH_SECONDS * 1000)
      }
    }
  })

  it("is the same twelve batches every time the page is built", () => {
    expect(scriptedBatches(page())).toEqual(scriptedBatches(page()))
  })
})

describe("the readings", () => {
  it("counts every visit as its own page view, with none it could not correlate", () => {
    const readings = frontDoorReadings(page())

    expect(readings.views).toBe(SCRIPTED_VISITS.length)
    expect(readings.rollup.uncorrelated).toBe(0)
  })

  it("reports every band against the same denominator", () => {
    for (const band of frontDoorReadings(page()).bands) {
      expect(band.views).toBe(SCRIPTED_VISITS.length)
      expect(band.reached).toBeLessThanOrEqual(band.views)
    }
  })

  /**
   * The property that makes the picture a funnel rather than a bar chart: a
   * band cannot have been reached by more readers than the band above it, on a
   * page that is read downwards. It holds because the visits are written as *how
   * far they got*, and it is asserted because a visit written any other way
   * would produce a shape the band's own copy would then be wrong about.
   */
  it("never reports a band reached by more readers than the one above it", () => {
    const reached = frontDoorReadings(page()).bands.map((band) => band.reached)

    expect(reached).toEqual([...reached].sort((first, second) => second - first))
  })

  it("keeps the bands in the order a reader meets them on the page", () => {
    const readings = frontDoorReadings(page())
    const order = bandsOf(page()).map((band) => band.name)

    expect(readings.bands.map((band) => band.band)).toEqual(
      order.filter((name) => readings.bands.some((band) => band.band === name))
    )
  })

  it("answers each question this page asks, and no more", () => {
    expect(frontDoorReadings(page()).funnels).toHaveLength(FUNNEL_QUESTIONS.length)
  })

  /**
   * Arithmetic the runtime guarantees, asserted here because it is the number
   * the page prints largest: a funnel whose second figure exceeded its first
   * would be a page claiming more readers did a thing than reached it.
   */
  it("never converts more readers than it reached", () => {
    for (const answer of frontDoorReadings(page()).funnels) {
      expect(answer.converted).toBeLessThanOrEqual(answer.reached)
      expect(answer.reached).toBeLessThanOrEqual(SCRIPTED_VISITS.length)
    }
  })

  /**
   * The two questions, written out, because **nothing else can hold them.**
   *
   * Found by mutation and by nothing else: pointing the second question's first
   * half at a different band — `Questions` rather than `See it happen` — passed
   * all 1,524 tests. Two rounds of it did. Every other assertion about a funnel
   * reads `FUNNEL_QUESTIONS` to work out what to expect, so it moves with the
   * constant, and *the denominator is the bar for the band it names* stays true
   * of whichever band that is. Deriving harder does not help: a test that reads
   * the same value the code reads cannot notice the value changing.
   *
   * Which question a page asks is an editorial decision rather than a derivable
   * one, so it is pinned the way the off-bar list is pinned — exactly, so that
   * changing one is a red test and an argument rather than a quiet re-aim. The
   * bands are named as literals for the same reason: `See it happen` and `Keep
   * going` are the band that offers a change and the band with the links out,
   * and a question about any other pair is a different band of the page.
   */
  it("asks about the band that offers a change, and about the foot of the page", () => {
    expect(FUNNEL_QUESTIONS).toEqual([{ from: "See it happen", to: "Keep going" }])
    expect(BAND_QUESTION).toBe("See it happen")
  })

  /**
   * The rule the funnel lost a question to, asserted rather than only written
   * down: a pair may not name the same band twice.
   *
   * Both ends of a funnel are a node a signal names, and a reader never names a
   * band — they press a button inside it. So *reached this band, then used
   * something in it* as a pair answers zero on any deployment, and answered a
   * number here only because the fixture minted a press against the band. It is
   * `BAND_QUESTION` now, off that band's own row.
   */
  it("never asks a funnel about one band twice", () => {
    for (const question of FUNNEL_QUESTIONS) {
      expect(question.from).not.toBe(question.to)
    }
  })

  /** Each question's denominator is the bar for the band it names. */
  it.each(FUNNEL_QUESTIONS.map((question, index) => [index, question] as const))(
    "answers question %i against the bar for the band it names",
    (index, question) => {
      const readings = frontDoorReadings(page())
      const bar = readings.bands.find((band) => band.band === question.from)

      expect(bar).toBeDefined()
      expect(readings.funnels[index]?.reached).toBe(bar!.reached)
    }
  )

  it("answers both questions off the same visits the bars are drawn from", () => {
    const readings = frontDoorReadings(page())
    const bandNamed = (name: string) => readings.bands.find((band) => band.band === name)

    const [readOn] = readings.funnels

    expect(readOn?.reached).toBe(bandNamed("See it happen")?.reached)
    expect(readOn?.converted).toBe(bandNamed("Keep going")?.reached)
  })

  /**
   * The band question is **two columns of one row** and nothing else, which is
   * the property that makes it different from the funnel beside it on the page.
   * If it ever stopped agreeing with the table above it, the page would be
   * printing two numbers for one fact.
   */
  it("answers the band question off that band's own row and nowhere else", () => {
    const readings = frontDoorReadings(page())
    const row = readings.bands.find((band) => band.band === BAND_QUESTION)

    expect(row).toBeDefined()
    expect(readings.inOneBand).toEqual({
      band: row!.band,
      reached: row!.reached,
      engaged: row!.engaged,
    })
  })

  /**
   * A reader who used something in a band reached it first, so the second figure
   * can never exceed the first. Asserted because it is the pair the page prints
   * largest, and because `engaged` and `reached` come from different halves of
   * the rollup — one from ancestry, one from the band's own signals.
   */
  it("never reports more readers using a band than reaching it", () => {
    for (const band of frontDoorReadings(page()).bands) {
      expect(band.engaged).toBeLessThanOrEqual(band.reached)
    }
  })

  /**
   * At least one band has to have a number here, or the page prints a column of
   * zeroes and the whole argument about what a region can report is unevidenced.
   * It is the assertion that fails if `within` is ever dropped from the fixture.
   */
  it("reports at least one band a reader used something in", () => {
    expect(frontDoorReadings(page()).bands.some((band) => band.engaged > 0)).toBe(true)
  })
})

describe("a question's sentence", () => {
  const readings = frontDoorReadings(page())

  it.each(FUNNEL_QUESTIONS.map((question, index) => [question, index] as const))(
    "carries both numbers for %o",
    (question, index) => {
      const answer = readings.funnels[index]

      expect(answer).toBeDefined()
      const sentence = funnelSentence(question, answer!)

      expect(sentence).toContain(String(answer!.reached))
      expect(sentence).toContain(String(answer!.converted))
      expect(sentence).toContain(question.from)
      expect(sentence).toContain(question.to)
    }
  )

  it("carries both numbers and the band for the question a row answers", () => {
    const sentence = bandSentence(readings.inOneBand)

    expect(sentence).toContain(String(readings.inOneBand.reached))
    expect(sentence).toContain(String(readings.inOneBand.engaged))
    expect(sentence).toContain(readings.inOneBand.band)
  })

  /**
   * Never a rate, for either shape. It is the rule the portal's own screen was
   * built to — two of two and two hundred of two hundred are the same rate and
   * different news — and the smallest figure on this page as a percentage would
   * be the most confident-looking number on the site.
   */
  it.each(FUNNEL_QUESTIONS.map((question, index) => [index, question] as const))(
    "says nothing as a percentage for question %i",
    (index) => {
      const answer = readings.funnels[index]

      expect(funnelSentence(FUNNEL_QUESTIONS[index]!, answer!)).not.toContain("%")
    }
  )

  it("says nothing as a percentage for the question a row answers", () => {
    expect(bandSentence(readings.inOneBand)).not.toContain("%")
  })
})

/**
 * The half of this fixture that a browser has to agree with.
 *
 * Every assertion above is about arithmetic. These are about **shape**: whether
 * the batches this file mints are batches a real page could have sent. Until
 * 19 September they were not — a press was filed against the band, which is a
 * node no reader can aim at — and nothing caught it, because the arithmetic over
 * a wrong shape is perfectly consistent arithmetic.
 */
describe("what a press is filed against", () => {
  const bandIds = () => new Set(bandsOf(page()).map((band) => band.id))

  const delegated = () =>
    scriptedBatches(page()).flatMap((batch) =>
      batch.signals.filter(
        (signal): signal is Extract<typeof signal, { kind: "activated" | "disclosed" }> =>
          signal.kind === "activated" || signal.kind === "disclosed"
      )
    )

  it("is never a band, because a band is not a thing anybody can aim at", () => {
    const bands = bandIds()

    expect(delegated()).not.toHaveLength(0)
    for (const signal of delegated()) {
      expect(bands.has(signal.nodeId)).toBe(false)
    }
  })

  /**
   * Absent is *nobody walked* and empty is *nothing addressed above it*, and the
   * two produce different tallies: a fixture that omitted the field would report
   * every band as zero rather than as the region the press happened in.
   */
  it("always says which regions it happened inside", () => {
    for (const signal of delegated()) {
      expect(signal.within).toBeDefined()
      expect(signal.within!.length).toBeGreaterThan(0)
    }
  })

  /** Nearest first, ending at the page, with the band somewhere in between. */
  it("names a band and the page itself, in that order", () => {
    const bands = bandIds()
    const root = page().root.id

    for (const signal of delegated()) {
      const within = signal.within ?? []
      const band = within.findIndex((address) => bands.has(address.nodeId))
      const at = within.findIndex((address) => address.nodeId === root)

      expect(band).toBeGreaterThanOrEqual(0)
      expect(at).toBe(within.length - 1)
      expect(band).toBeLessThan(at)
    }
  })

  /**
   * The consequence, stated as the number the page stopped printing: a band's
   * own press and open counts are zero and always will be. It is asserted so
   * that a caption reaching for either again is a red test rather than a column
   * of zeroes on a live page.
   */
  it("leaves every band's own press and open count at zero", () => {
    const bands = bandIds()

    for (const tally of frontDoorReadings(page()).rollup.tallies) {
      if (!bands.has(tally.nodeId)) continue
      expect(tally.activations).toBe(0)
      expect(tally.opens).toBe(0)
    }
  })
})
