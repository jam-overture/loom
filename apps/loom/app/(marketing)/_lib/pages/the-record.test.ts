import type { LoomTree } from "@loom/runtime"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import {
  MAX_CHANGES,
  readChangeSequence,
  writeChangeSequence,
  type ChangeToken,
} from "../adapt/history"
import { RESERVED_VOCABULARY } from "../copy"
import { outlineDiff } from "../outline"
import { historyFor, pageTreeFor, renderTree, treeFor } from "../render"
import {
  DEFAULT_THEME,
  HOME,
  recordHref,
  SITE_THEME_NAMES,
  THE_RECORD,
  type SiteThemeName,
} from "../site"
import { uses, wordsOf } from "../words"

import { RECORD_BAND } from "./the-record"

/**
 * The record page, in every state a visitor can reach it in.
 *
 * A page whose shape is a function of its address has as many pages as the
 * address has meanings, and the interesting ones are not the empty one. So the
 * assertions below are made against a set of real histories — one per request,
 * a stacked run, a held change answered, an address nobody meant — rather than
 * against the page as it is first met.
 */

const ORIGIN = "https://loom.example"

/**
 * The states worth rendering, each named for what a visitor would have done.
 *
 * `proof.proof` is here because it was broken: two runs of one request drew the
 * same ids and the second was refused. It is the cheapest state to get wrong
 * again.
 */
const STATES: Readonly<Record<string, string>> = {
  "nothing asked for": "",
  "one change": "proof",
  "a held change": "problem",
  "a held change answered": "problem-yes",
  "a refused change": "drop-pitch",
  "the same request twice": "proof.proof",
  "a run of four": "calmer.proof.problem-yes.shorter",
  "an address nobody meant": "chartreuse.proof.nonsense",
  "more than it will follow": Array.from({ length: 12 }, () => "proof").join("."),
}

const tokensOf = (changes: string): readonly ChangeToken[] => readChangeSequence(changes)

/** An address as the markup carries it: `&` between parameters is an entity. */
const linkTo = (href: string): string => `href="${href.replaceAll("&", "&amp;")}"`

const pageFor = async (changes: string, theme: SiteThemeName = DEFAULT_THEME): Promise<LoomTree> =>
  pageTreeFor(THE_RECORD, { origin: ORIGIN, theme, changes: tokensOf(changes) })

const markupFor = async (changes: string, theme: SiteThemeName = DEFAULT_THEME): Promise<string> =>
  renderToStaticMarkup(renderTree(await pageFor(changes, theme)).element)

