import {
  err,
  fixedPolicy,
  sequentialIdFactory,
  systemClock,
  type ChangeAssessment,
  type ChangeInterpreter,
  type Clock,
  type CompositionRuntime,
  type EditIntent,
  type IdFactory,
  type LoomTree,
  type RuntimeEventEnvelope,
} from "@jam-overture/loom"
import { planReverts, type RevertPlan, type StoredRevision } from "@jam-overture/loom/store"
import {
  commitIntent,
  confirmHeld,
  revertRevision,
  type RevertOutcome,
  type WriteOutcome,
  type WritePath,
} from "@jam-overture/loom/write"

import { docsGatePolicy } from "./policy"
import { docsPresetInterpreter, type DocsPreset } from "./presets"
import type { DocsSession } from "./session"

/**
 * One trip through the runtime, for one thing a reader clicked.
 *
 * Every operation here goes through **`commitIntent`**, which is the one write
 * path (0017): read head, refuse an intent written against a revision head has
 * moved past, compose, and — only if the Gate allowed it — append. There is no
 * second route. An undo goes through it too, by way of `revertRevision`, which
 * is the whole of 0032 in one sentence: undo is a proposal, judged like any
 * other, rather than a rewind that skips the Gate.
 *
 * It still all runs in the reader's browser. The interpreter is deterministic
 * (0057) and the store is memory, so the entire sequence — interpret, analyse,
 * weigh, judge, apply, append — happens between the click and the next paint,
 * with no server, no key and no network.
 *
 * **The site's own reader, `readDocsLog`, reads the store rather than the
 * clicks.** It would be easier to keep an array of what happened; it would also
 * be a second record, and the whole argument for a log is that there is one.
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

/**
 * Who the log says asked. A site with no accounts still has to name somebody,
 * because `answeredBy` exists to stop a confirmed change looking like a person
 * waving through their own request (0029) — and a blank there would teach the
 * opposite of what the page is about.
 */
export const DOCS_READER = "the reader"

/** What a reader clicked, in the site's words rather than the runtime's. */
export type DocsAsk =
  | { readonly kind: "preset"; readonly preset: DocsPreset }
  | { readonly kind: "undo"; readonly revision: number }

/**
 * Everything one click produced, in the order a reader meets it: what was
 * asked, what the runtime made of it, and what the Gate said.
 *
 * `intent` and `assessment` are lifted out of the events rather than out of the
 * outcome, because a `WriteOutcome` does not carry either: the write path
 * reports what became of the change, and the stages that produced it narrate
 * themselves (`intent-received`, `change-assessed`). Within one request those
 * events carry the whole assessment on purpose — what survives the request is
 * the narrowing that telemetry owns (0023). This is one request.
 *
 * `undo` never hands its intent to the caller either — the utterance behind a
 * revert is a revision number rather than a sentence someone typed, so the
 * runtime synthesises it. Reading it back off the event is how the box can show
 * a reader that an undo asked for something, in the same shape as everything
 * else.
 */
export type DocsChange = {
  readonly step: number
  readonly ask: DocsAsk
  readonly outcome: RevertOutcome
  readonly events: readonly RuntimeEventEnvelope[]
  readonly intent?: EditIntent
  readonly assessment?: ChangeAssessment
}

