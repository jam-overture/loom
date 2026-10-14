import type { IdFactory, TreeId } from "../ids.js"
import type { Clock } from "../runtime/events.js"
import type { EditIntent, IntentOrigin } from "../runtime/intent.js"
import type { ChangeInterpreter } from "../runtime/interpreter.js"
import { inverseInterpreter } from "../runtime/inverse.js"
import type { DiscardedWork } from "../runtime/proposal.js"
import {
  describeReseedPlan,
  planReseed,
  reseedDiscards,
  type ReseedPlan,
  type UnreseedablePlan,
} from "../store/reseed.js"
import type { LoomTree } from "../tree/tree.js"

import { commitIntent, describeWriteOutcome, type WriteOutcome, type WritePath } from "./commit.js"
import { computedChangeRuntime } from "./computed.js"

/**
 * Putting a page back, as a change like any other — and the half that makes the
 * operation pressable.
 *
 * `planReseed` has been able to say *here are the operations that carry this
 * stored page to the tree its builder produces now* since 0268. Nothing
 * proposed them. The gap that left is the one `Loom marketing` filed on 12
 * October, and it filed it as a cost rather than as a gap, which is the version
 * that says who is blocked:
 *
 * > **Merging a marketing pull request no longer changes the marketing site.**
 *
 * Every page of that surface is already a row on any deployment that has been
 * visited once. Seeding is create-if-absent and must stay that way — a deploy
 * that wrote over a stored page would throw away every change somebody accepted
 * in the portal, which is the trade 0259 took deliberately. So an edited builder
 * finds the same tree id it found yesterday, leaves it alone, and the authored
 * page stops being the served one.
 *
 * This is `revertRevision`'s sibling and takes the same seven steps: interpreted
 * (deterministically), proposed, assessed, gated, applied, and appended to the
 * log as a new revision. A reseed is therefore attributable to whoever asked for
 * it, refusable by the Gate, holdable for confirmation, visible to telemetry,
 * and itself revertable. The log says *this page was put back on this date, by
 * this person, over these revisions* rather than the history simply ending.
 *
 * ## The question this does not answer, and does not need to
 *
 * The entry asked for one decision beyond the operation: **who presses it.** It
 * set out three answers — only a person, on every deploy, or a button on the
 * page's own screen beside its history — and preferred the third.
 *
 * The Gate already answers it, and the answer is better than any of the three
 * because it is not a fourth switch. 0035 made discarded work a *rule* rather
 * than a level: a change that writes over work already in the log is never
 * applied without a person, whatever latitude its origin has. `reseedDiscards`
 * reads the log and declares what this reseed costs, so:
 *
 * - a page nobody has edited since it was seeded declares nothing, and the
 *   reseed applies. A deploy step may call this, and the authored page wins,
 *   which is the right default for a page no one has touched.
 * - a page somebody has edited through the portal declares those revisions, and
 *   the reseed is **held** — the same hold a reviewer answers on
 *   `/portal/trust`, carrying the sentence that names what it would overwrite.
 *   A deploy step may call this too, and it cannot quietly discard the edit.
 *
 * So the caller does not choose the safety; the cost of the particular reseed
 * does. The surfaces are then free to offer the button wherever it belongs
 * (`Loom portal`'s to place), because every route to it is the same route.
 *
 * ## What this does not become
 *
 * `TreeStore` still gains nothing — no delete, no reseed method, nothing that
 * writes a tree without being proposed (0268). Seeding is still create-only.
 * What is new is one function a surface can call, and it goes through the one
 * write path (0017) like everything else that becomes history.
 */

/** What produced the delta, for `Provenance.interpreter`. Not a model. */
export const RESEED_INTERPRETER = "loom/reseed"

export type ReseedablePlan = Extract<ReseedPlan, { readonly outcome: "reseedable" }>

/** Everything that stops a reseed being proposed. `already-authored` is not one — see `ReseedOutcome`. */
export type UnproposableReseed = Exclude<UnreseedablePlan, { readonly outcome: "already-authored" }>

const countOf = (count: number, noun: string): string =>
  `${count} ${noun}${count === 1 ? "" : "s"}`

/**
 * What the reseed is for, and — when there is one — what it costs.
 *
 * Stated in the rationale as well as declared in `discards`, for the reason
 * `revertRevision` gives: the Gate reads the declaration and the person
 * answering the hold reads this (0019 — a reviewer is shown the reason, not a
 * verdict).
 *
 * The shape of the page is named before the cost, because the two answer
 * different halves of a reviewer's question. *What does this do to the page* is
 * the operations, the nodes it removes and the ids it brings back. *What does it
 * take away from me* is the revisions. A reviewer who is told only the second
 * cannot tell a headline being restored from the page being emptied.
 */
const rationaleFor = (plan: ReseedablePlan, discards: readonly DiscardedWork[]): string => {
  const puts = `Puts the page back to the tree its builder produces, at head ${
    plan.headRevision
  }: ${countOf(plan.operations.length, "operation")}${
    plan.retires.length === 0 ? "" : `, removing ${countOf(plan.retires.length, "node")}`
  }${plan.revives.length === 0 ? "" : `, reviving ${countOf(plan.revives.length, "id")}`}.`

  if (discards.length === 0) return `${puts} Nothing in the log has touched the nodes it changes.`

  const revisions = discards.map((discarded) => discarded.revision).join(", ")

  return `${puts} Revision${
    discards.length === 1 ? "" : "s"
  } ${revisions} changed nodes this reseed touches, and applying it writes over what they did.`
}

