import {
  sequentialIdFactory,
  systemClock,
  type EditIntent,
  type LoomNode,
  type LoomTree,
} from "@loom/runtime"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { RESERVED_VOCABULARY } from "../copy"
import type { PageContext } from "../pages/home"
import { askRunFor, renderTree, treeFor } from "../render"
import { HOME, askHref, type SiteThemeName } from "../site"
import { wordsOf } from "../words"
import { BAND } from "../bands"
import { ASKS, askById, type Ask } from "./asks"
import type { ChangeRecord } from "./record"
import { FRONT_DOOR_POLICY, runAsk } from "./run"
import { PUT_IT_BACK, runUndo, undoInterpreter } from "./undo"

/**
 * The button that says *Put it back*, doing it.
 *
 * For two weeks it was a link to `/`, and the page it produced looked exactly
 * right — because a landing page rebuilt from its source resembles the page a
 * visitor changed in every way except the one this product is about. The site's
 * own fifth rung promises the pieces come *back* rather than being written out
 * again, and the questions band promises the undo is weighed and recorded like
 * anything else. Neither was happening on the front door.
 *
 * So everything below is one of those two sentences, held against what the
 * sequence actually did: the undo is judged, it is recorded, and the page it
 * leaves is the page the visitor arrived on rather than a copy of it.
 */

const ORIGIN = "https://loom.example"
const THEME: SiteThemeName = "minimal"

const contextFor = (context: Partial<PageContext> = {}): PageContext => ({
  origin: ORIGIN,
  theme: THEME,
  ...context,
})

const basePage = (): LoomTree => treeFor(HOME, contextFor())

/** The shape of the page, ignoring the revision counter each change bumped. */
const shapeOf = (page: LoomTree): string => JSON.stringify(page.root)

/**
 * A change and its undo, run the way the route runs them.
 *
 * Every ask that lands at all lands with the visitor's yes, so the tests below
 * approve by default: `problem` is held on arrival and the other three are not,
 * and saying yes to a change nobody stopped changes nothing about it.
 */
const changeThenUndo = async (
  ask: Ask,
  approveUndo = false
): Promise<{ readonly base: LoomTree; readonly page: LoomTree; readonly undone: boolean }> => {
  const base = basePage()
  const run = await runAsk(base, ask, true)

  if (run.undo === undefined) return { base, page: run.page, undone: false }

  const back = await runUndo(run.page, ask, run.undo, approveUndo)

  return { base, page: back.page, undone: back.record.landed }
}

const markupOf = (page: LoomTree): string => renderToStaticMarkup(renderTree(page).element)

/**
 * Every address the page offers, off the tree rather than out of the markup.
 *
 * Rendered markup escapes the `&` between two query parameters, so a link
 * assertion written against the HTML compares `?ask=x&approve=1` with
 * `?ask=x&amp;approve=1` and never matches. That is survivable for a positive
 * assertion, which fails loudly; it is not survivable for a negative one, which
 * passes whatever the page contains. Both are asserted here, so both read the
 * hrefs the nodes actually hold.
 */
const hrefsIn = (node: LoomNode): readonly string[] => {
  const own =
    node.kind === "element" && typeof node.props["href"] === "string" ? [node.props["href"]] : []

  return node.kind === "text" ? [] : [...own, ...node.children.flatMap(hrefsIn)]
}

const hrefsOf = (page: LoomTree): readonly string[] => hrefsIn(page.root)

/**
 * One band of the page, found by what it calls itself rather than by where it
 * sits — the same rule the outline follows, and for the same reason: "the panel
 * is the fourth child" is a fact about today's page that a re-ordered band would
 * quietly break, and quietly is the problem.
 */
const bandOf = (page: LoomTree, eyebrow: string): LoomNode => {
  const found = page.root.children.find(
    (child) => child.kind === "element" && child.props["eyebrow"] === eyebrow
  )

  if (found === undefined) throw new Error(`loom: the page has no band called "${eyebrow}"`)

  return found
}

/** The four that land. `drop-pitch` is refused and has nothing to put back. */
const REVERSIBLE: readonly Ask[] = ASKS.filter((ask) => ask.id !== "drop-pitch")

