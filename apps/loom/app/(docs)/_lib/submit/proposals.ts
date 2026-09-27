import {
  composeChange,
  defaultGatePolicy,
  describeSubmissionError,
  fixedPolicy,
  noopEventSink,
  ok,
  planTreeSubmissions,
  sequentialIdFactory,
  SUBMIT_PROP_KEY,
  walkTree,
  type ChangeInterpreter,
  type Clock,
  type DispositionKind,
  type DispositionReasonCode,
  type EditIntent,
  type JsonObject,
  type LoomNode,
  type LoomTree,
  type NodeId,
  type StakeLevel,
} from "@jam-overture/loom"

import { contactExampleTree } from "@/app/(docs)/_lib/examples/catalogue"

import { CONTACT_ENDPOINT, NEWSLETTER_ENDPOINT } from "./endpoints"

/**
 * What the runtime makes of a change to where a form posts.
 *
 * The page cannot assert this; the Gate has to say it. So the same node is
 * configured twice, under the **same policy** — the one a deployment has before
 * it has said anything — and the two verdicts are computed as the page is built.
 *
 * Holding the policy fixed is the point, and it is the difference from the data
 * seam's comparison on *Where the content comes from*. Repointing a binding is a
 * change a host may choose to guard by naming a key. Repointing a form is
 * guarded by the runtime itself, on every origin, with nothing registered and
 * nothing configured — because where a visitor's typing is sent should not
 * depend on who asked for it to move.
 */

const CLOCK: Clock = { now: () => "2026-09-15T09:00:00.000Z" }

export type FormVerdict = {
  /** The ask, in the words a person would type. */
  readonly ask: string
  /** The one operation it came to, in the seam's vocabulary. */
  readonly operation: string
  readonly kind: DispositionKind
  readonly stakes: StakeLevel
  readonly reasonCode: DispositionReasonCode
  /** The Gate's own sentence, verbatim. */
  readonly detail: string
}

/** The form on the connected contact page — the node every ask here configures. */
const formNodeId = (tree: LoomTree): NodeId => {
  const node = Array.from(walkTree(tree.root)).find(
    (candidate) => candidate.kind === "element" && candidate.type === "loom.form"
  )

  if (node === undefined) throw new Error("loom: the contact page has no form on it")

  return node.id
}

/**
 * One trip through the composition pipeline with the delta already decided.
 *
 * `composeChange` rather than `commitIntent`: this is about the judgement and
 * not about the writing, so no store is opened and neither run can leave a mark
 * the other could read. The interpreter is a function returning a fixed delta,
 * for the reason every produced verdict on this site uses one — the question is
 * what the Gate does with a change, and a model guessing at the change would
 * make the answer a different one each build.
 */
const judge = async (
  namespace: string,
  ask: string,
  operation: string,
  set: JsonObject,
  expect: DispositionKind
): Promise<FormVerdict> => {
  const tree = contactExampleTree(CONTACT_ENDPOINT)
  const ids = sequentialIdFactory(namespace)
  const nodeId = formNodeId(tree)

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
            operations: [{ op: "configure", nodeId, set, unset: [] }],
          },
          rationale: `One configure on the form. ${operation}`,
          provenance: {
            origin: intent.origin,
            ...(intent.actor === undefined ? {} : { actor: intent.actor }),
            interpreter: "loom/docs-bench",
            authoredBy: "runtime",
            confidence: 1,
            interpretedAt: CLOCK.now(),
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
    utterance: ask,
    observedAt: CLOCK.now(),
  }

  const outcome = await composeChange(
    {
      interpreter,
      policySource: fixedPolicy(defaultGatePolicy),
      events: noopEventSink,
      clock: CLOCK,
      idFactory: ids,
    },
    tree,
    intent
  )

  if (outcome.kind === "not-interpreted" || outcome.kind === "not-applicable") {
    throw new Error(`loom: the form comparison never reached the Gate — it ended ${outcome.kind}`)
  }

  if (outcome.disposition.kind !== expect) {
    throw new Error(
      `loom: this page claims "${ask}" is ${expect} and the Gate said ${outcome.disposition.kind}`
    )
  }

  return {
    ask,
    operation,
    kind: outcome.disposition.kind,
    stakes: outcome.disposition.stakes,
    reasonCode: outcome.disposition.reason.code,
    detail: outcome.disposition.reason.detail,
  }
}

/**
 * Two configures on one node, under one policy.
 *
 * The expected disposition of each is asserted inside `judge`, so a change to
 * the Gate that made either untrue stops the build rather than leaving this page
 * printing a confident lie about what a deployment is protected from.
 */
export const produceFormVerdicts = async (): Promise<readonly FormVerdict[]> => [
  await judge(
    "formlayout",
    "put the contact fields in two columns",
    `sets layout`,
    { layout: "paired" },
    "accepted"
  ),
  await judge(
    "formrepoint",
    "send the contact form to the newsletter list instead",
    `sets ${SUBMIT_PROP_KEY}.to`,
    { [SUBMIT_PROP_KEY]: { to: NEWSLETTER_ENDPOINT } },
    "requires-confirmation"
  ),
]

export type RefusedDeclaration = {
  /** What was written into the tree, verbatim. */
  readonly declared: string
  /** `describeSubmissionError`, verbatim: the path and what is wrong with it. */
  readonly sentence: string
  /** How many endpoints the planner came away with. */
  readonly planned: number
}

/**
 * The declaration that carries an address, refused at the plan.
 *
 * This is the thing the whole seam exists to make impossible, so it is worth
 * reaching rather than asserting. A tree is written with `action` beside `to` —
 * which is what a proposal would have to produce to post somewhere the
 * deployment never registered — and `parseSubmission` is asked to read it.
 *
 * Zod's default would **strip** the unknown key and honour the rest, which is
 * right for a document written by an older schema and wrong here: a declaration
 * carrying an address should be refused loudly rather than quietly accepted as
 * though the address were not in it. The schema is `.strict()` for that one
 * reason, and this is that line doing its job.
 */
export const produceRefusedDeclaration = (): RefusedDeclaration => {
  const declared = { to: CONTACT_ENDPOINT, action: "https://forms.example.net/collect" }
  const tree = treeDeclaring(declared)
  const plan = planTreeSubmissions(tree)
  const [problem] = plan.problems

  if (problem === undefined) {
    throw new Error("loom: a declaration carrying an address was planned without complaint")
  }

  return {
    declared: JSON.stringify(declared),
    sentence: describeSubmissionError(problem.error),
    planned: plan.endpoints.length,
  }
}

/** The connected contact page with something else written under `loom:submit`. */
const treeDeclaring = (declared: JsonObject): LoomTree => {
  const tree = contactExampleTree(CONTACT_ENDPOINT)
  const nodeId = formNodeId(tree)

  const rewrite = (node: LoomNode): LoomNode => {
    if (node.kind === "text") return node

    const children = node.children.map(rewrite)

    return node.kind === "element" && node.id === nodeId
      ? { ...node, children, props: { ...node.props, [SUBMIT_PROP_KEY]: declared } }
      : { ...node, children }
  }

  const root = rewrite(tree.root)

  if (root.kind !== "element") throw new Error("loom: the contact page lost its root")

  return { ...tree, root }
}
