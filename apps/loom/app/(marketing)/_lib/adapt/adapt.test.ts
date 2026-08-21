import { applyDelta, type ElementNode, type LoomNode, type LoomTree } from "@loom/runtime"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { RESERVED_VOCABULARY } from "../copy"
import type { PageContext } from "../pages/home"
import { askRunFor, renderTree, treeFor } from "../render"
import {
  HOME,
  HOW_IT_WORKS,
  SITE_THEME_NAMES,
  askHref,
  type SiteThemeName,
} from "../site"
import { ASKS, askById, readAskId, type AskId } from "./asks"
import { RECORD_VOCABULARY, type Verdict } from "./record"
import { FRONT_DOOR_POLICY, PROTECTED_IN_PLAIN_WORDS, protectedInPlainWords, runAsk } from "./run"

/**
 * The band where the front door stops describing itself and does it.
 *
 * Everything here is a claim the page makes to a stranger in its own words, so
 * everything here is asserted rather than trusted. The site says a change is
 * measured, weighed against rules, allowed or held or refused, and reversible;
 * these are those five sentences, each held against what the sequence actually
 * did.
 */

const ORIGIN = "https://loom.example"
const THEME: SiteThemeName = "minimal"

const contextFor = (ask?: AskId, approve = false): PageContext => ({
  origin: ORIGIN,
  theme: THEME,
  ...(ask === undefined ? {} : { ask, approve }),
})

const basePage = (): LoomTree => treeFor(HOME, contextFor())

const elementsOf = (node: LoomNode): readonly ElementNode[] =>
  node.kind === "text"
    ? []
    : [...(node.kind === "element" ? [node] : []), ...node.children.flatMap(elementsOf)]

const countOf = (page: LoomTree, type: string): number =>
  elementsOf(page.root).filter((element) => element.type === type).length

/** The shape of the page, ignoring the revision counter the change bumped. */
const shapeOf = (page: LoomTree): string => JSON.stringify(page.root)

describe("every choice the band offers", () => {
  it.each(ASKS)("$id has something to do on the page as it is written", async (ask) => {
    const run = await runAsk(basePage(), ask)

    expect(run.record.verdict).not.toBe("nothing-to-do")
  })

  it.each(ASKS)("$id says the same thing in the label as in the request", (ask) => {
    expect(ask.label.length).toBeLessThan(ask.utterance.length)
  })

  it("offers one choice per kind of change, and one the rules refuse", () => {
    expect(ASKS).toHaveLength(5)
  })
})

/**
 * The three answers a set of rules can give, on one band.
 *
 * This is the table the whole design turns on, so it is written out rather than
 * derived: a change to the rules or to a choice that quietly collapsed all five
 * into "allowed" would leave the band demonstrating nothing while every other
 * test still passed.
 */
const EXPECTED: Readonly<Record<AskId, Verdict>> = {
  calmer: "landed",
  shorter: "landed",
  proof: "landed",
  problem: "held",
  "drop-pitch": "refused",
}

describe("what this site's rules do with each request", () => {
  it.each(Object.entries(EXPECTED))("answers %s with %s", async (id, verdict) => {
    const ask = askById(id)
    if (ask === undefined) throw new Error(`loom: ${id} is not a choice on the band`)

    expect((await runAsk(basePage(), ask)).record.verdict).toBe(verdict)
  })

  it("names the rules that decided, on every answer", async () => {
    for (const ask of ASKS) {
      expect((await runAsk(basePage(), ask)).record.verdictLine).toContain("front-door")
    }
  })

  /**
   * A hold is a question, so answering it has to change the outcome. Anything
   * else would make the band's "I say yes" button decoration.
   */
  it("applies the held change when the visitor says yes", async () => {
    const ask = askById("problem")
    if (ask === undefined) throw new Error("loom: the get-to-the-point choice is gone")

    const held = await runAsk(basePage(), ask)
    const approved = await runAsk(basePage(), ask, true)

    expect(held.record.landed).toBe(false)
    expect(approved.record.landed).toBe(true)
    expect(approved.record.verdict).toBe("approved")
  })

  /**
   * And a refusal is not a question. The floor is what makes a rule different
   * from a suggestion, so saying yes to a refused change must do nothing — which
   * is `confirmChange`'s guarantee rather than this band's, and is worth holding
   * here because the band is where a visitor is told it.
   */
  it("still refuses the refused change when the visitor says yes", async () => {
    const ask = askById("drop-pitch")
    if (ask === undefined) throw new Error("loom: the refused choice is gone")

    const approved = await runAsk(basePage(), ask, true)

    expect(approved.record.verdict).toBe("refused")
    expect(approved.record.landed).toBe(false)
    expect(shapeOf(approved.page)).toBe(shapeOf(basePage()))
  })

  it("leaves the point of the product on the page, which is what the rules protect", async () => {
    const ask = askById("drop-pitch")
    if (ask === undefined) throw new Error("loom: the refused choice is gone")

    const approved = await runAsk(basePage(), ask, true)

    expect(countOf(approved.page, "loom.mosaic")).toBe(1)
  })
})

