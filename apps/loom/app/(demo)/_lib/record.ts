import type {
  ChangeAssessment,
  Disposition,
  DispositionReasonCode,
  EditIntent,
  IrreversibilityReason,
  RuntimeEvent,
  RuntimeEventEnvelope,
  StakeFactor,
  TreeDelta,
} from "@loom/runtime"

/**
 * One ask, and everything the runtime said about it, in one record.
 *
 * This is the demo's whole thesis as a data structure. "An AI changed the page"
 * is unremarkable on its own; what is worth showing is the page *and* the
 * account of how it changed — the proposal with its rationale and provenance,
 * the two axes the Gate weighed, which rule fired under which policy, the
 * inverse that makes undo real, and the revision it produced.
 *
 * Every field here already existed in the runtime. Nothing is computed for
 * display and nothing is embellished: the record is a projection of the events
 * the runtime narrates about itself (0023's stream, before it is narrowed for
 * storage), so a surface cannot show a verdict the Gate did not reach.
 *
 * A pure function over envelopes, with no React in sight, because the mapping
 * from "what happened" to "what a reader sees" is the part worth testing.
 */

export type RecordOutcome =
  | "applied"
  | "awaiting-you"
  | "refused"
  | "discarded"
  | "not-interpreted"
  | "did-not-apply"
  | "in-flight"

export type InterpretationView = {
  readonly rationale: string
  readonly interpreter: string
  readonly authoredBy: "model" | "runtime"
  readonly confidence: number
  readonly interpretedAt: string
  readonly operations: readonly string[]
}

export type StakesView = {
  readonly level: string
  readonly factors: readonly StakeFactor[]
}

export type ReversibilityView = {
  readonly reversible: boolean
  readonly retainedNodeCount: number
  readonly reasons: readonly string[]
  readonly inverseOperations: readonly string[]
}

export type DispositionView = {
  readonly kind: Disposition["kind"]
  readonly ruleCode: DispositionReasonCode
  readonly detail: string
  readonly policyId: string
  readonly policyFingerprint?: string
  readonly confidence: number
}

export type RevisionView = {
  /** The revision this change produced. */
  readonly produced: number
  /** And the one it replaced, which is the thing undo puts back. */
  readonly replaced: number
}

export type ChangeRecord = {
  /** The intent's id: one ask, one record, however many proposals it took. */
  readonly recordId: string
  readonly askedAt: string
  readonly utterance: string
  readonly origin: EditIntent["origin"]
  readonly actor?: string
  readonly outcome: RecordOutcome
  readonly interpretation?: InterpretationView
  readonly stakes?: StakesView
  readonly reversibility?: ReversibilityView
  readonly disposition?: DispositionView
  readonly revision?: RevisionView
  /** Set while a proposal sits in custody, so the surface can offer the answer. */
  readonly heldProposalId?: string
  /**
   * Who allowed a held change. Never the same field as `actor`: a hold exists
   * because the Gate wanted a second person, and provenance records only the
   * first (0029).
   */
  readonly answeredBy?: string
  /** Why nothing happened, when nothing happened. */
  readonly failure?: string
  /** A repair (0006) means the Gate refused once and the model tried again. */
  readonly repaired: boolean
}

const describeOperation = (operation: TreeDelta["operations"][number]): string => {
  switch (operation.op) {
    case "insert":
      return `insert ${operation.node.kind === "element" ? operation.node.type : operation.node.kind} into ${operation.parentId} at ${operation.index}`
    case "remove":
      return `remove ${operation.nodeId}`
    case "move":
      return `move ${operation.nodeId} to ${operation.parentId} at ${operation.index}`
    case "configure": {
      const keys = [...Object.keys(operation.set), ...operation.unset.map((key) => `${key} (cleared)`)]

      return `configure ${operation.nodeId}: ${keys.length === 0 ? "nothing" : keys.join(", ")}`
    }
  }
}

