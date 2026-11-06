/**
 * A page as the reader in front of it gets it: the base tree, plus the deltas
 * the audiences they are in have earned.
 *
 * This is
 * [0263](../../decisions/0263-a-page-is-a-base-tree-and-the-deltas-an-audience-earns.md)
 * clause 4 — *base plus matched deltas, locally, with no call to the control
 * plane* — and it is a **pure function of a tree, a set of rules and a
 * context**, which is what lets it run on every request in the customer's own
 * process beside the render it feeds.
 *
 * **What comes out is a projection of a revision and not a revision of its
 * own.** The composed tree keeps the base's `treeId` and the base's `revision`,
 * and nothing about it is appended anywhere. Three reasons, and the third is
 * the one that decided it:
 *
 * - A revision is a thing the log can replay and attribute. A composition is
 *   derived from one, per request, from rules that may change between two
 *   requests; it has no author, no timestamp and no place in the history.
 * - Bumping the number would make a reader's revision depend on which audience
 *   they fell into, so two readers of the same published page would report
 *   different revisions for it.
 * - **The measurement joins on it.** 0284 made a counter's identity
 *   `(application, audience, tree, revision)`. If a composition carried its own
 *   revision, the audience dimension and the revision dimension would move
 *   together and *compare these two audiences on this revision* — the whole
 *   point of serving two — would have nothing to compare.
 *
 * So the base revision is what a signal names, and the audience is what tells
 * two forms of it apart. That is the shape 0284 already built the tables for.
 */

import type { JsonObject } from "../json.js"
import { err, ok, reduceResult, type Result } from "../result.js"
import { applyOperation } from "../tree/apply.js"
import type { TreeDelta } from "../tree/delta.js"
import type { LoomNode } from "../tree/node.js"
import type { LoomTree } from "../tree/tree.js"

import type { AudienceId } from "./audience.js"
import { audiencesFor, type AudienceRule } from "./rule.js"

/** The delta one audience earns, against the base it was authored on. */
export type AudienceForm = {
  readonly audienceId: AudienceId
  readonly delta: TreeDelta
}

/**
 * Everything a deployment needs to serve one page to more than one audience:
 * the rules that sort readers, and the delta each audience earns.
 *
 * Both halves are **cacheable beside the base** (0263 clause 3), which is why
 * they are one value rather than two lookups — a host caching the base and
 * re-fetching the rules per request has paid for the call this record exists to
 * avoid.
 */
export type AudienceOverlay = {
  readonly rules: readonly AudienceRule[]
  readonly forms: readonly AudienceForm[]
}

export type ComposeError =
  /** A rule matched an audience the overlay has no delta for. */
  | { readonly code: "no-form"; readonly audienceId: AudienceId }
  /** The base moved and this delta was authored against an older revision. */
  | {
      readonly code: "stale-form"
      readonly audienceId: AudienceId
      readonly expected: number
      readonly actual: number
    }
  /** The delta is for another page. */
  | { readonly code: "form-mismatch"; readonly audienceId: AudienceId; readonly treeId: string }
  /** The operations did not apply, or what they produced is not a tree. */
  | { readonly code: "unapplicable"; readonly audienceId: AudienceId; readonly detail: string }

/** The tree this reader gets, and the audiences that made it that. */
export type ComposedTree = {
  readonly tree: LoomTree
  /**
   * In the order the rules gave them, which is the order the deltas were
   * applied in. A caller names this on the signals the page sends, so that what
   * was measured and what was served are the same claim.
   */
  readonly audiences: readonly AudienceId[]
}

export const describeComposeError = (error: ComposeError): string => {
  switch (error.code) {
    case "no-form":
      return `${error.audienceId} matched and has no delta`
    case "stale-form":
      return `${error.audienceId}'s delta is against revision ${error.expected}, the page is at ${error.actual}`
    case "form-mismatch":
      return `${error.audienceId}'s delta is for ${error.treeId}`
    case "unapplicable":
      return `${error.audienceId}'s delta did not apply: ${error.detail}`
  }
}

