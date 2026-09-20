import { READER_SIGNAL_KINDS } from "@loom/runtime/signals"
import { describe, expect, it } from "vitest"

import { RESERVED_VOCABULARY } from "../copy"
import {
  bandSentence,
  frontDoorReadings,
  FUNNEL_QUESTIONS,
  funnelSentence,
} from "../readers/visits"
import { treeFor } from "../render"
import {
  DEFAULT_THEME,
  HOME,
  PUTTING_IT_BACK,
  SITE_ROUTES,
  WHAT_CAN_HAPPEN,
  WHAT_READERS_DO,
  WHAT_YOU_RUN,
  WHO_CAN_ASK,
  YOUR_COMPONENTS,
} from "../site"
import { uses, wordsOf } from "../words"

import { homePageTree } from "./home"
import { PLAINLY } from "./what-readers-do"

/**
 * The page about what readers do, held to the arithmetic rather than to itself.
 *
 * Every figure on this page comes out of `rollUp` while the page is being built,
 * and the way that claim would stop being true is somebody pasting today's
 * numbers into the copy to settle a failing test. So the assertions run the
 * arithmetic themselves and go looking for its answers in the rendered words —
 * never the other way round, which is the discipline `your-components.test.ts`
 * records for its specimen band.
 */

const ORIGIN = "https://loom.example"

const tree = () => treeFor(WHAT_READERS_DO, { origin: ORIGIN, theme: DEFAULT_THEME })
const words = () => wordsOf(tree().root)
const readings = () => frontDoorReadings(homePageTree({ origin: ORIGIN, theme: DEFAULT_THEME }))

describe("the page about what readers do", () => {
  it("is a page of this site with a builder and a place in the map", () => {
    expect(SITE_ROUTES).toContain(WHAT_READERS_DO)
    expect(() => tree()).not.toThrow()
  })

  /**
   * Widened a fourth time, never relaxed, on the reasoning the same assertion
   * carries in three other files: the bar cannot group (the 12 September
   * finding), so a tenth page cannot go on it without taking another off, and
   * everything left out is in the footer's map marked as the page the reader is
   * on. Still an exact list, so a seventh still fails here and still has to be
   * argued for.
   */
  it("is kept off the bar deliberately, and is one of the seven pages that are", () => {
    expect(WHAT_READERS_DO.inMenu).toBe(false)
    expect(SITE_ROUTES.filter((route) => !route.inMenu)).toEqual([
      HOME,
      WHO_CAN_ASK,
      PUTTING_IT_BACK,
      WHAT_READERS_DO,
      WHAT_CAN_HAPPEN,
      WHAT_YOU_RUN,
      YOUR_COMPONENTS,
    ])
  })

  /**
   * Held to the **front door's** standard rather than a mechanism page's, and
   * that is a claim about this page rather than a rule it inherited.
   *
   * It is the page where our vocabulary would be easiest to reach for — a
   * signal, a node, a revision, a tally — and a visitor arriving from a search
   * for *which parts of my page do people read* has no more context than one
   * arriving at `/`. So none of it is used anywhere on the page, not merely kept
   * out of the opening band, and the words are *band*, *reader* and *version*.
   */
  it.each(RESERVED_VOCABULARY)("never says %s, anywhere on the page", (term) => {
    expect(uses(words(), term)).toBe(false)
  })

  it("answers the question the other nine pages all start after", () => {
    const text = words().toLowerCase()

    expect(text).toContain("which parts of your page do people ever reach")
    expect(text).toContain("the numbers do not change your page. you do.")
  })
})

describe("the four kinds", () => {
  it("has plain words for every kind the vocabulary has, and for nothing else", () => {
    expect(Object.keys(PLAINLY).sort()).toEqual([...READER_SIGNAL_KINDS].sort())
  })

  it("puts one tile on the page for each, in the reader's words", () => {
    const text = words()

    for (const kind of READER_SIGNAL_KINDS) {
      const plainly = PLAINLY[kind]

      expect(text).toContain(plainly.title)
      expect(text).toContain(plainly.body)
    }
  })

  /**
   * The band's own claim is *this is the whole list*, which is only true for as
   * long as the tiles are the vocabulary rather than four tiles somebody wrote.
   */
  it("says there is no fifth, and counts the list rather than claiming a number", () => {
    expect(READER_SIGNAL_KINDS).toHaveLength(4)
    expect(words()).toContain("Four things, and there is no fifth")
  })
})

