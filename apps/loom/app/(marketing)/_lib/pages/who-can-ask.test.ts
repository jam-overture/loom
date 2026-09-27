import {
  ceilingFor,
  ESCALATION_LADDER,
  intentOriginSchema,
  STAKE_ORDER,
  type ElementNode,
  type LoomNode,
  type LoomTree,
} from "@jam-overture/loom"
import { beforeAll, describe, expect, it } from "vitest"

import {
  ASKERS,
  ceilingOf,
  DEMONSTRATED,
  peopleAmong,
  rulesThatReadWhoAsked,
  weighEachAsker,
  wentAhead,
  type WeighedRequest,
} from "../adapt/askers"
import { askById, ASKS } from "../adapt/asks"
import { NOT_A_RULE, WEIGHT } from "../adapt/record"
import { FRONT_DOOR_POLICY } from "../adapt/run"
import { RESERVED_VOCABULARY } from "../copy"
import { spell } from "../journey"
import { askersFor, pageTreeFor, renderTree, treeFor } from "../render"
import {
  DEFAULT_THEME,
  HOME,
  SITE_ROUTES,
  SITE_THEME_NAMES,
  THE_RULES,
  WHO_CAN_ASK,
  type SiteThemeName,
} from "../site"
import { uses, wordsOf } from "../words"
import { COMPARISON_ANCHOR, MARK, readingOf } from "./who-can-ask"
import { unhonoured } from "../frames"

/**
 * The page that shows the one input to a verdict which is not about the change.
 *
 * Everything on it is either a description of code or a measurement taken on
 * this site's own front page while the page was being built, so everything on
 * it is asserted here against the thing it claims to be reporting. The failure
 * this guards against is the one this lane has now recorded three times: a
 * sentence that was true of a run the page had stopped printing.
 */

const ORIGIN = "https://loom.example"
const context = { origin: ORIGIN, theme: DEFAULT_THEME }

const elementsOf = (node: LoomNode): readonly ElementNode[] =>
  node.kind === "text"
    ? []
    : [...(node.kind === "element" ? [node] : []), ...node.children.flatMap(elementsOf)]

const served = async (theme: SiteThemeName = DEFAULT_THEME): Promise<LoomTree> =>
  pageTreeFor(WHO_CAN_ASK, { origin: ORIGIN, theme })

/**
 * Every address the page holds.
 *
 * `wordsOf` deliberately reads copy and not settings, and an `href` is a
 * setting — so a link has to be looked for in the props rather than in the
 * words, which is the trap this helper exists to stop the next assertion
 * walking into.
 */
const linksOf = (node: LoomNode): readonly string[] =>
  elementsOf(node).flatMap((element) =>
    typeof element.props["href"] === "string" ? [element.props["href"]] : []
  )

