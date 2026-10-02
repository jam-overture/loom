import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { READER_SIGNAL_KINDS } from "@jam-overture/loom/signals"
import { describe, expect, it } from "vitest"

import { produceAddressedMarkup } from "./markup"
import { produceApproved, produceBatch, produceKinds, produceReadBack } from "./page"

/**
 * What *What your readers do* says in its own words, held against what it shows.
 *
 * The blocks on that page are produced and cannot lie. The prose around them
 * can: it tells a reader which row of a table to look at, it quotes a node id
 * out of the batch below it, and it names the two entry points and the size
 * difference between them. Every one of those is typed by hand and is a claim
 * about something further down the same page.
 *
 * A number that drifted would leave the page confidently wrong rather than
 * merely out of date, and nothing renders differently when it does.
 *
 * The first group below is the opposite check, and it is here because the page
 * got one of these wrong in the direction nobody guards against. The prose was
 * *accurate* — it said four, and there were four — and it was pinned, and being
 * pinned to an accurate number is what made a correct runtime change into a
 * broken build for every lane. So that group asserts what the page may **not**
 * say about itself.
 */

const page = readFileSync(
  fileURLToPath(new URL("../../docs/the-runtime/what-your-readers-do/page.mdx", import.meta.url)),
  "utf8"
)

/** The prose with its line breaks flattened — every sentence here is hard-wrapped. */
const flowed = page.replace(/\s+/g, " ")

describe("the size of the vocabulary, which this page may not state", () => {
  /**
   * This page used to open *"Four things, and nothing else"* and close the
   * section with *"There is no fifth kind"*, and both were pinned here. They
   * were true, they were well written, and between them they stopped the runtime
   * from growing for three days: `completed` was approved, and adding it would
   * have reddened this suite for every lane at once.
   *
   * The rule that replaced them is that **the page never counts out loud.** The
   * count is the runtime's to state, and it states it in the caption of a block
   * that is built by walking `READER_SIGNAL_KINDS`. A sentence in prose cannot
   * do that, so prose does not get to try.
   */
  it("prints as many kinds as the runtime publishes", () => {
    expect(produceKinds().length).toBe(READER_SIGNAL_KINDS.length)
  })

  it("no longer argues a number in its prose", () => {
    expect(flowed).not.toContain("Four things, and nothing else.")
    expect(flowed).not.toContain("There is no fifth kind")
  })

  /**
   * The one surviving "N kinds" on the page is the sentence describing what the
   * *live block* asks for, which is a property of that component's `TYPES` and is
   * pinned against it further down this file. It is not a claim about how many
   * kinds exist, and it stays true when a fifth arrives.
   *
   * Anything else matching would be a new count somebody typed into a paragraph,
   * which is the thing this page is not allowed to have.
   */
  it("counts kinds in exactly one sentence, and that sentence is about the live block", () => {
    const counted = [...flowed.matchAll(/\b(one|two|three|four|five|six|seven)\s+kinds\b/gi)].map(
      (found) => found[0]?.toLowerCase() ?? ""
    )

    expect(counted).toEqual(["four kinds"])
    expect(flowed).toContain("That one asks for four kinds, each about a different part of the page")
  })

  /**
   * This replaced a test that required every kind to be named **in the prose**,
   * and that test was the second thing standing in `completed`'s way: a kind
   * whose whole design is that it reaches the page through a producer rather
   * than through a paragraph could never satisfy it. It was noticed by adding
   * the kind to the runtime locally and running this suite, which is the only
   * way it would have been noticed before the day it mattered.
   *
   * What replaces it is the check that is still worth making now that the prose
   * is not allowed to enumerate: the prose may fall *behind* the runtime, naming
   * a kind that has been dropped. Every kind this page names in code voice is
   * either one the runtime has, or `hovered` — the one that was asked for and
   * turned down, which the page names on purpose.
   */
  const CANDIDATE_KINDS = [
    "viewed",
    "dwelled",
    "activated",
    "disclosed",
    "completed",
    "hovered",
    "scrolled",
    "purchased",
  ] as const

  it("names no kind the runtime does not have, except the one it turned down", () => {
    const named = CANDIDATE_KINDS.filter((kind) => flowed.includes(`\`${kind}\``))
    const notInTheRuntime = named.filter(
      (kind) => !(READER_SIGNAL_KINDS as readonly string[]).includes(kind)
    )

    expect(named.length).toBeGreaterThan(1)
    expect(notInTheRuntime).toEqual(["hovered"])
  })

  /**
   * The opening sentence's plain-words list is produced, so the page's first
   * description of what a signal is grows with the vocabulary. If somebody
   * inlines it back into the prose this fails, which is the point.
   */
  it("writes its opening list from the runtime rather than typing it", () => {
    expect(flowed).toContain("what happened to it: <WhatAPageMaySay />")
    expect(flowed).not.toContain("which part someone looked at")
  })

  /**
   * The coming addition is announced only by a component that empties itself.
   * A sentence in the prose saying one is coming would outlive the thing it
   * announced, and there is no way to make MDX notice that it had.
   */
  it("keeps the coming addition out of the prose entirely", () => {
    expect(flowed).toContain("<TheApprovedAddition />")

    for (const kind of produceApproved().map((row) => row.kind)) {
      expect(flowed, `the prose names ${kind}, which it cannot un-name later`).not.toContain(kind)
    }
  })

  /**
   * The refused kind is the argument the count used to be making, and it does it
   * better: a list that has turned something down is closed, a list that is
   * merely short is not.
   */
  it("makes the closed-list argument with the kind that was refused", () => {
    expect(flowed).toContain("`hovered`")
    expect(flowed).toContain("it does not exist on a touchscreen")
    expect(flowed).toContain("A list that takes every reasonable suggestion is not closed")
  })
})

