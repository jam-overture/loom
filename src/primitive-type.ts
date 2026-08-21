import { z } from "zod"

/**
 * The names a tree uses to reach what a deployment registered.
 *
 * One grammar serves every registry — primitives, data sources, submission
 * endpoints — so that naming a capability looks the same wherever a tree does
 * it.
 */

const SEGMENT = "[a-z][a-z0-9]*(?:-[a-z0-9]+)*"

/**
 * The grammar of every name a tree uses to reach something a deployment
 * registered: a primitive, a data source, a submission endpoint. Dot-namespaced
 * kebab-case — `stack`, `commerce.product-card`, `contact.enquiry`.
 *
 * One pattern rather than one per registry, because the sameness is the point.
 * A tree names a capability and a registry decides what that name reaches; a
 * second grammar would say those are different kinds of name when they are not.
 */
export const NAMESPACED_ID_PATTERN = new RegExp(`^${SEGMENT}(?:\\.${SEGMENT})*$`)

/**
 * The identifier of a registered primitive — the contract between an element
 * node and whatever renders it. The tree schema only cares about the shape of
 * the identifier; resolving it to an implementation is the registry's job, which
 * keeps the AST independent of any particular primitive library.
 */
export const primitiveTypeSchema = z
  .string()
  .regex(NAMESPACED_ID_PATTERN)
  .brand<"PrimitiveType">()
export type PrimitiveType = z.infer<typeof primitiveTypeSchema>

/**
 * A named region inside a primitive that accepts projected children.
 * camelCase, mirroring prop naming.
 */
export const slotNameSchema = z
  .string()
  .regex(/^[a-z][a-zA-Z0-9]*$/)
  .brand<"SlotName">()
export type SlotName = z.infer<typeof slotNameSchema>

/**
 * A key naming one of the strings a primitive owns. camelCase, mirroring slot
 * and prop naming — and, load-bearing, never containing a dot: a dictionary
 * addresses a string as `${type}.${key}`, and a key with a dot in it would make
 * that address ambiguous between two primitives.
 */
export const textKeySchema = z
  .string()
  .regex(/^[a-z][a-zA-Z0-9]*$/)
  .brand<"TextKey">()
export type TextKey = z.infer<typeof textKeySchema>
