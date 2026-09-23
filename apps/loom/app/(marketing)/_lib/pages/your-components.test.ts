import type { LoomNode } from "@loom/runtime"
import { catalogueOf } from "@loom/runtime/sdk"
import { describe, expect, it } from "vitest"

import { BAND } from "../bands"
import { RESERVED_VOCABULARY } from "../copy"
import { siteRegistry } from "../registry"
import { FLOORS } from "../adapt/floors"
import { floorsFor, pageTreeFor, treeFor } from "../render"
import {
  DEFAULT_THEME,
  HOME,
  PUTTING_IT_BACK,
  internalHref,
  SITE_ROUTES,
  WHAT_READERS_DO,
  WHAT_YOU_RUN,
  WHO_CAN_ASK,
  YOUR_COMPONENTS,
} from "../site"
import { uses, wordsOf } from "../words"

import { SPECIMEN_ROWS } from "./your-components"

/**
 * The page that answers where the pieces come from.
 *
 * Everything here is asserted against the **built page** rather than against the
 * module that builds it. A test that read `SPECIMEN_ROWS` and compared it with
 * itself would pass however the band was assembled, and passing however the band
 * was assembled is precisely what let seven typed step counts survive sixteen
 * runs on this site. `SPECIMEN_ROWS` is used only to say *what the page is
 * supposed to be printing*; the assertion always looks for it in the tree.
 */

const ORIGIN = "https://loom.example"

const words = (): string =>
  wordsOf(treeFor(YOUR_COMPONENTS, { origin: ORIGIN, theme: DEFAULT_THEME }).root)

describe("the page about your own components", () => {
  it("is a page of this site with a builder and a place in the map", () => {
    expect(SITE_ROUTES).toContain(YOUR_COMPONENTS)
    expect(() => treeFor(YOUR_COMPONENTS, { origin: ORIGIN, theme: DEFAULT_THEME })).not.toThrow()
  })

  /**
   * The one judgement call on this page, asserted so that it is a decision
   * somebody made rather than something that drifted. The bar was back to the
   * eight items #166 asked about; a fifth page is not worth a ninth.
   *
   * **It was *the only page that is* until 11 September**, and `/what-you-run`
   * joined it on the same reasoning — so the assertion is the whole off-bar list
   * rather than this one page. Widened deliberately and not relaxed: it is still
   * an exact list, so a third page leaving the bar fails here and has to be
   * argued for, which is the property the original assertion was protecting.
   * Every one of them is still reachable, and `chrome.test.ts` is where that is
   * held.
   */
  /**
   * Widened three times, never relaxed, for the reason recorded on the same
   * assertion in `what-you-run.test.ts`: on 12 September `HOME` came off the bar
   * to make room for a seventh page, on 13 September `/who-can-ask` was added
   * off it, and on 14 September `/putting-it-back`. Still an exact list, so a
   * sixth still fails here and still has to be argued for.
   */
  it("is kept off the bar deliberately, and is one of the five pages that are", () => {
    expect(YOUR_COMPONENTS.inMenu).toBe(false)
    expect(SITE_ROUTES.filter((route) => !route.inMenu)).toEqual([
      HOME,
      WHO_CAN_ASK,
      PUTTING_IT_BACK,
      WHAT_READERS_DO,
      WHAT_YOU_RUN,
      YOUR_COMPONENTS,
    ])
  })

  it("answers the question the site had four pages and no answer to", () => {
    const text = words().toLowerCase()

    expect(text).toContain("do i have to rebuild my page")
    expect(text).toContain("a starting point, not the deal")
  })
})

/**
 * The band that is the reason the page is worth reading, held to the library
 * rather than to a copy of it.
 *
 * The claim the band makes about itself is *this is not an example of a
 * description, it is the description*. That claim is only true for as long as
 * the four cells come off `catalogueOf`, and the way it would stop being true is
 * somebody pasting today's values in to make a test pass. So the assertion is
 * the other way round: the page must contain what the catalogue says **now**,
 * whatever that turns out to be.
 */
