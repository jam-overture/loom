import {
  buildElement,
  buildSlot,
  buildText,
  composeChange,
  fixedPolicy,
  noopEventSink,
  sequentialIdFactory,
  systemClock,
  type CompositionRuntime,
  type EditIntent,
  type ElementNode,
  type LoomTree,
  type StakeFactorCode,
  type StakeLevel,
  type TreeOperation,
} from "@loom/runtime"

import { plannedInterpreter } from "./asks"
import { RAISED_BY, WEIGHT } from "./record"
import { FRONT_DOOR_POLICY, SITE_PROPS_VOCABULARY } from "./run"

/**
 * The two floors under this site, put to it, so that a page claiming *three
 * things no request gets past* is printing what happened rather than asserting
 * it.
 *
 * `/your-components` has made that claim since 11 September and two thirds of it
 * was aspiration. The floors exist in the runtime — a change may not add a piece
 * the deployment cannot draw (0173), and may not leave one carrying settings its
 * own description refuses (0179) — and both are wiring a host opts into, on
 * purpose, and this host had not. So a request naming a piece nobody described
 * passed the rules, was committed, and drew a hole; a value outside a setting's
 * list did the same. `run.ts` wires them now, and this module is how the page
 * stops taking anybody's word for it.
 *
 * **Not a sixth button.** The five the front door offers are things a visitor
 * might genuinely want, and every one of them is honest about its outcome. These
 * two are requests nobody would make on purpose — the near-miss a model makes at
 * three in the morning — so they are run while the page is built and reported,
 * rather than offered to be pressed.
 *
 * The same deterministic-interpreter pattern as the five
 * ([0057](../../../../../../decisions/0057-a-preset-is-a-deterministic-interpreter.md)):
 * the operations are computed from the page rather than asked of a model, and
 * nothing downstream can tell the difference. What is being demonstrated is what
 * the *write path* does with a bad change, and where the bad change came from is
 * no part of the claim.
 */

/** What the record says worked these out. Never a model, and never one of the five. */
export const FLOOR_INTERPRETER = "loom/front-door-floor"

export type FloorId = "a-piece-nobody-described" | "a-setting-value-nobody-allowed"

/**
 * A piece name a visitor could plausibly imagine and this site has never heard
 * of.
 *
 * `app.` rather than `loom.`, because that is the namespace a host's own
 * components live in and it makes this the honest shape of the mistake: the
 * model has been told about the pieces this site handed over and has reached
 * past them for one that sounds like it ought to exist. A `loom.`-prefixed
 * invention would read as our library being incomplete rather than as a request
 * being refused.
 */
const UNDESCRIBED_PIECE = "app.testimonial-wall"

/**
 * A height nobody offers, asked of the one band the front door's own fourth
 * button already changes the height of.
 *
 * Deliberately the same setting as `calmer`, and that pairing is the whole
 * reason for choosing it: a reader can press *Turn it down* on `/` and watch
 * that band's height change, then read here that the very same setting refuses a
 * value its description does not list. One band, one setting, the difference
 * being the value — a far smaller and more convincing claim than two unrelated
 * demonstrations.
 */
const UNOFFERED_HEIGHT = "enormous"

export type Floor = {
  readonly id: FloorId
  /** What a person would have typed. The record quotes it verbatim. */
  readonly utterance: string
  /** Why this change answers it, in the words a record would show. */
  readonly rationale: string
  /** What the refusal says when this page gives the plan nothing to do. */
  readonly nothingToChange: string
  /**
   * The weight clause this is expected to raise, held by `floors.test.ts` rather
   * than trusted.
   *
   * Declared because it is what makes the band's two cards *different*: both are
   * refused at the same weight, and the only thing distinguishing them is which
   * of the two floors caught it. A run that started raising the other one would
   * leave the page printing the same card twice.
   */
  readonly factor: StakeFactorCode
  readonly plan: (page: LoomTree) => readonly TreeOperation[] | undefined
}

/** The opening band, found by type — the same handle `asks.ts` uses. */
const openingBand = (page: LoomTree): ElementNode | undefined => {
  const found = page.root.children.find(
    (child) => child.kind === "element" && child.type === "loom.hero"
  )

  return found !== undefined && found.kind === "element" ? found : undefined
}

/**
 * The first floor: a request for something this site has nothing to draw.
 *
 * The piece it asks for is well-formed in every way the older checks can see —
 * it has a parent, an index, an id and a sensible-looking name — so nothing
 * short of *is this a piece we described* catches it. Which is exactly why the
 * check exists, and why the card is worth a reader's time: the request is not
 * malformed, it is unanswerable.
 */
const undescribedPiece: Floor = {
  id: "a-piece-nobody-described",
  utterance: "Put a wall of customer quotes at the top of the page.",
  rationale:
    "This adds one piece under the headline and moves nothing. The piece it asks for is not one this site described, so there is nothing to draw it with.",
  nothingToChange: "this page has no opening band to add anything under",
  factor: "unknown-primitive",
  plan: (page) => {
    const opening = openingBand(page)
    if (opening === undefined) return undefined

    const index = page.root.children.indexOf(opening)
    const ids = sequentialIdFactory("floor")

    return [
      {
        op: "insert",
        parentId: page.root.id,
        index: index + 1,
        node: buildElement(ids, {
          type: UNDESCRIBED_PIECE,
          props: { tone: "surface" },
          children: [
            buildSlot(ids, "heading", [
              buildElement(ids, {
                type: "loom.heading",
                props: { level: 2 },
                children: [buildText(ids, "What people say")],
              }),
            ]),
          ],
        }),
      },
    ]
  },
}

