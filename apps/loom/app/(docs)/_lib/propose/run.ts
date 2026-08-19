import {
  composeChange,
  confirmChange,
  fixedPolicy,
  sequentialIdFactory,
  systemClock,
  type Clock,
  type CompositionOutcome,
  type CompositionRuntime,
  type ConfirmationOutcome,
  type EditIntent,
  type IdFactory,
  type LoomTree,
  type ProposedChange,
  type RuntimeEventEnvelope,
} from "@loom/runtime"

import { docsGatePolicy } from "./policy"
import { docsPresetInterpreter, type DocsPreset } from "./presets"

/**
 * One trip through the runtime, for one chip on one example.
 *
 * This module is the whole of what the site does when a reader clicks: build an
 * intent, hand it to `composeChange`, keep what came back. There is no store, no
 * session and no server — the pipeline is a pure function of the tree and the
 * intent, so the entire sequence runs in the reader's browser and the page they
 * are looking at is the real thing rather than a recording of it.
 *
 * That is a deliberate limit as much as a convenience. A change here is applied
 * to a tree held in React state and is gone on reload: nothing is appended to a
 * log, nothing is attributed to anybody, and undo is therefore not offered,
 * because an undo is a proposal against a stored history (0032) and this site has
 * no history to propose against. What the record below *can* show is the inverse
 * delta the runtime computed — the undo it would make, if there were somewhere to
 * put it.
 */

/**
 * Ids that read as themselves, and cannot collide with the tree's own.
 *
 * Every example is built by a `sequentialIdFactory` under its own namespace, so
 * a change minting `n_firsttree1` again would produce two different nodes
 * claiming one id. The step number is in the namespace as well as the counter:
 * two clicks on the same example are two independent factories, and the ids in
 * the second proposal do not continue the first one's numbering.
 *
 * An id body is `[0-9a-z]{1,32}`, which is why the example id is stripped rather
 * than used as-is — `first-tree` is not a legal namespace and the failure is a
 * throw on the first node built.
 */
export const docsChangeNamespace = (exampleId: string, step: number): string =>
  `${exampleId.replace(/[^0-9a-z]/g, "").slice(0, 16)}c${step}`

export type DocsProposalRequest = {
  readonly exampleId: string
  readonly tree: LoomTree
  readonly preset: DocsPreset
  /** How many changes this example has been asked for already. Ids read from it. */
  readonly step: number
  readonly clock?: Clock
}

/**
 * Everything one click produced, in the order a reader meets it: what was asked,
 * what the runtime made of it, and what the Gate said.
 *
 * The intent and the events are kept rather than summarised because the site
 * shows them. A documentation page that told a reader "the runtime records every
 * stage" and then displayed a verdict would be asking them to take the
 * interesting half on trust.
 */
export type DocsProposal = {
  readonly step: number
  readonly preset: DocsPreset
  readonly intent: EditIntent
  readonly outcome: CompositionOutcome
  readonly events: readonly RuntimeEventEnvelope[]
}

const collectingRuntime = (
  idFactory: IdFactory,
  clock: Clock,
  interpreter: CompositionRuntime["interpreter"]
): { readonly runtime: CompositionRuntime; readonly events: RuntimeEventEnvelope[] } => {
  const events: RuntimeEventEnvelope[] = []

  return {
    events,
    runtime: {
      interpreter,
      policySource: fixedPolicy(docsGatePolicy),
      events: { emit: (envelope) => void events.push(envelope) },
      clock,
      idFactory,
      /**
       * No repairer. A refusal on this site is the Gate saying no in front of a
       * reader, which is the site working; a second, quieter attempt would be
       * the runtime arguing with its own verdict on a page about the verdict.
       */
    },
  }
}

const intentFor = (
  tree: LoomTree,
  preset: DocsPreset,
  idFactory: IdFactory,
  clock: Clock
): EditIntent => ({
  intentId: idFactory.intentId(),
  treeId: tree.treeId,
  baseRevision: tree.revision,
  /**
   * A reader clicked a button, so this is a person asking — which is also the
   * origin with the most latitude under the default ceilings. Calling it
   * anything else would make the Gate stricter here than it would be for the
   * same change on a real site, and the page would be teaching the wrong
   * verdict.
   */
  origin: "user-instruction",
  utterance: preset.utterance,
  observedAt: clock.now(),
})

export const proposeDocsChange = async (
  request: DocsProposalRequest
): Promise<DocsProposal> => {
  const clock = request.clock ?? systemClock
  const idFactory = sequentialIdFactory(docsChangeNamespace(request.exampleId, request.step))
  const { runtime, events } = collectingRuntime(
    idFactory,
    clock,
    docsPresetInterpreter(request.preset, idFactory, clock)
  )
  const intent = intentFor(request.tree, request.preset, idFactory, clock)
  const outcome = await composeChange(runtime, request.tree, intent)

  return { step: request.step, preset: request.preset, intent, outcome, events }
}

export type DocsConfirmationRequest = {
  readonly exampleId: string
  readonly tree: LoomTree
  readonly proposal: DocsProposal
  readonly held: ProposedChange
  readonly clock?: Clock
}

/**
 * Answering a hold, which is the half of the Gate a verdict alone cannot show.
 *
 * `confirmChange` re-assesses against the tree as it stands now rather than
 * trusting the assessment made when the change was held, so a confirmation
 * cannot smuggle in a decision made about a different page. The reader saying
 * yes is not a way past the Gate: a change it would now refuse outright stays
 * refused.
 */
export const confirmDocsChange = (request: DocsConfirmationRequest): DocsProposal => {
  const clock = request.clock ?? systemClock
  const idFactory = sequentialIdFactory(
    docsChangeNamespace(request.exampleId, request.proposal.step)
  )
  const interpreter = docsPresetInterpreter(request.proposal.preset, idFactory, clock)
  const { runtime, events } = collectingRuntime(idFactory, clock, interpreter)
  const outcome: ConfirmationOutcome = confirmChange(
    runtime,
    request.tree,
    request.held,
    request.proposal.intent
  )

  return {
    step: request.proposal.step,
    preset: request.proposal.preset,
    intent: request.proposal.intent,
    outcome,
    events: [...request.proposal.events, ...events],
  }
}

/** The tree a proposal left behind, or the one it was judged against. */
export const treeAfter = (tree: LoomTree, proposal: DocsProposal): LoomTree =>
  proposal.outcome.kind === "applied" ? proposal.outcome.tree : tree

/** The proposal a reader may answer, when the Gate held one. */
export const heldProposal = (proposal: DocsProposal): ProposedChange | undefined =>
  proposal.outcome.kind === "awaiting-confirmation"
    ? proposal.outcome.assessment.proposal
    : undefined
