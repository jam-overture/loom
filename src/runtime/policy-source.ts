import type { LoomTree } from "../tree/tree.js"

import type { EditIntent } from "./intent.js"
import type { GatePolicy } from "./policy.js"

/**
 * Where the Gate's policy comes from.
 *
 * `GatePolicy` is the set of choices the Gate consults; this is the seam that
 * decides *which* set a given change is judged by. Without it a runtime holds
 * one policy for its lifetime, so a host serving two tenants, two surfaces, or
 * two trust levels from one process has no supported way to judge them
 * differently — it has to build a whole runtime per request and hope every
 * construction site agrees.
 *
 * Two properties are deliberate, and both are about keeping the judgment
 * honest rather than about convenience.
 *
 * **It cannot see the proposal.** The context is the tree and the ask, both of
 * which exist before anything is interpreted. A source that could read the
 * proposed change could choose a lenient policy in response to a change the
 * strict one would have refused, and the refusal rate would look healthy while
 * meaning nothing. Who is asking, and of what, decides the policy; what came
 * back is then judged by it.
 *
 * **It is synchronous and pure.** Resolution sits inside the decision path, so
 * an implementation that awaited a network call would make every change slower
 * and every decision unreproducible — a replay could not fetch what the
 * original run fetched. A host whose policy lives elsewhere loads it before
 * entering the write path and closes over it here.
 */

export type PolicyContext = {
  readonly tree: LoomTree
  readonly intent: EditIntent
}

export interface PolicySource {
  readonly resolve: (context: PolicyContext) => GatePolicy
}

/**
 * One policy, for everything. The honest spelling of what a single-tenant host
 * wants, and what the runtime used to assume everyone wanted.
 */
export const fixedPolicy = (policy: GatePolicy): PolicySource => ({
  resolve: () => policy,
})