describe("the bars", () => {
  it("prints every band the readings mention, with the reader's own name for it", () => {
    const text = words()

    for (const band of readings().bands) expect(text).toContain(band.band)
  })

  /**
   * The assertion that would fail if a figure were ever typed. It computes the
   * readout the arithmetic produces and requires the page to contain that exact
   * string, so a hand-edited number is a red test naming the band.
   */
  it("prints the figure the arithmetic produced, with its denominator", () => {
    const text = words()

    for (const band of readings().bands) {
      expect(text).toContain(`${band.reached} of ${band.views}`)
    }
  })

  it("says how long each band was on screen, in the same words for each", () => {
    const text = words()

    for (const band of readings().bands) {
      expect(text).toContain(`${band.seconds} seconds on screen in total`)
    }
  })

  /**
   * A band's line says how many readers used something under it, and that is the
   * figure `engaged` carries. It used to be the band's own press count, which is
   * a number no deployment produces.
   */
  it("says how many readers used something in a band, from the band's own row", () => {
    const text = words()
    const used = readings().bands.filter((band) => band.engaged > 0)

    expect(used).not.toHaveLength(0)
    for (const band of used) {
      expect(text).toContain(`${band.engaged} used something in it`)
    }
  })

  /**
   * The split that had to go, asserted as an absence.
   *
   * *N opened something* was a band's own `opens`, and a band's `opens` is zero
   * on every real deployment — so a page printing it was printing a number only
   * this fixture could produce. A caption reaching for the split again is a red
   * test here rather than a column of zeroes on a live page.
   */
  it("never splits a band's line into presses and opens", () => {
    expect(words()).not.toContain("opened something,")
    expect(words()).not.toContain("opened something.")
  })

  it("says the visits are made up and this deployment counts nobody", () => {
    const text = words().toLowerCase()

    expect(text).toContain("the visits are made up")
    expect(text).toContain("counting is off unless you turn it on")
  })

  /**
   * The same page on a deployment that *is* counting, which is the state the
   * copy above stopped being true of on 17 September.
   *
   * Both sentences are asserted rather than one, because the pair is the
   * promise: a reader is told they are being counted **and** told the bars are
   * still a fixture, and a page that swapped one and forgot the other would be
   * the most misleading of the four possible pages.
   */
  it("tells a reader being counted that they are, and that the bars still are not them", () => {
    const counting = wordsOf(
      treeFor(WHAT_READERS_DO, { origin: ORIGIN, theme: DEFAULT_THEME, counting: true }).root
    ).toLowerCase()

    expect(counting).toContain("counting is on here")
    expect(counting).toContain("your own visit is being counted")
    expect(counting).not.toContain("this deployment counts nobody")
    expect(counting).not.toContain("counting is off")
  })

  /**
   * Not one figure on this page is a rate, and the band that shows a funnel is
   * the reason the check is worth having rather than obvious: *one of two* is
   * fifty per cent, and fifty per cent is the number a page selling this would
   * print.
   */
  it("shows no percentage anywhere", () => {
    expect(words()).not.toContain("%")
    expect(words().toLowerCase()).not.toContain("per cent of")
  })
})

describe("the funnel", () => {
  it("prints the answer to each question this page asks", () => {
    const text = words()
    const answers = readings().funnels

    expect(answers).toHaveLength(FUNNEL_QUESTIONS.length)

    for (const [index, question] of FUNNEL_QUESTIONS.entries()) {
      const answer = answers[index]

      expect(answer).toBeDefined()
      expect(text).toContain(`${answer!.converted} of ${answer!.reached}`)
      expect(text).toContain(funnelSentence(question, answer!))
    }
  })

  /**
   * The second shape, which is the one that needs nothing arranged in advance.
   * It is printed beside the funnel rather than instead of it, because the whole
   * point of the band is that the two are different: one is a column of a row
   * anybody already has, and the other had to be asked for before the readers
   * arrived.
   */
  it("prints the question a band answers about itself, beside the funnel", () => {
    const text = words()
    const answer = readings().inOneBand

    expect(text).toContain(`${answer.engaged} of ${answer.reached}`)
    expect(text).toContain(bandSentence(answer))
  })

  it("says which of the two had to be asked for before anybody arrived", () => {
    const text = words().toLowerCase()

    expect(text).toContain("had to be asked for in advance")
    expect(text).toContain("before anybody arrived")
  })

  /**
   * The key is the most privacy-sensitive thing in the design, so the band that
   * shows what it buys has to be the band that says what it is. Each clause is
   * a separate assertion because the one that would quietly go missing in a
   * re-word is *not stored*, and it is the one a reader is actually asking
   * about.
   */
  it.each([
    "it is not a cookie",
    "it is not stored there",
    "it does not survive a reload",
    "never derived from anything about the reader",
  ])("says that the joining up %s", (clause) => {
    expect(words().toLowerCase()).toContain(clause)
  })
})

describe("what it never knows", () => {
  it.each([
    "no name, no account and no visitor number",
    "nothing about the device",
    "nothing that joins what somebody did here to what they did on another page",
    "no recording of the visit",
    "nothing anybody typed",
  ])("refuses %s", (clause) => {
    expect(words().toLowerCase()).toContain(clause)
  })

  /**
   * The distinction the whole band rests on: these are absences in what is
   * recorded rather than switches somebody turned off, and a page that offered
   * them as settings would be making a much weaker promise.
   */
  it("says none of them is a setting", () => {
    expect(words().toLowerCase()).toContain("none of these is a setting you switch off")
  })

  /**
   * The claim this page may not make, asserted as an absence.
   *
   * Turning a number into a request is out of scope in the approved plan, and it
   * is the claim a competitor's page would make in this exact position. If it
   * ever becomes true it will be a decision record, and this test is where the
   * copy will be told it may change.
   */
  it("never says the page changes itself from what readers did", () => {
    const text = words().toLowerCase()

    expect(text).toContain("nothing here turns a low bar into a change")
    expect(text).not.toContain("automatically")
  })
})
