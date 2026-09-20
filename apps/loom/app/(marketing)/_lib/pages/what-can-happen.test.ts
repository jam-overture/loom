import {
  buildElement,
  buildText,
  composeChange,
  confirmChange,
  fixedPolicy,
  noopEventSink,
  sequentialIdFactory,
  systemClock,
  COMPOSITION_OUTCOME_KINDS,
  type CompositionOutcome,
  type CompositionOutcomeKind,
  type CompositionRuntime,
  type EditIntent,
  type ElementNode,
  type LoomNode,
  type LoomTree,
} from "@loom/runtime"
import { describe, expect, it } from "vitest"

import { askById, askInterpreter, ASKS, type Ask } from "../adapt/asks"
import { FRONT_DOOR_POLICY, protectedInPlainWords, runAsk } from "../adapt/run"
import { pageTreeFor, refusalFor, treeFor } from "../render"
import { DEFAULT_THEME, HOME, SITE_ROUTES, WHAT_CAN_HAPPEN } from "../site"
import { RESERVED_VOCABULARY } from "../copy"
import { piecesIn } from "../measure"
import { uses, wordsOf } from "../words"

import {
  DEMONSTRATED_ASK,
  endingsLeavingThePageAlone,
  endingsOf,
  inWords,
  REFUSAL_ANCHOR,
} from "./what-can-happen"

/**
 * The page whose entire argument is a claim about code, held to that code.
 *
 * Every other page of this site argues from sentences somebody wrote. This one
 * says **there are exactly five ways an ask can end and four of them leave your
 * page alone**, which is either a fact about `@loom/runtime` or the most
 * embarrassing sentence on the site. So the assertions below do not read the
 * copy and agree with it — they put requests through the real sequence, catch
 * which ending comes back, and hold the page's claim to what happened.
 *
 * Everything is asserted against the **rendered page** rather than the module
 * that builds it, for the reason `pages.test.ts` records: a builder tested in
 * isolation is a test of a function nobody visits.
 */

const ORIGIN = "https://loom.example"
const CONTEXT = { origin: ORIGIN, theme: DEFAULT_THEME }

const pageWords = async (): Promise<string> =>
  wordsOf((await pageTreeFor(WHAT_CAN_HAPPEN, CONTEXT)).root)

const frontDoor = (): LoomTree => treeFor(HOME, CONTEXT)

/** Every string a named prop holds on a page, found by walking it. */
const propsIn = (node: LoomNode, key: string): readonly string[] =>
  node.kind === "text"
    ? []
    : [
        ...(node.kind === "element" && typeof node.props[key] === "string"
          ? [node.props[key] as string]
          : []),
        ...node.children.flatMap((child) => propsIn(child, key)),
      ]

const hrefsIn = (node: LoomNode): readonly string[] => propsIn(node, "href")
const anchorsIn = (node: LoomNode): readonly string[] => propsIn(node, "anchor")

/** Every table on a page, found by type rather than by where it sits. */
const tablesIn = (node: LoomNode): readonly ElementNode[] =>
  node.kind === "text"
    ? []
    : [
        ...(node.kind === "element" && node.type === "loom.table" ? [node] : []),
        ...node.children.flatMap(tablesIn),
      ]

/**
 * Which ending a request actually gets, off the pipeline rather than off the
 * marketing lane's own vocabulary for it.
 *
 * `runAsk` is the site's runner and it flattens the five endings into a record
 * a visitor can read — which is its job, and it is the wrong instrument here.
 * The claim under test is about `CompositionOutcome["kind"]`, so this calls the
 * runtime directly with the same interpreter, the same rules and the same page
 * the site uses, and reports the kind it got.
 */
const runtimeFor = (ask: Ask, namespace: string): CompositionRuntime => {
  const idFactory = sequentialIdFactory(namespace)

  return {
    interpreter: askInterpreter(ask, idFactory, systemClock),
    policySource: fixedPolicy(FRONT_DOOR_POLICY),
    events: noopEventSink,
    clock: systemClock,
    idFactory,
  }
}

