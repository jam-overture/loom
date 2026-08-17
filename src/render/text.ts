import type { PrimitiveType } from "../primitive-type.js"

/**
 * The text seam: the strings a primitive owns, and the deployment's chance to
 * translate them.
 *
 * Almost every user-facing string on a Loom page comes from the tree, where a
 * model wrote it and the Gate weighed it. A few cannot. A marker glyph carries
 * an accessible name the visible label does not say; a disclosure control needs
 * a name for the thing it opens. Those strings are not content anyone proposed —
 * they belong to the registered component, the way its markup does.
 *
 * Making them props would put an accessible name inside the space a model
 * writes, which is the shape 0053 and 0055 both refused. Leaving them inline in
 * the component makes a German deployment render an English "Not included" in
 * the middle of a German pricing table, with nowhere to fix it.
 *
 * So a primitive **declares** the strings it needs, in its own language, and a
 * host may supply a dictionary that replaces them. What reaches the primitive is
 * a resolved map: the translation where there is one, the declared string where
 * there is not. Never a missing key, because the failure this seam exists to
 * prevent is a control with no name at all.
 */

/**
 * The strings a primitive receives, by declared key.
 *
 * `TKey` is the union of keys the primitive declared, so a component that reads
 * `loom.text.exlcuded` is a compile error at the point of declaration rather
 * than an empty accessible name in production. It defaults to `never` — a
 * primitive that declared no text can read no text, which is the honest type for
 * the map it is handed.
 */
export type PrimitiveText<TKey extends string = never> = Readonly<Record<TKey, string>>

/**
 * The map handed to a primitive that declares nothing, and the answer for a type
 * the resolver does not know.
 *
 * Null-prototype for the reason `staticPrimitiveResolver` gives: text keys are
 * lowercase identifiers and `constructor`, `toString` and `valueOf` are all
 * valid ones, so an ordinary object would answer `loom.text.constructor` with a
 * function off `Object.prototype`.
 */
export const NO_TEXT: PrimitiveText<string> = Object.freeze(
  Object.create(null) as Record<string, string>
)

/**
 * The renderer's whole dependency on translation: one lookup, by primitive type.
 *
 * A **separate interface** from `PrimitiveResolver`, for the reason `props.ts`
 * gives for `PropsValidator` being separate: a renderer handed no text resolver
 * hands every primitive an empty map, so "this deployment supplies strings" is a
 * visible choice at the composition root rather than a property of whichever
 * resolver happened to be wired in. A registry built by §4's SDK satisfies this
 * interface with the declared strings themselves, so the untranslated case is
 * the ordinary wiring and not a special one.
 *
 * The lookup is synchronous and pure. Merging a dictionary is
 * `textResolverFor`'s job, done once per dictionary rather than once per node.
 */
export interface TextResolver {
  readonly textFor: (type: PrimitiveType) => PrimitiveText<string>
}
