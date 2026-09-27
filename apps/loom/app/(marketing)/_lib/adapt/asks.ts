import {
  buildElement,
  buildSlot,
  buildText,
  err,
  ok,
  type ChangeInterpreter,
  type Clock,
  type ElementNode,
  type IdFactory,
  type LoomNode,
  type LoomTree,
  type TreeOperation,
} from "@jam-overture/loom"

import { BAND } from "../bands"
import { REPOSITORY_URL } from "../site"
import type { Verdict } from "./record"

/**
 * The four things a visitor can ask the front door for.
 *
 * The site has spent five runs *describing* a page that rearranges itself. This
 * is the page doing it. Each choice below is a real request through the real
 * sequence — worked out, measured, weighed against the rules, applied or held,
 * and reversible — and the only thing missing from it is the guess.
 *
 * That is the pattern
 * [0057](../../../../../../decisions/0057-a-preset-is-a-deterministic-interpreter.md)
 * accepted and named, in as many words, for this surface: a demonstrated change
 * is an ordinary interpreter that computes its operations from the page rather
 * than asking a model for them, and everything downstream is unable to tell the
 * difference. A front door that could only demonstrate anything when a key was
 * configured would show a dead button to most of the people who arrive at it,
 * and every visitor would pay for a model call to watch a card move.
 *
 * **The first four are one per kind of change**, which is not a coincidence. The
 * page says three bands further down that there are four kinds — add something,
 * remove something, move something, change a setting — and that this is the
 * whole list. Those four are that list, performed on the page making the claim.
 *
 * The fifth is the one this site refuses, and it is the most important button on
 * the band. See `dropPrices`.
 */

/** What the record says worked the change out. It is not a model, and it says so. */
export const FRONT_DOOR_INTERPRETER = "loom/front-door-ask"

export type AskId = "problem" | "shorter" | "proof" | "calmer" | "drop-pitch"

/**
 * The three answers a set of rules can give, before the visitor has said
 * anything.
 *
 * The same three the rules page writes out — *it happens*, *it waits for you*,
 * *it does not happen* — and deliberately the runtime's own words for them
 * rather than a second vocabulary, so `answers.test.ts` can hold a declared
 * answer against what the sequence actually returns without a translation table
 * standing between the two.
 *
 * `approved` is not one of them. It is what a *held* request becomes once a
 * person says yes, so it is an answer to a second question that has not been
 * asked yet, and a band counting what its five buttons do is counting the first.
 */
export type AskAnswer = Extract<Verdict, "landed" | "held" | "refused">

export type Ask = {
  readonly id: AskId
  /** What a person would have typed. It is the request, verbatim, and the record shows it. */
  readonly utterance: string
  /** The button. Shorter than the utterance, and never a different promise. */
  readonly label: string
  /** Why these changes answer that, in the words the record will show a visitor. */
  readonly rationale: string
  /**
   * What this site's rules do with it, as data a sentence can be spelled off.
   *
   * It lived in a table inside `adapt.test.ts` until today, which is exactly
   * where it was least useful: the tests knew one of the five stops and asks,
   * and the band offering the five told a visitor that everything except the
   * refused one *"may rearrange on its own"*. A fact the suite holds and the
   * page cannot read is a fact the page will eventually contradict.
   *
   * It is a declaration rather than a derivation because a page builder is
   * synchronous and running the sequence is not — and running all five on every
   * visit to compose one sentence would make the published front door depend on
   * performing every demonstration on it. So this is the claim, and
   * `answers.test.ts` puts each one through the real sequence and holds it here.
   */
  readonly answer: AskAnswer
  /**
   * The changes, or `undefined` when this page gives the choice nothing to do.
   * Absence is how the band knows not to offer it: a button whose only possible
   * outcome is "nothing happened" is worse than one that is not there.
   */
  readonly plan: (page: LoomTree, ids: IdFactory) => readonly TreeOperation[] | undefined
}

/** A band of the page, found by the one label that is stable, visible and unique. */
const bandAt = (
  page: LoomTree,
  eyebrow: string
): { readonly band: ElementNode; readonly index: number } | undefined => {
  const index = page.root.children.findIndex(
    (child) => child.kind === "element" && child.props["eyebrow"] === eyebrow
  )
  const band = index === -1 ? undefined : page.root.children[index]

  return band !== undefined && band.kind === "element" ? { band, index } : undefined
}

const openingBand = (
  page: LoomTree
): { readonly band: ElementNode; readonly index: number } | undefined => {
  const index = page.root.children.findIndex(
    (child) => child.kind === "element" && child.type === "loom.hero"
  )
  const band = index === -1 ? undefined : page.root.children[index]

  return band !== undefined && band.kind === "element" ? { band, index } : undefined
}

