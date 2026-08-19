import { z } from "zod"

import { primitiveTypeSchema } from "./primitive-type.js"

/**
 * What a primitive says about whether it renders a target the reader aims at.
 *
 * HTML forbids interactive content inside interactive content: an `a` inside an
 * `a`, a `button` inside either. A browser handed that markup does not report
 * it — it resolves the ambiguity by dropping one of the two targets, so the
 * page renders, looks right, and one of the things on it silently does not
 * work. It is the rare structural mistake that is invisible in a screenshot and
 * obvious to a reader.
 *
 * The declaration says what a *node* is, never what a *parent may hold*.
 * `loom.card` renders an anchor when the tree gives it an `href` and a plain
 * surface when it does not, which is a fact about that primitive alone;
 * whether two of them sit inside one another is derived from the tree rather
 * than declared. That is the distinction
 * [0054](../decisions/0054-a-container-is-its-childs-name-plus-the-arrangement.md)
 * drew when it rejected a `childType` field, and the reason this is not that.
 *
 * It lives here, beside the identifier schemas, because it has two readers that
 * do not know about each other: the SDK, where an author declares it, and the
 * Gate's policy, where a deployment's set of them arrives as vocabulary.
 */

/**
 * The conditional case is the common one, and collapsing it into `always` would
 * make the check worse than useless: a `loom.card` with no `href` holding a
 * `loom.action` is the ordinary composition, and a rule that refused it is a
 * rule hosts turn off.
 */
export type InteractiveWhen = "always" | { readonly whenProps: readonly string[] }

export const interactiveWhenSchema: z.ZodType<InteractiveWhen, z.ZodTypeDef, unknown> = z.union([
  z.literal("always"),
  z.object({ whenProps: z.array(z.string().min(1)).min(1).readonly() }).strict(),
])

/**
 * The primitives of a deployment that render a target, by type.
 *
 * Keyed by plain `string` rather than by the branded `PrimitiveType`, so a host
 * can write the map as a literal. The schema still validates every key as a
 * primitive type on the way in; what it does not do is make the ordinary
 * spelling of a policy fail to compile.
 */
export type InteractiveTypes = Readonly<Record<string, InteractiveWhen | undefined>>

export const interactiveTypesSchema: z.ZodType<InteractiveTypes, z.ZodTypeDef, unknown> = z.record(
  primitiveTypeSchema,
  interactiveWhenSchema
)

/**
 * A prop turns a primitive into a target when the tree actually gave it one.
 * `null` and the empty string do not count: a card whose `href` was cleared
 * renders the surface again, and reading a blank as a link would refuse the
 * change that fixed the nesting.
 */
const isSet = (value: unknown): boolean => value !== undefined && value !== null && value !== ""

/**
 * The own-property test is load-bearing rather than belt-and-braces: a trigger
 * named `constructor` or `toString` would otherwise read a function off
 * `Object.prototype` and make every node of that type a target.
 */
export const isInteractiveWith = (
  when: InteractiveWhen,
  props: Readonly<Record<string, unknown>>
): boolean =>
  when === "always" ||
  when.whenProps.some((key) => Object.hasOwn(props, key) && isSet(props[key]))
