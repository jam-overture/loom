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

import { MECHANISM_BAND, MECHANISM_SHORT_ANSWERS } from "../bands"
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
 * The last two are about the menu, and they are a pair rather than two more
 * buttons. One asks for the menu to stop following the reader down the page and
 * is held; one asks for it to be taken away and is refused outright. The same
 * piece, two requests, two different answers — which is the gradation the rest
 * of the band argues for in words. The first of the pair is also the only
 * request here whose *undo* the rules hold. See `unstickMenu` and `dropPitch`.
 */

/** What the record says worked the change out. It is not a model, and it says so. */
export const FRONT_DOOR_INTERPRETER = "loom/front-door-ask"

export type AskId = "problem" | "shorter" | "proof" | "calmer" | "unstick-menu" | "drop-pitch"

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
 * The menu, which two of the six requests are about.
 *
 * `dropPitch` found it inline while it was the only request that needed it.
 * `unstickMenu` would have been the second copy of that lookup, and two copies
 * is how two requests about one node end up disagreeing about which node that
 * is. The pair is the whole point of them — one asks for the menu to be taken
 * away and is refused, one asks for it to stop following the reader and is
 * held — so the only honest way to say *the same node, two answers* is for both
 * plans to read it from the same place.
 */
const menuBar = (page: LoomTree): ElementNode | undefined => {
  const menu = page.root.children.find(
    (child) => child.kind === "element" && child.type === "loom.nav"
  )

  return menu !== undefined && menu.kind === "element" ? menu : undefined
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
   * Lands on its own, and it is the move: a band changes place and nothing the
   * rules protect is touched by it.
   *
   * **It was the held one until 1 October**, and the note here said so for nine
   * days after it stopped being true. While the five choices sat on the front
   * door, the band this lifted to the top was the one saying what the product is
   * for, and the rules protect that — so the same request stopped and asked.
   * This page has no such band, and `shorter` is the request that is held here.
   * Which one of them it is was never a property of the request.
   */
  answer: "landed",
  utterance: "Skip ahead. Can I undo a change the AI makes?",
  label: "Get to the point",
  rationale:
    "This moves the band about putting a change back up to just under the headline, and leaves every other band where it was. Nothing is copied and nothing is rewritten. The band now under the headline is the one that was further down.",
  plan: (page) => {
    const opening = openingBand(page)
    const point = bandAt(page, MECHANISM_BAND.puttingItBack)

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
  answer: "held",
  utterance: "I am in a hurry. Cut this down to the essentials.",
  label: "I don't have long",
  rationale:
    "This takes away all four short answers at once, with their headings and every word under them. That is enough of the page in one go that your rules stop and ask a person first. Everything it would remove is carried in the change that reverses it, so putting it back restores each answer word for word.",
  plan: (page) => {
    const ops = MECHANISM_SHORT_ANSWERS.map((eyebrow) => bandAt(page, eyebrow))
      .filter((found): found is NonNullable<typeof found> => found !== undefined)
      .map((found) => ({ op: "remove", nodeId: found.band.id }) as const)

    return ops.length === 0 ? undefined : ops
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
            "You asked for evidence, so the page added some. Everything the panel beside this claims is checked by the tests that decide whether this page may be published. Every one of those tests is in the open.",
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
 * It is refused because **the menu is one of the things its rules protect**, and
 * taking a protected piece away is the one weight that sits at the refusal floor
 * rather than under it. There is no button to override it. That is the
 * difference between a rule and a suggestion.
 *
 * It has asked for two different things. It was the pricing table until
 * 21 August, when the maintainer took pricing off the front door, and the band
 * saying what the site is for until 1 October, when the five choices moved onto
 * a page that has no such band. What it asks for now is the piece that needs a
 * stranger no explaining at all: everybody understands why you would not let a
 * machine delete your navigation.
 *
 * `unstickMenu` is the other half of it, and the reason this one is worth more
 * than a refusal on its own: the same piece, asked about twice, answered
 * differently both times.
 */
const dropPitch: Ask = {
  id: "drop-pitch",
  /** Refused, and there is no yes that moves it. See the note above. */
  answer: "refused",
  utterance: "Hide the menu. I want to read this without distractions.",
  label: "Take the menu away",
  rationale:
    "This would remove the menu at the top of the page. The way out of a page is one of the things this site's rules protect, so the answer is no. That is a fact about the change, not about who asked for it, and there is no button that overrides it.",
  plan: (page) => {
    const menu = menuBar(page)

    return menu === undefined ? undefined : [{ op: "remove", nodeId: menu.id }]
  },
}

/**
 * The second setting change, and the only request on this site whose **undo is
 * held too**.
 *
 * That is the whole reason it exists, and it is worth being exact about what
 * was missing without it. The band's fifth rung promises that putting a change
 * back is weighed by the same rules as the change, and the panel carries a
 * sentence for the state where the rules stop one. Measured across the other
 * five requests, **no undo on this page was ever held**: the held one removes
 * four bands, and putting four bands back is an addition, which the rules let
 * through on their own. So the sentence existed and no address could reach it,
 * and the site demonstrated reversibility only under terms easier than the
 * thing being reversed.
 *
 * **A setting is the shape that fixes it, and the symmetry is arithmetic rather
 * than arrangement.** The rules protect the menu, and a setting change on a
 * protected piece weighs more than a request is let through on by itself, so
 * this is held. The change that reverses a setting change is another setting
 * change on the same piece, which the rules weigh exactly the same way. One
 * request, held on the way out and held on the way back, with nothing anywhere
 * exempting either half.
 *
 * It also pairs with `dropPitch`, which asks for the same piece to be taken
 * away and is refused outright. **One piece, two requests, two different
 * answers** is the gradation the rest of the band argues for in words, on one
 * screen, with the reader able to press both.
 *
 * The earlier reading of this, on 1 October, was that only a *move* has an
 * inverse of its own weight, and that the two things this page protects are
 * both worse to move than what was already being demonstrated. The first half
 * is what was wrong: a setting change is the other operation whose inverse is
 * itself.
 */
const unstickMenu: Ask = {
  id: "unstick-menu",
  answer: "held",
  utterance: "The menu follows me down the page and I find it distracting. Stop it sticking to the top.",
  label: "Stop the menu following me",
  rationale:
    "This changes one setting on the menu at the top of the page: it stops following you down the page and stays where it is. Nothing is added, nothing is taken away, and no word of the page is rewritten.",
  plan: (page) => {
    const menu = menuBar(page)

    if (menu === undefined) return undefined
    if (menu.props["position"] === "static") return undefined

    return [{ op: "configure", nodeId: menu.id, set: { position: "static" }, unset: [] }]
  },
}

/** Every choice, in the order the band offers them. */
export const ASKS: readonly Ask[] = [problem, shorter, proof, calmer, unstickMenu, dropPitch]

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
