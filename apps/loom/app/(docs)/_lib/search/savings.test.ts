import { describe, expect, it } from "vitest"

import { buildSearchIndex, searchProse } from "./build"
import { addressedProse } from "./model"
import { roomIn } from "./room"
import {
  PROSE_SAVINGS,
  addressesChangedBy,
  priceOf,
  savingsPricedIn,
  savingsSentence,
  shownInstead,
} from "./savings"

/**
 * The five savings, priced, and the one reason none of them is the answer.
 *
 * **What this file is for.** `room.ts` says how long the next page on this site
 * may be and the answer is a few hundred words. The next run to read that will
 * reach for the obvious remedy — make the index smaller — and the obvious
 * remedy has five obvious shapes, one of which buys thirty times the room of
 * the one it would try first. Arguing about them in a paragraph would be a
 * paragraph; **pricing them is a table**, and `0353`'s alternatives section is
 * that table.
 *
 * So each test below is one row of it, or the reason the row is refused. The
 * refusal is *run*: a candidate's words go into a real index and a real query
 * comes back with the excerpt that candidate would have shown a reader. A
 * candidate described as costing the excerpt and found not to touch one fails
 * here beside its description, which is the same bargain `absences.ts` strikes
 * for a sentence about what Loom lacks.
 *
 * **It is not a test of the search box.** `match.ts` is tested in
 * `match.test.ts` and ranks better than this file ever should. What is here is
 * the join between a price and what it buys, so that a figure in a decision
 * record cannot go stale while still reading as a measurement.
 */

const savingOf = (id: string) => {
  const found = PROSE_SAVINGS.find((saving) => saving.id === id)

  if (found === undefined) throw new Error(`loom: no saving is registered as "${id}"`)

  return found
}

/** The section every price is quoted in, so two prices are comparable. */
const SECTION = "the-runtime"

const wordsOf = (text: string): readonly string[] => text.split(/\s+/u).filter((word) => word !== "")

describe("the registry", () => {
  it("prices every candidate, and is in the order its own comment claims", () => {
    const prices = savingsPricedIn(SECTION)

    expect(prices).toHaveLength(PROSE_SAVINGS.length)
    expect(prices.map((price) => price.id)).toEqual(PROSE_SAVINGS.map((saving) => saving.id))

    /*
     * Cheapest first is a claim in the module's own comment and the comment
     * draws a conclusion from it — that what a saving buys and what it takes
     * run together. An order that drifted would leave the conclusion standing
     * over an order that no longer shows it.
     */
    for (const [at, price] of prices.entries()) {
      const next = prices[at + 1]

      if (next !== undefined) expect(price.words, `${price.id} before ${next.id}`).toBeLessThan(next.words)
    }
  })

  /**
   * One candidate costs a reader nothing, and the registry says which.
   *
   * Held as a count rather than by name, because the sentence this file exists
   * to support is *every one of them but one takes something from the reader* —
   * and a second free candidate arriving would be news rather than a detail.
   */
  it("has exactly one candidate that takes nothing from a reader", () => {
    const free = PROSE_SAVINGS.filter((saving) => saving.costs.startsWith("Nothing"))

    expect(free.map((saving) => saving.id)).toEqual(["identical-bodies-once"])

    for (const saving of PROSE_SAVINGS) expect(saving.costs, saving.id).not.toBe("")
  })
})

describe("the free one, and what it is worth", () => {
  /**
   * **It recovers nothing, and that is the number this row exists to carry.**
   *
   * *Store the same words once* is the first thing anybody proposes about an
   * index with nineteen near-identical pages in it, and on this site it is
   * worth nought — because no two bodies are byte-identical. The reference
   * pages repeat *sentences*, not bodies: each door's words are the shared
   * bands plus its own exports, so every body differs somewhere.
   */
  it("changes no address, because no two bodies on this site are the same", () => {
    expect(addressesChangedBy(savingOf("identical-bodies-once"))).toEqual([])

    const words = addressedProse(buildSearchIndex().entries, searchProse())
      .map(([, body]) => body)
      .filter((body) => body !== "")

    expect(new Set(words).size).toBe(words.length)
  })

  it("leaves the room exactly as it was", () => {
    expect(priceOf(savingOf("identical-bodies-once"), SECTION).words).toBe(roomIn(SECTION).words)
  })

  /**
   * **And it really does store a repeated body once**, which the two cases
   * above cannot show: on this site there is nothing for it to do, so an
   * implementation that did nothing at all would pass both of them and the
   * registry's description of it would be a lie nobody could catch. Handed two
   * addresses with the same words, it keeps the first and empties the second.
   */
  it("stores a repeated body once, on words that are repeated", () => {
    expect(
      savingOf("identical-bodies-once").storedAs([
        ["/docs/one", "the same words"],
        ["/docs/other", "the same words"],
        ["/docs/third", "its own words"],
      ])
    ).toEqual([
      ["/docs/one", "the same words"],
      ["/docs/other", ""],
      ["/docs/third", "its own words"],
    ])
  })
})