const interpretationOf = (assessment: ChangeAssessment): InterpretationView => ({
  rationale: assessment.proposal.rationale,
  interpreter: assessment.proposal.provenance.interpreter,
  authoredBy: assessment.proposal.provenance.authoredBy,
  confidence: assessment.proposal.provenance.confidence,
  interpretedAt: assessment.proposal.provenance.interpretedAt,
  operations: assessment.proposal.delta.operations.map(describeOperation),
})

/**
 * Why an undo would not put things back. Said in full rather than by code: the
 * two reasons fail for different reasons — one is about effects outside the
 * tree, one is about how much the inverse would have to carry — and a reader
 * deciding whether to confirm needs the difference.
 */
const describeIrreversibility = (reason: IrreversibilityReason): string =>
  reason.code === "out-of-tree-effect"
    ? `touches ${reason.primitiveTypes.join(", ")}, whose effects reach outside the tree`
    : `the inverse would carry ${reason.retainedNodeCount} nodes, past a budget of ${reason.budget}`

const reversibilityOf = (assessment: ChangeAssessment): ReversibilityView => ({
  reversible: assessment.reversibility.reversible,
  retainedNodeCount: assessment.reversibility.retainedNodeCount,
  reasons: assessment.reversibility.reasons.map(describeIrreversibility),
  inverseOperations: assessment.reversibility.inverse.operations.map(describeOperation),
})

const dispositionOf = (disposition: Disposition): DispositionView => ({
  kind: disposition.kind,
  ruleCode: disposition.reason.code,
  detail: disposition.reason.detail,
  policyId: disposition.policyId,
  ...(disposition.policyFingerprint === undefined
    ? {}
    : { policyFingerprint: disposition.policyFingerprint }),
  confidence: disposition.confidence,
})

/**
 * The record under construction.
 *
 * Views rather than raw runtime values, because a draft can start from a record
 * that already exists: answering a hold narrates a fresh assessment and verdict
 * but no intent, so the only way to say *which ask* was answered is to fold the
 * new events onto the record that was waiting.
 */
type Draft = {
  identity?: Pick<ChangeRecord, "recordId" | "askedAt" | "utterance" | "origin" | "actor">
  interpretation?: InterpretationView
  stakes?: StakesView
  reversibility?: ReversibilityView
  disposition?: DispositionView
  revision?: RevisionView
  held?: string | undefined
  answeredBy?: string | undefined
  discarded: boolean
  failure?: string
  repaired: boolean
}

const identityOf = (intent: EditIntent, askedAt: string): NonNullable<Draft["identity"]> => ({
  recordId: intent.intentId,
  askedAt,
  utterance: intent.utterance,
  origin: intent.origin,
  ...(intent.actor === undefined ? {} : { actor: intent.actor }),
})

const draftFrom = (base: ChangeRecord | undefined): Draft =>
  base === undefined
    ? { repaired: false, discarded: false }
    : {
        identity: {
          recordId: base.recordId,
          askedAt: base.askedAt,
          utterance: base.utterance,
          origin: base.origin,
          ...(base.actor === undefined ? {} : { actor: base.actor }),
        },
        ...(base.interpretation === undefined ? {} : { interpretation: base.interpretation }),
        ...(base.stakes === undefined ? {} : { stakes: base.stakes }),
        ...(base.reversibility === undefined ? {} : { reversibility: base.reversibility }),
        ...(base.disposition === undefined ? {} : { disposition: base.disposition }),
        ...(base.revision === undefined ? {} : { revision: base.revision }),
        ...(base.heldProposalId === undefined ? {} : { held: base.heldProposalId }),
        ...(base.answeredBy === undefined ? {} : { answeredBy: base.answeredBy }),
        discarded: base.outcome === "discarded",
        repaired: base.repaired,
      }

const failureOf = (event: RuntimeEvent): string | undefined => {
  switch (event.type) {
    case "interpretation-failed":
      return `not interpreted: ${event.error.detail}`
    case "assessment-failed":
      return `the proposal did not apply to this tree: ${event.error.code}`
    case "application-failed":
      return `the delta did not apply: ${event.error.code}`
    case "intent-not-writable":
      return `the page had already moved on: ${event.error.code}`
    case "commit-failed":
      return `applied, then not written: ${event.error.code}`
    case "hold-failed":
      return `the Gate offered it and custody failed: ${event.detail}`
    case "repair-failed":
      return `the second attempt failed: ${event.error.detail}`
    default:
      return undefined
  }
}

