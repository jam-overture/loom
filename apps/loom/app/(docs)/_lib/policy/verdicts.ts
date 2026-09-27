import {
  composeChange,
  defaultGatePolicy,
  fixedPolicy,
  noopEventSink,
  sequentialIdFactory,
  type Clock,
  type DispositionKind,
  type DispositionReasonCode,
  type EditIntent,
  type GatePolicy,
  type IntentOrigin,
  type LoomTree,
  type StakeLevel,
} from "@jam-overture/loom"

import { docsExamples } from "../examples/catalogue"
import { docsGatePolicy } from "../propose/policy"
import { docsPresetById, docsPresetInterpreter, type DocsPreset } from "../propose/presets"

/**
 * The same ask, judged twice, with one thing different between the two runs.
 *
 * This is the page's argument and it is not a thing prose can make. "Change the
 * policy and the verdicts change with it" is a claim; two verdicts side by side,
 * computed as the page builds, is the claim happening. A reader can check the
 * only interesting thing about it — that nothing else differed — by reading what
 * each column says it changed.
 *
 * Every column here is a **real trip through `composeChange`**: the site's own
 * presets planning against the site's own first example, the real Gate, and
 * whatever disposition came back. Nothing is scripted to make a point, which is
 * why the sentences under each verdict are the runtime's rather than a
 * paraphrase — including the ones that name a primitive this site protects.
 *
 * The load-bearing line is the assertion in `judge`. A column declares the
 * verdict it is illustrating, and a run that produces a different one throws and
 * stops the build. Without it a policy change somewhere else would leave this
 * page confidently printing "accepted" over a refusal, which is the exact
 * failure the comparison exists to make visible.
 */

/**
 * Fixed, so the page is byte-identical on every build. Nothing a reader sees
 * here is a timestamp, but intents carry one and a wall clock would make two
 * builds of the same commit differ for no reason anybody could see.
 */
const VERDICT_CLOCK: Clock = { now: () => "2026-09-04T09:00:00.000Z" }

/** What this site calls the person clicking, everywhere a name is required. */
const ASKER = "the reader"

/**
 * The tree every comparison happens to: the first example on the site.
 *
 * Reused rather than built here, because a reader arriving at this page has
 * already watched chips run against this exact tree on *Your first tree* and
 * *What the Gate decides*. A page about policy should be changing the policy and
 * nothing else, and a tree written specially for it would be one more thing the
 * reader has to take on trust.
 */
const seedTree = (): LoomTree => {
  const example = docsExamples.get("first-tree")

  if (example === undefined) {
    throw new Error("loom: the policy comparisons need the first-tree example, and it is not registered")
  }

  return example.build()
}

const presetOrThrow = (id: string): DocsPreset => {
  const preset = docsPresetById(id)

  if (preset === undefined) {
    throw new Error(`loom: the policy comparisons name a preset that does not exist — ${id}`)
  }

  return preset
}

export type PolicyVerdict = {
  readonly kind: DispositionKind
  readonly stakes: StakeLevel
  readonly reasonCode: DispositionReasonCode
  /** The Gate's own sentence about why, printed verbatim. */
  readonly detail: string
  /** Which policy said so — the field that makes a decision auditable later. */
  readonly policyId: string
}

type Run = {
  /** The namespace the ids of this run are minted under. Unique per column. */
  readonly namespace: string
  readonly preset: DocsPreset
  readonly policy: GatePolicy
  readonly origin: IntentOrigin
  /** The verdict this column is on the page to show. Asserted, not assumed. */
  readonly expect: DispositionKind
}

/**
 * One ask, through the composition pipeline, against a policy of the caller's
 * choosing.
 *
 * `composeChange` rather than `commitIntent`, because a comparison is about the
 * judgment and not about the writing: no store is opened, nothing is persisted,
 * and the two columns cannot interfere with one another because neither of them
 * has anywhere to leave a mark.
 */
const judge = async (run: Run): Promise<PolicyVerdict> => {
  const tree = seedTree()
  const ids = sequentialIdFactory(run.namespace)

  const intent: EditIntent = {
    intentId: ids.intentId(),
    treeId: tree.treeId,
    baseRevision: tree.revision,
    origin: run.origin,
    actor: ASKER,
    utterance: run.preset.utterance,
    observedAt: VERDICT_CLOCK.now(),
  }

  const outcome = await composeChange(
    {
      interpreter: docsPresetInterpreter(run.preset, ids, VERDICT_CLOCK),
      policySource: fixedPolicy(run.policy),
      events: noopEventSink,
      clock: VERDICT_CLOCK,
      idFactory: ids,
    },
    tree,
    intent
  )

  if (outcome.kind === "not-interpreted" || outcome.kind === "not-applicable") {
    throw new Error(
      `loom: the "${run.preset.label}" comparison never reached the Gate — it ended ${outcome.kind}`
    )
  }

  if (outcome.disposition.kind !== run.expect) {
    throw new Error(
      `loom: the "${run.preset.label}" comparison under ${run.policy.policyId} claims ${run.expect} and the Gate said ${outcome.disposition.kind}`
    )
  }

  return {
    kind: outcome.disposition.kind,
    stakes: outcome.disposition.stakes,
    reasonCode: outcome.disposition.reason.code,
    detail: outcome.disposition.reason.detail,
    policyId: outcome.disposition.policyId,
  }
}

