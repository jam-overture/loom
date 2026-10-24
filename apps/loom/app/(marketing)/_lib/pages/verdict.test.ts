import type { ElementNode, LoomNode, LoomTree, PrimitiveType } from "@jam-overture/loom"
import { describe, expect, it } from "vitest"

import { ASKS, type AskId } from "../adapt/asks"
import { BAND } from "../bands"
import { siteRegistry } from "../registry"
import { askRunFor, pageTreeFor } from "../render"
import { DEFAULT_THEME, HOW_IT_WORKS, type SiteThemeName } from "../site"
import type { PageContext } from "./home"

/**
 * How this page dresses an answer, held to the one rule a badge has to keep.
 *
 * ## The bug this was written against
 *
 * The record panel's badge was `record.landed ? "accent" : "outline"`. There are
 * five verdicts and `landed` is true for two of them, so *Waiting for you*,
 * *Refused* and *Nothing to do* came out as one chip — and that chip is also the
 * one the panel wears **before anybody has asked for anything**. Four of the six
 * things the panel can say were the same plain outline pill.
 *
 * The one that cost something is `refused`. Saying no, and saying which rule said
 * it, is the thing this product has that the others do not; it was dressed
 * exactly like *nothing has happened yet*.
 *
 * Measured on `/how-it-works?ask=shorter`, which is one request, one verdict and
 * one screen: the callout at the top of the page was the accent band, *Waiting
 * for you*, with a primary control in it, and the badge 3,260px below it was the
 * plain pill, *Waiting for you*, indistinguishable from the one that means
 * nothing was asked. Two controls on one screen, about one answer, disagreeing.
 *
 * ## What is asserted, and what is deliberately not
 *
 * The tones are read **off the built page** rather than off the table that
 * decides them. A test that imported `BADGE_TONE` and compared it to itself
 * would pass on any misspelling and on a badge that stopped being rendered at
 * all, which is the shape `Loom marketing` filed on 8 October.
 *
 * Nothing here asserts *which* tone a verdict wears. That is a design judgement
 * and it belongs in the file that makes it. What is held is the part that is not
 * a judgement: **two answers that mean different things to a reader must not look
 * the same**, and a page that has been asked nothing must not look like a page
 * that has been answered.
 */

const THEME: SiteThemeName = DEFAULT_THEME

const contextFor = (ask?: AskId, approve = false): PageContext => ({
  theme: THEME,
  ...(ask === undefined ? {} : { ask, approve }),
})

const elementsOf = (node: LoomNode): readonly ElementNode[] =>
  node.kind === "text"
    ? []
    : [...(node.kind === "element" ? [node] : []), ...node.children.flatMap(elementsOf)]

const bandOf = (page: LoomTree, eyebrow: string): ElementNode => {
  const band = elementsOf(page.root).find((element) => element.props["eyebrow"] === eyebrow)

  if (band === undefined) throw new Error(`loom: this page has no ${eyebrow} band`)

  return band
}

const textIn = (node: LoomNode): string =>
  node.kind === "text" ? node.value : node.children.map(textIn).join("")

/** The panel's headline chip: the first badge inside the band that demonstrates a change. */
const verdictChip = (page: LoomTree): Omit<Dressed, "landed"> => {
  const badge = elementsOf(bandOf(page, BAND.seeItHappen)).find(
    (element) => element.type === "loom.badge"
  )

  if (badge === undefined) throw new Error("loom: the see-it-happen band has no badge in it")

  /**
   * The node's own type travels with the chip so the rule below can ask the
   * registry about the primitive that is actually on the page, rather than about
   * a type name written out here. The two would be the same name today and the
   * written one would stop being true the day this band is composed differently.
   */
  return { type: badge.type, words: textIn(badge), props: badge.props }
}

/**
 * Every state a visitor can put this page into through its own address, and the
 * one state they arrive in.
 *
 * Built from `ASKS` rather than from a list, so a seventh choice is covered the
 * day it is offered rather than the day somebody remembers this file.
 */
const STATES: readonly (readonly [string, PageContext])[] = [
  ...ASKS.map((ask) => [ask.id, contextFor(ask.id)] as const),
  ...ASKS.map((ask) => [`${ask.id}, approved`, contextFor(ask.id, true)] as const),
]

/**
 * What the chip says, and the one fact about the change that is not a judgement
 * of this lane's: `landed`, written by `recordOf` out of the disposition the
 * rules returned.
 */
type Dressed = {
  /** The primitive the chip actually is, read off the node. */
  readonly type: PrimitiveType
  readonly words: string
  /**
   * Everything the chip's node carries, so the rule below can hand the registry
   * the props that are on the page rather than a pair synthesised here. A badge
   * that grew a second prop is then checked too, for free.
   */
  readonly props: ElementNode["props"]
  /** Absent for the page nobody has asked anything. */
  readonly landed?: boolean
}

/** The state a visitor arrives in, named once so a rule can exclude it by name. */
const UNASKED = "nothing asked"

/**
 * One run per state and not two.
 *
 * `askRunFor` hands back the page *and* the record it was built from, so asking
 * it is how both halves of a row are read. Calling `pageTreeFor` beside it would
 * run the whole sequence a second time for a value already in hand, which is the
 * waste `marketing-03` measured on this page on 13 October.
 */
const dressed = async (): Promise<ReadonlyMap<string, Dressed>> => {
  const untouched = await pageTreeFor(HOW_IT_WORKS, contextFor())

  const answered = await Promise.all(
    STATES.map(async ([name, context]) => {
      const run = await askRunFor(context)

      if (run === undefined) throw new Error(`loom: ${name} ran no request`)

      return [name, { ...verdictChip(run.page), landed: run.record.landed }] as const
    })
  )

  return new Map([[UNASKED, verdictChip(untouched)], ...answered])
}