describe("the specimen", () => {
  const catalogued = () => {
    const found = catalogueOf(siteRegistry).find((one) => one.type === SPECIMEN_ROWS.type)

    if (found === undefined) throw new Error(`loom: ${SPECIMEN_ROWS.type} is not in the library`)

    return found
  }

  it("is a piece the site is actually built from", () => {
    expect(catalogued().type).toBe(SPECIMEN_ROWS.type)
    expect(words()).toContain(SPECIMEN_ROWS.type)
  })

  it("prints the sentence the library holds, not one written beside it", () => {
    expect(words()).toContain(catalogued().description)
  })

  it("prints the settings the library declares, in the order it declares them", () => {
    const declared = catalogued().props

    expect(declared).toBeDefined()
    expect(SPECIMEN_ROWS.settings()).toBe((declared ?? []).map((prop) => prop.name).join(", "))
    expect(words()).toContain(SPECIMEN_ROWS.settings())
  })

  it("prints the places inside it the library declares", () => {
    expect(SPECIMEN_ROWS.inside()).toBe(catalogued().slots.join(", "))
    expect(words()).toContain(SPECIMEN_ROWS.inside())
  })

  /**
   * The negative half, and it is the one that caught something.
   *
   * A first draft of the band printed a second piece's name in the prose beside
   * the table, to say "and this one, and this one". Our internal names are not
   * copy — they are the one place on this page where a reader would meet a
   * string they have no way to read — so the band names exactly the piece it is
   * about and nothing else. Anything else that starts leaking one fails here
   * rather than on the page.
   */
  it("names one piece of the library and no other", () => {
    const named = [...words().matchAll(/\bloom\.[a-z][a-z0-9-]*/g)].map((match) => match[0])

    expect([...new Set(named)]).toEqual([SPECIMEN_ROWS.type])
  })
})

/**
 * The register, strictly — the front door's rule rather than the mechanism
 * page's.
 *
 * This page is written for somebody who has just been told an AI will rearrange
 * their interface and wants to know what it will cost them. That reader has no
 * more context than one who has just arrived at `/`, so the page earns none of
 * our words and uses none of them.
 *
 * **The specimen's own sentence is exempt, and deliberately.** It is quoted from
 * `src/primitives/`, which is another lane's file, and holding that lane's copy
 * to this lane's register through a shared test is exactly the coupling that had
 * five lanes editing one marketing file to get green in August. The choice of
 * specimen is this file's to make; the wording of it is not.
 */
describe("the register it is written in", () => {
  const ownCopy = (): string => words().replace(SPECIMEN_ROWS.description(), " ")

  it.each(RESERVED_VOCABULARY)("never says %s to a reader who has just arrived", (term) => {
    expect(uses(ownCopy(), term)).toBe(false)
  })

  it("keeps the reader in the sentence", () => {
    const text = ownCopy().toLowerCase()

    expect(text).toContain("your page")
    expect(text).toContain("you already built")
  })
})

/**
 * The contradiction this page exists to close, asserted where it was: on the
 * front door, one screen apart.
 *
 * Both sentences stay — they were never wrong, and the fix is not to delete
 * either of them. What is asserted is that the reader is no longer left to
 * reconcile them alone: the number is captioned as a starting point, and the
 * band carrying it offers the way to the page that says the rest.
 */
describe("the front door, which said two things about where pieces come from", () => {
  const front = (): string => wordsOf(treeFor(HOME, { origin: ORIGIN, theme: DEFAULT_THEME }).root)

  const frontDoorLinks = (): readonly string[] => {
    const hrefs = (node: LoomNode): readonly string[] => [
      ...(node.kind === "element" && typeof node.props["href"] === "string"
        ? [node.props["href"]]
        : []),
      ...(node.kind === "text" ? [] : node.children.flatMap(hrefs)),
    ]

    return hrefs(treeFor(HOME, { origin: ORIGIN, theme: DEFAULT_THEME }).root)
  }

  it("still says both true things", () => {
    expect(front()).toContain("ready-made pieces to build with")
    expect(front()).toContain("It can only use the pieces you handed it")
  })

  it("no longer leaves the number to be read as the whole offer", () => {
    expect(front()).toContain("A starting point, not the deal")
    expect(front()).not.toContain(
      "Each one takes its colours and type from whatever theme the page is wearing."
    )
  })

  /**
   * The footer reaches every page, so a link from the map would satisfy a weaker
   * assertion while changing nothing for a reader in the band where the question
   * is raised. This one is about the band.
   */
  it("offers the way to the answer from the band that raises the question", () => {
    const facts = treeFor(HOME, { origin: ORIGIN, theme: DEFAULT_THEME }).root.children.find(
      (child) => child.kind === "element" && child.props["eyebrow"] === BAND.facts
    )

    expect(facts).toBeDefined()
    expect(frontDoorLinks()).toContain(internalHref(ORIGIN, YOUR_COMPONENTS.path, DEFAULT_THEME))

    const withinBand = JSON.stringify(facts)

    expect(withinBand).toContain(YOUR_COMPONENTS.path)
    expect(withinBand).toContain("Where the pieces come from")
  })
})