const intentFor = (page: LoomTree, ask: Ask, runtime: CompositionRuntime): EditIntent => ({
  intentId: runtime.idFactory.intentId(),
  treeId: page.treeId,
  baseRevision: page.revision,
  origin: "user-instruction",
  actor: "a visitor",
  utterance: ask.utterance,
  observedAt: runtime.clock.now(),
})

const endingOf = async (page: LoomTree, ask: Ask, namespace: string): Promise<CompositionOutcome> => {
  const runtime = runtimeFor(ask, namespace)

  return composeChange(runtime, page, intentFor(page, ask, runtime))
}

/**
 * An ask with nothing to do, which is how `not-interpreted` is reached without
 * a model and without a stub standing in for one.
 *
 * `askInterpreter` returns a refusal when a choice's plan finds nothing to
 * change, and the pipeline reports that as *nothing was interpreted* — which is
 * precisely the ending the page describes as "the AI gave back nothing that was
 * a change to your page". The cause differs from an unreachable model and the
 * ending does not, and the ending is what the page claims.
 */
const NOTHING_TO_DO: Ask = {
  id: "calmer",
  answer: "landed",
  utterance: "Do something this page has nothing for.",
  label: "Nothing to do",
  rationale: "There is nothing here for this to change.",
  plan: () => undefined,
}

describe("the five endings", () => {
  it("names every ending the machinery has, and invents none", () => {
    expect(endingsOf().map((ending) => ending.kind)).toEqual([...COMPOSITION_OUTCOME_KINDS])
  })

  /**
   * The direction the assertion above cannot fail in.
   *
   * `endingsOf` walks the runtime's list and throws on a kind nobody has
   * written a sentence for, so a sixth ending is caught. A sentence for an
   * ending that no longer exists would simply never be reached — it would sit
   * in the array, unread, and the page would go on being correct while the file
   * described something that had stopped happening.
   */
  it("has no sentence left over for an ending the machinery no longer has", () => {
    const described = endingsOf().map((ending) => ending.kind)
    const all: readonly CompositionOutcomeKind[] = COMPOSITION_OUTCOME_KINDS

    expect(described).toHaveLength(all.length)
    expect(new Set(described).size).toBe(described.length)
  })

  it("puts them on the page in the machinery's order, not this file's", async () => {
    const words = await pageWords()
    const positions = endingsOf().map((ending) => words.indexOf(ending.name))

    expect(positions.every((at) => at >= 0)).toBe(true)
    expect([...positions]).toEqual([...positions].sort((a, b) => a - b))
  })

  /**
   * The width, pinned, because the obvious improvement to this band breaks it.
   *
   * A third column — the name as a short bold handle, separate from its
   * sentence — is what anybody reading the builder will reach for, and at 390px
   * it puts *Your page afterwards* behind a sideways scroll. That is the one
   * column the band exists for. Measured rather than argued: three columns came
   * to 369px inside a 284px wrapper, two come to 284 with nothing to scroll.
   */
  it("keeps the endings to two columns, so the answer is never the one off the edge", async () => {
    const tree = await pageTreeFor(WHAT_CAN_HAPPEN, CONTEXT)
    const rows = tablesIn(tree.root)
      .filter((table) => table.props["caption"] === "The five ways a request to change a page can end")
      .flatMap((table) =>
        table.children.flatMap((child): readonly ElementNode[] =>
          child.kind === "element" && child.type === "loom.table-row" ? [child] : []
        )
      )

    expect(rows).toHaveLength(endingsOf().length)
    for (const cells of rows) {
      expect(cells.children).toHaveLength(2)
    }
  })

  it("says exactly one of them changes your page", () => {
    expect(endingsOf().filter((ending) => ending.changesYourPage)).toHaveLength(1)
    expect(endingsLeavingThePageAlone()).toBe(COMPOSITION_OUTCOME_KINDS.length - 1)
  })

  it("leads with the count it counted rather than a number somebody typed", async () => {
    const words = await pageWords()

    expect(words).toContain(`${inWords(endingsLeavingThePageAlone())} of them leave your page`)
    expect(words).toContain(`can end ${inWords(endingsOf().length).toLowerCase()} ways`)
  })
})