describe("what the button now does", () => {
  it.each(REVERSIBLE)("$id can be put back, and the page comes back with it", async (ask) => {
    const { base, page, undone } = await changeThenUndo(ask, true)

    expect(undone).toBe(true)
    expect(shapeOf(page)).toBe(shapeOf(base))
  })

  /**
   * The claim the fifth rung makes, separated out from the one above it.
   *
   * Identical markup would be satisfied by a page rebuilt from source, which is
   * exactly what this change stopped doing — so what is asserted is that the
   * revision counter moved. The page a visitor is left with has been changed
   * twice and is not the tree the builder produced.
   */
  it.each(REVERSIBLE)("$id leaves a page that was restored rather than rebuilt", async (ask) => {
    const { base, page } = await changeThenUndo(ask, true)

    expect(page.revision).toBeGreaterThan(base.revision)
    expect(shapeOf(page)).toBe(shapeOf(base))
  })

  it("offers nothing to put back when the rules refused the change", async () => {
    const refused = askById("drop-pitch")

    if (refused === undefined) throw new Error("loom: the refused choice is not offered")

    const run = await runAsk(basePage(), refused, true)

    expect(run.record.landed).toBe(false)
    expect(run.undo).toBeUndefined()
  })
})

describe("the undo is a change, and is judged like one", () => {
  it.each(REVERSIBLE)("$id's undo is decided by the rules this site publishes", async (ask) => {
    const run = await runAsk(basePage(), ask, true)

    if (run.undo === undefined) throw new Error(`loom: ${ask.id} landed without an undo`)

    const back = await runUndo(run.page, ask, run.undo)

    expect(back.record.verdictLine).toContain(FRONT_DOOR_POLICY.policyId)
    expect(back.record.measured).not.toBe("Nothing changed, in no steps.")
  })

  it.each(REVERSIBLE)("$id's undo quotes the visitor rather than the machinery", async (ask) => {
    const run = await runAsk(basePage(), ask, true)

    if (run.undo === undefined) throw new Error(`loom: ${ask.id} landed without an undo`)

    const back = await runUndo(run.page, ask, run.undo)

    expect(back.record.asked).toBe(PUT_IT_BACK)
    expect(back.record.putBack).toBe(true)
    expect(back.record.ask).toBe(ask.id)
  })

  /**
   * The one that makes the band worth building, and it was not arranged.
   *
   * *Get to the point* moves the band this site protects, so the rules hold it
   * and the visitor answers. Putting it back **moves that same protected band
   * again**, so the rules hold the undo too — and there is no way round it but
   * the same yes. Nothing here exempts an undo to make the demonstration tidier,
   * and this is the assertion that would fail if anything ever did.
   */
  it("holds the undo of a held change, and lets the visitor answer it", async () => {
    const ask = askById("problem")

    if (ask === undefined) throw new Error("loom: the held choice is not offered")

    const base = basePage()
    const run = await runAsk(base, ask, true)

    if (run.undo === undefined) throw new Error("loom: the approved change landed without an undo")

    const asked = await runUndo(run.page, ask, run.undo, false)

    expect(asked.record.awaitingYou).toBe(true)
    expect(asked.record.landed).toBe(false)
    expect(shapeOf(asked.page)).toBe(shapeOf(run.page))

    const answered = await runUndo(run.page, ask, run.undo, true)

    expect(answered.record.verdict).toBe("approved")
    expect(shapeOf(answered.page)).toBe(shapeOf(base))
  })

  /**
   * An undo written for one arrangement of the page is not offered against
   * another, which is the stale proposal the whole sequence exists to catch.
   */
  it("declines an undo written against a page that has since moved", async () => {
    const ask = askById("calmer")

    if (ask === undefined) throw new Error("loom: the settings choice is not offered")

    const run = await runAsk(basePage(), ask, true)

    if (run.undo === undefined) throw new Error("loom: the change landed without an undo")

    const ids = sequentialIdFactory("stale")
    const interpreter = undoInterpreter(run.undo, ids, systemClock)
    const intent: EditIntent = {
      intentId: ids.intentId(),
      treeId: run.page.treeId,
      baseRevision: run.page.revision,
      origin: "user-instruction",
      utterance: PUT_IT_BACK,
      observedAt: systemClock.now(),
    }

    /** Against the page it was written for: a proposal. */
    expect((await interpreter.interpret(intent, run.page)).ok).toBe(true)
    /** Against the page as it is published, which the change has not been applied to: none. */
    expect((await interpreter.interpret(intent, basePage())).ok).toBe(false)
  })
})