const assessed = (draft: Draft, assessment: ChangeAssessment): Draft => ({
  ...draft,
  interpretation: interpretationOf(assessment),
  stakes: { level: assessment.stakes.level, factors: assessment.stakes.factors },
  reversibility: reversibilityOf(assessment),
})

const fold = (draft: Draft, envelope: RuntimeEventEnvelope): Draft => {
  const { event } = envelope

  switch (event.type) {
    case "intent-received":
      return { ...draft, identity: identityOf(event.intent, envelope.occurredAt) }
    case "change-assessed":
      return assessed(draft, event.assessment)
    case "disposition-decided":
      return { ...draft, disposition: dispositionOf(event.disposition) }
    case "change-committed":
      return { ...draft, revision: { produced: event.revision, replaced: event.revision - 1 } }
    case "proposal-held":
      return { ...draft, held: event.proposalId }
    /**
     * A hold that has been answered is no longer a hold. Clearing it here rather
     * than leaving the surface to notice is what keeps a card from offering
     * buttons for a decision that has already been made.
     */
    case "hold-confirmed":
      return { ...draft, held: undefined, ...(event.actor === undefined ? {} : { answeredBy: event.actor }) }
    case "hold-discarded":
      return {
        ...draft,
        held: undefined,
        discarded: true,
        ...(event.actor === undefined ? {} : { answeredBy: event.actor }),
      }
    case "repair-requested":
      return { ...draft, repaired: true }
    default: {
      const failure = failureOf(event)

      return failure === undefined ? draft : { ...draft, failure }
    }
  }
}

const outcomeOf = (draft: Draft): RecordOutcome => {
  if (draft.revision !== undefined) return "applied"
  if (draft.held !== undefined) return "awaiting-you"
  if (draft.discarded) return "discarded"
  if (draft.failure !== undefined) {
    return draft.failure.startsWith("not interpreted") ? "not-interpreted" : "did-not-apply"
  }
  if (draft.disposition?.kind === "rejected") return "refused"

  return "in-flight"
}

/**
 * The envelopes of one ask, folded into one record — optionally onto the record
 * that ask already produced.
 *
 * Later events win, which is what makes a repair read correctly: a refused
 * proposal and the smaller one that replaced it both narrate a disposition, and
 * the record should show the verdict that stands while still saying a repair
 * happened.
 *
 * `base` is what makes answering a hold legible. `confirmHeld` narrates a second
 * assessment and a second verdict but never an intent — there is nothing left to
 * interpret — so without the record it is completing, those events describe an
 * ask nobody can name. With it, the card a visitor is looking at stops saying
 * "waiting on you" and starts saying which revision it produced.
 */
export const recordFromEvents = (
  envelopes: readonly RuntimeEventEnvelope[],
  base?: ChangeRecord
): ChangeRecord | undefined => {
  const draft = envelopes.reduce<Draft>(fold, draftFrom(base))
  const { identity } = draft

  if (identity === undefined) return undefined

  return {
    ...identity,
    outcome: outcomeOf(draft),
    ...(draft.interpretation === undefined ? {} : { interpretation: draft.interpretation }),
    ...(draft.stakes === undefined ? {} : { stakes: draft.stakes }),
    ...(draft.reversibility === undefined ? {} : { reversibility: draft.reversibility }),
    ...(draft.disposition === undefined ? {} : { disposition: draft.disposition }),
    ...(draft.revision === undefined ? {} : { revision: draft.revision }),
    ...(draft.held === undefined ? {} : { heldProposalId: draft.held }),
    ...(draft.answeredBy === undefined ? {} : { answeredBy: draft.answeredBy }),
    ...(draft.failure === undefined ? {} : { failure: draft.failure }),
    repaired: draft.repaired,
  }
}