/**
 * The second floor: a setting that exists, on a piece that exists, given a value
 * the piece's own description does not offer.
 *
 * The nastiest of the near-misses, and the reason 0179 exists rather than 0173
 * being enough: every name in it is real. A check built from a list of piece
 * names sees nothing wrong here, the rules weigh it as the small setting change
 * it looks like, and the page is served with the band it touched drawing
 * nothing.
 */
const unofferedValue: Floor = {
  id: "a-setting-value-nobody-allowed",
  utterance: "Make the top of this page enormous.",
  rationale:
    "This changes one setting on the opening band and touches nothing else. The height it asks for is not one that band's description offers.",
  nothingToChange: "this page has no opening band to set a height on",
  factor: "invalid-props",
  plan: (page) => {
    const opening = openingBand(page)

    return opening === undefined
      ? undefined
      : [{ op: "configure", nodeId: opening.id, set: { stature: UNOFFERED_HEIGHT }, unset: [] }]
  },
}

/**
 * Both, in the order the band prints them: the piece first, then the setting.
 *
 * Exported so `floors.test.ts` can put the same two requests to a runtime with
 * **neither floor wired** and watch them go through. That is the one thing worth
 * proving about this band, and the one thing `probeFloors` cannot prove on its
 * own: it refuses to return unless both were refused, so a suite built only on
 * it would pass identically on a deployment where the refusals came from
 * somewhere else entirely.
 */
export const FLOORS: readonly Floor[] = [undescribedPiece, unofferedValue]

/** A setting a piece refused, and the sentence its own description answered with. */
export type RefusedSetting = {
  readonly name: string
  /**
   * The declaring piece's own words, quoted.
   *
   * Written for a developer rather than for a visitor, and printed anyway. The
   * band's claim is that the refusal *names the setting and says why*, and a
   * sentence this site had rewritten into friendlier words would be the claim
   * made about a translation of the evidence.
   */
  readonly said: string
}

export type FloorResult = {
  readonly id: FloorId
  /** What a person would have said, verbatim. */
  readonly asked: string
  readonly weight: StakeLevel
  /** The weight as a reader meets it, in the record's own word. */
  readonly weighedAs: string
  /**
   * Why it weighed that, in the record's own clauses and never this band's.
   *
   * The same sentences the front door's panel prints, so a reader who has met
   * one of them on `/` meets the same words here. A second wording for one fact
   * is the drift every measured band on this site is built to avoid.
   */
  readonly raisedBy: readonly string[]
  /** The pieces the run said this site has nothing to draw. */
  readonly pieces: readonly string[]
  /** The settings a piece refused. */
  readonly settings: readonly RefusedSetting[]
}

/**
 * One floor, put to the page as this site publishes it.
 *
 * **It throws unless the request was refused**, and that is the arrangement
 * rather than a missing branch. The page this result is printed on says in as
 * many words that no request gets past these, so a run in which one did is a
 * page that must not publish — the same arrangement `weighEachAsker` has with
 * its four weights and `ASKERS` has with its four kinds. A test would find it a
 * day later; this finds it while the page is being built.
 */
const put = async (page: LoomTree, floor: Floor): Promise<FloorResult> => {
  const idFactory = sequentialIdFactory("floor")
  const runtime: CompositionRuntime = {
    interpreter: plannedInterpreter(
      {
        plan: floor.plan,
        rationale: floor.rationale,
        nothingToChange: floor.nothingToChange,
        interpreter: FLOOR_INTERPRETER,
      },
      idFactory,
      systemClock
    ),
    policySource: fixedPolicy(FRONT_DOOR_POLICY),
    propsVocabulary: SITE_PROPS_VOCABULARY,
    events: noopEventSink,
    clock: systemClock,
    idFactory,
  }

  const intent: EditIntent = {
    intentId: idFactory.intentId(),
    treeId: page.treeId,
    baseRevision: page.revision,
    /**
     * `user-instruction` earns the most latitude of the four origins, so it is
     * the hardest case to refuse and therefore the only honest one to
     * demonstrate on. A floor that only held against a timer would be a ceiling.
     */
    origin: "user-instruction",
    actor: "a visitor",
    utterance: floor.utterance,
    observedAt: systemClock.now(),
  }

  const composed = await composeChange(runtime, page, intent)

  if (composed.kind !== "rejected") {
    throw new Error(
      `loom: "${floor.utterance}" ended as ${composed.kind}, and this site says no request gets past that`
    )
  }

  const { analysis, stakes } = composed.assessment

  return {
    id: floor.id,
    asked: floor.utterance,
    weight: stakes.level,
    weighedAs: WEIGHT[stakes.level],
    raisedBy: stakes.factors.map((factor) => RAISED_BY[factor.code]),
    pieces: analysis.unknownPrimitives.map((unknown) => unknown.type),
    settings: analysis.invalidProps.flatMap((invalid) =>
      invalid.issues.map((issue) => ({ name: issue.path, said: issue.message }))
    ),
  }
}

/**
 * Both floors, put to the front door as it is published.
 *
 * The page is built once and both are judged against it: `composeChange` returns
 * a new page rather than touching the one it was handed, so the second request
 * meets the same page the first did rather than whatever the first left behind.
 *
 * Each result is checked against what its floor declared it would raise. The two
 * cards differ only in which floor caught them, so a run where both came back on
 * the same one would print one card twice — and the page would rather not
 * publish than do that.
 */
export const probeFloors = async (page: LoomTree): Promise<readonly FloorResult[]> => {
  const results: FloorResult[] = []

  for (const floor of FLOORS) {
    const result = await put(page, floor)
    const raised = RAISED_BY[floor.factor]

    if (!result.raisedBy.includes(raised)) {
      throw new Error(
        `loom: "${floor.utterance}" was refused and not for the reason this band prints it for`
      )
    }

    results.push(result)
  }

  return results
}
