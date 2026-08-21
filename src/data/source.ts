import { z } from "zod"

import { NAMESPACED_ID_PATTERN } from "../primitive-type.js"

/**
 * What a data source is, from the tree's side of the seam.
 *
 * A binding names a source and says nothing about where the answer comes from.
 * This module holds that name and the shape of the answer, so a tree can ask a
 * question no part of it knows how to answer.
 */

/**
 * The identifier of a registered data source — the contract between a binding
 * in the tree and whatever answers it.
 *
 * Same grammar as `PrimitiveType`, and for the same reason: a tree names a
 * capability, a registry decides what that name reaches, and the AST stays
 * independent of any particular host's data. `profile`, `commerce.products`.
 */
export const sourceIdSchema = z.string().regex(NAMESPACED_ID_PATTERN).brand<"SourceId">()
export type SourceId = z.infer<typeof sourceIdSchema>

/**
 * The name a primitive reads an answer under — `loom.data.services`. camelCase,
 * mirroring slot names and prop names, because it is the same kind of thing: a
 * named region of what a primitive receives.
 */
export const bindingNameSchema = z
  .string()
  .regex(/^[a-z][a-zA-Z0-9]*$/)
  .brand<"BindingName">()
export type BindingName = z.infer<typeof bindingNameSchema>
