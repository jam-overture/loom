import { sequentialIdFactory, type LoomTree, type TreeDelta } from "@loom/runtime"

import { ASKS, askById, type Ask, type AskId } from "./asks"
import type { ChangeRecord } from "./record"
import { runAsk } from "./run"

/**
 * More than one change, in the order they were asked for.
 *
 * The front door demonstrates *a* change: one request, one verdict, one way
 * back. That is the smaller half of what this product does. The half nothing
 * else on the market can show is what a page looks like after the fourth
 * change — whether anyone can still say what happened, in what order, and which
 * of them is the one to put back.
 *
 * So this module is the front door's runner with a list instead of a value.
 * Each request is worked out against the page the one before it left behind,
 * which is the only honest way to run a sequence: a change planned against a
 * page that has since moved is exactly the stale proposal the whole sequence
 * exists to catch.
 *
 * **It keeps nothing**, for the reason
 * [0081](../../../../../../decisions/0081-the-front-door-demonstrates-statelessly-and-the-address-is-the-state.md)
 * gives about the front door, and the reason applies harder here. A history is
 * the most tempting thing on a marketing site to put in a session, and a
 * session per visitor on the most-crawled surface the project has is a memory
 * leak with an advertising budget. The list of requests is in the address, the
 * page is rebuilt from the published one on every load, and the same address a
 * week later is the same history.
 */

/**
 * How many changes one address may ask for.
 *
 * A public page whose work is a function of its query string needs a ceiling,
 * and this one is low on purpose: six is more than the point needs — the
 * argument lands by the third — and a hand-written address asking for four
 * hundred is a request to spend the deployment's afternoon rebuilding a
 * landing page. Anything past the sixth is dropped rather than refused, because
 * a mangled address should be a page and not a 400.
 */
export const MAX_CHANGES = 6

/** Between one request and the next, in the address. */
export const CHANGE_SEPARATOR = "."

/**
 * What the visitor saying yes looks like in the address.
 *
 * A suffix rather than a second parameter, because approval belongs to *one*
 * request: `problem-yes.shorter` says the first was overridden and the second
 * was not, and a single `approve=1` could not say that about a list. No ask id
 * ends in it, and `history.test.ts` holds that so an id that did would fail
 * rather than silently become an approval of something else.
 */
export const APPROVED_SUFFIX = "-yes"

export type ChangeToken = {
  readonly ask: AskId
  /** Whether the visitor answered the rules holding this one back. */
  readonly approved: boolean
}

/** The sequence, as the address carries it. */
export const writeChangeSequence = (tokens: readonly ChangeToken[]): string =>
  tokens
    .map((token) => `${token.ask}${token.approved ? APPROVED_SUFFIX : ""}`)
    .join(CHANGE_SEPARATOR)

const readToken = (given: string): readonly ChangeToken[] => {
  const approved = given.endsWith(APPROVED_SUFFIX)
  const ask = askById(approved ? given.slice(0, -APPROVED_SUFFIX.length) : given)

  return ask === undefined ? [] : [{ ask: ask.id, approved }]
}

/**
 * The sequence, off a query string.
 *
 * Everything unrecognised is dropped and nothing is an error: a request this
 * site no longer offers, a typo, a repeated parameter, four hundred of them.
 * What comes back is always a list this page can run.
 */
export const readChangeSequence = (
  given: string | readonly string[] | undefined
): readonly ChangeToken[] => {
  const first = typeof given === "string" ? given : given?.[0]

  return first === undefined || first.length === 0
    ? []
    : first.split(CHANGE_SEPARATOR).flatMap(readToken).slice(0, MAX_CHANGES)
}

/** The sequence with one more request on the end of it. */
export const withChange = (
  tokens: readonly ChangeToken[],
  ask: AskId
): readonly ChangeToken[] => [...tokens, { ask, approved: false }]

/** The sequence without its most recent request, which is what putting one back is. */
export const withoutLastChange = (tokens: readonly ChangeToken[]): readonly ChangeToken[] =>
  tokens.slice(0, -1)

/**
 * The sequence with one of its requests answered.
 *
 * By position rather than by ask, because the same request can be made twice in
 * one history and the visitor is answering one of them.
 */
