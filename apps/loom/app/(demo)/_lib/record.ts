import type {
  ChangeAssessment,
  Disposition,
  DispositionReasonCode,
  EditIntent,
  IrreversibilityReason,
  LoomTree,
  RuntimeEvent,
  RuntimeEventEnvelope,
  StakeFactor,
  StakeLevel,
  TreeDelta,
  TreeOperation,
} from "@jam-overture/loom"

import { plainChange, type PlainChange } from "./plain-change"
import { reversesTheLastChange, settingsMoved, type SettingMove } from "./put-back"
import { keepingWords, touchedBy, type TouchedNode } from "./touched"

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
  /**
   * The runtime's level, not a string that happens to hold one.
   *
   * It was widened to `string` when this view was written and nothing needed it
   * narrow, because the only consumer printed it. `weighed.ts` reads it against
   * the portal's four-entry `STAKES` table, and a `string` there is either a
   * cast or an unreachable fallback branch — both of which are a surface
   * pretending it might be handed a level the Gate cannot produce.
   */
  readonly level: StakeLevel
  readonly factors: readonly StakeFactor[]
}

export type ReversibilityView = {
  readonly reversible: boolean
  readonly retainedNodeCount: number
  readonly reasons: readonly string[]
  readonly inverseOperations: readonly string[]
  /**
   * The inverse itself, beside the sentences about it.
   *
   * `inverseOperations` is `describeOperation` over the inverse — a line of
   * evidence for the disclosure, and the only thing this record kept of the
   * one field on the assessment that is *content* rather than an account of
   * content. `assessReversibility` computes the inverse whether or not anybody
   * undoes anything, and an inverse that puts a removal back carries the
   * removed nodes: that is what `retainedNodeCount` counts, and until now this
   * surface printed the count and threw the nodes away.
   *
   * **Which made the demo's third claim the one it could only assert.** The
   * card says *"The 4 pieces it takes off the page are kept, so the exact
   * opposite of this change already exists"*, which is true, and a stranger's
   * only way to check it was a third press past the end of their minute
   * (`_lib/kept.ts` has the sequence, measured). The pieces are right here.
   * Kept as operations rather than as a rendered anything, because this module
   * has no React in it and the one thing a surface may not do is hold a second
   * copy of a page.
   *
   * Nothing is removed: `inverseOperations` stays exactly as it was, and the
   * disclosure goes on printing it.
   */
  readonly inverse: readonly TreeOperation[]
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
   * The revision this ask was asking to put back, when it was an undo.
   *
   * Not read off the events, because the log does not carry it in a form this
   * surface may read: `revertRevision` synthesises `Undo revision 1.` and a
   * rationale saying the same thing in prose, and both are the runtime's
   * sentences rather than a field. Parsing either would be this surface
   * pattern-matching a string it does not own — the exact thing `undo.ts`
   * refuses to do when it decides whether a record *is* an undo.
   *
   * So it is stamped by the action that asked, which knows the number because
   * it is the number it passed. That makes it the surface's own knowledge about
   * its own request, which is honest, and it is why `undoOf` lives next to the
   * predicate rather than here.
   */
  readonly undoes?: number
  /**
   * Which suggestion this ask came from, when it came from one.
   *
   * Stamped by the action that asked, for the reason `undoes` is: it is the
   * surface's own knowledge about its own request. The runtime is handed a
   * *sentence* — `preset.utterance`, verbatim, because that is what a person
   * would have typed — and has no idea a button produced it, so nothing in the
   * log can give this back. Matching the utterance against the table afterwards
   * would be the surface pattern-matching a string to recover something it knew
   * and threw away.
   *
   * A `string` rather than a `DemoPresetId`, so this module stays clear of the
   * preset table: `presets.ts` reads the record, and typing the field would turn
   * that into a cycle. Same trade `undoes` makes by being a number.
   *
   * What it is for is the one control a dead ask can honestly offer — asking for
   * the same thing again, against the page as it now stands (`moved.ts`).
   */
  readonly presetId?: string
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
  /**
   * Which nodes this change is about, so the page can be marked where it moved
   * rather than only described in the rail. Empty until the change is assessed,
   * and empty forever for an ask that never produced a delta.
   */
  readonly touched: readonly TouchedNode[]
  /**
   * What the change did to the page, in the words on the page, in the past
   * tense — computed once against the tree it was judged against, and kept.
   *
   * **The record's plain half used to exist only while the change was a
   * question.** The page computes that reading per render against the tree on
   * the stage, which is the only tree it has; that is right for a change still
   * waiting and impossible for one that has landed, because the delta has
   * already been applied to that tree and resolving it there reports a change
   * that did nothing. So the one line written in the page's own words rather
   * than the Gate's was dropped at exactly the moment the change became real —
   * and for a change Loom applied on its own it was never shown at all. Two
   * presses of *Repaint the top band* make opposite changes and produced two
   * cards identical to the word.
   *
   * It is frozen here rather than recomputed because the tree it describes is
   * gone by the time anything reads it. Same reason `touched` is frozen one
   * field up, and it arrives on the same event: the assessment carries the
   * delta, and the caller supplies the tree the runtime judged it against.
   *
   * Absent when the caller did not name that tree — which a caller that cannot
   * name it honestly should not. An absent reading prints nothing; a wrong one
   * would print a confident account of a change that did not happen.
   */
  readonly did?: readonly PlainChange[]
  /**
   * Which settings this change moved, and what it moved them from — frozen
   * against the tree it was judged against, for the same reason `did` and
   * `touched` are frozen: that tree is gone by the time anything reads this.
   *
   * It is the only thing on the record that carries a prop's *value*. The
   * technical half already names the props a change configured — `configure
   * demo-n3: backdrop` — and stops there, which is enough to say what was
   * touched and not enough to say which way it went. Two presses of one toggle
   * produce that identical string twice.
   *
   * Absent when the caller could not name the tree, which is the same condition
   * `did` is absent under and the same honesty: a move with no "from" in it is
   * not a move anybody can check.
   */
  readonly settingsMoved?: readonly SettingMove[]
  /**
   * Whether this change put those settings back where the change before them
   * moved them from.
   *
   * Frozen rather than read per render, because the history it is computed
   * against is the history *at the moment of the ask*. A reading taken later
   * would answer a different question every time the visitor pressed something
   * else, and a card that changes its account of what happened is the one thing
   * a record may never do.
   *
   * `put-back.ts` has the argument. It is what lets an ordinary second press
   * wear the words the undo already had.
   */
  readonly wentBack?: boolean
}