/**
 * A move, not a removal and an insertion.
 *
 * The band keeps the identity it had, so what arrives under the headline is the
 * same band a moment older rather than a copy of it — which is what lets the
 * change that reverses this one be a single step
 * ([0044](../../../../../../decisions/0044-a-move-relocates-a-subtree-and-the-analysis-measures-the-subtree.md)).
 */
const problem: Ask = {
  id: "problem",
  /**
   * Held, and it is the most instructive of the five. It moves a band the rules
   * protect rather than destroying it — not damage, and not something the rules
   * let a request through on its own either — so it stops and asks the visitor,
   * which is the middle answer and the one no competitor has.
   */
  answer: "held",
  utterance: "Skip the tour. What problem does this actually solve?",
  label: "Get to the point",
  rationale:
    "This lifts the whole band about what Loom is for to just under the headline and leaves every other band where it was. Nothing is copied and nothing is rewritten: the band under the headline is the one that was further down.",
  plan: (page) => {
    const opening = openingBand(page)
    const point = bandAt(page, BAND.problems)

    if (opening === undefined || point === undefined) return undefined
    if (point.index === opening.index + 1) return undefined

    return [
      { op: "move", nodeId: point.band.id, parentId: page.root.id, index: opening.index + 1 },
    ]
  },
}

/**
 * The removal, so a visitor can watch the change that reverses it put every
 * word back rather than take their word for it.
 */
const shorter: Ask = {
  id: "shorter",
  answer: "landed",
  utterance: "I am in a hurry. Take the questions off the page.",
  label: "I don't have long",
  rationale:
    "This takes the whole band of questions away — its heading, all four questions and every answer under them. Everything it removes is carried in the change that reverses it, so putting it back restores each answer word for word rather than writing it again.",
  plan: (page) => {
    const questions = bandAt(page, BAND.questions)

    return questions === undefined ? undefined : [{ op: "remove", nodeId: questions.band.id }]
  },
}

const evidenceBand = (ids: IdFactory): LoomNode =>
  buildElement(ids, {
    type: "loom.section",
    props: { tone: "accent", width: "readable", eyebrow: "Added a moment ago" },
    children: [
      buildSlot(ids, "heading", [
        buildElement(ids, {
          type: "loom.heading",
          props: { level: 2, balance: true },
          children: [buildText(ids, "This band was not here when you arrived")],
        }),
      ]),
      buildElement(ids, {
        type: "loom.prose",
        props: { tone: "muted", measured: true },
        children: [
          buildText(
            ids,
            "You asked for evidence, so the page added some. Everything the panel beside this claims is checked by the same tests that decide whether this page may be published at all — and every one of them is in the open.",
          ),
        ],
      }),
      buildElement(ids, {
        type: "loom.action",
        props: { href: REPOSITORY_URL, variant: "secondary", external: true },
        children: [buildText(ids, "Read the source")],
      }),
    ],
  })

/** The addition. Nothing already on the page moves, and the record says how much arrived. */
const proof: Ask = {
  id: "proof",
  answer: "landed",
  utterance: "I do not believe you. Show me the evidence.",
  label: "Prove it",
  rationale:
    "This adds a band under the headline and puts nothing else out of place. It is an addition rather than a replacement, so every band already on the page keeps its position relative to the others.",
  plan: (page, ids) => {
    const opening = openingBand(page)

    return opening === undefined
      ? undefined
      : [{ op: "insert", parentId: page.root.id, index: opening.index + 1, node: evidenceBand(ids) }]
  },
}

/**
 * The setting change, and the quietest of the four on purpose: two values on one
 * band, no word of the page altered, nothing added and nothing taken away. It is
 * the shape of change that is far commoner in practice than the dramatic ones.
 */
const calmer: Ask = {
  id: "calmer",
  answer: "landed",
  utterance: "The top of this page is shouting at me. Calm it down.",
  label: "Turn it down",
  rationale:
    "This changes two settings on the opening band: the pattern painted behind it, and how tall it stands. Not one word of the page changes, nothing is added and nothing is taken away.",
  plan: (page) => {
    const opening = openingBand(page)
    if (opening === undefined) return undefined

    const already =
      opening.band.props["backdrop"] === "none" && opening.band.props["stature"] === "standard"

    return already
      ? undefined
      : [
          {
            op: "configure",
            nodeId: opening.band.id,
            set: { backdrop: "none", stature: "standard" },
            unset: [],
          },
        ]
  },
}

