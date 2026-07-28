import type { StakeLevel } from "./stake-level.js"

/**
 * What the Gate decided, and why. The rationale is structured rather than
 * prose so that a host can render it, a test can assert on it, and telemetry
 * can aggregate it — the same decision has to serve all three.
 */

export type DispositionKind = "accepted" | "requires-confirmation" | "rejected"

export type DispositionReasonCode =
  | "confidence-below-floor"
  | "stakes-at-refusal-floor"
  | "irreversible"
  | "stakes-above-ceiling"
  | "confidence-below-minimum"
  | "within-policy"

export type DispositionReason = {
  readonly code: DispositionReasonCode
  readonly detail: string
}

export type Disposition = {
  readonly kind: DispositionKind
  readonly reason: DispositionReason
  readonly stakes: StakeLevel
  readonly reversible: boolean
  readonly confidence: number
}