describe("the paragraph that introduces the caveats", () => {
  /**
   * The *does not mean* line on every row is the one thing on this page a reader
   * could mistake for hedging, so there is a paragraph above the panel saying
   * what it is for — the plain version first, the concrete case before the rule,
   * which is this site's own order.
   *
   * It is held here because it is the one half of this unit that is prose: the
   * sentences themselves are produced and `gaps.test.tsx` makes each of them
   * happen, and nothing would notice if the paragraph that tells a reader to read
   * them went away.
   */
  it("tells a reader the second line is there, before the panel is", () => {
    const panel = flowed.indexOf("<TheVocabulary />")
    const promise = flowed.indexOf("says what it means and, behind a line, what it does **not**")

    expect(promise).toBeGreaterThan(-1)
    expect(promise).toBeLessThan(panel)
  })

  /** The rule, stated as a property of names rather than as an apology. */
  it("says why every one of these names falls short of the fact", () => {
    expect(flowed).toContain("Every one of these names is shorter than the fact it stands for")
  })

  /**
   * The concrete case before the general rule, and it is the kind the finding
   * behind this unit was filed about.
   */
  it("makes the case with the kind a page cannot observe", () => {
    expect(flowed).toContain("`completed` is the plainest case")
    expect(flowed).toContain(
      "a page can see a form let go, and it cannot see whether anything, anywhere, accepted it"
    )
  })

  /**
   * Two sections of this page now say *does not*, about different things, and a
   * reader meeting both needs to be told they are different. One is privacy —
   * what is deliberately left out of a signal. The other is physics — what a
   * browser is able to observe at all.
   */
  it("separates it from what a signal does not carry", () => {
    expect(flowed).toContain("Different from *what a signal does not carry*, further down")
    expect(flowed).toContain("what a browser is able to see at all")
    expect(flowed.indexOf("## What a signal does not carry")).toBeGreaterThan(
      flowed.indexOf("Different from *what a signal does not carry*")
    )
  })
})

describe("the rows this page points at", () => {
  /**
   * "The fourth row is the interesting one" is an instruction to look at a
   * specific line of a produced table. Reordering that table silently turns this
   * sentence into a lie, and this is the only thing that would notice.
   */
  it("has the content-carrying signal fourth in the read-back table", () => {
    const rows = produceReadBack()

    expect(flowed).toContain("The fourth row is the interesting one")
    expect(rows[3]?.what).toContain("words a reader saw")
    expect(rows[3]?.accepted).toBe(false)
  })
})