/**
 * The claim, run.
 *
 * Three of the five endings are reachable through the choices the front door
 * already offers, the fourth through a choice with nothing to do, and the fifth
 * by confirming a held change against a page that has moved underneath it —
 * which is the failure the page's second band describes in as many words. So
 * all five are exercised here rather than four asserted and one taken on trust.
 */
describe("what actually happens", () => {
  const reaching: Readonly<Record<CompositionOutcomeKind, string>> = {
    applied: "proof",
    "awaiting-confirmation": "problem",
    rejected: "drop-pitch",
    "not-interpreted": "",
    "not-applicable": "",
  }

  it.each(["applied", "awaiting-confirmation", "rejected"] as const)(
    "reaches %s through the front door, and the page says whether it changes anything",
    async (kind) => {
      const ask = askById(reaching[kind])
      if (ask === undefined) throw new Error(`loom: no ask reaches ${kind}`)

      const page = frontDoor()
      const outcome = await endingOf(page, ask, "t")
      const ending = endingsOf().find((one) => one.kind === kind)

      expect(outcome.kind).toBe(kind)
      expect(ending?.changesYourPage).toBe(outcome.kind === "applied")
    }
  )

  it("reaches not-interpreted when nothing comes back, and leaves the page alone", async () => {
    const page = frontDoor()
    const outcome = await endingOf(page, NOTHING_TO_DO, "t")

    expect(outcome.kind).toBe("not-interpreted")
    expect(endingsOf().find((one) => one.kind === "not-interpreted")?.changesYourPage).toBe(false)
  })

  /**
   * The ending the page's second band is about, produced the way the band says
   * it happens: a change worked out against the page as it stood, put to a page
   * that has moved since.
   *
   * The move is a real one — the band the held change wants to lift is taken off
   * the page first — so the confirmation arrives about a piece that is no longer
   * there. Nothing is stubbed and no revision number is edited by hand.
   */
  it("reaches not-applicable when the page has moved underneath the change", async () => {
    const page = frontDoor()
    const ask = askById("problem")
    if (ask === undefined) throw new Error("loom: the held choice is gone")

    const runtime = runtimeFor(ask, "t")
    const intent = intentFor(page, ask, runtime)
    const held = await composeChange(runtime, page, intent)

    expect(held.kind).toBe("awaiting-confirmation")
    if (held.kind !== "awaiting-confirmation") return

    const moved = await runAsk(page, ask, true, "moved")
    expect(moved.record.landed).toBe(true)

    const confirmed = confirmChange(runtime, moved.page, held.assessment.proposal, intent)

    expect(confirmed.kind).toBe("not-applicable")
    expect(endingsOf().find((one) => one.kind === "not-applicable")?.changesYourPage).toBe(false)
  })

  /**
   * The fourth column of the table, checked as a whole rather than per row.
   *
   * Four endings leaving the page alone is the page's headline and it is the
   * kind of claim that stays true row by row while going wrong in aggregate —
   * so this asserts the count against the sequence rather than against the
   * declarations the rows are printed from.
   */
  it("leaves the page untouched in every ending but one", async () => {
    const page = frontDoor()
    const before = piecesIn(page.root)

    for (const ask of ASKS.filter((one) => one.answer !== "landed")) {
      const run = await runAsk(page, ask)

      expect({ ask: ask.id, pieces: piecesIn(run.page.root) }).toEqual({ ask: ask.id, pieces: before })
      expect(run.record.landed).toBe(false)
    }
  })
})