/**
 * The claim the panel makes in as many words: *putting it back restores every
 * word rather than writing them out again.*
 *
 * On a page that keeps nothing, "Put it back" is a link home and the page is
 * rebuilt — so the sentence is only true if the rebuilt page and the page the
 * reversing change produces are the same page. That is what is checked here,
 * for every choice that lands, and it is the single assertion the band's honesty
 * rests on.
 */
describe("the change that reverses a change", () => {
  it.each(ASKS)("$id puts the page back exactly as it was", async (ask) => {
    const base = basePage()
    const run = await runAsk(base, ask, true)

    if (run.undo === undefined) {
      expect(run.record.landed).toBe(false)

      return
    }

    const back = applyDelta(run.page, run.undo)

    expect(back.ok).toBe(true)
    if (back.ok) expect(shapeOf(back.value)).toBe(shapeOf(base))
  })
})

/**
 * The panel reports the change that produced the page it is standing on.
 *
 * The page is built twice: once to find out what happens, and again with that
 * answer written into the panel, so what a visitor reads is the record of the
 * page in front of them rather than of a page nobody saw. The two runs agree
 * because nothing the rules weigh is a function of how big the page is — which
 * is true of today's rules rather than true by law, so it is asserted here.
 */
describe("the record and the page it stands on", () => {
  it.each(ASKS)("$id reports the change the visitor is looking at", async (ask) => {
    const first = await runAsk(basePage(), ask, true)
    const staged = treeFor(HOME, { ...contextFor(ask.id, true), record: first.record })
    const second = await runAsk(staged, ask, true)

    expect(second.record).toEqual(first.record)
  })

  it.each(ASKS)("$id leaves the band itself on the page", async (ask) => {
    const run = await askRunFor(contextFor(ask.id, true))

    expect(run).toBeDefined()
    expect(run === undefined ? "" : shapeOf(run.page)).toContain("See it happen")
  })
})

describe("the address is the whole of the state", () => {
  it.each(ASKS)("$id survives being written into a link and read back", (ask) => {
    const href = askHref(ORIGIN, { theme: THEME, ask: ask.id, approve: true })
    const url = new URL(href)

    expect(readAskId(url.searchParams.get("ask") ?? undefined)).toBe(ask.id)
    expect(url.searchParams.get("approve")).toBe("1")
  })

  it("treats an address it does not recognise as the plain page", async () => {
    expect(readAskId("something-else")).toBeUndefined()
    expect(await askRunFor(contextFor())).toBeUndefined()
  })

  /**
   * A re-theme is the site's other live claim, and the two are made at once
   * here. Losing the visitor's change on the way to another palette would show
   * them a page that is not the one they were looking at, at the exact moment
   * they are being told a palette touches only the root.
   */
  it.each(ASKS)("$id survives a change of palette", async (ask) => {
    const run = await askRunFor(contextFor(ask.id, true))
    const markup = renderToStaticMarkup(
      renderTree(run === undefined ? treeFor(HOME, contextFor(ask.id, true)) : run.page).element
    )

    for (const palette of SITE_THEME_NAMES.filter((name) => name !== THEME)) {
      /** As an attribute, so the query string's separators are escaped. */
      const href = askHref(ORIGIN, { theme: palette, ask: ask.id, approve: true }).replaceAll(
        "&",
        "&amp;"
      )

      expect(markup).toContain(`href="${href}"`)
    }
  })

  it("builds the same page twice for the same address", async () => {
    const once = await askRunFor(contextFor("shorter"))
    const twice = await askRunFor(contextFor("shorter"))

    expect(once).toBeDefined()
    expect(twice === undefined ? "" : shapeOf(twice.page)).toBe(
      once === undefined ? "!" : shapeOf(once.page)
    )
  })
})

/**
 * Whatever the visitor has asked of it, it is still a page of this site: it
 * renders, the palettes still only touch the root, and it still says nothing a
 * stranger would have to look up.
 */