describe("the node id this page quotes", () => {
  /**
   * The page says `n_readersignals8` at revision 0 means one thing forever. It
   * is quoted out of the batch printed two blocks below, and an edit to the
   * example tree can renumber it.
   */
  it("is an address really in the batch below it", () => {
    const quoted = /`(n_readersignals\d+)` at revision (\d+)/.exec(flowed)

    expect(quoted, "the page no longer quotes a node id").not.toBeNull()

    const batch = JSON.parse(produceBatch().json) as {
      readonly revision: number
      readonly signals: readonly { readonly nodeId: string }[]
    }

    expect(batch.signals.map((signal) => signal.nodeId)).toContain(quoted?.[1])
    expect(String(batch.revision)).toBe(quoted?.[2])
  })
})

describe("what the page says addressing costs", () => {
  it("claims two attributes per element, and the render writes two", () => {
    expect(flowed).toContain("Two attributes per decorated element")
    expect(produceAddressedMarkup().onAnElement.length).toBe(2)
  })

  it("claims the root additionally carries the tree and the revision", () => {
    expect(flowed).toContain("the tree and revision on the root")
    expect(produceAddressedMarkup().onTheRoot.length).toBe(2)
  })
})

describe("the two entry points", () => {
  /**
   * The callout tells a reader to import the broadcaster from the browser entry
   * and the parser from the plain one. The live component on this page is the
   * thing that would be caught doing otherwise — it is in the same bundle the
   * callout is describing.
   */
  const live = readFileSync(
    fileURLToPath(new URL("../../_components/reader-signals-live.tsx", import.meta.url)),
    "utf8"
  )

  it("tells a reader to import the broadcaster from the browser entry", () => {
    expect(flowed).toContain("Import it from `@jam-overture/loom/signals/broadcast`")
  })

  it("is followed by this page's own live block, which imports it that way", () => {
    expect(live).toContain('from "@jam-overture/loom/signals/broadcast"')
    expect(live).not.toMatch(/^import \{[^}]*\} from "@jam-overture\/loom\/signals"$/m)
  })

  it("sends the reader to the plain entry for parsing", () => {
    expect(flowed).toContain('import { parseReaderSignalBatch } from "@jam-overture/loom/signals"')
  })

  /**
   * The paragraph under the live block tells a reader which kind is being asked
   * for about which part of the page. That is a claim about the `TYPES` constant
   * in the component directly above it, and the two are edited months apart.
   */
  it("describes the live block's configuration as the live block configures it", () => {
    const types = /const TYPES = \{([\s\S]*?)\n\} as const/.exec(live)?.[1] ?? ""

    expect(types, "the live block no longer has a TYPES constant").not.toBe("")

    const asks = (kind: string): readonly string[] =>
      [...(new RegExp(`${kind}: \\[([^\\]]*)\\]`).exec(types)?.[1] ?? "").matchAll(/"([^"]+)"/g)].map(
        (found) => found[1] ?? ""
      )

    expect(asks("viewed")).toEqual(["loom.section", "loom.faq-list"])
    expect(asks("dwelled")).toEqual(["loom.section"])
    expect(asks("activated")).toEqual(["loom.action", "loom.link"])
    expect(asks("disclosed")).toEqual(["loom.faq"])

    expect(flowed).toContain("`viewed` for the two sections and the questions band")
    expect(flowed).toContain("`dwelled` for the sections only")
    expect(flowed).toContain("`activated` for the link and the call to action")
    expect(flowed).toContain("`disclosed` for the questions")
  })
})

describe("the limits this page admits to", () => {
  /**
   * Three of these are open findings against other lanes, and the page's value
   * rests on saying so rather than describing a seam that is finished. A run
   * that quietly dropped one would be the documentation drifting *towards*
   * optimism, which is the direction that costs a reader most.
   */
  it("says nothing stores or interprets signals yet", () => {
    expect(flowed).toContain("Nothing stores or interprets these")
  })

  it("says a broadcaster watches only the nodes present when it started", () => {
    expect(flowed).toContain("watches the nodes that were there when it started")
  })

  it("says a new revision needs a new broadcast", () => {
    expect(flowed).toContain("A new revision is a new broadcast")
  })

  it("says consent is the host's, not the runtime's", () => {
    expect(flowed).toContain("It does not give you a lawful basis")
  })
})
