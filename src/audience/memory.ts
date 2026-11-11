/**
 * An `AudienceOverlayStore` in two `Map`s, for a test and for a deployment with
 * no database.
 *
 * The reference implementation, on the terms `memory.ts` and `memoryPolicyLog`
 * already set, and it carries the same warning they do: a `Map` keeps nothing
 * across a process, so on the serverless hosts §3 targets it keeps nothing at
 * all. What it is honestly for is the suite, a lesson, and a deployment holding
 * its forms in a module — which is the thing 0359 clause 6 said already
 * satisfied the seam.
 */

import { err, ok } from "../result.js"

import type { AudienceForm } from "./compose.js"
import {
  audienceOverlayOf,
  audienceRulesOutcomeOf,
  clampAudienceRuleHistoryLimit,
  type AudienceFormListing,
  type AudienceOverlayError,
  type AudienceOverlayStore,
  type AudienceRuleRevision,
  type StoredAudienceForm,
} from "./overlay-store.js"

export const memoryAudienceOverlayStore = (): AudienceOverlayStore => {
  /**
   * The whole log rather than its head, because the head is a view over it and
   * this is the implementation the contract calls the reference: a `Map` of
   * current rules would satisfy every read and quietly stop being a record.
   */
  const rules = new Map<string, readonly AudienceRuleRevision[]>()
  const forms = new Map<string, Map<string, StoredAudienceForm>>()

  const headOf = (treeId: string): AudienceRuleRevision | undefined => {
    const log = rules.get(treeId) ?? []

    return log[log.length - 1]
  }

  /** Ascending by id, so two reads of an unchanged page answer in one order. */
  const formsOf = (treeId: string): readonly StoredAudienceForm[] =>
    [...(forms.get(treeId)?.values() ?? [])].sort((left, right) =>
      left.audienceId.localeCompare(right.audienceId)
    )

  return {
    overlay: async (treeId) =>
      ok(
        audienceOverlayOf(
          headOf(treeId),
          formsOf(treeId).map(
            ({ audienceId, delta }): AudienceForm => ({ audienceId, delta })
          )
        )
      ),

    rules: async (treeId) => ok(headOf(treeId)),

    history: async (treeId, request) =>
      ok(
        [...(rules.get(treeId) ?? [])]
          .reverse()
          .slice(0, clampAudienceRuleHistoryLimit(request?.limit))
      ),

    forms: async (treeId) =>
      ok(
        formsOf(treeId).map(
          ({ audienceId, delta, actor, authoredAt }): AudienceFormListing => ({
            audienceId,
            baseRevision: delta.baseRevision,
            actor,
            authoredAt,
          })
        )
      ),

    recordRules: async (treeId, request) => {
      const outcome = audienceRulesOutcomeOf(treeId, request, headOf(treeId))
      if (!outcome.ok || outcome.value.outcome === "unchanged") return outcome

      rules.set(treeId, [...(rules.get(treeId) ?? []), outcome.value.revision])

      return outcome
    },

    setForm: async (treeId, request) => {
      if (request.delta.treeId !== treeId) {
        return err<AudienceOverlayError>({
          code: "tree-mismatch",
          treeId,
          delta: request.delta.treeId,
        })
      }

      const stored: StoredAudienceForm = { treeId, ...request }
      const held = forms.get(treeId) ?? new Map<string, StoredAudienceForm>()
      held.set(request.audienceId, stored)
      forms.set(treeId, held)

      return ok<StoredAudienceForm>(stored)
    },
  }
}