/**
 * The same interpreter every reseed uses, with the plan's half filled in.
 *
 * Everything specific to a reseed is here — the stamp that says the runtime
 * planned this against a builder, the rationale a reviewer reads, and the
 * discards the log read found. What is left is `inverseInterpreter`: the head
 * check, the provenance of a computed change, and the shape of the proposal are
 * one implementation rather than two that drift.
 *
 * `undoes` is **absent**, and that is not an omission. It names the one revision
 * a change puts back, and a reseed puts back no revision — it carries the page
 * to a tree that was never in the log, over however many entries stand in the
 * way. Stamping any number there would be a claim the log cannot support; the
 * revisions it writes over are in `discards`, where they are true.
 */
export const reseedInterpreter = (
  plan: ReseedablePlan,
  discards: readonly DiscardedWork[],
  idFactory: IdFactory,
  clock: Clock
): ChangeInterpreter =>
  inverseInterpreter(
    {
      operations: plan.operations,
      /**
       * The plan and its cost were both measured at one head. Judging them at a
       * different one would be judging a different question, so the interpreter
       * declines rather than proposing something whose reasoning has expired.
       */
      headRevision: plan.headRevision,
      interpreter: RESEED_INTERPRETER,
      rationale: rationaleFor(plan, discards),
      /**
       * Declared only when there is something to declare, so absence keeps
       * meaning "nobody looked at a log" rather than "a log was checked and was
       * clean" (0035). Here a log was always read — the empty case is said in
       * the rationale in words instead, which is the only place it can be said
       * without lying in a field.
       */
      ...(discards.length === 0 ? {} : { discards }),
    },
    idFactory,
    clock
  )

export type ReseedRequest = {
  readonly treeId: TreeId
  /**
   * A fresh build of the page — what the builder in the repository produces now.
   *
   * The caller's rather than something this module could obtain, because a
   * builder is the host's: §3 has no registry of pages and no way to run one.
   * The surfaces hold theirs already, and both sides of the comparison being
   * passed in is what keeps this testable without a build step.
   */
  readonly authored: LoomTree
  readonly origin: IntentOrigin
  readonly actor?: string
}

export type ReseedOutcome =
  | WriteOutcome
  /**
   * The stored page is already the tree the builder produces, so nothing was
   * proposed and nothing needed to be.
   *
   * Its own ending rather than one of the obstacles below, which is the
   * difference between this and `revertRevision`. A reseed is the kind of
   * operation that gets pressed twice — by a person who cannot see whether the
   * first took, and by a deploy that runs on every release — so *the page is
   * already right* is the healthy answer, and a caller that could not tell it
   * from *the page cannot be put back* would report a success as a failure on
   * every release after the first.
   */
  | { readonly kind: "already-authored"; readonly headRevision: number }
  /**
   * Nothing was proposed, because no reseed could be planned: the two trees are
   * different pages, or they differ by something no operation can express.
   * Writing over accepted work is not one of these — that is a proposal the Gate
   * holds, not a plan that failed (0035).
   */
  | { readonly kind: "not-reseedable"; readonly plan: UnproposableReseed }

export const describeReseedOutcome = (outcome: ReseedOutcome): string => {
  switch (outcome.kind) {
    case "already-authored":
      return `already authored: revision ${outcome.headRevision} is the page the builder produces`
    case "not-reseedable":
      return `not reseedable: ${describeReseedPlan(outcome.plan)}`
    default:
      return describeWriteOutcome(outcome)
  }
}

/**
 * Puts a page back to its authored shape, if it can be expressed and the Gate
 * agrees.
 *
 * Reads head itself rather than taking the stored tree, because the head the
 * plan is made against and the head the intent names have to be the same
 * revision — and a caller passing one it read earlier is a caller that can pass
 * a stale one. The write path checks the intent against head again before
 * interpreting, and the interpreter refuses a tree at a revision the plan was
 * not made against, so a page that moves between the read and the commit ends as
 * a `revision-conflict` rather than as a reseed to the wrong arrangement.
 *
 * The intent is synthesised here, for the reason the revert path gives: the
 * utterance behind a reseed is not a sentence anybody typed. `origin` and
 * `actor` are the caller's, and they are what the Gate weighs and what the
 * provenance records — putting a page back is still someone asking for a change.
 */
export const reseedPage = async (
  path: WritePath,
  request: ReseedRequest
): Promise<ReseedOutcome> => {
  const head = await path.store.head(request.treeId)
  if (!head.ok) return { kind: "not-written", error: head.error }

  const plan = planReseed(head.value, request.authored)

  if (plan.outcome === "already-authored") {
    return { kind: "already-authored", headRevision: plan.headRevision }
  }

  if (plan.outcome !== "reseedable") return { kind: "not-reseedable", plan }

  /**
   * The cost is read before anything is proposed, and a log that cannot be read
   * stops the reseed. Proposing it with an empty declaration would tell the Gate
   * the log was clean, and the Gate would apply it over somebody's accepted edit.
   */
  const discards = await reseedDiscards(path.store, {
    treeId: request.treeId,
    operations: plan.operations,
  })
  if (!discards.ok) return { kind: "not-written", error: discards.error }

  const { idFactory, clock } = path.runtime

  const intent: EditIntent = {
    intentId: idFactory.intentId(),
    treeId: request.treeId,
    baseRevision: plan.headRevision,
    origin: request.origin,
    ...(request.actor === undefined ? {} : { actor: request.actor }),
    utterance: "Put this page back to the version in the repository.",
    observedAt: clock.now(),
  }

  return commitIntent(
    {
      store: path.store,
      holds: path.holds,
      runtime: computedChangeRuntime(
        path.runtime,
        reseedInterpreter(plan, discards.value, idFactory, clock)
      ),
    },
    intent
  )
}
