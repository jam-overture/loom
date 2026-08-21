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
} from "@loom/runtime"

import { BAND } from "../bands"
import { REPOSITORY_URL } from "../site"

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

export type AskId = "costs" | "shorter" | "proof" | "calmer" | "drop-prices"

export type Ask = {
  readonly id: AskId
  /** What a person would have typed. It is the request, verbatim, and the record shows it. */
  readonly utterance: string
  /** The button. Shorter than the utterance, and never a different promise. */
  readonly label: string
  /** Why these changes answer that, in the words the record will show a visitor. */
  readonly rationale: string
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
const costs: Ask = {
  id: "costs",
  utterance: "Show me what it costs before anything else.",
  label: "Price first",
  rationale:
    "This lifts the whole band of plans to just under the headline and leaves every other band where it was. Nothing is copied and nothing is rewritten: the band under the headline is the one that was further down.",
  plan: (page) => {
    const opening = openingBand(page)
    const plans = bandAt(page, BAND.pricing)

    if (opening === undefined || plans === undefined) return undefined
    if (plans.index === opening.index + 1) return undefined

    return [
      { op: "move", nodeId: plans.band.id, parentId: page.root.id, index: opening.index + 1 },
    ]
  },
}

/**
 * The removal, so a visitor can watch the change that reverses it put every
 * word back rather than take their word for it.
 */
const shorter: Ask = {
  id: "shorter",
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
 * It is refused because the plans are one of the two things this site's rules
 * protect, and taking a protected piece away is the one weight that sits at the
 * refusal floor rather than under it. There is no button to override it. That is
 * the difference between a rule and a suggestion.
 */
const dropPrices: Ask = {
  id: "drop-prices",
  utterance: "Take the plans off the page. Nobody wants to see prices.",
  label: "Delete the prices",
  rationale:
    "This takes the plans away — the whole band, the three columns and everything listed under them. What it destroys is one of the two things this site's rules protect, which is a fact about the change rather than about who asked for it.",
  plan: (page) => {
    const plans = bandAt(page, BAND.pricing)

    return plans === undefined ? undefined : [{ op: "remove", nodeId: plans.band.id }]
  },
}

/** Every choice, in the order the band offers them. */
export const ASKS: readonly Ask[] = [costs, shorter, proof, calmer, dropPrices]

export const askById = (id: string | undefined): Ask | undefined =>
  id === undefined ? undefined : ASKS.find((ask) => ask.id === id)

/** An ask id off a query string, or nothing. An unknown one is not an error. */
export const readAskId = (given: string | readonly string[] | undefined): AskId | undefined => {
  const first = typeof given === "string" ? given : given?.[0]

  return askById(first)?.id
}

/**
 * One choice, as an interpreter.
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
export const askInterpreter = (ask: Ask, ids: IdFactory, clock: Clock): ChangeInterpreter => ({
  interpret: (intent, page) => {
    const operations = ask.plan(page, ids)

    return Promise.resolve(
      operations === undefined || operations.length === 0
        ? err({
            code: "refused",
            detail: `this page gives "${ask.label}" nothing to change`,
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
            rationale: ask.rationale,
            provenance: {
              origin: intent.origin,
              ...(intent.actor === undefined ? {} : { actor: intent.actor }),
              interpreter: FRONT_DOOR_INTERPRETER,
              authoredBy: "runtime" as const,
              confidence: 1,
              interpretedAt: clock.now(),
            },
          })
    )
  },
})
