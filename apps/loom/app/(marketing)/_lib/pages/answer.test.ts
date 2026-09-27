import type { ElementNode, LoomNode, LoomTree } from "@jam-overture/loom"
import { describe, expect, it } from "vitest"

import { ASKS, type AskId } from "../adapt/asks"
import { askRunFor, treeFor } from "../render"
import { askHref, DEFAULT_THEME, HOME, HOW_IT_WORKS, type SiteThemeName } from "../site"
import { wordsOf } from "../words"
import type { PageContext } from "./home"

/**
 * The answer a visitor lands on.
 *
 * The band that demonstrates a change has worked since 22 August, and until this
 * run a visitor could not see it work: a choice is an ordinary link, the browser
 * puts the reader at the top of the document, and the top of the document is an
 * opening band 880px tall that is identical in every state. The assertions here
 * are the ones that keep the fix true — that the answer is above the opening
 * band, that every word of it is the record's rather than this file's, and that
 * a stranger who has asked for nothing still meets the page they always met.
 */

const ORIGIN = "https://loom.example"
const THEME: SiteThemeName = DEFAULT_THEME

const contextFor = (ask?: AskId, approve = false): PageContext => ({
  origin: ORIGIN,
  theme: THEME,
  ...(ask === undefined ? {} : { ask, approve }),
})

/** Every state the front door can be in once someone has pressed something. */
const ANSWERED: readonly (readonly [string, PageContext])[] = [
  ...ASKS.map((ask) => [ask.id, contextFor(ask.id)] as const),
  ...ASKS.map((ask) => [`${ask.id}, approved`, contextFor(ask.id, true)] as const),
]

const elementsOf = (node: LoomNode): readonly ElementNode[] =>
  node.kind === "text"
    ? []
    : [...(node.kind === "element" ? [node] : []), ...node.children.flatMap(elementsOf)]

/**
 * The band, found by type among the page's own children.
 *
 * Among the *root's* children rather than anywhere in the tree, because where it
 * sits is half of what it is for: a notice nested inside a section further down
 * would satisfy a search of the whole tree and answer nobody.
 */
const answerOf = (page: LoomTree): ElementNode | undefined => {
  const found = page.root.children.find(
    (child) => child.kind === "element" && child.type === "loom.callout"
  )

  return found !== undefined && found.kind === "element" ? found : undefined
}

const indexOfType = (page: LoomTree, type: string): number =>
  page.root.children.findIndex((child) => child.kind === "element" && child.type === type)

/** The page as the route serves it, which is the only page a visitor ever sees. */
const servedPage = async (context: PageContext): Promise<LoomTree> => {
  const run = await askRunFor(context)

  return run === undefined ? treeFor(HOME, context) : run.page
}

const actionsOf = (band: ElementNode): readonly ElementNode[] =>
  elementsOf(band).filter((element) => element.type === "loom.action")

const hrefOf = (action: ElementNode): string => {
  const href = action.props["href"]

  if (typeof href !== "string") throw new Error("loom: an action on the answer band has no address")

  return href
}

describe("the page a stranger arrives at", () => {
  it("carries no answer band, because nothing has been asked", () => {
    expect(answerOf(treeFor(HOME, contextFor()))).toBeUndefined()
  })

  /**
   * The arrival page is the most-read tree this project has and the band is
   * spread into it conditionally, so the thing worth asserting is not that the
   * band is absent but that **nothing else moved to make room for it**. An empty
   * spread that quietly reordered the opening band would pass the check above.
   */
  it("opens on the menu and the opening band, in that order and with nothing between", () => {
    const page = treeFor(HOME, contextFor())

    expect(indexOfType(page, "loom.nav")).toBe(0)
    expect(indexOfType(page, "loom.hero")).toBe(1)
  })
})