/**
 * The one this site will not do, and the reason it is offered anyway.
 *
 * A page that only ever demonstrates changes it is happy with is demonstrating
 * nothing: every product with an AI in it can show a page rearranging. The
 * interesting claim is that some things do not happen however emphatically they
 * are asked for — so the band offers a request that is refused, in front of the
 * visitor, with the reason attached.
 *
 * It is refused because **what this site says it is for** is one of the two
 * things its rules protect, and taking a protected piece away is the one weight
 * that sits at the refusal floor rather than under it. There is no button to
 * override it. That is the difference between a rule and a suggestion.
 *
 * It was the pricing band until 21 August, when the maintainer took pricing off
 * the front door. The choice of what to protect got better for it: a business
 * protecting its price list is ordinary, and a business refusing to let a
 * machine delete the statement of what it does for people is the same instinct
 * pointed at the thing that actually matters.
 */
const dropPitch: Ask = {
  id: "drop-pitch",
  /** Refused, and there is no yes that moves it. See the note above. */
  answer: "refused",
  utterance: "Cut the sales pitch. I only want to see the product.",
  label: "Cut the pitch",
  rationale:
    "This takes away the whole band about what Loom is for, and the four things under it. What it destroys is one of the two things this site's rules protect, which is a fact about the change rather than about who asked for it.",
  plan: (page) => {
    const point = bandAt(page, BAND.problems)

    return point === undefined ? undefined : [{ op: "remove", nodeId: point.band.id }]
  },
}

/** Every choice, in the order the band offers them. */
export const ASKS: readonly Ask[] = [problem, shorter, proof, calmer, dropPitch]

export const askById = (id: string | undefined): Ask | undefined =>
  id === undefined ? undefined : ASKS.find((ask) => ask.id === id)

/** An ask id off a query string, or nothing. An unknown one is not an error. */
export const readAskId = (given: string | readonly string[] | undefined): AskId | undefined => {
  const first = typeof given === "string" ? given : given?.[0]

  return askById(first)?.id
}

/**
 * A change this site works out for itself, as the three things an interpreter
 * needs to be one.
 *
 * Extracted from `askInterpreter` on 23 September, when `floors.ts` needed the
 * same machinery for a request that is **not** one of the five buttons: a floor
 * probe has no `AskId`, no label and no place in the band, and the alternative
 * to a shared shape was a second copy of the block below — thirty lines whose
 * whole job is to say *this was computed, not guessed*, kept in step by hand.
 *
 * `interpreter` is a parameter rather than a constant for the same reason. Both
 * kinds are deterministic interpreters under
 * [0057](../../../../../../decisions/0057-a-preset-is-a-deterministic-interpreter.md),
 * and the record is the one place the difference between them is worth keeping:
 * a paper trail calling a floor probe one of the front door's buttons would be
 * naming the wrong request.
 */
export type PlannedChange = {
  readonly plan: (page: LoomTree, ids: IdFactory) => readonly TreeOperation[] | undefined
  /** Why these changes answer the request, in the words the record will show. */
  readonly rationale: string
  /** What the refusal says when this page gives the plan nothing to do. */
  readonly nothingToChange: string
  /** What the record says worked the change out. Never a model, and it says so. */
  readonly interpreter: string
}

/**
 * A planned change, as an interpreter.
 *
 * It works the changes out against the page it is handed rather than against
 * the one the button was drawn on. That is not defensive coding: the front door
 * builds a fresh page for every visit, and a set of changes computed against a
 * page nobody is looking at is precisely the stale proposal the whole sequence
 * exists to catch.
 *
 * The record it writes says what it is. `authoredBy: "runtime"` and a confidence
 * of 1, because these were computed rather than guessed, and a 1 nobody graded
 * would otherwise walk into calibration as a model's perfect score
 * ([0031](../../../../../../decisions/0031-calibration-is-a-reader-not-a-controller.md)).
 */
export const plannedInterpreter = (
  change: PlannedChange,
  ids: IdFactory,
  clock: Clock
): ChangeInterpreter => ({
  interpret: (intent, page) => {
    const operations = change.plan(page, ids)

    return Promise.resolve(
      operations === undefined || operations.length === 0
        ? err({
            code: "refused",
            detail: change.nothingToChange,
          })
        : ok({
            proposalId: ids.proposalId(),
            intentId: intent.intentId,
            delta: {
              deltaId: ids.deltaId(),
              treeId: page.treeId,
              baseRevision: page.revision,
              operations,
            },
            rationale: change.rationale,
            provenance: {
              origin: intent.origin,
              ...(intent.actor === undefined ? {} : { actor: intent.actor }),
              interpreter: change.interpreter,
              authoredBy: "runtime" as const,
              confidence: 1,
              interpretedAt: clock.now(),
            },
          })
    )
  },
})

/** One of the five buttons, as an interpreter. */
export const askInterpreter = (ask: Ask, ids: IdFactory, clock: Clock): ChangeInterpreter =>
  plannedInterpreter(
    {
      plan: ask.plan,
      rationale: ask.rationale,
      nothingToChange: `this page gives "${ask.label}" nothing to change`,
      interpreter: FRONT_DOOR_INTERPRETER,
    },
    ids,
    clock
  )