describe("storing a repeated sentence once", () => {
  /**
   * The row that shows why compression is the thing being spent and not bytes.
   *
   * The reference pages share seven bands, so this candidate takes **a
   * fifteenth** of the stored text out — 16,598 bytes of it — and buys **about
   * a hundred words**. gzip has already been paid for that repetition: a
   * sentence written down for the nineteenth time costs a few bytes of
   * back-reference rather than its length, so removing it gives back the
   * back-reference and not the sentence.
   *
   * It is the strongest available argument that no amount of tidying reaches
   * this cap, which is why the raw figure and the compressed one are asserted
   * against each other rather than separately.
   */
  it("removes a fifteenth of the stored text and buys about a hundred words", () => {
    const today = priceOf(savingOf("identical-bodies-once"), SECTION)
    const price = priceOf(savingOf("repeated-sentences-once"), SECTION)

    expect(today.raw - price.raw).toBeGreaterThan(today.raw / 25)
    expect(price.words - today.words).toBeLessThan(200)
  })

  /**
   * What it costs, which is a row rather than a wording.
   *
   * The first page that says a shared sentence keeps it, so the top result for
   * a query answered by one is unchanged and the saving reads as free. The cost
   * is on every other page that says it: the sentence is no longer stored
   * there, so that page can no longer answer for it. `foldFamilies` in
   * `match.ts` refused the same trade in its other spelling — dropping a
   * repeated band from fifteen of the sixteen doors — and its comment says why:
   * *the import itself fails* would become findable on one door and nowhere
   * else.
   */
  it("takes a shared sentence off every door but the first", () => {
    const saving = savingOf("repeated-sentences-once")
    const changed = addressesChangedBy(saving)

    expect(changed.length).toBeGreaterThan(10)

    const shared = "Everything below is exported from that import."
    const storing = (bodies: readonly (readonly [string, string])[]): number =>
      bodies.filter(([, body]) => body.includes(shared)).length

    const bodies = addressedProse(buildSearchIndex().entries, searchProse()).filter(([, body]) => body !== "")

    expect(storing(bodies)).toBeGreaterThan(10)
    expect(storing(saving.storedAs(bodies))).toBe(1)
  })
})

/**
 * The three that rewrite the words, and the one sentence that refuses all of
 * them.
 *
 * **A body is shown as well as matched.** Each case below takes a query this
 * site answers, puts the candidate's words through the real index, and compares
 * the excerpt a reader would be handed with the one they are handed today. The
 * query is named in each case so that the failure reads as *this candidate
 * stopped changing what this query shows* rather than as an index that moved.
 */
describe("the three that rewrite the stored sentences", () => {
  const changesTheExcerpt = (id: string, query: string): void => {
    const shown = shownInstead(savingOf(id), query)

    expect(shown, `${query} answers with no prose excerpt`).toBeDefined()
    expect(shown?.today).not.toBe("")
    expect(shown?.instead, `${id} on "${query}"`).not.toBe(shown?.today)
  }

  it("lower-casing quotes the site's own words back in the wrong case", () => {
    changesTheExcerpt("lower-cased", "protected heading")
  })

  it("dropping the punctuation quotes a sentence with nothing between its clauses", () => {
    changesTheExcerpt("punctuation-dropped", "serverless")
  })

  it("dropping the function words quotes something that is not a sentence", () => {
    changesTheExcerpt("function-words-dropped", "serverless")
  })

  /**
   * The largest saving, priced and shown in the same case.
   *
   * It is the one worth a test of its own because it is the one a run would
   * take: more room than every other candidate here put together, for a quarter
   * of the stored bytes. What it spends is the excerpt — **a third of the words
   * come out of the line a reader is shown** — and the two halves are asserted
   * together so that neither can be quoted without the other.
   *
   * **The multiple was thirty until 13 November and is about five now.** The
   * candidate did not move; the site's own room did, from 373 words to 2,693,
   * when the prose files stopped writing an address beside every body. A ratio
   * is a fact about both of its numbers, and this one was mostly a fact about
   * how little room there was — which is worth knowing about any sentence of
   * the form *n times the room*, this one included.
   */
  it("buys five times the room, out of a third of the words in the row", () => {
    const price = priceOf(savingOf("function-words-dropped"), SECTION)

    expect(price.words).toBeGreaterThan(roomIn(SECTION).words * 4)

    const shown = shownInstead(savingOf("function-words-dropped"), "serverless")
    const today = wordsOf(shown?.today ?? "").length
    const instead = wordsOf(shown?.instead ?? "").length

    expect(today).toBeGreaterThan(10)
    expect(instead).toBeLessThan(today * 0.8)
  })

  /**
   * And the cost the wording does not show: which page answers.
   *
   * `searchTerms` splits what somebody typed and `scoreTerm` requires every one
   * of those words to be found somewhere. Taking the small words out of the
   * stored body does not take them out of the query — so a phrase does not stop
   * matching, which was measured and is why this case says *which page* rather
   * than *whether*. The words are still found, in a title, a section, a summary
   * or a block, and the row a reader is handed is no longer the sentence that
   * says the phrase.
   */
  it("changes which sentence answers a phrase, rather than whether one does", () => {
    const shown = shownInstead(savingOf("function-words-dropped"), "no second way in")

    expect(shown?.today).toContain("not a way past the Gate")
    expect(shown?.instead).not.toBe("")
    expect(shown?.instead).not.toContain("not a way past the Gate")
  })
})

describe("what a run reaching for one of these is told", () => {
  it("names the largest, its price, and where the real candidates are", () => {
    const sentence = savingsSentence(SECTION)
    const best = savingsPricedIn(SECTION).reduce((most, price) => (price.words > most.words ? price : most))

    expect(sentence).toContain(best.id)
    expect(sentence).toContain(best.words.toLocaleString("en-GB"))
    expect(sentence).toContain("0353")
    /** The reason, in the words the module states it in — not a paraphrase. */
    expect(sentence).toContain("shown as well as matched")
  })
})
