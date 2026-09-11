import type { ElementNode, LoomNode } from "@loom/runtime"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { ASKS, askById, type AskId } from "../adapt/asks"
import { DEFAULT_SHOWN, REFUSED } from "../adapt/paper-trail"
import { ordinal, spell, spellCapitalised, STEPS } from "../journey"
import { pageTreeFor, renderTree, trailFor } from "../render"
import { DEFAULT_THEME, HOME, HOW_IT_WORKS, mechanismHref } from "../site"
import { wordsOf } from "../words"
import { PANEL_STEPS } from "./see-it-happen"

/**
 * The record on the mechanism page is a record of the thing that just happened
 * to the reader.
 *
 * The front door has let a visitor rearrange it since 22 August, and the
 * mechanism page has printed the raw lines the machinery wrote since it was
 * built. Both were true. What nobody had checked is what happens when somebody
 * uses the first and then follows a link to the second, and the answer was that
 * they were shown **the record of a different request** — the one chosen when
 * that page was written, whoever had arrived and whatever they had just done.
 *
 * The two claims a stranger has to believe are that the record is real and that
 * it is of the thing that just happened to them. The first is checked six ways
 * in `paper-trail.test.ts`. The second is what this file is for, and it was
 * quietly false at the one moment it could be checked.
 *
 * **Everything here is asserted against a built page** rather than against the
 * modules that build one. A test that read `paperTrailFor`'s answer and compared
 * it with itself would pass however either page was written, and passing however
 * the page was written is exactly what the old arrangement did for eight runs.
 */

const ORIGIN = "https://loom.example"

type Address = { readonly ask?: AskId; readonly approve?: boolean }

const context = (address: Address) => ({
  origin: ORIGIN,
  theme: DEFAULT_THEME,
  ...(address.ask === undefined ? {} : { ask: address.ask }),
  ...(address.approve === undefined ? {} : { approve: address.approve }),
})

const treeOf = async (route: typeof HOME, address: Address = {}): Promise<LoomNode> =>
  (await pageTreeFor(route, context(address))).root

const markupOf = async (route: typeof HOME, address: Address = {}): Promise<string> =>
  renderToStaticMarkup(
    renderTree(await pageTreeFor(route, context(address))).element
  ).replaceAll("&#x27;", "'")

const elementsOf = (node: LoomNode): readonly ElementNode[] =>
  node.kind === "text"
    ? []
    : [...(node.kind === "element" ? [node] : []), ...node.children.flatMap(elementsOf)]

const bandsOf = (node: LoomNode): readonly ElementNode[] =>
  elementsOf(node).filter((element) => element.type === "loom.section")

const eyebrowsOf = (node: LoomNode): readonly string[] =>
  bandsOf(node).flatMap((band) =>
    typeof band.props["eyebrow"] === "string" ? [band.props["eyebrow"]] : []
  )

/** Every `href` the page holds, which is the only handle a link really has. */
const linksOf = (node: LoomNode): readonly string[] =>
  elementsOf(node).flatMap((element) =>
    typeof element.props["href"] === "string" ? [element.props["href"]] : []
  )

const utteranceOf = (ask: AskId): string => {
  const found = askById(ask)

  if (found === undefined) throw new Error(`loom: no ask called ${ask}`)

  return found.utterance
}

const CONTRAST_BAND = "And when the answer is no"

describe("the record the mechanism page prints", () => {
  /**
   * The defect itself, on every choice the band offers.
   *
   * The request is checked inside the printed JSON rather than only in the
   * page's prose, because the prose is ours and the JSON is the runtime's. A
   * page that said the right thing above a record of something else would be the
   * original defect wearing a fix.
   */
  it.each(ASKS.map((ask) => ask.id))("is the record of %s when the address says so", async (ask) => {
    const markup = await markupOf(HOW_IT_WORKS, { ask })

    expect(markup).toContain(utteranceOf(ask))

    for (const other of ASKS.filter((entry) => entry.id !== ask)) {
      expect(markup).not.toContain(other.utterance)
    }
  })

  /**
   * The page every crawler, every share preview and every stranger is served.
   *
   * It is worth a test of its own precisely because it is the state nobody
   * arrives at deliberately: a change that made the mechanism page a function of
   * its address could have quietly changed what the address without one means.
   */
  it("is the default record when the address asks for nothing", async () => {
    const markup = await markupOf(HOW_IT_WORKS)

    expect(markup).toContain(utteranceOf(DEFAULT_SHOWN))
  })

  /**
   * An address nobody could have meant is a page, not an error — the same rule
   * the front door has always followed. `readAskId` is what discards the value,
   * so what is checked here is the page it produces rather than the reader.
   */
  it("is the default record when the address names a request that does not exist", async () => {
    const trail = await trailFor({ origin: ORIGIN, theme: DEFAULT_THEME })

    expect(trail.ask).toBe(DEFAULT_SHOWN)
    expect(trail.asked).toBe(utteranceOf(DEFAULT_SHOWN))
  })
})

