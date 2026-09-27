import { sequentialIdFactory, type LoomTree, type TreeDelta } from "@jam-overture/loom"

import { ASKS, askById, type Ask, type AskId } from "./asks"
import type { ChangeRecord } from "./record"
import { runAsk } from "./run"
import { runUndo } from "./undo"

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

/**
 * What putting one back looks like in the address.
 *
 * `problem-yes.shorter-back` is *the second request, and then its undo* — two
 * requests, one of which happens to reverse the other, run in that order against
 * the page each left behind. Until 6 September this page had no way to say that,
 * and so said it a different way: **the button dropped the request from the
 * address** and the page was rebuilt from the published one with that request
 * never made.
 *
 * That reaches a page which looks the same and is not the same thing, and the
 * difference is the entire product. The front door stopped doing it on
 * 5 September; this is the grammar that lets the page whose subject is a
 * *sequence* stop doing it too — and a sequence is the case that matters, because
 * an undo appended to a list of four changes is the thing nothing else can show.
 *
 * A suffix rather than a parameter, for the reason `APPROVED_SUFFIX` gives: it
 * belongs to *one* request, and a single `back=1` could not say which.
 */
export const PUT_BACK_SUFFIX = "-back"

export type ChangeToken = {
  readonly ask: AskId
  /** Whether the visitor answered the rules holding this one back. */
  readonly approved: boolean
  /** Whether the visitor asked for this one to be put back afterwards. */
  readonly putBack: boolean
  /**
   * Whether they answered the rules holding *the undo* back.
   *
   * A separate answer from `approved`, because they are separate questions asked
   * a moment apart. The interesting address on this site is the one where the
   * rules hold a change, the visitor allows it, and then the rules hold the undo
   * of that same change as well — which they do, because putting a protected
   * band back is still moving a protected band. One flag could not carry both
   * halves of that, and collapsing them would be the site arranging its own
   * demonstration.
   */
  readonly putBackApproved: boolean
}

const writeToken = (token: ChangeToken): string =>
  [
    token.ask,
    token.approved ? APPROVED_SUFFIX : "",
    token.putBack ? PUT_BACK_SUFFIX : "",
    token.putBack && token.putBackApproved ? APPROVED_SUFFIX : "",
  ].join("")

/** The sequence, as the address carries it. */
export const writeChangeSequence = (tokens: readonly ChangeToken[]): string =>
  tokens.map(writeToken).join(CHANGE_SEPARATOR)

const withoutSuffix = (given: string, suffix: string): string | undefined =>
  given.endsWith(suffix) ? given.slice(0, -suffix.length) : undefined

/**
 * One token, read right to left, because that is the order the suffixes are
 * written in and it is the only reading that is unambiguous.
 *
 * The trailing `-yes` is the undo's answer **only when what it leaves ends in
 * `-back`**; otherwise it is the change's own. `history.test.ts` holds that no
 * request this site offers is named in a way that could be mistaken for either.
 */