describe("the refusal the page prints", () => {
  it("is a real run against the front door this site publishes", async () => {
    const refusal = await refusalFor(CONTEXT)

    expect(refusal).toBeDefined()
    expect(refusal?.record.verdict).toBe("refused")
    expect(refusal?.record.asked).toBe(askById(DEMONSTRATED_ASK)?.utterance)
  })

  /**
   * The band's whole claim, and the one number pair on this site that would be
   * worth faking. Equal counts are the page unchanged; the assertion is that
   * they come off two trees rather than off one value printed twice.
   */
  it("counts the page before and after, and they are the same", async () => {
    const refusal = await refusalFor(CONTEXT)
    const ask = askById(DEMONSTRATED_ASK)
    if (ask === undefined) throw new Error("loom: the demonstrated request is gone")

    const run = await runAsk(frontDoor(), ask)

    expect(refusal?.piecesBefore).toBe(piecesIn(frontDoor().root))
    /**
     * Held to the page the sequence handed back, not only to the count above
     * it. Two literals that agreed with each other would satisfy the second
     * assertion on its own, and both of those halves were reached by mutation
     * before this line was added.
     */
    expect(refusal?.piecesAfter).toBe(piecesIn(run.page.root))
    expect(refusal?.piecesAfter).toBe(refusal?.piecesBefore)
    expect(refusal?.piecesBefore).toBeGreaterThan(0)
  })

  it("prints the counted numbers rather than a sentence about them", async () => {
    const refusal = await refusalFor(CONTEXT)
    const words = await pageWords()

    expect(words).toContain(`${refusal?.piecesBefore} pieces before the request`)
    expect(words).toContain(`and ${refusal?.piecesAfter} after it`)
  })

  /**
   * The demonstrated request is the front door's own refused button, so a
   * visitor arriving from `/` is watching the same refusal opened up rather
   * than a second one arranged to be more convincing.
   */
  it("is the same request the front door offers, and that request is refused there too", () => {
    expect(askById(DEMONSTRATED_ASK)?.answer).toBe("refused")
  })

  it("names what this site protects in the words the rules page uses", async () => {
    const words = await pageWords()

    for (const protection of protectedInPlainWords()) {
      expect(uses(words, protection)).toBe(true)
    }
  })
})