describe("who the page thinks it is talking to", () => {
  /**
   * The one stage title that is about a person, held against the front door's
   * own wording for the same line rather than against a string typed twice. The
   * page a visitor arrives from and the page they arrive at have to agree about
   * who they are.
   */
  it("uses the front door's own words for the reader who arrived from it", async () => {
    const markup = await markupOf(HOW_IT_WORKS, { ask: "proof" })
    const first = PANEL_STEPS[0]?.title

    expect(first).toBeDefined()
    expect(markup).toContain(first as string)
    expect(markup).not.toContain("Somebody asked for something")
  })

  it("says somebody asked when nobody in particular did", async () => {
    const markup = await markupOf(HOW_IT_WORKS)

    expect(markup).toContain("Somebody asked for something")
    expect(markup).toContain("A moment ago somebody asked")
    expect(markup).not.toContain("You have just asked")
  })

  it("addresses the reader who made the request it is printing", async () => {
    const markup = await markupOf(HOW_IT_WORKS, { ask: "shorter" })

    expect(markup).toContain("You have just asked")
    expect(markup).not.toContain("A moment ago somebody asked")
  })
})

describe("how long the record is, as the page printing it says", () => {
  /**
   * Three shapes, three sentences, and the numbers in each counted off the run
   * the page is holding while it speaks. The three runs are chosen because they
   * are the three answers the rules can give rather than to cover branches: a
   * change that landed, a change that was held, and a change that was held and
   * then allowed by the visitor.
   */
  it("counts a run that landed, and names the extra line", async () => {
    const trail = await trailFor(context({ ask: "proof" }))
    const markup = await markupOf(HOW_IT_WORKS, { ask: "proof" })

    expect(trail.landed).toBe(true)
    expect(markup).toContain(
      `${spellCapitalised(trail.lines.length)} lines for the ${STEPS} steps above. The extra one is the rules themselves`
    )
  })

  it("counts a run that stopped at the answer, and says there is no line after it", async () => {
    const trail = await trailFor(context({ ask: "problem" }))
    const markup = await markupOf(HOW_IT_WORKS, { ask: "problem" })

    expect(trail.landed).toBe(false)
    expect(markup).toContain(
      `${spellCapitalised(trail.lines.length)} lines for the ${STEPS} steps above, and no ${ordinal(
        trail.lines.length + 1
      )}`
    )
    expect(markup).not.toContain("The extra one is the rules themselves")
  })

  /**
   * The strongest state on the site, and the one that would have been described
   * most wrongly: a change the rules held and the visitor then allowed is put to
   * the rules a **second** time, and the whole second pass is in the record. The
   * old sentence would have called that six lines and named one extra.
   */
  it("counts a change put to the rules twice, and says why it was", async () => {
    const trail = await trailFor(context({ ask: "problem", approve: true }))
    const markup = await markupOf(HOW_IT_WORKS, { ask: "problem", approve: true })
    const held = await trailFor(context({ ask: "problem" }))

    expect(trail.landed).toBe(true)
    expect(trail.lines.length).toBeGreaterThan(held.lines.length)
    expect(markup).toContain(
      `${spellCapitalised(trail.lines.length)} lines for the ${STEPS} steps above, because this change went through them twice: ${spell(
        held.lines.length
      )} for the request your rules held, and ${spell(
        trail.lines.length - held.lines.length
      )} more for the same change put again after you said yes.`
    )
  })

  /**
   * The negative half, and it is deliberately wider than any one answer: a page
   * that stated a length it is not printing would pass a test that only looked
   * for the right number, because both sentences could stand at once. This
   * searches every English count the page could be caught saying and requires
   * every one of them absent except the one the run actually is.
   */
  it.each(ASKS.map((ask) => ask.id))(
    "states no length for %s but the one it printed",
    async (ask) => {
      const trail = await trailFor(context({ ask }))
      const markup = await markupOf(HOW_IT_WORKS, { ask })
      const right = spellCapitalised(trail.lines.length)

      for (const wrong of ["Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"]) {
        if (wrong === right) continue

        expect(markup).not.toContain(`${wrong} lines`)
      }

      expect(markup).toContain(`${right} lines`)
    }
  )
})

