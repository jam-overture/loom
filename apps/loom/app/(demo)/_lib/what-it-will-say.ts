import {
  composeChange,
  fixedPolicy,
  type Clock,
  type CompositionOutcome,
  type IdFactory,
  type LoomTree,
  type TreeDelta,
} from "@jam-overture/loom"

import { STAKES } from "@/app/(portal)/_lib/vocabulary"

import { offeredPresets, presetById, presetInterpreter, type DemoPresetId } from "./presets"
import { wouldPutTheLastChangeBack, type SettingMove } from "./put-back"
import { demoPolicy } from "./session"
import { DEMO_ACTOR } from "./visitor"

/**
 * What Loom will say about the one change this surface invites — before anybody
 * has pressed it.
 *
 * **The first screen used to sell the half of this product everybody else
 * already has.** It said *"Ask that page for a change"*, offered one green
 * button, and then spent its largest block — 358px of an 857px rail, measured
 * on a production build at 1280×900 — on a second rendering of the band the
 * button names. A stranger who pressed nothing learned that an AI can rewrite a
 * page, which `docs/rollout.md` names as the least novel thing here, and
 * learned nothing at all about the record. The one sentence on that screen
 * about the Gate was a hedge covering every ask ever made — *"some changes it
 * makes on its own, some it won't make without asking you first"* — which is
 * true of nothing in particular and so proves nothing about anything.
 *
 * What stands there now is the Gate's answer to the button directly above it.
 *
 * ## It is computed, not predicted, and that distinction is the whole module
 *
 * `presets.ts` refuses to let a preset's `promise` name a verdict, and the
 * reason it gives is right: *"a label promising 'this one will be held' would
 * be a surface predicting a decision it does not make — and would be wrong the
 * first time the policy or the page moved."* Every word of that still holds
 * against a **typed** claim.
 *
 * This is not one. `composeChange` interprets, analyses, assesses and gates,
 * and stops at the verdict without writing anything (0021) — so the sentence
 * below is produced by the same function, the same interpreter, the same tree
 * and the same `demoPolicy` that will run two seconds later when the visitor
 * presses the button. It cannot disagree with the press for the same reason a
 * number cannot disagree with itself. Retune the policy, move the page, swap
 * the leading preset: the sentence moves with them, because it is not a
 * sentence about them, it is their output.
 *
 * `pipeline.test.ts` holds that property directly rather than trusting this
 * paragraph: the verdict this module reads on arrival and the verdict the real
 * write path produces for the same preset are asserted equal.
 *
 * ## No model, no write, no session
 *
 * The preset interpreters are deterministic ([0057](../../../../../decisions/0057-a-preset-is-a-deterministic-interpreter.md)),
 * so this costs a tree walk and no key. `composeChange` is handed no store —
 * it has nowhere to write even in the `applied` case, where the tree it returns
 * is computed and dropped. A visitor who never presses anything leaves no trace
 * of having been told what would have happened.
 *
 * ## Why the rule sentence is not printed here, and the card still prints it
 *
 * `ruleSentence` is the portal's table and it is written in the past tense for
 * a decision already taken — `within-policy` reads *"…so it went ahead on its
 * own"*, which is a false statement about a button nobody has pressed. The
 * level words are tense-free, so `STAKES` is shared here exactly as
 * `weighed.ts` shares it and the rule stays on the card, where the tense is
 * right and where the weighing panel and the ceiling comparison stand with it.
 *
 * That ordering is deliberate rather than a shortcut. **What is here is a
 * strict subset of what the card says**, so the press is a promise kept rather
 * than an argument made twice — which is the failure `reasoning.ts` exists to
 * catch and the one this screen is most able to reintroduce.
 */

export type WillSay = {
  /**
   * What the press does, which is the thing a stranger has to know before
   * making it. Held first: the demo's leading ask is one the Gate stops
   * (`DEMO_LEADING_PRESET`), so the first press moves nothing, and a visitor
   * who was not told that has watched a button do nothing.
   */
  readonly lead: string
  /** Why, in the level's own word and the shared table's. */
  readonly detail: string
  /** Whether the page will move on the press — what the surface styles on. */
  readonly moves: boolean
  /**
   * Which of the three answers the Gate gave, as one word.
   *
   * `lead` and `detail` are sentences about *this* button and are the right
   * shape for the one press the panel invites. They are the wrong shape for a
   * list: four of them stacked down the rail is the record dumped on arrival,
   * which is the trap this surface is named for. So the same verdict is also
   * carried as a value nothing has to parse — which is what lets a row wear two
   * words (`what-each-row-says.ts`) and a panel count them
   * (`how-many-wait-for-you.ts`).
   */
  readonly standing: AskStanding
  /**
   * Whether this press would put the page back where the visitor's last change
   * moved it from — the one thing about an offered ask that the preset table
   * cannot know, because it is a fact about the history rather than about the
   * ask.
   *
   * `false` on the arrival screen, always, because there is no last change to
   * reverse. It stops being false the moment a toggle has been pressed once,
   * which is the defect `put-back.ts` records the measurement for.
   */
  readonly putsBack: boolean
}