describe("the page itself", () => {
  /**
   * **Off the bar as of 20 September, and reachable exactly as the other six
   * off-bar pages are.** The maintainer read the bar and said two things: that
   * the site was too busy, and that this page's menu label gave the wrong
   * message. The label is answered in `site.ts`; this is the other half.
   *
   * What `inMenu: false` has guaranteed since 8 September is unchanged and is
   * asserted here rather than assumed: the footer's map carries every route,
   * so a page off the bar is never a page off the site.
   */
  it("is reachable and in the footer's map, and is no longer in the bar", () => {
    expect(SITE_ROUTES).toContain(WHAT_CAN_HAPPEN)
    expect(WHAT_CAN_HAPPEN.inMenu).toBe(false)
  })

  /** Its label says what the page says, rather than promising a stranger failure. */
  it("is not named for the ending nobody wants", () => {
    expect(WHAT_CAN_HAPPEN.label).toBe("What can happen")
    expect(WHAT_CAN_HAPPEN.label.toLowerCase()).not.toContain("wrong")
    expect(WHAT_CAN_HAPPEN.path).not.toContain("wrong")
  })

  /**
   * The bar gave an item back. The exact list is asserted so that a page
   * arriving on or leaving the bar has to be argued for here rather than
   * happening as a side effect.
   */
  it("gave the bar back an item", () => {
    expect(SITE_ROUTES.filter((route) => !route.inMenu).map((route) => route.path)).toEqual([
      "/",
      "/who-can-ask",
      "/putting-it-back",
      "/what-readers-do",
      "/what-can-happen",
      "/what-you-run",
      "/your-components",
    ])
  })

  it("meets nobody with a word they do not have", async () => {
    const words = await pageWords()

    for (const term of RESERVED_VOCABULARY) {
      expect({ term, uses: uses(words, term) }).toEqual({ term, uses: false })
    }
  })

  /**
   * The page is about what the machinery does and is not the place to teach
   * anybody to use it — that is `/docs`, and the boundary agreed on 11
   * September holds here too: no code on a page a reader has not yet decided to
   * try.
   */
  it("prints no code", async () => {
    const words = await pageWords()

    for (const term of ["npm", "pnpm", "yarn", "npx", "import"]) {
      expect({ term, uses: uses(words, term) }).toEqual({ term, uses: false })
    }
  })

  it("says what happens to the reader's own page, in the reader's words", async () => {
    const words = (await pageWords()).toLowerCase()

    expect(words).toContain("your page")
    expect(words).toContain("your rules")
  })

  /**
   * The ending nobody asks about, and the one the page would be dishonest
   * without. Four endings leaving a page alone says nothing about the fifth,
   * and a page that stopped there would be making its case by omitting the only
   * case that costs anybody anything.
   */
  it("does not stop at the four, and says what the fifth leaves you", async () => {
    const words = await pageWords()

    expect(words).toContain("A change landed, and it was the wrong one")
    expect(words.toLowerCase()).toContain("put it back")
  })

  it("builds without a refusal to print, rather than failing to render", () => {
    expect(() => treeFor(WHAT_CAN_HAPPEN, CONTEXT)).not.toThrow()
  })

  /**
   * The hero's link to the band below it, and the band answering to the name it
   * points at.
   *
   * Written after an hour spent fixing a defect that was not there. The link
   * looked dead in a browser — clicked, no scroll — and the diagnosis was that
   * `?theme=minimal` on an address the reader had reached without it turns a
   * fragment jump into a navigation. The replacement wrote the palette only
   * when it was not the default, which `pages.test.ts` immediately failed as a
   * re-theme changing markup below the root: on one palette the link had a
   * query and on the others it did not, which is exactly what 0049 forbids and
   * what `withoutPaletteNames` cannot normalise away.
   *
   * Both halves of that were wrong. The measurement was taken 900ms after a
   * click that triggers a full reload in a development build, so the scroll was
   * read before the page had finished loading; with the load waited for, every
   * combination of entry address and link form lands the band at the top of the
   * viewport. **The ordinary link was right all along**, and the suite refused
   * the fix for it before a reviewer had to.
   *
   * So this holds the link to the form every other internal link on the site
   * takes — the palette always written, which is what keeps it invariant under a
   * re-theme — and holds the band to carrying the name it points at, which is
   * the half that would genuinely break in silence.
   */
  it("links to its own refusal band the way it links to anything else", () => {
    const hrefs = hrefsIn(treeFor(WHAT_CAN_HAPPEN, CONTEXT).root)

    expect(hrefs).toContain(
      `${ORIGIN}${WHAT_CAN_HAPPEN.path}?theme=${DEFAULT_THEME}#${REFUSAL_ANCHOR}`
    )
  })

  it("carries the reader's own palette on that link", () => {
    const bold = treeFor(WHAT_CAN_HAPPEN, { origin: ORIGIN, theme: "bold" as const })

    expect(hrefsIn(bold.root)).toContain(
      `${ORIGIN}${WHAT_CAN_HAPPEN.path}?theme=bold#${REFUSAL_ANCHOR}`
    )
  })

  it("gives the band the name the link points at", () => {
    const anchors = anchorsIn(treeFor(WHAT_CAN_HAPPEN, CONTEXT).root)

    expect(anchors).toContain(REFUSAL_ANCHOR)
  })
})

describe("counting pieces", () => {
  it("counts every piece of a page, text included", () => {
    const ids = sequentialIdFactory("c")
    const node = buildElement(ids, {
      type: "loom.prose",
      props: {},
      children: [buildText(ids, "one")],
    })

    expect(piecesIn(node)).toBe(2)
  })

  it("says a small count in words, and falls back to the digit past the list", () => {
    expect(inWords(4)).toBe("Four")
    expect(inWords(0)).toBe("None")
    expect(inWords(42)).toBe("42")
  })
})
