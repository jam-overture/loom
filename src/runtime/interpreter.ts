import type { Result } from "../result.js"
import type { LoomTree } from "../tree/tree.js"

import type { EditIntent } from "./intent.js"
import type { ProposedChange } from "./proposal.js"

/**
 * The AI seam.
 *
 * Interpretation is the one genuinely non-deterministic step in the pipeline,
 * so it sits behind an interface the rest of the runtime depends on but never
 * implements. Everything downstream — assessment, the Gate, application — is
 * pure and can be tested without a model in the loop.
 *
 * An interpreter may fail to produce a delta at all. That is a distinct outcome
 * from producing one the Gate rejects, and the two must not be conflated: the
 * first is "I did not understand", the second is "you may not do that".
 */

export type InterpretationError =
  | { readonly code: "not-understood"; readonly detail: string }
  | { readonly code: "no-change-needed"; readonly detail: string }
  | { readonly code: "interpreter-unavailable"; readonly detail: string }
  | { readonly code: "malformed-proposal"; readonly detail: string }

export interface ChangeInterpreter {
  readonly interpret: (
    intent: EditIntent,
    tree: LoomTree
  ) => Promise<Result<ProposedChange, InterpretationError>>
}