describe.each(Object.entries(STATES))("the record page, with %s", (_state, changes) => {
  it.each(SITE_THEME_NAMES)("renders in %s with nothing the runtime could not honour", async (theme) => {
    expect(renderTree(await pageFor(changes, theme)).diagnostics).toEqual([])
  })

  it("has exactly one first-level heading", async () => {
    expect([...(await markupFor(changes)).matchAll(/<h1\b/g)]).toHaveLength(1)
  })

  /**
   * Held to the front door's standard rather than the mechanism page's, and
   * deliberately: this page is one search result away from being somebody's
   * first sight of the product, and most of the words on it are assembled from
   * what the rules answered rather than written by hand. A run that made one of
   * those sentences technical would land it here without anyone editing a page.
   */
  it.each(RESERVED_VOCABULARY)("never says %s to someone who has just arrived", async (term) => {
    expect(uses(wordsOf((await pageFor(changes)).root), term)).toBe(false)
  })

  it("builds the same page twice, byte for byte", async () => {
    const once = await pageFor(changes)
    const twice = await pageFor(changes)

    expect(JSON.stringify(twice.root)).toBe(JSON.stringify(once.root))
  })

  it("names no colour of its own", async () => {
    const markup = await markupFor(changes)
    const body = markup.slice(markup.indexOf(">", markup.indexOf("<div")))

    expect(body).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(body).not.toMatch(/\b(rgba?|hsla?)\(/)
  })
})

describe("what the page prints about a run of changes", () => {
  const CHANGES = "calmer.proof.problem-yes.shorter"

  it("prints one entry per request, in the words the visitor used", async () => {
    const history = await historyFor({ origin: ORIGIN, theme: DEFAULT_THEME, changes: tokensOf(CHANGES) })
    const markup = await markupFor(CHANGES)

    if (history === undefined) throw new Error("loom: the run produced no history")

    for (const step of history.steps) {
      expect(markup).toContain(`Change ${step.position} of ${history.steps.length}`)
      expect(markup).toContain(step.record.verdictLabel)
    }

    expect(history.steps).toHaveLength(4)
  })

  /**
   * The sentences a visitor reads about a change are the ones the rules
   * produced, not a gloss written beside them. A page that printed its own
   * summary would be the one part of this site that cannot be checked.
   */
  it("prints what the rules answered rather than a summary of it", async () => {
    const history = await historyFor({ origin: ORIGIN, theme: DEFAULT_THEME, changes: tokensOf(CHANGES) })
    const markup = await markupFor(CHANGES)

    if (history === undefined) throw new Error("loom: the run produced no history")

    for (const step of history.steps) {
      expect(markup).toContain(step.record.measured)
      expect(markup).toContain(step.record.weighed)
      expect(markup).toContain(step.record.undo)
    }
  })

  it("shows the page as the run leaves it, band by band", async () => {
    const history = await historyFor({ origin: ORIGIN, theme: DEFAULT_THEME, changes: tokensOf(CHANGES) })
    const markup = await markupFor(CHANGES)

    if (history === undefined) throw new Error("loom: the run produced no history")

    for (const row of outlineDiff(history.start, history.page)) {
      expect(markup).toContain(row.name)
    }
  })

  it("counts the run in one line before the entries", async () => {
    expect(await markupFor(CHANGES)).toContain("4 requests, in order")
  })

  it("says nothing has happened when nothing has", async () => {
    const markup = await markupFor("")

    expect(markup).toContain("Nothing has been asked for yet.")
    expect(markup).not.toContain("Change 1 of")
  })
})

describe("the way through and the way back", () => {
  it("offers the most recent change back, as the same run without it", async () => {
    const markup = await markupFor("proof.shorter")

    expect(markup).toContain("Put this back")
    expect(markup).toContain(
      linkTo(recordHref(ORIGIN, { theme: DEFAULT_THEME, changes: "proof" }))
    )
  })

  /**
   * Only the most recent one. Taking a change out of the middle re-runs
   * everything after it against a page it never saw, which is a different
   * question from undoing it — and offering one button for both would be the
   * page's only dishonest sentence.
   */
  it("offers it once, however long the run", async () => {
    const markup = await markupFor("proof.calmer.shorter")

    expect(markup.split("Put this back")).toHaveLength(2)
  })

  it("offers nothing to put back when the rules refused the change", async () => {
    expect(await markupFor("drop-pitch")).not.toContain("Put this back")
  })

  it("offers the visitor the answer to a change the rules held", async () => {
    const markup = await markupFor("problem")

    expect(markup).toContain("I say yes — go ahead")
    expect(markup).toContain(
      linkTo(recordHref(ORIGIN, { theme: DEFAULT_THEME, changes: "problem-yes" }))
    )
  })

  it("stops asking once the visitor has answered", async () => {
    const markup = await markupFor("problem-yes")

    expect(markup).not.toContain("I say yes — go ahead")
    expect(markup).toContain("You said yes")
  })

  /**
   * A button whose only possible outcome is "nothing happened" wastes the one
   * click it gets, so the page offers what still has somewhere to go — worked
   * out against the changed page rather than listed.
   */
  it("offers only the requests that would still change something", async () => {
    const history = await historyFor({ origin: ORIGIN, theme: DEFAULT_THEME, changes: tokensOf("shorter") })
    const markup = await markupFor("shorter")

    if (history === undefined) throw new Error("loom: the run produced no history")

    expect(history.offered.map((ask) => ask.id)).not.toContain("shorter")
    for (const ask of history.offered) {
      expect(markup).toContain(
        linkTo(
          recordHref(ORIGIN, {
            theme: DEFAULT_THEME,
            changes: writeChangeSequence([...history.tokens, { ask: ask.id, approved: false }]),
          })
        )
      )
    }
  })

  it("stops taking requests once the run is as long as it says it follows", async () => {
    const full = Array.from({ length: MAX_CHANGES }, () => "proof").join(".")
    const markup = await markupFor(full)

    expect(markup).toContain(`This page follows ${MAX_CHANGES} changes at a time`)
    expect(markup).toContain(`Change ${MAX_CHANGES} of ${MAX_CHANGES}`)
    expect(markup).not.toContain(`Change ${MAX_CHANGES + 1} of`)
  })

  it("carries the visitor's palette through every request it offers", async () => {
    const markup = await markupFor("proof", "bold")

    expect(markup).toContain(linkTo(recordHref(ORIGIN, { theme: "bold", changes: "proof.calmer" })))
  })
})

/**
 * The workaround, held in place by an assertion rather than by a comment.
 *
 * `loom.card` sets `height: 100%`, so several cards as siblings in one band all
 * take the same height and the tallest is cut off by the card's own
 * `overflow: hidden` — 154px of the outline missing, measured. Each card
 * therefore sits in a column of its own, where 100% is its own height. A run
 * that tidied the wrappers away would get a page that renders, passes every
 * other test here, and loses the bottom of the list.
 */
describe("every card of the record band", () => {
  it("sits in a column of its own, because a column of cards clips the tallest", async () => {
    const page = await pageFor("proof.shorter")
    const band = page.root.children.find(
      (child) => child.kind === "element" && child.props["eyebrow"] === RECORD_BAND.history
    )

    if (band === undefined || band.kind !== "element") throw new Error("loom: the record band is gone")

    const cards = band.children.filter(
      (child) => child.kind === "element" && child.type === "loom.card"
    )
    const wrapped = band.children.filter(
      (child) =>
        child.kind === "element" &&
        child.type === "loom.stack" &&
        child.children.length === 1 &&
        child.children[0]?.kind === "element" &&
        child.children[0].type === "loom.card"
    )

    expect(cards).toEqual([])
    expect(wrapped).toHaveLength(3)
  })
})

describe("the record page and the page it reports on", () => {
  it("reports on the front door as it is published, not on itself", async () => {
    const history = await historyFor({ origin: ORIGIN, theme: DEFAULT_THEME, changes: tokensOf("proof") })
    const published = treeFor(HOME, { origin: ORIGIN, theme: DEFAULT_THEME })

    if (history === undefined) throw new Error("loom: the run produced no history")

    expect(JSON.stringify(history.start.root)).toBe(JSON.stringify(published.root))
  })

  /**
   * The page the record describes changes; the record page itself does not.
   * That is what keeps this surface free of the front door's two-pass problem —
   * there is nothing here whose own contents the rules would have to weigh.
   */
  it("does not change under the run it is describing", async () => {
    const empty = await pageFor("")
    const run = await pageFor("shorter")

    expect(empty.root.children).toHaveLength(run.root.children.length)
  })
})
