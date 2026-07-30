import type { JsonObject } from "../json.js"
import type { PrimitiveType } from "../primitive-type.js"

/**
 * The prop-validation seam, inherited from 0009.
 *
 * A primitive declares what its props must look like; something has to check
 * that the tree's props match, and this is where it happens — once, at the
 * boundary the renderer already crosses, rather than inside every primitive.
 *
 * It is a **separate interface** from `PrimitiveResolver` rather than an
 * optional method on it, for the same reason `ChangeRepairer` is separate from
 * `ChangeInterpreter`: a renderer handed no validator cannot validate, so
 * "this deployment checks AI-authored props against declared schemas" is a
 * visible choice at the composition root instead of a property of whichever
 * resolver got wired in.
 *
 * Validation is a **predicate, not a codec**. The verdict says whether the
 * props are acceptable; it never returns replacement props, and the renderer
 * always hands the primitive the props exactly as they appear in the tree. A
 * schema that defaults or coerces would make the rendered page a function of
 * the deployment's schema version as well as the tree, and a tree that no
 * longer describes the page it produces is the one thing Loom cannot afford.
 * Defaults belong inside the primitive, which is where presentation lives.
 */

export type PropsIssue = {
  /** Dotted path within the props object; `props` when the whole bag is wrong. */
  readonly path: string
  /**
   * Developer-facing text from the declaring schema. Zod's own messages can
   * name a rejected value (an enum mismatch quotes what it received), so a
   * consumer must treat this as content rather than as a safe-to-log constant.
   */
  readonly message: string
}

export type PropsVerdict =
  | { readonly outcome: "valid" }
  | { readonly outcome: "invalid"; readonly issues: readonly PropsIssue[] }
  /** The validator has no schema for this type — see `render.ts` for what that means. */
  | { readonly outcome: "undeclared" }

export interface PropsValidator {
  readonly validateProps: (type: PrimitiveType, props: JsonObject) => PropsVerdict
}
