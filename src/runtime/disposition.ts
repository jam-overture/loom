import { z } from "zod"

import { writeCheckSchema, type WriteCheck } from "./checks.js"
import { irreversibilityReasonSchema, type IrreversibilityReason } from "./irreversibility.js"
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
  "discards-later-work",
  "redirected-submission",
  "repointed-binding",
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
 * What a disposition says when it was decided before the Gate recorded which
 * policy decided it. Not the default policy's name: those judgments were made
 * under a policy nobody wrote down, and claiming they were made under this
 * host's current one would be a guess presented as a record.
 */
export const UNATTRIBUTED_POLICY_ID = "unattributed"

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
  /**
   * Which policy judged this. Required on the type so every construction site
   * has to say; defaulted on the schema so a record written before the field
   * existed still parses, and reads as the unknown it is.
   */
  policyId: z.string().min(1).default(UNATTRIBUTED_POLICY_ID),
  /**
   * What that policy *contained* when it judged this, beside what it was called.
   *
   * Optional and never defaulted, unlike `policyId`. A name has an honest
   * stand-in for the unknown — `unattributed` says "nobody wrote this down" — and
   * a digest has none: any string here is a claim about the contents of a
   * policy, and inventing one would be inventing the very fact the field exists
   * to check.
   */
  policyFingerprint: z.string().min(1).optional(),
  /**
   * And which of the write path's optional checks were in place, beside what the
   * rules were.
   *
   * A fingerprint proves the rules held; it says nothing about the two seams a
   * composition root hands over separately, either of which can turn an
   * `accepted` into a `rejected` (0179, 0208). Without this, a deployment that
   * wired a registry into the write path on Tuesday produced Wednesday's
   * judgments under a byte-identical fingerprint, and a reader comparing the two
   * weeks was told nothing had changed.
   *
   * **The empty list is written rather than omitted**, which is the opposite of
   * `irreversibilityReasons` below, and the difference is that nothing else here
   * disambiguates the absence. `reversible` says whether any reason could have
   * fired; no field says whether this runtime was asked about its seams. So an
   * empty array is *asked, and none were wired*, and the field being absent is
   * *judged before the Gate recorded this* — the same two states `policyId` and
   * `policyFingerprint` keep apart, by the same means.
   */
  wiredChecks: z.array(writeCheckSchema).optional(),
  /**
   * Why it cannot be taken back, for the one screen that has to ask somebody.
   *
   * `reversible` above says *whether*, and `reason.detail` says why in a
   * sentence — and a sentence is the wrong thing to read, because the two
   * reasons ask opposite things of the person holding the decision. One sends
   * them to go and look at a payment flow; the other asks whether some content
   * is worth keeping. The detail line is prose written for a reader and
   * documented as such, so a consumer recovering the codes out of it would be
   * parsing somebody else's wording, and would break silently the first time
   * anybody improved it.
   *
   * Absent and never defaulted (0045), and omitted rather than empty when
   * nothing fired. `reversible` is what disambiguates the absence, which leaves
   * three states readable and the fourth impossible:
   *
   * | `reversible` | this field | what it means |
   * | --- | --- | --- |
   * | `true` | absent | nothing fired, which is what `true` already said |
   * | `false` | present | these are the reasons |
   * | `false` | absent | judged before this field existed |
   * | `true` | present | never written; asserted in `gate.test.ts` |
   */
  irreversibilityReasons: z.array(irreversibilityReasonSchema).optional(),
})

export type Disposition = {
  readonly kind: DispositionKind
  readonly reason: DispositionReason
  readonly stakes: StakeLevel
  readonly reversible: boolean
  readonly confidence: number
  readonly policyId: string
  /** Absent on a judgment recorded before the Gate fingerprinted policies. */
  readonly policyFingerprint?: string
  /**
   * Absent on a judgment recorded before the Gate wrote down which checks were
   * wired. Empty means it was asked and none were; the schema above says why the
   * two are kept apart here and folded together elsewhere.
   */
  readonly wiredChecks?: readonly WriteCheck[]
  /**
   * Absent when nothing fired, and on a judgment recorded before the field
   * existed. The schema above says which absence is which.
   */
  readonly irreversibilityReasons?: readonly IrreversibilityReason[]
}