describe("the refusal beside the record", () => {
  /**
   * The three positions the contrast band states are positions in the **refused**
   * run. They were read off the run printed above it, which gave the right three
   * numbers for as long as that run could only ever be six lines long — so this
   * asks for a page whose two runs are different lengths and holds them anyway.
   */
  it("counts the refused run rather than whatever is printed above it", async () => {
    const trail = await trailFor(context({ ask: "problem", approve: true }))
    const markup = await markupOf(HOW_IT_WORKS, { ask: "problem", approve: true })
    const matching = trail.refusedLines - 1

    expect(trail.lines.length).not.toBe(trail.refusedLines)
    expect(markup).toContain(`The same ${spell(matching)} kinds of line, and then a different answer`)
    expect(markup).toContain(`and then this, its ${ordinal(trail.refusedLines)}`)
    expect(markup).toContain(`There is no ${ordinal(trail.refusedLines + 1)}`)
  })

  /**
   * Printing the site's one refusal beside a record that *is* that refusal would
   * put the same answer on the page twice, the second time captioned as though
   * it were a different one. That is a page losing track of what it just said,
   * and it is only ever visible to a reader who followed the link.
   */
  it("is not printed when the visitor asked for the refused change themselves", async () => {
    const page = await treeOf(HOW_IT_WORKS, { ask: REFUSED })

    expect(eyebrowsOf(page)).not.toContain(CONTRAST_BAND)
  })

  it.each(ASKS.filter((ask) => ask.id !== REFUSED).map((ask) => ask.id))(
    "is printed beside the record of %s",
    async (ask) => {
      expect(eyebrowsOf(await treeOf(HOW_IT_WORKS, { ask }))).toContain(CONTRAST_BAND)
    }
  )

  it("is printed on the page a stranger arrives at", async () => {
    expect(eyebrowsOf(await treeOf(HOW_IT_WORKS))).toContain(CONTRAST_BAND)
  })
})

describe("the way down, from the front door's panel", () => {
  /**
   * The link is checked as an address the site could be *reached* at rather than
   * as a string: it is built here the way the panel builds it and then followed,
   * and what comes back has to be the record of the same request. A link that
   * pointed at the right page with the wrong request in it would satisfy any
   * test that only looked at the front door.
   */
  it.each(ASKS.map((ask) => ask.id))("carries %s through to the record of it", async (ask) => {
    const front = await treeOf(HOME, { ask })
    const expected = mechanismHref(ORIGIN, { theme: DEFAULT_THEME, ask })

    expect(linksOf(front)).toContain(expected)

    const arrived = await markupOf(HOW_IT_WORKS, { ask })

    expect(arrived).toContain(utteranceOf(ask))
  })

  /**
   * The approval travels because the record does. A change the rules held and
   * the visitor then allowed has lines the held one does not, so a link that
   * dropped it would open a page whose record is shorter than the panel the
   * visitor followed it from.
   */
  it("carries the visitor's approval, because the record is longer with it", async () => {
    const front = await treeOf(HOME, { ask: "problem", approve: true })

    expect(linksOf(front)).toContain(
      mechanismHref(ORIGIN, { theme: DEFAULT_THEME, ask: "problem", approve: true })
    )
  })

  /**
   * The panel is the one place this link belongs. A visitor who has not asked
   * for anything has no record to go and read, so offering them the raw one is
   * an invitation to a page about a request they never made — which is the
   * defect this run is fixing, in the other direction.
   */
  it("is not offered before the visitor has asked for anything", async () => {
    const arrival = await treeOf(HOME)

    expect(wordsOf(arrival)).not.toContain("See every line the machinery wrote")
  })

  it("is offered once the visitor has", async () => {
    const asked = await treeOf(HOME, { ask: "calmer" })

    expect(wordsOf(asked).split("See every line the machinery wrote").length - 1).toBe(1)
  })
})