/**
 * The tree a change was judged against, and how to read words off it.
 *
 * Handed in by the caller rather than found here, because it is the one thing
 * the event stream does not carry: the runtime narrates the delta, never the
 * tree the delta was planned against. The server action holds both — it reads
 * the head before it writes — and is the only place in this lane that does.
 *
 * `restoring` travels with it for the reason `plainChange` gives: an undo's
 * operations are ordinary inserts and removes (0032), so nothing in the delta
 * says which direction it is going and only the ask that raised it knows.
 */
export type AssessedAgainst = {
  /** The tree as it stood before this change, which is what the delta resolves against. */
  readonly before: LoomTree
  /** The registry's closed choices, so a setting is not quoted back as words. */
  readonly settings: ReadonlySet<string>
  /** Whether this change puts something back rather than making it. */
  readonly restoring?: boolean
  /**
   * The asks this visitor has already made, newest first, so a change that
   * reverses the last one can say so.
   *
   * Handed in for the same reason `before` is: it is knowledge the caller holds
   * and the event stream does not. The runtime narrates one ask at a time and
   * has no opinion about the ask before it — correctly, because whether a change
   * is *a second press* is a fact about this visitor's session rather than about
   * the tree or the delta.
   *
   * Optional, and an absent history is read as no history rather than as an
   * error: a caller that cannot name what came before should say nothing, and
   * the cost is one card that does not mention it went back.
   */
  readonly earlier?: readonly ChangeRecord[]
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
  /*
   * The same operations, undescribed. Read from the one field `touched` two
   * lines down already reads — the inverse is where a removed node's parent,
   * position and words survive — so this is the third reader of one value
   * rather than a second source for it.
   */
  inverse: assessment.reversibility.inverse.operations,
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
  /**
   * Carried rather than derived, and this is the only reason `Draft` knows about
   * it at all: answering a held undo folds a second assessment and verdict onto
   * the record that was waiting (`recordAwaiting`), so a fold that dropped this
   * would sever the undo from the revision it undoes at exactly the moment it
   * lands. The card offering the undo would then go on offering it after the
   * page had been put back.
   */
  undoes?: number
  /** Carried for the same reason `undoes` is: answering a hold folds onto the
   * record that was waiting, and a fold that dropped this would take the way out
   * of a dead ask with it. */
  presetId?: string
  discarded: boolean
  failure?: string
  repaired: boolean
  touched: readonly TouchedNode[]
  /** Carried for the same reason `touched` is: the tree it describes is gone. */
  did?: readonly PlainChange[]
  /** Carried for the same reason `did` is, and it is what a later ask compares
   * itself against — so a fold that dropped it would make the *next* toggle
   * press unable to tell it had gone back. */
  settingsMoved?: readonly SettingMove[]
  /** Carried for the same reason `settingsMoved` is: the history it was computed
   * against is the history at the moment of the ask, and no later fold has it. */
  wentBack?: boolean
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
    ? { repaired: false, discarded: false, touched: [] }
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
        ...(base.undoes === undefined ? {} : { undoes: base.undoes }),
        ...(base.presetId === undefined ? {} : { presetId: base.presetId }),
        discarded: base.outcome === "discarded",
        repaired: base.repaired,
        touched: base.touched,
        /*
         * Carried, and this is the fold that made it worth carrying: a held
         * change is assessed when it is asked for and answered later, so the
         * only moment its "before" tree exists is the first fold. Answering
         * `yes` re-folds onto this record with no tree in hand, and a drop here
         * would empty the line at the exact press that makes it true.
         */
        ...(base.did === undefined ? {} : { did: base.did }),
        ...(base.settingsMoved === undefined ? {} : { settingsMoved: base.settingsMoved }),
        ...(base.wentBack === undefined ? {} : { wentBack: base.wentBack }),
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

/**
 * What this change moved, and whether that put the last change back.
 *
 * Computed at the one fold that has both halves in hand — the delta, and the
 * tree it was planned against — and never afterwards. `put-back.ts` says why
 * the answer is frozen rather than read per render.
 *
 * The comparison is against the earlier record's own frozen moves, so the two
 * changes were each measured against the tree they actually ran on. Nothing is
 * re-resolved against a tree that has since moved.
 *
 * **Only the change immediately before this one, and only one that reached the
 * page.** A record with no revision never moved the tree — it is waiting, or it
 * was refused, or it did not apply — so it is not the thing a later change could
 * have put back, and stepping over it is what stops a hold sitting in the rail
 * from hiding the change that really came before. The first applied record in a
 * newest-first list is that change; what it moved, if anything, is the whole of
 * what `reversesTheLastChange` is allowed to look at.
 */
const lastMovesIn = (earlier: readonly ChangeRecord[]): readonly SettingMove[] | undefined =>
  earlier.find((record) => record.revision !== undefined)?.settingsMoved

const movesOf = (
  assessment: ChangeAssessment,
  against: AssessedAgainst
): Pick<Draft, "settingsMoved" | "wentBack"> => {
  const moved = settingsMoved(against.before, assessment.proposal.delta)

  return {
    settingsMoved: moved,
    wentBack: reversesTheLastChange(moved, lastMovesIn(against.earlier ?? [])),
  }
}

const assessed = (
  draft: Draft,
  assessment: ChangeAssessment,
  against: AssessedAgainst | undefined
): Draft => ({
  ...draft,
  interpretation: interpretationOf(assessment),
  stakes: { level: assessment.stakes.level, factors: assessment.stakes.factors },
  reversibility: reversibilityOf(assessment),
  /*
   * The inverse travels with the delta here for one reason: it is the only place
   * a *removed* node's parent and position survive. `assessReversibility`
   * computes it whether or not anybody undoes anything, so pointing at the gap a
   * removal left costs nothing beyond reading a field that already exists.
   *
   * And it is the only place the removed node's *words* survive, which is what
   * lets the mark in that gap name what is missing from it rather than say
   * "something". The settings are the same ones `did` is read with two fields
   * below, so the quotation on the band and the quotation on the card are cut
   * by one function against one registry.
   */
  touched: keepingWords(
    touchedBy(assessment.proposal.delta, assessment.reversibility.inverse, against?.settings),
    draft.touched
  ),
  /*
   * And the same delta in the words on the page, past tense, against the tree
   * the runtime judged it against.
   *
   * This is the only fold where that tree can be named. Assessment is the moment
   * the delta and the tree it was planned against are both true at once; one
   * event later the change has either landed — and the tree is a revision
   * behind — or it is waiting, and will be answered by a fold with no tree at
   * all. So it is computed here and carried, never recomputed.
   */
  ...(against === undefined
    ? {}
    : (() => {
        const moves = movesOf(assessment, against)

        return {
          ...moves,
          did: plainChange(
            against.before,
            assessment.proposal.delta,
            against.settings,
            /*
             * Two ways of putting something back, and the card only ever needed
             * one word for both.
             *
             * `against.restoring` is the undo — knowledge the *control* had,
             * because an undo's operations are ordinary inserts and removes
             * (0032) and nothing in the delta says which way it is going.
             * `wentBack` is the second press of a toggle — knowledge the
             * *history* has, because a configure's delta says exactly which way
             * it went and only the change before it says whether that is back.
             *
             * Neither can be derived from the other and both mean the same thing
             * to a reader, so they are joined here rather than in `plainChange`,
             * which is a function of one delta and one tree and should stay one.
             */
            (against.restoring ?? false) || (moves.wentBack ?? false),
            "done"
          ),
        }
      })()),
})

const fold =
  (against: AssessedAgainst | undefined) =>
  (draft: Draft, envelope: RuntimeEventEnvelope): Draft => {
    const { event } = envelope

    switch (event.type) {
      case "intent-received":
        return { ...draft, identity: identityOf(event.intent, envelope.occurredAt) }
      case "change-assessed":
        return assessed(draft, event.assessment, against)
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
      /**
       * A commit that failed is a hold that is over.
       *
       * Both places the runtime narrates this have already released custody —
       * `persist` is reached only after `confirmHeld` took the hold, and the
       * revision-conflict branch releases it first, saying why: *"A hold names a
       * revision, so a hold whose tree has moved on can never apply again — it is
       * not stale pending a retry, it is dead."*
       *
       * Leaving `held` set made the record outlive the custody it described. The
       * card went on reading **Waiting on you** and *"Loom will not make this
       * change until you say yes"* over a proposal no yes could reach, with the
       * conflict code in the smallest type on the card as the only correction.
       * Cleared here, the same record reads `no-change` — *"The change no longer
       * fits this page"* — which is what happened, in the words the portal and
       * the demo already share.
       *
       * The failure itself still lands, through the default branch below: this
       * clears custody and says nothing about why, which is `failureOf`'s to say.
       */
      case "commit-failed": {
        const failure = failureOf(event)

        return { ...draft, held: undefined, ...(failure === undefined ? {} : { failure }) }
      }
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
 *
 * `against` is the tree this ask was judged against, and it is optional for the
 * same reason `base` is: the second fold of a held change — the one that answers
 * it — has no such tree, and must not invent one. A fold given no tree keeps
 * whatever reading the first fold left (`draftFrom`), so the line survives the
 * press that makes it true.
 */
export const recordFromEvents = (
  envelopes: readonly RuntimeEventEnvelope[],
  base?: ChangeRecord,
  against?: AssessedAgainst
): ChangeRecord | undefined => {
  const draft = envelopes.reduce<Draft>(fold(against), draftFrom(base))
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
    ...(draft.undoes === undefined ? {} : { undoes: draft.undoes }),
    ...(draft.presetId === undefined ? {} : { presetId: draft.presetId }),
    ...(draft.failure === undefined ? {} : { failure: draft.failure }),
    repaired: draft.repaired,
    touched: draft.touched,
    ...(draft.did === undefined ? {} : { did: draft.did }),
    ...(draft.settingsMoved === undefined ? {} : { settingsMoved: draft.settingsMoved }),
    ...(draft.wentBack === undefined ? {} : { wentBack: draft.wentBack }),
  }
}
