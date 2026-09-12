import {
  composeChange,
  DATA_PROP_KEY,
  defaultGatePolicy,
  fixedPolicy,
  noopEventSink,
  ok,
  sequentialIdFactory,
  walkTree,
  type ChangeInterpreter,
  type Clock,
  type DispositionKind,
  type DispositionReasonCode,
  type EditIntent,
  type GatePolicy,
  type LoomTree,
  type NodeId,
  type StakeLevel,
} from "@loom/runtime"

import { boundPage } from "./shop"

/**
 * What the Gate makes of a change to a question.
 *
 * A binding decides which of a deployment's data appears on a public page, so
 * *repointing* one — `catalogue.services` to `orders.mine`, the same node, one
 * prop — is a change worth knowing about. The page cannot assert what the
 * runtime does with it; the runtime has to say.
 *
 * So the same ask is judged twice, against two policies that differ in one line.
 * It is the shape *What AI may change* uses for every comparison on it, for the
 * reason given there: two verdicts side by side, computed as the page builds, is
 * the claim happening rather than the claim being made.
 */

const REPOINT_CLOCK: Clock = { now: () => "2026-09-12T09:00:00.000Z" }

const THE_ASK = "show my own orders in the services band instead"

/** Where the repointed binding would send the page. */
const SOMEBODY_ELSES_DATA = "orders.mine"

export type RepointVerdict = {
  /** Which policy judged it, in a few words a reader can hold. */
  readonly label: string
  /** The one line that differs between the two policies. */
  readonly difference: string
  readonly kind: DispositionKind
  readonly stakes: StakeLevel
  readonly reasonCode: DispositionReasonCode
  /** The Gate's own sentence, printed verbatim. */
  readonly detail: string
}

const boundNodeId = (tree: LoomTree): NodeId => {
  const bound = Array.from(walkTree(tree.root)).find(
    (node) => node.kind === "element" && node.props[DATA_PROP_KEY] !== undefined
  )

  if (bound === undefined) throw new Error("loom: the bound page has no binding to repoint")

  return bound.id
}

/**
 * One trip through the composition pipeline, against a policy of the caller's
 * choosing.
 *
 * `composeChange` rather than `commitIntent`: this is about the judgement and
 * not about the writing, so no store is opened and neither run can leave a mark
 * the other could read.
 */
const judge = async (
  namespace: string,
  policy: GatePolicy,
  expect: DispositionKind
): Promise<Omit<RepointVerdict, "label" | "difference">> => {
  const { tree } = boundPage()
  const ids = sequentialIdFactory(namespace)
  const nodeId = boundNodeId(tree)

  const interpreter: ChangeInterpreter = {
    interpret: (intent, against) =>
      Promise.resolve(
        ok({
          proposalId: ids.proposalId(),
          intentId: intent.intentId,
          delta: {
            deltaId: ids.deltaId(),
            treeId: against.treeId,
            baseRevision: against.revision,
            operations: [
              {
                op: "configure",
                nodeId,
                set: {
                  [DATA_PROP_KEY]: {
                    services: { source: SOMEBODY_ELSES_DATA, params: {} },
                  },
                },
                unset: [],
              },
            ],
          },
          rationale: `One configure. The band asks ${SOMEBODY_ELSES_DATA} instead of catalogue.services.`,
          provenance: {
            origin: intent.origin,
            ...(intent.actor === undefined ? {} : { actor: intent.actor }),
            interpreter: "loom/docs-bench",
            authoredBy: "runtime",
            confidence: 1,
            interpretedAt: REPOINT_CLOCK.now(),
          },
        })
      ),
  }

  const intent: EditIntent = {
    intentId: ids.intentId(),
    treeId: tree.treeId,
    baseRevision: tree.revision,
    origin: "user-instruction",
    actor: "the reader",
    utterance: THE_ASK,
    observedAt: REPOINT_CLOCK.now(),
  }

  const outcome = await composeChange(
    {
      interpreter,
      policySource: fixedPolicy(policy),
      events: noopEventSink,
      clock: REPOINT_CLOCK,
      idFactory: ids,
    },
    tree,
    intent
  )

  if (outcome.kind === "not-interpreted" || outcome.kind === "not-applicable") {
    throw new Error(`loom: the repointing comparison never reached the Gate — it ended ${outcome.kind}`)
  }

  if (outcome.disposition.kind !== expect) {
    throw new Error(
      `loom: the repointing comparison under ${outcome.disposition.policyId} claims ${expect} and the Gate said ${outcome.disposition.kind}`
    )
  }

  return {
    kind: outcome.disposition.kind,
    stakes: outcome.disposition.stakes,
    reasonCode: outcome.disposition.reason.code,
    detail: outcome.disposition.reason.detail,
  }
}

/** The policy a deployment has before it says anything about its own data. */
const OUT_OF_THE_BOX: GatePolicy = defaultGatePolicy

/**
 * The same policy, having said one thing: that the questions this page asks are
 * not for an instruction to change on its own.
 *
 * `loom:data` is an ordinary prop key to `protectedPropKeys`, which is the point
 * — the knob that exists for a primitive's own props reaches the runtime's keys
 * too, and a deployment that cares does not need a new setting.
 */
const GUARDED: GatePolicy = {
  ...defaultGatePolicy,
  policyId: "loom-docs-guards-its-questions",
  protectedPropKeys: [...defaultGatePolicy.protectedPropKeys, DATA_PROP_KEY],
}

/**
 * Two verdicts on one repointed binding.
 *
 * The expected disposition of each is asserted inside `judge`, so a change to
 * the Gate that made either of these untrue stops the build rather than leaving
 * the page printing a confident lie about what a deployment is protected from.
 */
export const produceRepointing = async (): Promise<readonly RepointVerdict[]> => [
  {
    label: "The policy you get for free",
    difference: "protectedPropKeys is empty — the runtime's own default.",
    ...(await judge("repointfree", OUT_OF_THE_BOX, "accepted")),
  },
  {
    label: "One line added",
    difference: `protectedPropKeys names ${DATA_PROP_KEY}.`,
    ...(await judge("repointguarded", GUARDED, "requires-confirmation")),
  },
]