describe("the four askers", () => {
  it("are the runtime's list, in the runtime's order", () => {
    expect(ASKERS.map((asker) => asker.origin)).toEqual([...intentOriginSchema.options])
  })

  /**
   * The guarantee behind every count on the page. A fifth kind of asker is a
   * fifth column and a fifth card, and the site is not permitted to go on
   * saying four — so it does not render at all until somebody writes the words.
   */
  it("cannot be added to the runtime without words being written here", () => {
    expect(ASKERS).toHaveLength(intentOriginSchema.options.length)

    for (const asker of ASKERS) {
      expect(asker.name.length).toBeGreaterThan(0)
      expect(asker.who.length).toBeGreaterThan(0)
      expect(asker.what.length).toBeGreaterThan(0)
    }
  })

  /**
   * The runtime spells three of the four as hyphenated identifiers, and those
   * are the ones a visitor must never meet. The fourth is `developer`, which is
   * an ordinary English word and the right one to use — so the rule is about
   * the identifiers rather than about every string the runtime happens to have
   * picked, and the site's own reserved list carries the rest.
   */
  it("meets a reader with none of the runtime's own names", () => {
    for (const asker of ASKERS) {
      const words = `${asker.name} ${asker.who} ${asker.what}`

      if (asker.origin.includes("-")) {
        expect({ origin: asker.origin, uses: words.includes(asker.origin) }).toEqual({
          origin: asker.origin,
          uses: false,
        })
      }

      for (const term of RESERVED_VOCABULARY) {
        expect({ origin: asker.origin, term, uses: uses(words, term) }).toEqual({
          origin: asker.origin,
          term,
          uses: false,
        })
      }
    }
  })

  /** The column heading has to fit a column. */
  it("gives each a name short enough to head a column", () => {
    for (const asker of ASKERS) {
      expect(asker.name.split(/\s+/).length).toBeLessThanOrEqual(3)
    }
  })

  it("reads each ceiling off the rules this site is published under", () => {
    for (const asker of ASKERS) {
      expect(ceilingOf(asker)).toBe(ceilingFor(FRONT_DOOR_POLICY, asker.origin))
    }
  })

  /**
   * The page's opening claim about the list, held to the field it is counted
   * off. It is the claim a reader remembers — *most of what asks for a change
   * is not a person* — and it is the one that would quietly stop being true.
   */
  it("is mostly things that are not people", () => {
    expect(peopleAmong().length).toBeLessThan(ASKERS.length)
    expect(peopleAmong().map((asker) => asker.origin)).toEqual(["user-instruction", "developer"])
  })
})

describe("the requests the comparison is built from", () => {
  it("are all buttons on the front door", () => {
    for (const id of DEMONSTRATED) {
      expect(ASKS.map((ask) => ask.id)).toContain(id)
      expect(askById(id)).toBeDefined()
    }
  })

  it("are one for each weight the rules can give a change", () => {
    expect(DEMONSTRATED).toHaveLength(STAKE_ORDER.length)
  })
})