const collectingRuntime = (
  idFactory: IdFactory,
  clock: Clock,
  interpreter: ChangeInterpreter
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

/**
 * The interpreter for a path that does not interpret.
 *
 * `confirmHeld` answers a proposal that was written and judged before the
 * reader arrived; it re-judges, it does not re-plan. The seam still has to be
 * filled, and filling it with the preset that wrote the original would be a
 * quiet lie about what the confirmation does. This refuses, and the refusal is
 * unreachable — which is the point of writing it down rather than reaching for
 * the nearest interpreter to hand.
 */
const nothingToInterpret: ChangeInterpreter = {
  interpret: () =>
    Promise.resolve(
      err({ code: "refused", detail: "answering a held proposal does not plan a new change" })
    ),
}

/**
 * The three things the write path needs, named rather than spread.
 *
 * A `DocsSession` carries two fields `WritePath` has no use for — the seed and
 * the tree id, which the revert planner wants — and handing them over would be
 * passing whatever happened to be in scope rather than what the seam asks for.
 */
const writePath = (session: DocsSession, runtime: CompositionRuntime): WritePath => ({
  store: session.store,
  holds: session.holds,
  runtime,
})

const intentOf = (events: readonly RuntimeEventEnvelope[]): EditIntent | undefined => {
  for (const envelope of events) {
    if (envelope.event.type === "intent-received") return envelope.event.intent
  }

  return undefined
}

/**
 * The last assessment, not the first.
 *
 * A hold answered later produces a second one — `confirmChange` re-assesses
 * against the tree as it stands — and the box merges both halves of the run
 * into one event list. The reader is looking at what is true now.
 */
const assessmentOf = (
  events: readonly RuntimeEventEnvelope[]
): ChangeAssessment | undefined => {
  let found: ChangeAssessment | undefined

  for (const envelope of events) {
    if (envelope.event.type === "change-assessed") found = envelope.event.assessment
  }

  return found
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
  actor: DOCS_READER,
  utterance: preset.utterance,
  observedAt: clock.now(),
})

export type DocsAskRequest = {
  readonly session: DocsSession
  readonly exampleId: string
  readonly tree: LoomTree
  readonly preset: DocsPreset
  /** How many things this example has been asked for already. Ids read from it. */
  readonly step: number
  readonly clock?: Clock
}

export const askDocsChange = async (request: DocsAskRequest): Promise<DocsChange> => {
  const clock = request.clock ?? systemClock
  const idFactory = sequentialIdFactory(docsChangeNamespace(request.exampleId, request.step))
  const { runtime, events } = collectingRuntime(
    idFactory,
    clock,
    docsPresetInterpreter(request.preset, idFactory, clock)
  )
  const intent = intentFor(request.tree, request.preset, idFactory, clock)
  const outcome = await commitIntent(writePath(request.session, runtime), intent)
  const assessment = assessmentOf(events)

  return {
    step: request.step,
    ask: { kind: "preset", preset: request.preset },
    outcome,
    events,
    intent,
    ...(assessment === undefined ? {} : { assessment }),
  }
}

export type DocsAnswerRequest = {
  readonly session: DocsSession
  readonly exampleId: string
  readonly change: DocsChange
  readonly clock?: Clock
}

/**
 * Answering a hold, which is the half of the Gate a verdict alone cannot show.
 *
 * `confirmHeld` releases the proposal from custody *before* it applies it, so
 * answering happens exactly once however many times the button is pressed, and
 * it re-assesses against the tree as it stands rather than trusting the
 * assessment made when the change was held. The reader saying yes is not a way
 * past the Gate: a change it would now refuse stays refused.
 *
 * The actor is passed, so the log records who allowed it separately from who
 * asked (0029).
 */
export const answerDocsHold = async (request: DocsAnswerRequest): Promise<DocsChange> => {
  const { change } = request

  if (change.outcome.kind !== "held") return change

  const clock = request.clock ?? systemClock
  const idFactory = sequentialIdFactory(docsChangeNamespace(request.exampleId, change.step))
  const { runtime, events } = collectingRuntime(idFactory, clock, nothingToInterpret)
  const outcome = await confirmHeld(writePath(request.session, runtime), {
    proposalId: change.outcome.held.proposalId,
    actor: DOCS_READER,
  })
  const all = [...change.events, ...events]
  const assessment = assessmentOf(all)

  return {
    step: change.step,
    ask: change.ask,
    outcome,
    events: all,
    ...(change.intent === undefined ? {} : { intent: change.intent }),
    ...(assessment === undefined ? {} : { assessment }),
  }
}