/**
 * Served rather than built, and since 23 September the two differ — which is the
 * change rather than a regression.
 *
 * This suite asserted the opposite until today: *is the same page the builder
 * produced*, which was true while nothing on the page was measured. Two of its
 * three limits are now put to this site while the page is being built, and a
 * request through the whole sequence is not something a synchronous builder can
 * make. So the assertion becomes the one worth making all along — the served
 * page carries evidence the builder alone cannot produce, and the builder's page
 * is the page as it stood, with the three claims and no cards under them.
 */
describe("as the route serves it", () => {
  it("carries the two refusals, which the builder alone cannot produce", async () => {
    const served = wordsOf(
      (await pageTreeFor(YOUR_COMPONENTS, { origin: ORIGIN, theme: DEFAULT_THEME })).root
    )
    const built = words()

    for (const floor of FLOORS) {
      expect(served).toContain(floor.utterance)
      expect(built).not.toContain(floor.utterance)
    }
  })

  /**
   * The evidence is the half a reader should not have to take on trust, so what
   * the machinery named has to reach the page rather than being summarised into
   * *it was refused*.
   */
  it("prints what each refusal named, off the run rather than off this file", async () => {
    const results = await floorsFor({ origin: ORIGIN, theme: DEFAULT_THEME })
    const served = wordsOf(
      (await pageTreeFor(YOUR_COMPONENTS, { origin: ORIGIN, theme: DEFAULT_THEME })).root
    )

    expect(results).toHaveLength(FLOORS.length)

    for (const result of results) {
      for (const piece of result.pieces) expect(served).toContain(piece)

      for (const setting of result.settings) {
        expect(served).toContain(setting.name)
        expect(served).toContain(setting.said)
      }

      for (const clause of result.raisedBy) expect(served).toContain(clause)
    }
  })

  /**
   * The line over the cards says how many of the three were put to this site. A
   * count that was typed would be the one number on this page able to contradict
   * the cards directly beneath it, which is the failure this site has recorded
   * seven times and now counts everything it prints to avoid.
   */
  it("counts the cards it actually printed rather than promising a number", async () => {
    const served = wordsOf(
      (await pageTreeFor(YOUR_COMPONENTS, { origin: ORIGIN, theme: DEFAULT_THEME })).root
    )

    expect(served).toContain(`${FLOORS.length} of the three, put to this site`)
    expect(served).toContain("Three things no request gets past")
  })

  /**
   * The assertion above cannot tell a derived two from a typed one while there
   * are exactly two floors, which is the shape of every count this site has got
   * wrong. So the builder is handed one result and asked what it says — the only
   * way to see the number move without waiting for a third floor to exist.
   */
  it("says one when it was handed one, rather than two whatever it was handed", async () => {
    const [first] = await floorsFor({ origin: ORIGIN, theme: DEFAULT_THEME })

    expect(first).toBeDefined()

    const built = wordsOf(
      treeFor(YOUR_COMPONENTS, {
        origin: ORIGIN,
        theme: DEFAULT_THEME,
        floors: first === undefined ? [] : [first],
      }).root
    )

    expect(built).toContain("1 of the three, put to this site")
    expect(built).not.toContain("2 of the three, put to this site")
  })

  /**
   * Nothing else about the page is a function of the run, which is what keeps
   * every reader of it looking at the same two answers: the requests are fixed
   * in `render.ts` rather than read off the address.
   */
  it("changes nothing else the builder wrote", async () => {
    const served = await pageTreeFor(YOUR_COMPONENTS, { origin: ORIGIN, theme: DEFAULT_THEME })

    expect(wordsOf(served.root)).toContain(SPECIMEN_ROWS.description())
    expect(wordsOf(served.root)).toContain(
      "The ready-made ones are a starting point, not the deal"
    )
  })
})
