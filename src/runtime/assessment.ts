import type { DeltaId } from "../ids.js"
import { flatMapResult, mapResult, type Result } from "../result.js"
import type { TreeError } from "../tree/errors.js"
import type { LoomTree } from "../tree/tree.js"

import { analyzeDelta, type ChangeAnalysis } from "./analysis.js"
import { interactivePredicateFor } from "./nesting.js"
import type { GatePolicy } from "./policy.js"
import type { ProposedChange } from "./proposal.js"
import { assessReversibility, type Reversibility } from "./reversibility.js"
import { assessStakes, type StakeAssessment } from "./stakes.js"
import { EVERY_TYPE_UNDECLARED, primitiveVocabularyFor, type PropsVocabulary } from "./vocabulary.js"

/**
 * Everything the Gate is allowed to look at, gathered in one pass. Assembling
 * this is the last step that touches the tree; the Gate itself sees only this
 * record and the policy, which is what keeps it a pure function of its inputs.
 *
 * A failure here means the delta does not apply at all — a malformed proposal
 * rather than a rejected one. That distinction matters downstream: an
 * inapplicable proposal is an interpreter bug, not a policy decision.
 *
 * This is also where a proposal's own declaration about what it writes over is
 * folded into the damage estimate (0035), so the Gate keeps seeing two axes and
 * a policy rather than growing a third input. The policy's vocabulary — which
 * primitives are targets, and which exist at all — reaches the analysis the
 * same way and for the same reason (0064, 0173): the facts need a host's
 * primitives to state, and one seam should hold everything the Gate's inputs
 * are assembled from.
 */

export type ChangeAssessment = {
  readonly proposal: ProposedChange
  readonly analysis: ChangeAnalysis
  readonly stakes: StakeAssessment
  readonly reversibility: Reversibility
}

export const assessChange = (
  tree: LoomTree,
  proposal: ProposedChange,
  policy: GatePolicy,
  inverseDeltaId: DeltaId,
  checkProps: PropsVocabulary = EVERY_TYPE_UNDECLARED
): Result<ChangeAssessment, TreeError> =>
  flatMapResult(
    analyzeDelta(
      tree,
      proposal.delta,
      interactivePredicateFor(policy.interactiveTypes),
      primitiveVocabularyFor(policy.registeredPrimitiveTypes),
      checkProps
    ),
    (analysis) =>
      mapResult(
        assessReversibility(tree, proposal.delta, analysis, policy, inverseDeltaId),
        (reversibility) => ({
          proposal,
          analysis,
          stakes: assessStakes({ analysis, discards: proposal.discards ?? [] }, policy),
          reversibility,
        })
      )
  )
