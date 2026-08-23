import { applyDelta, type LoomTree } from "@loom/runtime"
import { describe, expect, it } from "vitest"

import { treeFor } from "../render"
import { DEFAULT_THEME, HOME } from "../site"
import { ASKS, type AskId } from "./asks"
import {
  APPROVED_SUFFIX,
  MAX_CHANGES,
  emptyHistory,
  readChangeSequence,
  runHistory,
  stillChangesSomething,
  tallyOf,
  withApproval,
  withChange,
  withoutLastChange,
  writeChangeSequence,
  type ChangeToken,
} from "./history"

/**
 * A run of changes, and what the page is able to say about it afterwards.
 *
 * The front door's band proves a change can be explained. This proves a
 * *history* can — that four requests in a row are still four answerable
 * questions, that each was judged against the page the one before it left, and
 * that the way back the record promises is the way back it has.
 *
 * Everything here is asserted against what the sequence actually did rather
 * than against a fixture, for the reason the front door's tests give: the page
 * is making these claims to a stranger in its own words, so a change to the
 * rules that quietly made them false has to fail here.
 */

const ORIGIN = "https://loom.example"

const front = (): LoomTree => treeFor(HOME, { origin: ORIGIN, theme: DEFAULT_THEME })

const tokensOf = (...asks: readonly (AskId | `${AskId}-yes`)[]): readonly ChangeToken[] =>
  readChangeSequence(asks.join("."))

/** The shape of the page, ignoring the revision counter each change bumped. */
const shapeOf = (page: LoomTree): string => JSON.stringify(page.root)

describe("a history in the address", () => {
  it("reads each request the site offers", () => {
    for (const ask of ASKS) {
      expect(readChangeSequence(ask.id)).toEqual([{ ask: ask.id, approved: false }])
    }
  })

  it("reads the visitor having said yes to one of them", () => {
    expect(readChangeSequence(`problem${APPROVED_SUFFIX}.shorter`)).toEqual([
      { ask: "problem", approved: true },
      { ask: "shorter", approved: false },
    ])
  })

  /**
   * The suffix has to be unambiguous, and it is only unambiguous while no
   * request is named for it. An ask id ending in `-yes` would silently become an
   * approval of some shorter id, which is the kind of failure that shows up as a
   * change landing that nobody asked to land.
   */
  it.each(ASKS)("$id cannot be mistaken for a request that was said yes to", (ask) => {
    expect(ask.id.endsWith(APPROVED_SUFFIX)).toBe(false)
  })

  it("survives an address nobody meant", () => {
    expect(readChangeSequence(undefined)).toEqual([])
    expect(readChangeSequence("")).toEqual([])
    expect(readChangeSequence("chartreuse.nonsense")).toEqual([])
    expect(readChangeSequence("proof.nonsense")).toEqual([{ ask: "proof", approved: false }])
  })

  it("takes the first of a repeated parameter", () => {
    expect(readChangeSequence(["proof", "shorter"])).toEqual([{ ask: "proof", approved: false }])
  })

  /**
   * The ceiling matters more here than anywhere else on the site: this page's
   * work is a function of its query string, so an address is an instruction
   * about how much of the deployment's afternoon to spend.
   */
  it("follows no more changes than it says it will", () => {
    const many = Array.from({ length: 40 }, () => "proof").join(".")

    expect(readChangeSequence(many)).toHaveLength(MAX_CHANGES)
  })

  it("writes what it reads, and reads what it writes", () => {
    const tokens = tokensOf("problem-yes", "shorter", "proof")

    expect(readChangeSequence(writeChangeSequence(tokens))).toEqual(tokens)
  })

  it("adds a request to the end, and takes the most recent one off", () => {
    const one = withChange([], "proof")

    expect(one).toEqual([{ ask: "proof", approved: false }])
    expect(withoutLastChange(withChange(one, "shorter"))).toEqual(one)
  })

  /**
   * By position, because the same request can be made twice in one history and
   * the visitor is answering one of them rather than both.
   */
  it("answers one held change and leaves the other alone", () => {
    const twice = withChange(withChange([], "problem"), "problem")

    expect(withApproval(twice, 2)).toEqual([
      { ask: "problem", approved: false },
      { ask: "problem", approved: true },
    ])
  })
})

