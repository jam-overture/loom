import { applyDelta, type LoomTree } from "@loom/runtime"
import { describe, expect, it } from "vitest"

import { treeFor } from "../render"
import { DEFAULT_THEME, HOME } from "../site"
import { ASKS, type AskId } from "./asks"
import {
  APPROVED_SUFFIX,
  MAX_CHANGES,
  PUT_BACK_SUFFIX,
  emptyHistory,
  readChangeSequence,
  runHistory,
  stillChangesSomething,
  tallyOf,
  withApproval,
  withChange,
  withPutBack,
  withPutBackApproval,
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

/** A token as the address spells it: the request, and any answers given about it. */
type WrittenToken = `${AskId}${"" | "-yes"}${"" | "-back"}${"" | "-yes"}`

const tokensOf = (...asks: readonly WrittenToken[]): readonly ChangeToken[] =>
  readChangeSequence(asks.join("."))

/** A request nobody has answered anything about, which is what a fresh press writes. */
const plain = (ask: AskId): ChangeToken => ({
  ask,
  approved: false,
  putBack: false,
  putBackApproved: false,
})

/** The shape of the page, ignoring the revision counter each change bumped. */
const shapeOf = (page: LoomTree): string => JSON.stringify(page.root)

/**
 * The same, ignoring the ids as well.
 *
 * A request draws its ids from a factory namespaced by its position, so the
 * *third* request to add a band adds the same band under different ids from the
 * first. That is deliberate and it is what stops two runs of one request
 * colliding — see `runHistory` — so two histories that arrive at the same
 * arrangement by different routes are equal in every way but this. Comparing
 * with the ids in would be asserting that they took the same route, which is the
 * opposite of what these tests are about.
 */
const arrangementOf = (page: LoomTree): string => shapeOf(page).replace(/"id":"[^"]*"/g, '"id":""')

describe("a history in the address", () => {
  it("reads each request the site offers", () => {
    for (const ask of ASKS) {
      expect(readChangeSequence(ask.id)).toEqual([plain(ask.id)])
    }
  })

  it("reads the visitor having said yes to one of them", () => {
    expect(readChangeSequence(`problem${APPROVED_SUFFIX}.shorter`)).toEqual([
      { ...plain("problem"), approved: true },
      plain("shorter"),
    ])
  })

  /**
   * The four readings the grammar has to keep apart, and the reason it is read
   * right to left: a trailing `-yes` belongs to the undo only when what it
   * leaves behind ends in `-back`.
   */
  it("reads a request, its answer, its undo and the undo's answer apart", () => {
    expect(readChangeSequence("problem")).toEqual([plain("problem")])
    expect(readChangeSequence(`problem${APPROVED_SUFFIX}`)).toEqual([
      { ...plain("problem"), approved: true },
    ])
    expect(readChangeSequence(`problem${PUT_BACK_SUFFIX}`)).toEqual([
      { ...plain("problem"), putBack: true },
    ])
    expect(readChangeSequence(`problem${APPROVED_SUFFIX}${PUT_BACK_SUFFIX}${APPROVED_SUFFIX}`)).toEqual(
      [{ ask: "problem", approved: true, putBack: true, putBackApproved: true }]
    )
  })

  /**
   * The suffixes have to be unambiguous, and they are only unambiguous while no
   * request is named for either. An ask id ending in `-yes` would silently become
   * an approval of some shorter id, which is the kind of failure that shows up as
   * a change landing that nobody asked to land; one ending in `-back` would show
   * up as a page putting a change back on its own.
   */
  it.each(ASKS)("$id cannot be mistaken for an answer about another request", (ask) => {
    expect(ask.id.endsWith(APPROVED_SUFFIX)).toBe(false)
    expect(ask.id.endsWith(PUT_BACK_SUFFIX)).toBe(false)
  })

  it("survives an address nobody meant", () => {
    expect(readChangeSequence(undefined)).toEqual([])
    expect(readChangeSequence("")).toEqual([])
    expect(readChangeSequence("chartreuse.nonsense")).toEqual([])
    expect(readChangeSequence("proof.nonsense")).toEqual([plain("proof")])
    expect(readChangeSequence(PUT_BACK_SUFFIX)).toEqual([])
    expect(readChangeSequence(`nonsense${PUT_BACK_SUFFIX}`)).toEqual([])
  })

  it("takes the first of a repeated parameter", () => {
    expect(readChangeSequence(["proof", "shorter"])).toEqual([plain("proof")])
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
    const tokens = tokensOf("problem-yes-back-yes", "shorter-back", "proof")

    expect(readChangeSequence(writeChangeSequence(tokens))).toEqual(tokens)
  })

  /** An undo nobody asked for cannot be written by an answer to one. */
  it("never writes the undo's answer without the undo", () => {
    const answered = withPutBackApproval(withChange([], "proof"), 1)

    expect(writeChangeSequence(answered)).toBe("proof")
    expect(readChangeSequence(writeChangeSequence(answered))).toEqual([plain("proof")])
  })

  it("adds a request to the end", () => {
    expect(withChange([], "proof")).toEqual([plain("proof")])
  })

  /**
   * By position, because the same request can be made twice in one history and
   * the visitor is answering one of them rather than both.
   */
  it("answers one held change and leaves the other alone", () => {
    const twice = withChange(withChange([], "problem"), "problem")

    expect(withApproval(twice, 2)).toEqual([plain("problem"), { ...plain("problem"), approved: true }])
  })

  /**
   * Putting one back is an addition to the sequence, not a subtraction from it.
   *
   * The address keeps saying the change was asked for, and says an undo of it
   * followed. That is the whole difference between this and the `tokens.slice(0,
   * -1)` the button used to write, and it is why the record can tell the two
   * apart afterwards.
   */
  it("puts one back by answering it rather than by dropping it", () => {
    const two = withChange(withChange([], "proof"), "shorter")

    expect(writeChangeSequence(withPutBack(two, 2))).toBe("proof.shorter-back")
    expect(writeChangeSequence(withPutBackApproval(withPutBack(two, 2), 2))).toBe(
      "proof.shorter-back-yes"
    )
    expect(withPutBack(two, 2)[0]).toEqual(plain("proof"))
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

    expect(tallyOf(history)).toEqual({ asked: 3, landed: 1, waiting: 1, refused: 1, putBack: 0 })
  })

  it("counts an undo among the requests, because it is one", async () => {
    const history = await runHistory(front(), tokensOf("proof", "shorter-back"))

    expect(tallyOf(history)).toEqual({ asked: 3, landed: 3, waiting: 0, refused: 0, putBack: 1 })
  })
})

/**
 * The one assertion the page's honesty rests on.
 *
 * Every entry tells a visitor that the change which reverses it was written at
 * the same moment. On the most recent entry that sentence is also a button —
 * and until 6 September the button was a link to the same history with the last
 * request taken off, which rebuilds the page from the published one with that
 * request never made. The result is the same arrangement reached a different
 * way, and the difference between those two things is what this site sells.
 *
 * The button now runs the inverse. Both halves are checked here: that the undo
 * really restores what the change moved, **and** that the arrangement it reaches
 * is still the one replaying without the request reaches — for every request
 * that lands, at every depth in a history. The second is what makes the first
 * believable rather than merely asserted.
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
      const tokens = tokensOf(...before(ask.id), `${ask.id}-yes` as WrittenToken)
      const history = await runHistory(front(), tokens)
      const step = history.steps[history.steps.length - 1]

      if (step === undefined) throw new Error("loom: the history ran nothing")
      if (step.undo === undefined) throw new Error(`loom: ${ask.id} landed with no way back`)

      const reversed = applyDelta(history.page, step.undo)
      const replayed = await runHistory(front(), tokens.slice(0, -1))

      expect(reversed.ok).toBe(true)
      if (!reversed.ok) return

      expect(shapeOf(reversed.value)).toBe(shapeOf(replayed.page))
    }
  )

  /**
   * The same claim again, made by the page rather than by this file.
   *
   * Above, the test applies the inverse itself. Here the address asks for it and
   * the history runs it through interpretation, measurement and the rules — and
   * the page that comes out the far end is still the one replaying without the
   * request reaches. If those ever part company, the button is lying.
   */
  it.each(ASKS.filter((ask) => ask.id !== "drop-pitch"))(
    "reaches the same page by running the undo, with $id asked last",
    async (ask) => {
      const tokens = tokensOf(...before(ask.id), `${ask.id}-yes` as WrittenToken)
      const last = tokens.length

      /**
       * Both answers given, because one of these requests is held by the rules
       * and so is its undo. Answering an undo nothing held changes nothing —
       * `runUndo` never consults it once the change has applied — so the same
       * address covers every request the site offers.
       */
      const undone = await runHistory(
        front(),
        withPutBackApproval(withPutBack(tokens, last), last)
      )
      const replayed = await runHistory(front(), tokens.slice(0, -1))

      expect(undone.steps[undone.steps.length - 1]?.record.landed).toBe(true)
      expect(shapeOf(undone.page)).toBe(shapeOf(replayed.page))
    }
  )

  it("keeps the undo as an entry of its own, with the change still in the list", async () => {
    const history = await runHistory(front(), tokensOf("calmer", "proof-back"))

    expect(history.steps.map((step) => step.putsBack)).toEqual([undefined, undefined, 2])
    expect(history.steps.map((step) => step.ask.id)).toEqual(["calmer", "proof", "proof"])
    expect(history.steps[2]?.record.putBack).toBe(true)
    expect(history.steps[2]?.record.landed).toBe(true)
  })

  /**
   * The best thing on this page, and it was not arranged.
   *
   * `problem` moves the band this site protects, so the rules hold it and the
   * visitor says yes. Putting it back moves that same protected band again — so
   * **the rules hold the undo too**, and there is no way past it but the same
   * yes. That falls out of not exempting an undo; the only way to lose it is to
   * cheat.
   */
  it("puts the undo to the same rules that held the change", async () => {
    const held = await runHistory(front(), tokensOf("problem-yes-back"))
    const allowed = await runHistory(front(), tokensOf("problem-yes-back-yes"))

    /** Held: the change is still on the page, because the undo did not land. */
    expect(held.steps[0]?.record.landed).toBe(true)
    expect(held.steps[1]?.record.awaitingYou).toBe(true)
    expect(held.steps[1]?.record.landed).toBe(false)
    expect(shapeOf(held.page)).not.toBe(shapeOf(held.start))

    /** Allowed: the same rules, the same hold, one more yes, and the page is back. */
    expect(allowed.steps[1]?.record.verdict).toBe("approved")
    expect(allowed.steps[1]?.record.landed).toBe(true)
    expect(shapeOf(allowed.page)).toBe(shapeOf(allowed.start))
  })

  /**
   * The undo is a request in the sequence, so what follows it is judged against
   * the page it left — which is the whole reason the grammar puts it inside a
   * token rather than at the end of the address.
   */
  it("carries on from the restored page when more is asked after an undo", async () => {
    const history = await runHistory(front(), tokensOf("proof-back", "proof"))
    const straight = await runHistory(front(), tokensOf("proof"))

    expect(history.steps.map((step) => step.record.verdict)).toEqual([
      "landed",
      "landed",
      "landed",
    ])
    expect(arrangementOf(history.page)).toBe(arrangementOf(straight.page))
  })

  it("has nothing to put back when the rules refused the change", async () => {
    const history = await runHistory(front(), tokensOf("drop-pitch"))

    expect(history.steps[0]?.undo).toBeUndefined()
    expect(history.steps[0]?.record.undo).toContain("nothing to put back")
  })

  /**
   * An address asking to reverse something that never happened is a page, not a
   * 400 — the same rule the rest of this grammar follows.
   */
  it("drops the undo of a request that changed nothing", async () => {
    const history = await runHistory(front(), tokensOf("drop-pitch-back"))

    expect(history.steps).toHaveLength(1)
    expect(history.steps[0]?.putsBack).toBeUndefined()
    expect(shapeOf(history.page)).toBe(shapeOf(history.start))
  })
})