export type VerdictColumn = {
  /** What this column is, in a few words: the policy or the asker it stands for. */
  readonly label: string
  /** The one thing that differs from the other column, spelled out. */
  readonly difference: string
  readonly verdict: PolicyVerdict
}

export type ComparisonId = "what-you-protect" | "who-asked" | "where-it-stops"

export type VerdictComparison = {
  readonly id: ComparisonId
  /** The question the two columns answer, as a reader would ask it. */
  readonly question: string
  /** What was asked for, in the words a person would have typed. */
  readonly ask: string
  /** One sentence about what the pair shows. The site's voice, not the runtime's. */
  readonly moral: string
  readonly columns: readonly VerdictColumn[]
}

type Recipe = Omit<VerdictComparison, "columns"> & {
  readonly columns: readonly (Omit<VerdictColumn, "verdict"> & { readonly run: Run })[]
}

const DEMOTE = "demote-the-heading"
const ADD = "add-a-sentence"
const REMOVE = "remove-the-heading"

const RECIPES: readonly Recipe[] = [
  {
    id: "what-you-protect",
    question: "What difference does one line of vocabulary make?",
    ask: presetOrThrow(DEMOTE).utterance,
    moral:
      "Nothing about the change moved. The only difference between these two runs is that one policy had said a heading matters here.",
    columns: [
      {
        label: "The policy you get for free",
        difference: "protectedPrimitiveTypes is empty — the runtime's own default.",
        run: {
          namespace: "protectdefault",
          preset: presetOrThrow(DEMOTE),
          policy: defaultGatePolicy,
          origin: "user-instruction",
          expect: "accepted",
        },
      },
      {
        label: "This site's policy",
        difference: 'protectedPrimitiveTypes is ["loom.heading"], and nothing else differs.',
        run: {
          namespace: "protectdocs",
          preset: presetOrThrow(DEMOTE),
          policy: docsGatePolicy,
          origin: "user-instruction",
          expect: "requires-confirmation",
        },
      },
    ],
  },
  {
    id: "who-asked",
    question: "Does it matter who wanted it?",
    ask: presetOrThrow(ADD).utterance,
    moral:
      "The same policy, the same change, the same page — and a person who asked for it gets it, while a schedule that nobody was watching has to check first.",
    columns: [
      {
        label: "Somebody asked",
        difference: "origin is user-instruction, whose ceiling is medium.",
        run: {
          namespace: "askeduser",
          preset: presetOrThrow(ADD),
          policy: docsGatePolicy,
          origin: "user-instruction",
          expect: "accepted",
        },
      },
      {
        label: "Nobody asked",
        difference: "origin is scheduled-adaptation, whose ceiling is low.",
        run: {
          namespace: "askedcron",
          preset: presetOrThrow(ADD),
          policy: docsGatePolicy,
          origin: "scheduled-adaptation",
          expect: "requires-confirmation",
        },
      },
    ],
  },
  {
    id: "where-it-stops",
    question: "Where does asking a person stop being enough?",
    ask: presetOrThrow(REMOVE).utterance,
    moral:
      "One word apart from the change above, under the same one-line policy, and past the refusal floor there is no button that turns it into a yes.",
    columns: [
      {
        label: "The policy you get for free",
        difference: "Nothing is protected, so this is an ordinary removal.",
        run: {
          namespace: "stopdefault",
          preset: presetOrThrow(REMOVE),
          policy: defaultGatePolicy,
          origin: "user-instruction",
          expect: "accepted",
        },
      },
      {
        label: "This site's policy",
        difference: "The same one line — and destroying what it protects outranks reconfiguring it.",
        run: {
          namespace: "stopdocs",
          preset: presetOrThrow(REMOVE),
          policy: docsGatePolicy,
          origin: "user-instruction",
          expect: "rejected",
        },
      },
    ],
  },
]

export const COMPARISON_IDS: readonly ComparisonId[] = RECIPES.map((recipe) => recipe.id)

/**
 * Runs every column, in order.
 *
 * Sequential per comparison and parallel across them is not worth the
 * complication: each run builds its own tree and its own id factory, so nothing
 * is shared and `Promise.all` is safe throughout.
 */
export const produceComparisons = (): Promise<readonly VerdictComparison[]> =>
  Promise.all(
    RECIPES.map(async (recipe) => ({
      id: recipe.id,
      question: recipe.question,
      ask: recipe.ask,
      moral: recipe.moral,
      columns: await Promise.all(
        recipe.columns.map(async ({ run, ...column }) => ({
          ...column,
          verdict: await judge(run),
        }))
      ),
    }))
  )

export const comparisonById = async (id: ComparisonId): Promise<VerdictComparison> => {
  const found = (await produceComparisons()).find((comparison) => comparison.id === id)

  if (found === undefined) {
    throw new Error(`loom: no policy comparison is called ${id}`)
  }

  return found
}