describe("the chip the record panel wears", () => {
  it("is a treatment this deployment's badge actually registers", async () => {
    const chips = await dressed()

    expect(chips.size).toBeGreaterThan(1)

    for (const [state, chip] of chips) {
      const verdict = siteRegistry.validateProps(chip.type, chip.props)

      expect(verdict, `${state} wears ${String(chip.props["tone"])}`).toEqual({ outcome: "valid" })
    }
  })

  /**
   * The page these rules read is the page a visitor is served.
   *
   * They read `askRunFor`'s own tree, because it hands back the record beside it
   * and running the sequence twice to learn one boolean is the waste this page
   * was measured for on 13 October. That is only sound while `pageTreeFor`
   * serves what `askRunFor` produced, which it does today and which nothing else
   * here would notice stopping.
   */
  it("is the chip the route actually serves, and not one from a second build", async () => {
    const context = contextFor(ASKS[0]?.id)
    const run = await askRunFor(context)

    if (run === undefined) throw new Error("loom: the first choice ran no request")

    expect(verdictChip(await pageTreeFor(HOW_IT_WORKS, context))).toEqual(verdictChip(run.page))
  })

  /**
   * The live bug, as a rule.
   *
   * A reader who has asked for nothing and a reader whose rules refused them are
   * being told opposite things, and until today the chip was the same chip —
   * *Nothing yet*, *Waiting for you* and *Refused* were one plain outline pill
   * with a different word at the end of it. The words differ and the words are a
   * few characters inside a pill; what a reader takes from this band at a glance
   * is the pill.
   */
  it("never dresses an answered page the way it dresses one that was asked nothing", async () => {
    const chips = await dressed()
    const untouched = chips.get(UNASKED)

    if (untouched === undefined) throw new Error("loom: no chip for the unasked page")

    for (const [state, chip] of chips) {
      if (state === UNASKED) continue
      if (chip.words === untouched.words) continue

      expect(chip.props["tone"], `${state} says “${chip.words}” in the unasked page's own chip`).not.toBe(
        untouched.props["tone"]
      )
    }
  })

  /**
   * The other half, and the one that catches the next boolean.
   *
   * Whether the change landed is the fact this chip exists to report, and it is
   * written by the rules rather than by this route group. Two states that
   * disagree about it are opposite answers, so they may not look the same —
   * whichever way round a future predicate is written.
   *
   * It deliberately allows *Allowed* and *You said yes* to share a treatment.
   * They are different sentences about the same answer: the page changed. The
   * difference between them is who said so, which the words carry and the chip
   * is not being asked.
   */
  it("never dresses a change that landed like one that did not", async () => {
    const chips = [...(await dressed())].filter(([, chip]) => chip.landed !== undefined)

    expect(chips.length, "no state here carries a record").toBeGreaterThan(1)

    for (const [oneState, one] of chips) {
      for (const [otherState, other] of chips) {
        if (one.landed === other.landed) continue

        expect(
          one.props["tone"],
          `${oneState} and ${otherState} are dressed alike`
        ).not.toBe(other.props["tone"])
      }
    }
  })
})

/**
 * The two predicates this lane has, and the reason there are two.
 *
 * `toneFor` answers *can the visitor still act on this?* and is what the callout
 * at the top of an answered page wears — a held change gets the accent, because
 * that band is where the *I say yes, go ahead* control is. The panel's badge
 * answers *what did the rules do?*, and to that question a held change and a
 * landed one are opposite answers.
 *
 * They are therefore meant to disagree, on exactly one verdict. Written down as
 * a test because the two are four hundred lines apart in two files, they return
 * overlapping types, and the obvious tidy-up is to delete one of them.
 */
describe("the callout's predicate and the panel's", () => {
  it("disagree about a change the rules held, which is the point of having both", async () => {
    const held = ASKS.map((ask) => ask.id)

    const disagreements = await Promise.all(
      held.map(async (ask) => {
        const context = contextFor(ask)
        const page = await pageTreeFor(HOW_IT_WORKS, context)
        const callout = page.root.children.find(
          (child) => child.kind === "element" && child.type === "loom.callout"
        )

        if (callout === undefined || callout.kind !== "element") return undefined

        return {
          ask,
          words: String(callout.props["title"] ?? ""),
          callout: callout.props["tone"],
          panel: verdictChip(page).props["tone"],
        }
      })
    )

    const waiting = disagreements.filter(
      (entry) => entry !== undefined && entry.words === "Waiting for you"
    )

    expect(waiting.length, "no choice on this page is held, so this rule checks nothing").toBeGreaterThan(0)

    for (const entry of waiting) {
      expect(entry?.callout).toBe("accent")
      expect(entry?.panel).not.toBe(entry?.callout)
    }
  })

  /**
   * `toneFor` is the callout's and is exported for the share card. Nothing in the
   * panel may reach for it: it is the wrong question there, and the one time it
   * was reached for the two bands contradicted each other on screen.
   */
  it("agree wherever the question is the same, which is every change that landed", async () => {
    for (const ask of ASKS) {
      const page = await pageTreeFor(HOW_IT_WORKS, contextFor(ask.id, true))
      const callout = page.root.children.find(
        (child) => child.kind === "element" && child.type === "loom.callout"
      )

      if (callout === undefined || callout.kind !== "element") continue
      if (String(callout.props["title"] ?? "") === "Refused") continue

      expect(verdictChip(page).props["tone"], `${ask.id} landed`).toBe("accent")
    }
  })
})