/**
 * The Gate's answer to one ask, before anybody pressed it.
 *
 * Not a fourth vocabulary: these are the three outcomes `composeChange` can
 * reach that this surface can offer a press for, named from the visitor's side
 * rather than the runtime's — *what happens to me when I press it*, rather than
 * `awaiting-confirmation`.
 */
export type AskStanding = "on-its-own" | "asks-you" | "refuses"

/**
 * The three endings a verdict can have, as a sentence about a press that has
 * not happened.
 *
 * Forward tense throughout, which is the one thing every string here must be
 * and the one thing nothing already in the repository was: every plain-language
 * table this surface reads — `STATES`, `RULE_SENTENCES`, `STAKE_FACTORS` — was
 * written for a record, and a record is something that already happened.
 */
const SAID = {
  held: {
    lead: "Pressing this raises a question, not a change.",
    tail: "so Loom asks you before the page moves, and writes down what you decide.",
  },
  applied: {
    lead: "Pressing this changes the page straight away.",
    tail: "so Loom does it without stopping to ask, and writes down what it did.",
  },
  refused: {
    lead: "Loom will not make this change.",
    tail: "so nothing on the page moves, and Loom writes down why.",
  },
} as const

/**
 * The verdict, as the panel says it — a pure function over the outcome, so the
 * words are testable without running a pipeline and the pipeline is testable
 * without reading any words.
 *
 * The two endings that never reached the Gate return nothing. An utterance no
 * interpreter could make a delta from and a delta the tree refuses have no
 * stakes and no verdict, and a panel inventing *"Low risk"* for one of them
 * would be the surface answering a question the runtime never asked — the same
 * restraint `weighedOf` exercises one screen later, for the same reason.
 *
 * It is also the honest state for a preset this tree gives nothing to do:
 * `plan` returns `undefined`, the interpreter refuses, and the panel falls back
 * to the sentence it has always carried rather than claiming a verdict it has
 * not got.
 */
export const willSayOf = (outcome: CompositionOutcome, putsBack = false): WillSay | undefined => {
  switch (outcome.kind) {
    case "awaiting-confirmation":
      return {
        lead: SAID.held.lead,
        detail: `${STAKES[outcome.assessment.stakes.level].label} — ${SAID.held.tail}`,
        moves: false,
        standing: "asks-you",
        putsBack,
      }
    case "applied":
      return {
        lead: SAID.applied.lead,
        detail: `${STAKES[outcome.assessment.stakes.level].label} — ${SAID.applied.tail}`,
        moves: true,
        standing: "on-its-own",
        putsBack,
      }
    case "rejected":
      return {
        lead: SAID.refused.lead,
        detail: `${STAKES[outcome.assessment.stakes.level].label} — ${SAID.refused.tail}`,
        moves: false,
        standing: "refuses",
        putsBack,
      }
    case "not-interpreted":
    case "not-applicable":
      return undefined
  }
}

/**
 * The proposal's delta, where the outcome reached one.
 *
 * The three verdicts carry an assessment and an assessment carries the proposal
 * it was made about; the two endings that never reached the Gate carry neither,
 * and are the same two `willSayOf` already answers nothing for.
 */
const deltaOf = (outcome: CompositionOutcome): TreeDelta | undefined =>
  outcome.kind === "applied" ||
  outcome.kind === "awaiting-confirmation" ||
  outcome.kind === "rejected"
    ? outcome.assessment.proposal.delta
    : undefined

/**
 * Run the real thing against the real tree and read the verdict off it.
 *
 * The runtime is `beginDemoWrite`'s, less the store and the holds — same
 * interpreter shape, same `fixedPolicy(demoPolicy)`, same clock and ids. It has
 * to be: a verdict reached under a different policy than the press will meet is
 * worse than no verdict, because it is a sentence this surface would stand
 * behind and be wrong about.
 *
 * The events go nowhere. The demo's record *is* the event stream read back
 * within the request that wrote it (`session.ts`), and nothing here is writing
 * a record — a visitor who looked at the page and left has asked for nothing.
 *
 * `undefined` in, `undefined` out, so the page can hand it `rail.leading?.preset`
 * without deciding anything. Which ask is primary is `rail.ts`'s reading and
 * `presets.ts`'s rule; this module only asks the Gate about whichever one that
 * was.
 */
