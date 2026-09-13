import { ceilingOf, describeCeiling, withCeiling } from "../deadline.js"
import type { JsonObject } from "../json.js"
import { err, type Result } from "../result.js"
import type { LoomTree } from "../tree/tree.js"

import type {
  EndpointId,
  EndpointRegistry,
  SubmissionTarget,
  SubmissionUnavailable,
} from "./endpoint.js"
import { planTreeSubmissions, submissionPlanIsEmpty, type SubmissionPlan } from "./plan.js"
import {
  buildSubmissionResolution,
  EMPTY_SUBMISSION_RESOLUTION,
  type SubmissionResolution,
} from "./resolution.js"

/**
 * The second step in serving a page that may do IO, and the only one that talks
 * to a host about where a form posts.
 *
 * Every endpoint in the plan is asked at once. They are independent by
 * construction, so asking in sequence would make a page's latency the sum of its
 * forms rather than the slowest of them. Nothing here rejects: each failure is
 * captured against its own id, so a token store having a bad afternoon costs the
 * forms on the page rather than the page.
 *
 * That holds for a token store that says no. It did not hold for one that says
 * nothing at all until 13 September, which is what the ceiling is for (0140): a
 * `Promise.all` waits for the slowest of its questions, and an endpoint that
 * never answers is not slow — it is the page, held, with no diagnostic, because
 * nothing had decided it had waited long enough.
 */

export type ResolveSubmissionsOptions = {
  readonly registry: EndpointRegistry
  /** Passed through to every endpoint — the render request's host context. */
  readonly context?: JsonObject
  /**
   * How long any one endpoint is given, each independently of the others.
   * Defaults to `DEFAULT_ENDPOINT_CEILING_MS`; there is no way to wait forever
   * (0140).
   */
  readonly ceilingMs?: number
}

/**
 * Ten seconds, the data seam's number and for its reason: this is a page being
 * served, and a reader is waiting for it.
 *
 * The seam's own documentation says resolution *"is allowed to be slow"*, and
 * that is still true — a token minted against a store is exactly what this
 * budget is for. What it is not allowed to be is unbounded.
 */
export const DEFAULT_ENDPOINT_CEILING_MS = 10_000

const askOne = async (
  to: EndpointId,
  options: ResolveSubmissionsOptions
): Promise<Result<SubmissionTarget, SubmissionUnavailable>> => {
  const registered = options.registry.endpoint(to)

  if (!registered) {
    return err({
      reason: "no-such-endpoint",
      detail: `registered: ${options.registry.endpoints.map((entry) => entry.id).join(", ") || "none"}`,
    })
  }

  const ceiling = ceilingOf(options.ceilingMs, DEFAULT_ENDPOINT_CEILING_MS)

  return withCeiling(
    ceiling,
    (): Result<SubmissionTarget, SubmissionUnavailable> =>
      err({ reason: "unavailable", detail: `no answer in ${describeCeiling(ceiling)}` }),
    (signal) => registered.resolve(options.context, signal)
  )
}

export const resolveSubmissionPlan = async (
  plan: SubmissionPlan,
  options: ResolveSubmissionsOptions
): Promise<SubmissionResolution> => {
  if (submissionPlanIsEmpty(plan)) return EMPTY_SUBMISSION_RESOLUTION

  const answered = await Promise.all(
    plan.endpoints.map(
      async (
        to
      ): Promise<readonly [EndpointId, Result<SubmissionTarget, SubmissionUnavailable>]> => [
        to,
        await askOne(to, options),
      ]
    )
  )

  return buildSubmissionResolution(plan, new Map(answered))
}

/** Plan and resolve in one step, for the ordinary caller that does both. */
export const resolveTreeSubmissions = async (
  tree: LoomTree,
  options: ResolveSubmissionsOptions
): Promise<SubmissionResolution> => resolveSubmissionPlan(planTreeSubmissions(tree), options)