describe("a run of changes", () => {
  it("is nothing at all before anyone has asked for anything", () => {
    const history = emptyHistory(front())

    expect(history.steps).toEqual([])
    expect(shapeOf(history.page)).toBe(shapeOf(history.start))
    expect(history.offered).toEqual(ASKS)
  })

  it("keeps one entry per request, in the order they were asked", async () => {
    const tokens = tokensOf("proof", "calmer", "shorter")
    const history = await runHistory(front(), tokens)

    expect(history.steps.map((step) => step.ask.id)).toEqual(["proof", "calmer", "shorter"])
    expect(history.steps.map((step) => step.position)).toEqual([1, 2, 3])
  })

  it("comes out the same way twice, so an address means one thing", async () => {
    const tokens = tokensOf("proof", "problem-yes", "shorter")
    const once = await runHistory(front(), tokens)
    const twice = await runHistory(front(), tokens)

    expect(shapeOf(twice.page)).toBe(shapeOf(once.page))
    expect(twice.steps.map((step) => step.record)).toEqual(once.steps.map((step) => step.record))
  })

  /**
   * The claim the whole page rests on: each request is answered against the page
   * the one before it left, not against the page the site publishes. Asking for
   * the same removal twice is the cheapest proof — the second time there is
   * nothing there to remove, and the rules are never even consulted.
   */
  it("judges each request against the page the one before it left", async () => {
    const history = await runHistory(front(), tokensOf("shorter", "shorter"))

    expect(history.steps[0]?.record.verdict).toBe("landed")
    expect(history.steps[1]?.record.verdict).toBe("nothing-to-do")
  })

  it("stops offering a request once it has nothing left to do", async () => {
    const removal = ASKS.find((ask) => ask.id === "shorter")
    if (removal === undefined) throw new Error("loom: the removal choice is gone")

    const history = await runHistory(front(), tokensOf("shorter"))

    expect(stillChangesSomething(history.start, removal)).toBe(true)
    expect(stillChangesSomething(history.page, removal)).toBe(false)
    expect(history.offered.map((ask) => ask.id)).not.toContain("shorter")
  })

  /**
   * Two runs of one request add two different bands.
   *
   * They did not, for as long as this page existed and no longer: one request
   * is one run and a run draws its ids from a factory that starts at one, so
   * the second addition asked the page to hold a piece it was already holding
   * and was correctly refused. The page's own words for that — "the change did
   * not fit this page" — were true and useless, because the change was fine and
   * the request had been made badly. A history says which run it is.
   */
  it("adds a second band when the same request is made twice", async () => {
    const history = await runHistory(front(), tokensOf("proof", "proof"))

    expect(history.steps.map((step) => step.record.verdict)).toEqual(["landed", "landed"])
    expect(history.steps.map((step) => step.record.measured)).toEqual([
      history.steps[0]?.record.measured,
      history.steps[0]?.record.measured,
    ])
  })

  it("stops offering the move once the band is where it was asked to be", async () => {
    const history = await runHistory(front(), tokensOf("problem-yes"))

    expect(history.steps[0]?.record.landed).toBe(true)
    expect(history.offered.map((ask) => ask.id)).not.toContain("problem")
  })

  /**
   * A refusal changes nothing, so it changes nothing about what comes next
   * either. The request stays on offer, which is the honest thing for a page
   * whose point is that the rule holds every time rather than once.
   */
  it("leaves the page alone when the rules refuse a request", async () => {
    const history = await runHistory(front(), tokensOf("drop-pitch"))

    expect(history.steps[0]?.record.verdict).toBe("refused")
    expect(shapeOf(history.page)).toBe(shapeOf(history.start))
    expect(history.offered.map((ask) => ask.id)).toContain("drop-pitch")
  })

  it("still refuses it three changes in, however the page has moved", async () => {
    const history = await runHistory(front(), tokensOf("proof", "calmer", "drop-pitch"))

    expect(history.steps[2]?.record.verdict).toBe("refused")
    expect(history.steps[2]?.record.verdictLine).toContain("front-door")
  })

  /**
   * A hold is a question, and answering it has to change the outcome — while
   * leaving the record saying that the rules stopped it first. Both halves, on
   * a history rather than on a single change.
   */
  it("applies a held change only once the visitor has said yes", async () => {
    const held = await runHistory(front(), tokensOf("problem"))
    const said = await runHistory(front(), tokensOf("problem-yes"))

    expect(held.steps[0]?.record.verdict).toBe("held")
    expect(held.steps[0]?.record.landed).toBe(false)
    expect(shapeOf(held.page)).toBe(shapeOf(held.start))

    expect(said.steps[0]?.record.verdict).toBe("approved")
    expect(said.steps[0]?.record.landed).toBe(true)
    expect(shapeOf(said.page)).not.toBe(shapeOf(said.start))
  })

  it("counts how it came out, and the counts are the entries", async () => {
    const history = await runHistory(front(), tokensOf("proof", "problem", "drop-pitch"))

    expect(tallyOf(history)).toEqual({ asked: 3, landed: 1, waiting: 1, refused: 1 })
  })
})

/**
 * The one assertion the page's honesty rests on.
 *
 * Every entry tells a visitor that the change which reverses it was written at
 * the same moment. On the most recent entry that sentence is also a button, and
 * the button is a link to the same history with the last request taken off —
 * which rebuilds the page from scratch. So the promise is only true if the
 * rebuilt page and the reversed page are the same page, and that is what this
 * checks, for every request that lands, at every depth in a history.
 */
describe("putting the most recent change back", () => {
  /**
   * Three changes deep, and never the request under test twice — the same
   * request made twice is a different assertion and it has its own test above.
   */
  const before = (last: AskId): readonly AskId[] =>
    (["proof", "calmer", "shorter"] as const).filter((id) => id !== last)

  it.each(ASKS.filter((ask) => ask.id !== "drop-pitch"))(
    "restores the page exactly, with $id asked last",
    async (ask) => {
      const tokens = tokensOf(...before(ask.id), `${ask.id}-yes` as `${AskId}-yes`)
      const history = await runHistory(front(), tokens)
      const step = history.steps[history.steps.length - 1]

      if (step === undefined) throw new Error("loom: the history ran nothing")
      if (step.undo === undefined) throw new Error(`loom: ${ask.id} landed with no way back`)

      const reversed = applyDelta(history.page, step.undo)
      const shorter = await runHistory(front(), withoutLastChange(tokens))

      expect(reversed.ok).toBe(true)
      if (!reversed.ok) return

      expect(shapeOf(reversed.value)).toBe(shapeOf(shorter.page))
    }
  )

  it("has nothing to put back when the rules refused the change", async () => {
    const history = await runHistory(front(), tokensOf("drop-pitch"))

    expect(history.steps[0]?.undo).toBeUndefined()
    expect(history.steps[0]?.record.undo).toContain("nothing to put back")
  })
})