describe.each(ANSWERED)("%s", (_name, context) => {
  it("answers above the opening band, where the browser leaves the reader", async () => {
    const page = await servedPage(context)
    const band = answerOf(page)

    expect(band).toBeDefined()
    expect(page.root.children.indexOf(band as LoomNode)).toBeLessThan(
      indexOfType(page, "loom.hero")
    )
  })

  /**
   * Every word held against the record rather than against expected copy.
   *
   * This is the assertion the band exists to earn. A top-of-page notice that
   * said "allowed" while the panel below said "waiting for you" would be this
   * site failing at the one claim it makes, and it is exactly the failure a
   * screenshot review does not catch — the two are two screens apart.
   */
  it("says what the record says, and nothing this file made up", async () => {
    const run = await askRunFor(context)
    const band = answerOf((run as NonNullable<typeof run>).page)
    const record = (run as NonNullable<typeof run>).record
    const words = wordsOf(band as LoomNode)

    expect((band as ElementNode).props["title"]).toBe(record.verdictLabel)
    expect(words).toContain(record.asked)
    expect(words).toContain(record.verdictLine)
  })

  /**
   * The decision, offered exactly when the rules are waiting for one.
   *
   * The address is the whole of the state on this surface, so "the visitor may
   * say yes" is a fact about one URL: the band offers the approving address if
   * and only if the record says a person has been asked. A band that offered it
   * on a refusal would be promising an override past a floor that has none.
   */
  it("offers the way through only when the rules held the change for a person", async () => {
    const run = await askRunFor(context)
    const record = (run as NonNullable<typeof run>).record
    const band = answerOf((run as NonNullable<typeof run>).page) as ElementNode
    const approving = askHref(ORIGIN, { theme: THEME, ask: record.ask, approve: true })

    expect(actionsOf(band).some((action) => hrefOf(action) === approving)).toBe(record.awaitingYou)
  })

  /**
   * The tone tracks the action, which is the only thing this palette can say.
   *
   * There is no red in a Loom palette, deliberately, so a refusal cannot be
   * painted as one — but it must not be painted as an approval either, and the
   * first version of this band shipped *Refused* in the accent green. The rule
   * that replaced it is checkable: the accent tone and a primary control are the
   * same claim, so the band wears one if and only if it offers the other.
   */
  it("wears the accent tone if and only if it hands the visitor something to do", async () => {
    const band = answerOf(await servedPage(context)) as ElementNode
    const hasPrimary = actionsOf(band).some((action) => action.props["variant"] === "primary")

    expect(band.props["tone"]).toBe(hasPrimary ? "accent" : "neutral")
  })

  /**
   * The record link, followed.
   *
   * It pointed at `/the-record` with a replayable sequence of changes in the
   * address until 26 September, when the maintainer retired that page into the
   * mechanism page. The mechanism page already takes an `ask`, so the link is
   * simpler and the property worth holding is the same one: **the address the
   * band writes has to carry what the visitor actually did**, or the page they
   * arrive at is reporting on a different request from the one they just made.
   */
  it("hands over an address carrying the request the visitor made", async () => {
    const run = await askRunFor(context)
    const record = (run as NonNullable<typeof run>).record
    const band = answerOf((run as NonNullable<typeof run>).page) as ElementNode
    const onward = actionsOf(band)
      .map(hrefOf)
      .find((href) => new URL(href).pathname === HOW_IT_WORKS.path)

    expect(onward).toBeDefined()

    const address = new URL(onward as string)

    expect(address.searchParams.get("ask")).toBe(record.ask)
    expect(address.searchParams.get("approve")).toBe(context.approve === true ? "1" : null)
  })
})

/**
 * The same link, once the visitor has put the change back.
 *
 * The address this band writes carried the request and the visitor's yes, and
 * stopped there — so somebody who changed the page, put it back, and pressed
 * *See the whole record* arrived at a list showing only the change. On the one
 * step between two of this site's own pages, the site dropped the thing it says
 * is never dropped. It could not do otherwise until 7 September, because the
 * record page had no way to say *and then its undo*; it does now, so this holds
 * the hand-off in both directions.
 */

/**
 * The register is **not** asserted here, and that is deliberate rather than an
 * omission. `adapt.test.ts` already holds every reserved word against the whole
 * served page in all ten of these states, so this band is covered by the
 * assertion that covers the page it is part of. A second copy of the list in
 * this file would be a second list to keep in step, and the one that drifted
 * would be the one nobody was reading.
 */