export type DocsUndoRequest = {
  readonly session: DocsSession
  readonly exampleId: string
  readonly revision: number
  readonly step: number
  readonly clock?: Clock
}

/**
 * Undo, taking the same route as everything else.
 *
 * `revertRevision` plans the inverse from the log, wraps it as an ordinary
 * proposal from an interpreter called `loom/revert`, and hands it to
 * `commitIntent`. So it is judged by the same policy, refusable, holdable,
 * recorded as a new revision — and itself undoable, which a reader can try.
 *
 * The interpreter passed here is never consulted: `revertRevision` swaps in its
 * own, because there is nothing to guess about an inverse.
 */
export const undoDocsRevision = async (request: DocsUndoRequest): Promise<DocsChange> => {
  const clock = request.clock ?? systemClock
  const idFactory = sequentialIdFactory(docsChangeNamespace(request.exampleId, request.step))
  const { runtime, events } = collectingRuntime(idFactory, clock, nothingToInterpret)
  const outcome = await revertRevision(writePath(request.session, runtime), {
    treeId: request.session.treeId,
    revision: request.revision,
    seed: request.session.seed,
    origin: "user-instruction",
    actor: DOCS_READER,
  })
  const intent = intentOf(events)
  const assessment = assessmentOf(events)

  return {
    step: request.step,
    ask: { kind: "undo", revision: request.revision },
    outcome,
    events,
    ...(intent === undefined ? {} : { intent }),
    ...(assessment === undefined ? {} : { assessment }),
  }
}

/**
 * One entry in the log, and what undoing it would take.
 *
 * Everything above `undo` is read straight off the `StoredRevision` — this
 * derives nothing and remembers nothing. What is *not* here is as instructive
 * as what is: there is no utterance, because the log records the change rather
 * than the conversation that produced it, and no verdict, because a refused
 * change never reached the log at all.
 */
export type DocsLogEntry = {
  readonly revision: number
  readonly stored: StoredRevision
  /** The verbs in the entry's delta, in order — the shape of what it did. */
  readonly verbs: readonly string[]
  readonly undo: RevertPlan
}

/** How much history a box shows. Beyond this a reader is scrolling, not reading. */
export const DOCS_LOG_LIMIT = 12

/**
 * The log, newest first, with an undo verdict against every row.
 *
 * `planReverts` answers for all of them from **one** walk of the log rather
 * than replaying it once per row, which is the read it was built for: the
 * forward replay is shared and only the head-ward trail differs per target.
 *
 * A page of history is exactly where that matters, because the answer is not
 * the same for every row — undoing the newest change is usually clean, and
 * undoing an older one may write over what came after it. The plan says which,
 * and the box says so before a reader presses anything.
 */
export const readDocsLog = async (session: DocsSession): Promise<readonly DocsLogEntry[]> => {
  const page = await session.store.revisions(session.treeId, {
    direction: "older",
    limit: DOCS_LOG_LIMIT,
  })

  if (!page.ok || page.value.revisions.length === 0) return []

  const revisions = page.value.revisions.map((entry) => entry.revision)
  const plans = await planReverts(session.store, {
    treeId: session.treeId,
    revisions,
    seed: session.seed,
  })

  if (!plans.ok) return []

  return page.value.revisions
    .flatMap((stored) => {
      const undo = plans.value.get(stored.revision)

      return undo === undefined
        ? []
        : [
            {
              revision: stored.revision,
              stored,
              verbs: stored.delta.operations.map((operation) => operation.op),
              undo,
            },
          ]
    })
    .reverse()
}

/** The tree a change left behind, or the one it was judged against. */
export const treeAfter = (tree: LoomTree, change: DocsChange): LoomTree =>
  change.outcome.kind === "committed" ? change.outcome.tree : tree

/** The proposal a reader may answer, when the Gate held one. */
export const heldOutcome = (
  change: DocsChange
): Extract<WriteOutcome, { readonly kind: "held" }> | undefined =>
  change.outcome.kind === "held" ? change.outcome : undefined