export const withApproval = (
  tokens: readonly ChangeToken[],
  position: number
): readonly ChangeToken[] =>
  tokens.map((token, index) => (index === position - 1 ? { ...token, approved: true } : token))

export type ChangeStep = {
  /** Where it comes in the history, counting from one, as the page numbers it. */
  readonly position: number
  readonly ask: Ask
  readonly approved: boolean
  readonly record: ChangeRecord
  /**
   * The change that reverses this one, written at the same moment and absent
   * only when nothing was applied. Only the most recent one is offered as a
   * button — see the page — but every step carries it, because what the record
   * says about putting a change back is checked against it.
   */
  readonly undo?: TreeDelta
}

export type ChangeHistory = {
  /** What the address asked for, after anything unrecognised was dropped. */
  readonly tokens: readonly ChangeToken[]
  readonly steps: readonly ChangeStep[]
  /** The front door as it is published, before any of this. */
  readonly start: LoomTree
  /** The front door as this history leaves it. */
  readonly page: LoomTree
  /** The requests that still have something to do on the page as it now stands. */
  readonly offered: readonly Ask[]
}

/**
 * Whether a request would still change anything.
 *
 * The front door offers all five choices whatever state it is in, and that is
 * right there: a visitor arrives on a page nobody has touched. Here the page
 * has been moved four times, so a choice whose only possible outcome is
 * "nothing happened" is a button that wastes the one click it gets. Asking the
 * request itself is the only way to know, and it is the same question the
 * sequence will ask a moment later.
 */
export const stillChangesSomething = (page: LoomTree, ask: Ask): boolean =>
  ask.plan(page, sequentialIdFactory("offer")) !== undefined

const offeredOn = (page: LoomTree): readonly Ask[] =>
  ASKS.filter((ask) => stillChangesSomething(page, ask))

/** A history of nothing, which is what a visitor who has asked for nothing sees. */
export const emptyHistory = (start: LoomTree): ChangeHistory => ({
  tokens: [],
  steps: [],
  start,
  page: start,
  offered: offeredOn(start),
})

type Walk = { readonly page: LoomTree; readonly steps: readonly ChangeStep[] }

/**
 * Every request in the address, run in order, from the published page.
 *
 * Sequential rather than parallel by construction: each request is handed the
 * page the previous one left, so the fourth is judged against the page the
 * first three made rather than against the page the site publishes. That is the
 * whole reason a history is interesting — the rules are asked again every time,
 * and a change that was fine on arrival can stop being fine three changes in.
 */
export const runHistory = async (
  start: LoomTree,
  tokens: readonly ChangeToken[]
): Promise<ChangeHistory> => {
  const walked = await tokens.reduce<Promise<Walk>>(async (soFar, token, index) => {
    const { page, steps } = await soFar
    const ask = askById(token.ask)

    if (ask === undefined) {
      throw new Error(`loom: ${token.ask} is not a request this site offers`)
    }

    /**
     * A namespace per position, so two runs of the same request add two
     * different bands rather than the second asking the page to hold a piece it
     * is already holding. Lowercase letters and digits only.
     */
    const run = await runAsk(page, ask, token.approved, `ask${index + 1}`)

    return {
      page: run.page,
      steps: [
        ...steps,
        {
          position: index + 1,
          ask,
          approved: token.approved,
          record: run.record,
          ...(run.undo === undefined ? {} : { undo: run.undo }),
        },
      ],
    }
  }, Promise.resolve({ page: start, steps: [] }))

  return {
    tokens,
    steps: walked.steps,
    start,
    page: walked.page,
    offered: offeredOn(walked.page),
  }
}

/** How the history came out, for the line that sums it up above the list. */
export type HistoryTally = {
  readonly asked: number
  readonly landed: number
  readonly waiting: number
  readonly refused: number
}

export const tallyOf = (history: ChangeHistory): HistoryTally => ({
  asked: history.steps.length,
  landed: history.steps.filter((step) => step.record.landed).length,
  waiting: history.steps.filter((step) => step.record.awaitingYou).length,
  refused: history.steps.filter((step) => step.record.verdict === "refused").length,
})
