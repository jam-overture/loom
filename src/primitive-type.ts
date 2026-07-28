import { z } from "zod"

/**
 * The identifier of a registered primitive — the contract between an element
 * node and whatever renders it. Dot-namespaced kebab-case: `stack`,
 * `commerce.product-card`. The tree schema only cares about the shape of the
 * identifier; resolving it to an implementation is the registry's job, which
 * keeps the AST independent of any particular primitive library.
 */
const SEGMENT = "[a-z][a-z0-9]*(?:-[a-z0-9]+)*"

export const primitiveTypeSchema = z
  .string()
  .regex(new RegExp(`^${SEGMENT}(?:\\.${SEGMENT})*$`))
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