const formFor = (
  overlay: AudienceOverlay,
  audienceId: AudienceId
): Result<AudienceForm, ComposeError> => {
  const form = overlay.forms.find((candidate) => candidate.audienceId === audienceId)

  return form === undefined ? err({ code: "no-form", audienceId }) : ok(form)
}

/**
 * One audience's operations, against the root as the audiences before it left
 * it.
 *
 * **The revision is checked against the base and never against the accumulator**
 * — every delta here was authored against the same published revision, so
 * chaining `applyDelta` would refuse the second one for being one behind a
 * number composition had just moved. `applyOperation` exists for exactly this:
 * *one operation against one tree, with no delta around it*.
 */
const advanceForm = (
  base: LoomTree,
  root: LoomNode,
  form: AudienceForm
): Result<LoomNode, ComposeError> => {
  if (form.delta.treeId !== base.treeId) {
    return err({ code: "form-mismatch", audienceId: form.audienceId, treeId: form.delta.treeId })
  }

  if (form.delta.baseRevision !== base.revision) {
    return err({
      code: "stale-form",
      audienceId: form.audienceId,
      expected: form.delta.baseRevision,
      actual: base.revision,
    })
  }

  return reduceResult<(typeof form.delta.operations)[number], LoomNode, ComposeError>(
    form.delta.operations,
    root,
    (current, operation) => {
      const applied = applyOperation(current, operation)

      return applied.ok
        ? applied
        : err({
            code: "unapplicable",
            audienceId: form.audienceId,
            detail: `${applied.error.code}`,
          })
    }
  )
}

/**
 * The page this context earns, or why it cannot be served.
 *
 * **It refuses rather than falling back to the base, and that is the decision
 * in this function.** A composition that quietly dropped a stale delta would
 * serve the base tree to a reader the deployment has already decided is in
 * `aud_eu`, and the signals that page sends would be filed under `aud_eu`
 * anyway — so the comparison 0263 clause 5 exists for would be between one
 * audience's form and another audience's *name over the base's form*. A
 * measurement that is quietly wrong is worse than a page that is honestly
 * missing, which is the same argument `origins` is closed by default on.
 *
 * It is all-or-nothing per request for the same reason: two matched deltas of
 * which one applied is a form nobody authored, judged or asked for.
 *
 * A context matching nothing is **not** a failure — it is the base tree, which
 * is what every deployment that has never heard of an audience is already
 * being served.
 */
export const composeTreeForContext = (
  base: LoomTree,
  overlay: AudienceOverlay,
  context: JsonObject | undefined
): Result<ComposedTree, ComposeError> => {
  const audiences = audiencesFor(overlay.rules, context)
  if (audiences.length === 0) return ok({ tree: base, audiences })

  const advanced = reduceResult<AudienceId, LoomNode, ComposeError>(
    audiences,
    base.root,
    (root, audienceId) => {
      const form = formFor(overlay, audienceId)

      return form.ok ? advanceForm(base, root, form.value) : form
    }
  )

  if (!advanced.ok) return advanced

  const root = advanced.value
  if (root.kind !== "element") {
    return err({
      code: "unapplicable",
      audienceId: audiences[audiences.length - 1] as AudienceId,
      detail: `root became a ${root.kind} node`,
    })
  }

  /*
   * No invariant check here, and it was a defensive one until a planted
   * mutation showed nothing could reach it. Two deltas each judged against the
   * base on its own are the one place in this repository where independently
   * authored operations meet, so the fear was a pair that each insert the same
   * node id and together make a tree with two of one id. `insert` already
   * refuses a node whose id the tree holds, so the second one fails as
   * `duplicate-node-id` and never gets far enough to make the tree it would
   * have invalidated — which is the only invariant `validateTreeInvariants`
   * has. Written down because the next reader will have the same fear.
   */
  return ok({ tree: { ...base, root }, audiences })
}
