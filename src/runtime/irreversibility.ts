import { z } from "zod"

import { primitiveTypeSchema, type PrimitiveType } from "../primitive-type.js"

/**
 * Why a change cannot be taken back, as data.
 *
 * Its own module rather than `reversibility.ts` because of who has to import
 * it. The reason is *computed* there, against a tree, a policy and an inverse
 * delta; it is *stored* by `disposition.ts`, which §6 reads back out of a holds
 * table and validates like anything else that crossed a wire or a year. A leaf
 * holding nothing but the shape lets the second import it without pulling the
 * tree engine in behind it, and keeps the direction of the dependency honest:
 * the stored shape does not know how it was derived.
 *
 * The two members ask opposite things of whoever reads them, which is why a
 * code is worth keeping beside the prose. `out-of-tree-effect` means the page
 * is recoverable and reality is not — go and look at the part that takes the
 * payment. `retention-budget-exceeded` means reality is fine and the page is
 * not — decide whether the content is worth keeping, because the rest of it
 * will not come back.
 */

export const irreversibilityReasonSchema = z.discriminatedUnion("code", [
  z.object({
    code: z.literal("out-of-tree-effect"),
    /**
     * Which of the types the change touched this policy declared reach outside
     * the tree. A type name is vocabulary the deployment registered rather than
     * anything a visitor typed, which is why a stored record may carry it.
     */
    primitiveTypes: z.array(primitiveTypeSchema),
  }),
  z.object({
    code: z.literal("retention-budget-exceeded"),
    retainedNodeCount: z.number().int().nonnegative(),
    budget: z.number().int().nonnegative(),
  }),
])

export type IrreversibilityReason =
  | { readonly code: "out-of-tree-effect"; readonly primitiveTypes: readonly PrimitiveType[] }
  | {
      readonly code: "retention-budget-exceeded"
      readonly retainedNodeCount: number
      readonly budget: number
    }

/**
 * The types a reason list blames, empty when no out-of-tree reason fired.
 *
 * Here rather than at each of its two call sites because both of them are
 * narrowing a reason list on the way into a stored record, and the narrowing is
 * the part a reader has to be able to check.
 */
export const outOfTreeEffectTypesOf = (
  reasons: readonly IrreversibilityReason[]
): readonly PrimitiveType[] =>
  reasons.flatMap((reason) => (reason.code === "out-of-tree-effect" ? reason.primitiveTypes : []))
