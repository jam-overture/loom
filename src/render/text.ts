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
 *
 * The two halves have different owners, and the renderer gets them from
 * different places. **Declarations come with the component**, off the same
 * registry that resolved it, because they are part of the primitive the way its
 * markup is. **A dictionary is the host's**, wired deliberately, because which
 * language a visitor gets is not the framework's to decide. `RenderOptions.text`
 * is the second of those and not the first (0063).
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
 * gives for `PropsValidator` being separate: which language a deployment serves
 * is a decision made at the composition root, and burying it in whichever
 * resolver happened to be wired in would make a host that serves two languages
 * register its library twice.
 *
 * A registry built by §4's SDK satisfies this interface with the declared
 * strings themselves, so an untranslated deployment needs no dictionary and no
 * wiring — the renderer reads the declarations off the resolver it already has.
 *
 * The lookup is synchronous and pure. Merging a dictionary is
 * `textResolverFor`'s job, done once per dictionary rather than once per node.
 */
export interface TextResolver {
  readonly textFor: (type: PrimitiveType) => PrimitiveText<string>
}

/**
 * Whether a resolver can also answer for the strings its primitives declared.
 *
 * This is an **exact** test rather than a heuristic, and the reason is worth
 * stating: the only way to declare text is `definePrimitive`, and the only thing
 * that carries a declaration to the renderer is `createPrimitiveRegistry`, whose
 * result is a `TextResolver`. A resolver that is not one — `staticPrimitiveResolver`
 * over a map of components, or a host's own — has no declarations to lose. So
 * "does this resolver satisfy `TextResolver`" and "does anything here declare
 * strings" are the same question, and answering the first answers the second.
 */
export const isTextResolver = (value: object): value is TextResolver =>
  typeof (value as Partial<TextResolver>).textFor === "function"

/**
 * A primitive's declared strings with a host's answers laid over them, for the
 * one case where both are in play and they are not the same object.
 *
 * Total by construction: every key either side carries is in the result, so a
 * host resolver that answers for half the library — or for a different library
 * entirely — leaves no declared key behind. Frozen and null-prototype for the
 * reason `NO_TEXT` gives.
 */
export const overlayText = (
  declared: PrimitiveText<string>,
  supplied: PrimitiveText<string>
): PrimitiveText<string> => {
  if (Object.keys(supplied).length === 0) return declared
  if (Object.keys(declared).length === 0) return supplied

  const merged: Record<string, string> = Object.create(null) as Record<string, string>

  for (const [key, value] of Object.entries(declared)) merged[key] = value
  for (const [key, value] of Object.entries(supplied)) merged[key] = value

  return Object.freeze(merged)
}