describe("what the visitor reads afterwards", () => {
  it("shows one record before the change is put back and two after", async () => {
    const one = await askRunFor(contextFor({ ask: "proof" }))
    const two = await askRunFor(contextFor({ ask: "proof", back: true }))

    if (one === undefined || two === undefined) throw new Error("loom: the choice did not run")

    const undone = two.undone

    expect(one.undone).toBeUndefined()
    expect(undone?.landed).toBe(true)

    if (undone === undefined) throw new Error("loom: the undo did not run")

    const before = markupOf(treeFor(HOME, contextFor({ ask: "proof", record: one.record })))
    const after = markupOf(
      treeFor(HOME, contextFor({ ask: "proof", back: true, record: two.record, undone }))
    )

    expect(before).not.toContain(PUT_IT_BACK)
    expect(after).toContain(PUT_IT_BACK)
    expect(after).toContain("when you put it back")
  })

  /**
   * The button leads to the undo, and the proof is that following it runs one.
   *
   * This is the assertion the whole change exists for and it is written by
   * *walking* the address rather than by comparing it to a string: for two weeks
   * the control said *Put it back* and pointed at `/`, and every test on this
   * band passed, because a page rebuilt from source and a page restored by its
   * own undo render identically. So the href is read off the node the visitor
   * would press, taken apart, and put back through the route — and what has to
   * come out the other side is a record of an undo.
   */
  it.each(REVERSIBLE)("$id's own control is the one that puts it back", async (ask) => {
    const context = contextFor({ ask: ask.id, approve: true })
    const run = await askRunFor(context)

    if (run === undefined) throw new Error(`loom: ${ask.id} did not run`)

    const page = treeFor(HOME, { ...context, record: run.record })
    const offered = hrefsIn(bandOf(page, BAND.seeItHappen))
    const pressed = offered.find((href) => new URL(href).searchParams.get("back") === "1")

    if (pressed === undefined) {
      throw new Error(`loom: the panel offers ${ask.id} no way to put it back`)
    }

    /** And the notice at the top of the page offers the same address, not a different one. */
    expect(hrefsOf(page).filter((href) => href === pressed)).toHaveLength(2)

    const params = new URL(pressed).searchParams

    expect(params.get("ask")).toBe(ask.id)

    const followed = await askRunFor(
      contextFor({
        ask: ask.id,
        approve: params.get("approve") === "1",
        back: true,
        backApprove: params.get("back-yes") === "1",
      })
    )

    expect(followed?.undone).toBeDefined()
    expect(followed?.undone?.putBack).toBe(true)
  })

  /**
   * A held undo has restored nothing, and the card must not say it has.
   *
   * The payoff sentence — *the pieces came back, this is the page you arrived
   * on* — is true only after something was put back. Printed under an undo the
   * rules are still holding it would be the same defect this whole change
   * removes, one card lower and in the state that is most interesting to read.
   */
  it("does not claim a restoration the rules have not allowed yet", async () => {
    const held = await askRunFor(contextFor({ ask: "problem", approve: true, back: true }))
    const done = await askRunFor(
      contextFor({ ask: "problem", approve: true, back: true, backApprove: true })
    )

    if (held?.undone === undefined || done?.undone === undefined) {
      throw new Error("loom: the undo did not run")
    }

    expect(held.undone.landed).toBe(false)
    expect(done.undone.landed).toBe(true)

    const pageOf = (record: ChangeRecord, undone: ChangeRecord): string =>
      wordsOf(
        treeFor(
          HOME,
          contextFor({ ask: "problem", approve: true, back: true, record, undone })
        ).root
      )

    expect(pageOf(held.record, held.undone)).not.toContain("the page you arrived on")
    expect(pageOf(done.record, done.undone)).toContain("the page you arrived on")
  })

  /**
   * The notice at the top of the page reports the state the page is in.
   *
   * A visitor who has just put a change back is reading a page that no longer
   * carries it, and a band still headed *Allowed* over that page would be this
   * site failing at its own claim on the line a reader reads fastest.
   */
  it("reports the undo at the top of the page rather than the change", async () => {
    const run = await askRunFor(contextFor({ ask: "shorter", back: true }))

    if (run?.undone === undefined) throw new Error("loom: the undo did not run")

    const page = treeFor(
      HOME,
      contextFor({ ask: "shorter", back: true, record: run.record, undone: run.undone })
    )
    const markup = markupOf(page)
    const notice = markup.slice(0, markup.indexOf("Ask this page to rearrange itself"))

    expect(notice).toContain(PUT_IT_BACK)
  })

  /**
   * *Put it back* is offered once, on the change that is still on the page.
   *
   * The undo's own card offers the way out instead: putting back a
   * putting-back is asking for the change again, and the five buttons above
   * already say that in words a visitor understands.
   */
  it("does not offer to put back the putting-back", async () => {
    const run = await askRunFor(contextFor({ ask: "calmer", back: true }))

    if (run?.undone === undefined) throw new Error("loom: the undo did not run")

    const hrefs = hrefsOf(
      treeFor(
        HOME,
        contextFor({ ask: "calmer", back: true, record: run.record, undone: run.undone })
      )
    )

    expect(hrefs).not.toContain(askHref(ORIGIN, { theme: THEME, ask: "calmer", back: true }))
  })

  /**
   * The address keeps everything the visitor has done, so a link from the undo
   * cannot send them to a page where the change it reverses never happened.
   */
  it("keeps the visitor's yes in every link it offers afterwards", async () => {
    const run = await askRunFor(contextFor({ ask: "problem", approve: true, back: true }))

    if (run?.undone === undefined) throw new Error("loom: the undo did not run")

    const hrefs = hrefsOf(
      treeFor(
        HOME,
        contextFor({
          ask: "problem",
          approve: true,
          back: true,
          record: run.record,
          undone: run.undone,
        })
      )
    )

    expect(run.undone.awaitingYou).toBe(true)
    expect(hrefs).toContain(
      askHref(ORIGIN, { theme: THEME, ask: "problem", approve: true, back: true, backApprove: true })
    )
  })

  /**
   * The register, on the state of the front door this change invented.
   *
   * `voice.test.ts` walks the four routes as they are published, which is every
   * state of them that existed when it was written. An undo has its own
   * sentences and its own machinery underneath, and the front door's rule does
   * not soften because a visitor pressed something: not one of our words, in any
   * state a visitor can reach.
   */
  it.each(REVERSIBLE)("$id's undo says nothing a stranger would have to look up", async (ask) => {
    const run = await askRunFor(contextFor({ ask: ask.id, approve: true, back: true, backApprove: true }))

    if (run?.undone === undefined) throw new Error(`loom: ${ask.id}'s undo did not run`)

    const words = wordsOf(
      treeFor(
        HOME,
        contextFor({
          ask: ask.id,
          approve: true,
          back: true,
          backApprove: true,
          record: run.record,
          undone: run.undone,
        })
      ).root
    ).toLowerCase()

    for (const term of RESERVED_VOCABULARY) {
      expect(words).not.toContain(term.toLowerCase())
    }
  })
})

/**
 * The record the visitor reads is the record of the page they are looking at.
 *
 * The page is built twice — once to find out what happens, once with that answer
 * written into it — and the second answer is the one shown. Adding a second card
 * to the panel makes the page the undo is judged against bigger than the page
 * the first pass judged, so the two agreeing is a property of today's rules
 * rather than a law, and this is where it would be caught.
 */
describe("the record and the page it stands on", () => {
  it.each(REVERSIBLE)("$id's undo reports the page the visitor is looking at", async (ask) => {
    const context = contextFor({ ask: ask.id, approve: true, back: true, backApprove: true })
    const first = await askRunFor(context)

    if (first?.undone === undefined) throw new Error(`loom: ${ask.id}'s undo did not run`)

    const staged = treeFor(HOME, { ...context, record: first.record, undone: first.undone })
    const run = await runAsk(staged, ask, true)

    if (run.undo === undefined) throw new Error(`loom: ${ask.id} landed without an undo`)

    const second = await runUndo(run.page, ask, run.undo, true)

    expect(second.record).toEqual(first.undone)
  })
})
