import { z } from "zod"

import { stakeLevelSchema, type StakeLevel } from "./stake-level.js"

/**
 * What the Gate decided, and why. The rationale is structured rather than
 * prose so that a host can render it, a test can assert on it, and telemetry
 * can aggregate it — the same decision has to serve all three.
 */

export const dispositionKindSchema = z.enum(["accepted", "requires-confirmation", "rejected"])
export type DispositionKind = z.infer<typeof dispositionKindSchema>

export const dispositionReasonCodeSchema = z.enum([
  "confidence-below-floor",
  "stakes-at-refusal-floor",
  "irreversible",
  "stakes-above-ceiling",
  "confidence-below-minimum",
  "within-policy",
])
export type DispositionReasonCode = z.infer<typeof dispositionReasonCodeSchema>

export const dispositionReasonSchema = z.object({
  code: dispositionReasonCodeSchema,
  detail: z.string().min(1),
})

export type DispositionReason = {
  readonly code: DispositionReasonCode
  readonly detail: string
}

/**
 * The schema exists because a disposition outlives the process that decided it:
 * §6 stores one and reads it back later, and a judgment restored from storage is
 * validated at that boundary like anything else that crossed a wire or a year.
 */
export const dispositionSchema = z.object({
  kind: dispositionKindSchema,
  reason: dispositionReasonSchema,
  stakes: stakeLevelSchema,
  reversible: z.boolean(),
  confidence: z.number().min(0).max(1),
})

export type Disposition = {
  readonly kind: DispositionKind
  readonly reason: DispositionReason
  readonly stakes: StakeLevel
  readonly reversible: boolean
  readonly confidence: number
}