describe("the sixteen runs", () => {
  let weighed: readonly WeighedRequest[] = []

  beforeAll(async () => {
    weighed = await askersFor(context)
  })

  it("is every request put by every asker", () => {
    expect(weighed).toHaveLength(DEMONSTRATED.length)

    for (const request of weighed) {
      expect(request.answers.map((answer) => answer.origin)).toEqual(
        ASKERS.map((asker) => asker.origin)
      )
    }
  })

  /**
   * The band's own structure, and the thing that would make it meaningless: two
   * rows weighed the same are two rows saying one thing twice, and a reader
   * would have no way to tell that the ladder in front of them has a rung
   * missing.
   */
  it("climbs the weights in order, one request each", () => {
    expect(weighed.map((request) => request.weight)).toEqual([...STAKE_ORDER])
    expect(weighed.map((request) => request.weighedAs)).toEqual(
      STAKE_ORDER.map((level) => WEIGHT[level])
    )
  })

  /**
   * The claim `0002` makes, checked rather than repeated: stakes and who asked
   * are independent axes, so the weight of a change cannot move because a
   * different asker wanted it. `weighEachAsker` throws if it does; this is the
   * assertion that says so out loud.
   */
  it("weighs a change the same however asked for it", async () => {
    for (const request of weighed) {
      expect(STAKE_ORDER).toContain(request.weight)
    }

    await expect(
      weighEachAsker(treeFor(HOME, context))
    ).resolves.toEqual(weighed)
  })

  /**
   * The page's sharpest claim, and the one a sceptical reader is owed a
   * measurement of rather than a promise.
   */
  it("has exactly one rule that ever read who was asking", () => {
    const reading = rulesThatReadWhoAsked(weighed)

    expect(reading).toEqual(["stakes-above-ceiling"])
    expect(ESCALATION_LADDER).toContain(reading[0])
    expect(reading).not.toContain(NOT_A_RULE)
  })

  /** The floor is sovereign over the ceilings, which is the last row. */
  it("refuses the heaviest request to all four of them", () => {
    const floor = weighed[weighed.length - 1]

    expect(floor?.weight).toBe("critical")
    expect(floor?.answers.map((answer) => answer.answer)).toEqual(
      ASKERS.map(() => "was-refused")
    )
    expect(wentAhead(floor as WeighedRequest)).toEqual([])
  })

  /** The lightest request is under every line, which is the first row. */
  it("lets the lightest request through for all four of them", () => {
    const lightest = weighed[0]

    expect(lightest?.weight).toBe("low")
    expect(wentAhead(lightest as WeighedRequest)).toHaveLength(ASKERS.length)
  })

  /**
   * The two rows in the middle are the page. If neither of them split, the
   * comparison is four rows all saying the same thing and the site has nothing
   * to show — which is a state this suite must fail in rather than photograph.
   */
  it("splits the askers on at least one request", () => {
    const split = weighed.filter(
      (request) =>
        wentAhead(request).length > 0 && wentAhead(request).length < ASKERS.length
    )

    expect(split.length).toBeGreaterThan(0)
  })

  /**
   * Every asker's line, checked against the policy rather than against the
   * band: an asker went ahead unwatched exactly when the weight was within its
   * ceiling and nothing else objected.
   */
  it("lets each asker through exactly up to its own line", () => {
    for (const request of weighed) {
      for (const asker of ASKERS) {
        const answer = request.answers.find((given) => given.origin === asker.origin)
        const within = STAKE_ORDER.indexOf(request.weight) <= STAKE_ORDER.indexOf(ceilingOf(asker))

        expect({ asker: asker.name, weight: request.weight, went: answer?.answer === "went-ahead" }).toEqual(
          {
            asker: asker.name,
            weight: request.weight,
            went: within && request.weight !== FRONT_DOOR_POLICY.refusalFloor,
          }
        )
      }
    }
  })

  /**
   * The composing itself, on data the site does not have.
   *
   * A literal equal to today's true sentence is indistinguishable from the
   * computation at a single point, and the assertion on the served page cannot
   * tell them apart. This one can: it moves the answers and checks the words
   * move with them.
   */
  it("says something different when the answers are different", () => {
    const [first] = weighed
    const flipped: WeighedRequest = {
      ...(first as WeighedRequest),
      answers: (first as WeighedRequest).answers.map((answer) => ({
        ...answer,
        answer: "stopped-and-asked" as const,
      })),
    }

    expect(readingOf([flipped])).not.toBe(readingOf([first as WeighedRequest]))
    expect(readingOf([flipped])).toContain("every one of them stopped to ask")
    /**
     * And the other way: nobody going ahead because everybody was refused is a
     * different sentence from nobody going ahead because everybody was held.
     * Only the first is a floor, and only the first may say so.
     */
    expect(readingOf([flipped])).not.toContain("no yes that moves")
    expect(readingOf([weighed[weighed.length - 1] as WeighedRequest])).toContain(
      "no yes that moves"
    )
  })

  /** The sentence under the table is composed from the runs, not written under them. */
  it("reads the table back in words rather than describing it", () => {
    const reading = readingOf(weighed)

    for (const request of weighed) {
      expect(reading).toContain(request.weighedAs)
    }

    for (const asker of wentAhead(weighed[1] as WeighedRequest)) {
      expect(reading).toContain(asker.name.toLowerCase())
    }
  })
})

