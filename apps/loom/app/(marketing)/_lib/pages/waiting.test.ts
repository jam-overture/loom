import type { ElementNode, LoomNode, LoomTree } from "@jam-overture/loom"
import { describe, expect, it } from "vitest"

import { BAND } from "../bands"
import { pageTreeFor, treeFor } from "../render"
import { DEFAULT_THEME, HOME, HOW_IT_WORKS, type SiteThemeName } from "../site"
import { wordsOf } from "../words"
import { ASKS } from "../adapt/asks"
import { PANEL_STEPS } from "./see-it-happen"

/**
 * The panel before anybody has asked it for anything.
 *
 * This is the one state of the site's most important band that **every** visitor
 * meets — and, because the front door is what a crawler and a share preview
 * fetch, the only state most of them will ever see. It used to be a heading and
 * a sentence in a card sized for five steps of prose; it is now the record's own
 * shape with every rung unlit.
 *
 * Two things have to be true of that and neither was checked before, because
 * before this run there was nothing to check: **the shape a visitor is shown is
 * the shape they get**, and **showing it claims nothing**. The first is what
 * makes the panel a promise rather than a picture; the second is what keeps a
 * page that has done nothing from looking like a page that has done something.
 */

const ORIGIN = "https://loom.example"
const THEME: SiteThemeName = DEFAULT_THEME

const elementsOf = (node: LoomNode): readonly ElementNode[] =>
  node.kind === "text"
    ? []
    : [...(node.kind === "element" ? [node] : []), ...node.children.flatMap(elementsOf)]

const arrival = (): LoomTree => treeFor(HOME, { origin: ORIGIN, theme: THEME })

/**
 * The band, found by its eyebrow rather than by position — the same handle the
 * visitor's own requests use to find it, and the only one on the page that is
 * stable, visible and unique.
 */
const bandOf = (page: LoomTree): ElementNode => {
  const band = elementsOf(page.root).find((element) => element.props["eyebrow"] === BAND.seeItHappen)

  if (band === undefined) throw new Error("loom: the front door has no see-it-happen band")

  return band
}

const stepsIn = (node: LoomNode): readonly ElementNode[] =>
  elementsOf(node).filter((element) => element.type === "loom.milestone")

describe("the panel before the visitor has asked for anything", () => {
  it("shows the record's five rungs rather than an empty box", () => {
    expect(stepsIn(bandOf(arrival())).length).toBe(PANEL_STEPS.length)
  })

  /**
   * The morph, held through both *rendered* trees rather than against
   * `PANEL_STEPS`. A test that read the table for both sides would pass however
   * either panel was built, which is the failure it exists to catch: the point
   * is not that a table exists, it is that both panels are made from it.
   */
  it.each(ASKS.map((ask) => ask.id))(
    "names the same steps, in the same order, as the panel %s fills in",
    async (ask) => {
      const asked = await pageTreeFor(HOME, { origin: ORIGIN, theme: THEME, ask })

      expect(stepsIn(bandOf(arrival())).map((step) => step.props["title"])).toEqual(
        stepsIn(bandOf(asked)).map((step) => step.props["title"])
      )
    }
  )

  /**
   * Nothing has happened, so nothing may read as having happened. A `done` rung
   * renders a filled dot and is announced silently; `planned` renders hollow and
   * carries its own accessible name, which is the whole difference between a
   * panel that is waiting and one that is reporting.
   */
  it("leaves every rung unlit and empty", () => {
    const rungs = stepsIn(bandOf(arrival()))

    expect(rungs.map((step) => ({ state: step.props["state"], body: step.props["body"] }))).toEqual(
      rungs.map(() => ({ state: "planned", body: undefined }))
    )
  })

  /**
   * The accent is a claim, and 26 August settled which one: a band wears it if
   * and only if it hands the visitor something to do. A waiting panel hands them
   * nothing, so its badge is the outline — which also keeps it from reading as a
   * verdict beside the four accented ones the same badge wears once there is a
   * record.
   */
  it("wears no accent, because it is not offering the visitor a decision", () => {
    const badges = elementsOf(bandOf(arrival())).filter(
      (element) => element.type === "loom.badge"
    )

    expect(badges.length).toBe(1)
    expect(badges[0]?.props["tone"]).toBe("outline")
  })

  /**
   * The five steps are written down once.
   *
   * They used to be written twice in this file — as the rungs, and as a sentence
   * promising *what you asked for, what the change turned out to be, how much of
   * the page it moved, which of your rules allowed it, and what putting it back
   * would restore*. Two hand-written copies of one list is a list that drifts,
   * and the copy that would have drifted is the one a visitor reads before there
   * is anything to check it against.
   *
   * So each title appears in the band exactly once. A future run that reaches
   * for a prose recital of the sequence finds this rather than a reviewer.
   *
   * `wordsOf` is the site's own, imported rather than written again here. The
   * first draft of this file had a local copy that read `node.text` where the
   * runtime holds `node.value`, so it walked the band and collected nothing —
   * and passed, silently, against a mutation that put the whole recital back.
   * That module's own comment says why it exists; this is the second time it
   * has been right.
   */
  it.each(PANEL_STEPS.map((step) => step.title))("says %s once and nowhere else", (title) => {
    const words = wordsOf(bandOf(arrival()))

    expect(words.split(title).length - 1).toBe(1)
  })

  /**
   * The count the mechanism page keeps. `adapt.test.ts` holds the *filled* panel
   * against that page; this holds the waiting one, so a sixth step taught on
   * `/how-it-works` cannot be missing from the state every visitor sees first.
   */
  it("names as many steps as the mechanism page teaches", () => {
    const mechanism = treeFor(HOW_IT_WORKS, { origin: ORIGIN, theme: THEME })

    expect(stepsIn(bandOf(arrival())).length).toBe(stepsIn(mechanism.root).length)
  })
})