describe("the page a choice leaves behind", () => {
  const states: readonly (readonly [string, PageContext])[] = [
    ["untouched", contextFor()],
    ...ASKS.map((ask) => [ask.id, contextFor(ask.id)] as const),
    ...ASKS.map((ask) => [`${ask.id}, approved`, contextFor(ask.id, true)] as const),
  ]

  it.each(states)("%s renders with nothing the runtime could not honour", async (_name, context) => {
    for (const theme of SITE_THEME_NAMES) {
      const run = await askRunFor({ ...context, theme })
      const page = run === undefined ? treeFor(HOME, { ...context, theme }) : run.page

      expect(renderTree(page).diagnostics).toEqual([])
    }
  })

  it.each(states)("%s meets nobody with a word they do not have", async (_name, context) => {
    const run = await askRunFor(context)
    const page = run === undefined ? treeFor(HOME, context) : run.page
    const words = wordsOf(page.root)

    for (const term of RESERVED_VOCABULARY) {
      expect({ term, uses: uses(words, term) }).toEqual({ term, uses: false })
    }
  })

  it.each(states)("%s still has exactly one first-level heading", async (_name, context) => {
    const run = await askRunFor(context)
    const page = run === undefined ? treeFor(HOME, context) : run.page
    const markup = renderToStaticMarkup(renderTree(page).element)

    expect([...markup.matchAll(/<h1\b/g)]).toHaveLength(1)
  })
})

/**
 * What the band tells a reader it protects, held against what is protected.
 *
 * A refusal the reader did not see coming reads as the page breaking rather
 * than as a rule holding, so the band says what this site protects before
 * offering the button that will be refused. That sentence is the thing that goes
 * stale — it still said "what it charges" for one commit after pricing left the
 * front door — so every word of it is derived, and this is what holds the
 * derivation honest.
 */
describe("what the band says this site protects", () => {
  it.each(FRONT_DOOR_POLICY.protectedPrimitiveTypes)("says what %s is, in plain words", (type) => {
    expect(PROTECTED_IN_PLAIN_WORDS[type]).toBeTypeOf("string")
  })

  it("says it on the page, in the visitor's words and not in ours", () => {
    const words = wordsOf(basePage().root)

    for (const phrase of protectedInPlainWords()) expect(words).toContain(phrase)
    for (const type of FRONT_DOOR_POLICY.protectedPrimitiveTypes) {
      expect(words).not.toContain(type)
    }
  })

  it("counts them rather than claiming a number", () => {
    /**
     * Two, today. The assertion is not the number — it is that the page and the
     * rules agree on it, so a fourth protected thing cannot leave the page
     * saying "two things" and listing three.
     */
    const words = wordsOf(basePage().root)
    const named = protectedInPlainWords().length

    expect(words).toContain(`protects ${named === 1 ? "one thing" : `${named === 2 ? "two" : "three"} things`}`)
  })
})

/**
 * Every sentence the record can print, held to the register on its own.
 *
 * The assertions above only see the sentences today's five choices happen to
 * produce. Most of the translations are for judgments this page cannot currently
 * reach — a change that discards later work, a redirected form — and the run
 * that makes one of them reachable will not think to come back here. So the
 * whole vocabulary is checked, not the part in use.
 */
describe("everything the record could ever say", () => {
  it.each(RECORD_VOCABULARY)("%s is written in the visitor's language", (sentence) => {
    for (const term of RESERVED_VOCABULARY) {
      expect({ sentence, term, uses: uses(sentence, term) }).toEqual({
        sentence,
        term,
        uses: false,
      })
    }
  })
})

/**
 * The panel walks the reader through the same steps the mechanism page names.
 *
 * Not the same words — there it is a diagram and here it happened to the reader,
 * so the panel says "You asked" where the other page says "Someone asks". What
 * must not drift is the *number*: a sixth step described on `/how-it-works` and
 * not shown here would be the site teaching a sequence it does not perform.
 */
describe("the panel and the mechanism page", () => {
  it("walks through as many steps as the mechanism page names", async () => {
    const run = await askRunFor(contextFor("calmer"))
    const mechanism = treeFor(HOW_IT_WORKS, contextFor())

    expect(run).toBeDefined()
    expect(run === undefined ? 0 : countOf(run.page, "loom.milestone")).toBe(
      countOf(mechanism, "loom.milestone")
    )
  })

  it("shows no steps at all before the visitor has asked for anything", () => {
    expect(countOf(basePage(), "loom.milestone")).toBe(0)
  })
})

/**
 * The reader's words, as `voice.test.ts` collects them: text nodes and the props
 * that hold sentences rather than settings. Duplicated deliberately and kept
 * small — the alternative is a module in the lane whose only caller is a test,
 * and the two files check different things about the same words.
 */
const PROSE_PROPS: readonly string[] = [
  "eyebrow",
  "title",
  "body",
  "label",
  "caption",
  "question",
  "answer",
  "name",
  "price",
  "period",
]

const wordsOf = (node: LoomNode): string => {
  if (node.kind === "text") return node.value

  const own =
    node.kind === "element"
      ? PROSE_PROPS.flatMap((key) => (typeof node.props[key] === "string" ? [node.props[key]] : []))
      : []

  return [...own, ...node.children.map(wordsOf)].join(" ")
}

const uses = (text: string, term: string): boolean =>
  new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}s?\\b`, "i").test(text)