describe("the page as it is served", () => {
  let page: LoomTree
  let words = ""

  beforeAll(async () => {
    page = await served()
    words = wordsOf(page.root)
  })

  it("is a route of this site with a builder and a file on disk", () => {
    expect(SITE_ROUTES).toContain(WHO_CAN_ASK)
  })

  /**
   * Every cell, against the run it reports — not merely that there are sixteen
   * of them.
   *
   * The mutation this exists for drew every cell as a tick. Sixteen cells were
   * still there, the sentence under the table still read correctly, and the
   * band said the opposite of what happened. A count is not a check.
   */
  it("draws every cell as the mark for what actually happened", async () => {
    const weighed = await askersFor(context)
    const rows = elementsOf(page.root).filter(
      (element) => element.type === "loom.comparison-row" && element.props["note"] !== undefined
    )

    expect(rows).toHaveLength(weighed.length)

    rows.forEach((row, index) => {
      const request = weighed[index] as WeighedRequest
      const marks = row.children
        .flatMap(elementsOf)
        .filter((cell) => cell.type === "loom.comparison")
        .map((cell) => cell.props["mark"])

      expect({ request: request.ask, marks }).toEqual({
        request: request.ask,
        marks: request.answers.map((answer) => MARK[answer.answer]),
      })
    })
  })

  it("heads a column with each asker, in order", () => {
    const subjects = elementsOf(page.root)
      .filter(
        (element) => element.type === "loom.comparison" && element.props["role"] === "subject"
      )
      .map((element) => wordsOf(element))

    expect(subjects).toEqual(ASKERS.map((asker) => asker.name))
  })

  it("quotes each request in the words a person would have used", async () => {
    const weighed = await askersFor(context)

    for (const request of weighed) {
      expect(words).toContain(request.asked)
      expect(askById(request.ask)?.utterance).toBe(request.asked)
    }
  })

  it("counts the rules off the ladder rather than typing the number", () => {
    expect(words).toContain(`There are ${spell(ESCALATION_LADDER.length)} rules`)
  })

  it("counts the runs off the runs", async () => {
    const weighed = await askersFor(context)

    expect(words).toContain(`all ${spell(weighed.length * ASKERS.length)} runs`)
  })

  /**
   * The page's sharpest claim, checked where a reader meets it.
   *
   * Asserting that `rulesThatReadWhoAsked` returns one rule is not the same
   * assertion: the mutation this exists for left the measurement correct and
   * had the band print *none of them*, which is the opposite claim, with every
   * other test green.
   */
  it("prints the count of rules that read who asked, as measured", async () => {
    const weighed = await askersFor(context)
    const reading = rulesThatReadWhoAsked(weighed)

    expect(reading).toHaveLength(1)
    expect(words).toContain("exactly one of them ever gave two askers a different answer")
  })

  /** The sentence under the table is the one the runs produce, word for word. */
  it("prints the reading the runs compose, not a sentence beside them", async () => {
    const weighed = await askersFor(context)

    expect(words).toContain(readingOf(weighed))
  })

  /**
   * The band the hero points at has to be the band that is there. A fragment
   * pointing at nothing is a button that appears to do nothing, which cost this
   * lane an hour on 12 September for a defect that did not exist.
   */
  it("puts the anchor the hero points at on the comparison", () => {
    const anchored = elementsOf(page.root).filter(
      (element) => element.props["anchor"] === COMPARISON_ANCHOR
    )

    expect(anchored).toHaveLength(1)
    expect(anchored[0]?.type).toBe("loom.section")
    expect(
      linksOf(page.root).some((href) => href.endsWith(`#${COMPARISON_ANCHOR}`))
    ).toBe(true)
  })

  it("meets nobody with a word they do not have in its opening band", () => {
    const hero = elementsOf(page.root).find((element) => element.type === "loom.hero")

    for (const term of RESERVED_VOCABULARY) {
      expect({ term, uses: uses(wordsOf(hero as ElementNode), term) }).toEqual({
        term,
        uses: false,
      })
    }
  })

  it("hands the reader back to the page that states what it shows", () => {
    expect(linksOf(page.root).some((href) => href.includes(THE_RULES.path))).toBe(true)
  })

  it("renders with nothing the runtime could not honour", async () => {
    expect(unhonoured(renderTree(await served(), { origin: ORIGIN }).diagnostics)).toEqual([])
  })

  it.each(SITE_THEME_NAMES)("names no colour of its own under %s", async (theme) => {
    const rendered = await served(theme)
    const below = elementsOf(rendered.root).filter((element) => element.id !== rendered.root.id)

    for (const element of below) {
      expect(JSON.stringify(element.props)).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(|hsl\(/i)
    }
  })
})

describe("the rules page it grew out of", () => {
  it("offers the demonstration from the band that states it", async () => {
    const rules = await pageTreeFor(THE_RULES, context)

    expect(linksOf(rules.root).some((href) => href.includes(WHO_CAN_ASK.path))).toBe(true)
  })
})