const readToken = (given: string): readonly ChangeToken[] => {
  const beforeUndoAnswer = withoutSuffix(given, APPROVED_SUFFIX)
  const putBackApproved =
    beforeUndoAnswer !== undefined && beforeUndoAnswer.endsWith(PUT_BACK_SUFFIX)
  const answered = putBackApproved && beforeUndoAnswer !== undefined ? beforeUndoAnswer : given

  const beforePutBack = withoutSuffix(answered, PUT_BACK_SUFFIX)
  const putBack = beforePutBack !== undefined

  const named = beforePutBack ?? answered
  const beforeAnswer = withoutSuffix(named, APPROVED_SUFFIX)
  const approved = beforeAnswer !== undefined

  const ask = askById(beforeAnswer ?? named)

  return ask === undefined ? [] : [{ ask: ask.id, approved, putBack, putBackApproved }]
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
export const withChange = (tokens: readonly ChangeToken[], ask: AskId): readonly ChangeToken[] => [
  ...tokens,
  { ask, approved: false, putBack: false, putBackApproved: false },
]

/** One token in the sequence, with one of its two answers given. */
const answering = (
  tokens: readonly ChangeToken[],
  position: number,
  answer: Partial<ChangeToken>
): readonly ChangeToken[] =>
  tokens.map((token, index) => (index === position - 1 ? { ...token, ...answer } : token))

/**
 * The sequence with one of its requests answered.
 *
 * By position rather than by ask, because the same request can be made twice in
 * one history and the visitor is answering one of them.
 */
export const withApproval = (
  tokens: readonly ChangeToken[],
  position: number
): readonly ChangeToken[] => answering(tokens, position, { approved: true })

/**
 * The sequence with one of its requests put back afterwards.
 *
 * This is not `tokens.slice(0, -1)`, and the difference is the page's subject.
 * Dropping the request replays the history as though it had never been asked
 * for; putting it back leaves it asked for, and adds the change that reverses
 * it — measured, weighed by the same rules and written down, exactly like the
 * change it reverses. The two arrive at the same arrangement of the page by
 * routes that a record can tell apart, and this site is the one that tells them
 * apart.
 *
 * By position, like `withApproval`, so the grammar can express *the second
 * request, then its undo, then a third* — which is a coherent history and runs
 * as one. The page only offers the button on the most recent request, and says
 * why underneath it.
 */
export const withPutBack = (
  tokens: readonly ChangeToken[],
  position: number
): readonly ChangeToken[] => answering(tokens, position, { putBack: true })

/** The sequence with the rules' hold on one of its undos answered. */
export const withPutBackApproval = (
  tokens: readonly ChangeToken[],
  position: number
): readonly ChangeToken[] => answering(tokens, position, { putBackApproved: true })

export type ChangeStep = {
  /**
   * Which request in the history this is about, counting from one, as the page
   * numbers it. An undo carries the position of the change it reverses rather
   * than one of its own — it is not a fifth thing the visitor asked the page to
   * become, it is what happened to the fourth.
   */
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
  /**
   * Set on a step that *is* an undo, naming the position it puts back.
   *
   * An undo on this site is a request like any other — interpreted, measured,
   * weighed by the same named rules, allowed or held or refused — so it is a
   * step like any other and the record reads it out the same way. This field is
   * what the page needs to say *whose* undo it is; nothing else distinguishes
   * it, and nothing else should.
   */
  readonly putsBack?: number
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

    const position = index + 1

    /**
     * A namespace per position, so two runs of the same request add two
     * different bands rather than the second asking the page to hold a piece it
     * is already holding. Lowercase letters and digits only.
     */
    const run = await runAsk(page, ask, token.approved, `ask${position}`)
    const change: ChangeStep = {
      position,
      ask,
      approved: token.approved,
      record: run.record,
      ...(run.undo === undefined ? {} : { undo: run.undo }),
    }

    /**
     * Nothing landed, so there is nothing to reverse and the address asking for
     * one is dropped rather than refused — a request the rules held or turned
     * down has already told the visitor what happened, and a second entry saying
     * the undo of it did not fit would be the page explaining its own grammar.
     */
    if (!token.putBack || run.undo === undefined) {
      return { page: run.page, steps: [...steps, change] }
    }

    const back = await runUndo(run.page, ask, run.undo, token.putBackApproved, `back${position}`)

    return {
      page: back.page,
      steps: [
        ...steps,
        change,
        {
          position,
          ask,
          approved: token.putBackApproved,
          record: back.record,
          putsBack: position,
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
  /**
   * Every request the page answered, undos included.
   *
   * An undo is counted because on this site it *is* a request — it went through
   * the same five steps and got a verdict of its own — and a summary that quietly
   * left it out would be the line above the list disagreeing with the list.
   */
  readonly asked: number
  readonly landed: number
  readonly waiting: number
  readonly refused: number
  /** How many of them were a change being put back. */
  readonly putBack: number
}

export const tallyOf = (history: ChangeHistory): HistoryTally => ({
  asked: history.steps.length,
  landed: history.steps.filter((step) => step.record.landed).length,
  waiting: history.steps.filter((step) => step.record.awaitingYou).length,
  refused: history.steps.filter((step) => step.record.verdict === "refused").length,
  putBack: history.steps.filter((step) => step.putsBack !== undefined).length,
})