export const whatItWillSay = async (
  tree: LoomTree,
  presetId: DemoPresetId | undefined,
  ids: IdFactory,
  clock: Clock,
  /**
   * What the visitor's last change moved, which is the whole of the history
   * this reading is allowed to look at (`record.ts`'s `lastMovesIn`).
   *
   * Optional, and absent means *there is nothing to put back* rather than
   * *nobody checked* — on the arrival screen it genuinely is absent, and a
   * caller that never passes it gets the arrival screen's answer, which is the
   * honest one for a page nothing has happened to.
   */
  lastMoves?: readonly SettingMove[]
): Promise<WillSay | undefined> => {
  const preset = presetId === undefined ? undefined : presetById(presetId)
  if (preset === undefined) return undefined

  const outcome = await composeChange(
    {
      interpreter: presetInterpreter(preset, ids, clock),
      policySource: fixedPolicy(demoPolicy),
      events: { emit: () => undefined },
      clock,
      idFactory: ids,
    },
    tree,
    /**
     * The same intent `actions.ts` writes for a preset press, field for field.
     * `baseRevision` is the tree in hand rather than a form value, which is the
     * one difference and is the same fact: there is no client here to have seen
     * a different revision, and the tree this is judged against is the tree the
     * page is rendering.
     */
    {
      intentId: ids.intentId(),
      treeId: tree.treeId,
      baseRevision: tree.revision,
      origin: "user-instruction",
      actor: DEMO_ACTOR,
      utterance: preset.utterance,
      observedAt: clock.now(),
    }
  )

  return willSayOf(outcome, wouldPutTheLastChangeBack(tree, deltaOf(outcome), lastMoves))
}

/** What the Gate answered about each ask on offer, by preset id. */
export type AskVerdicts = Readonly<Partial<Record<DemoPresetId, WillSay>>>

/**
 * The Gate's answer to **every** ask the panel is offering, reached the same
 * way the lead's is: by running it.
 *
 * ## Why this is the fact the arrival screen was missing
 *
 * One verdict proves one button honest. Five of them prove the *product*,
 * because the five answers are not the same — and that difference is the thing
 * no screenshot, no video and no other AI demonstration can carry. Everybody
 * can show a model rewriting a page; `docs/rollout.md` names that as the least
 * novel thing here. Only a governed one can say, before a stranger has pressed
 * anything, *this one I will just do, and that one I will stop and ask you
 * about* — and be checked on it fifteen seconds later.
 *
 * Until this run the arrival screen's claim was *"Loom weighs every ask before
 * it lands, and writes down what it did"*, which is true of every ask ever made
 * and therefore proves nothing about any of them. `how-many-wait-for-you.ts`
 * turns these answers into the same claim with the hedge taken out: a count,
 * over this page, at this revision, under `demoPolicy`.
 *
 * ## Why it is allowed to say it before the press
 *
 * The same reason the lead's verdict is, and it does not weaken by being said
 * five times: nothing here is **typed**. `presets.ts` refuses to let a preset's
 * label name a verdict, and it is right to — a typed label would be a surface
 * predicting a decision it does not make, and would be wrong the first time the
 * policy or the page moved. These are not predictions. Each one *is*
 * `composeChange`'s own answer, so retune the policy or move the page and the
 * words move with it. A prediction can be wrong; a value cannot disagree with
 * itself. `pipeline.test.ts` holds that against the real write path rather than
 * against this paragraph.
 *
 * ## What it costs, said plainly
 *
 * Five tree walks instead of one, on a render, with no key, no store and no
 * session. The presets are deterministic interpreters (0057), which is the
 * whole reason a governed verdict can be free at all.
 *
 * **What is still unmeasured is a cold serverless invocation**, which is this
 * lane's open finding of 1 October — and this run does not improve it, it
 * multiplies it: that entry was filed about one such call per render and there
 * are now one per offered ask. The entry is appended to with this run's numbers
 * rather than quietly outgrown.
 *
 * ## Keyed, and omitting rather than guessing
 *
 * A plain record rather than a `Map`, because it crosses to a client component
 * and an object is the one shape nothing has to be told about. An ask that
 * reached no verdict — not interpretable against this tree, not applicable to
 * it — is **absent** rather than present with a hedge, which is the restraint
 * `willSayOf` exercises one level down, and is what keeps the count honest:
 * what is counted is what was answered.
 */
export const whatEachWillSay = async (
  tree: LoomTree,
  available: readonly DemoPresetId[],
  ids: IdFactory,
  clock: Clock,
  /** Handed through unchanged, so every row is measured against one history. */
  lastMoves?: readonly SettingMove[]
): Promise<AskVerdicts> => {
  const says: Partial<Record<DemoPresetId, WillSay>> = {}

  for (const preset of offeredPresets(available)) {
    const said = await whatItWillSay(tree, preset.id, ids, clock, lastMoves)
    if (said !== undefined) says[preset.id] = said
  }

  return says
}

/** Which of the answered asks would only put the visitor's last change back. */
export const asksThatPutItBack = (says: AskVerdicts): ReadonlySet<DemoPresetId> =>
  new Set(
    Object.entries(says).flatMap(([id, said]) =>
      said?.putsBack === true ? [id as DemoPresetId] : []
    )
  )
