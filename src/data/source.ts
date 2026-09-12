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
 * The grammar a source id has to satisfy, in words, said once.
 *
 * The same sentence reaches two very different readers. `describeDataRegistryError`
 * tells a host that registered a bad id, and that reader has the code open. A
 * misdeclared `loom:data` in a tree reaches somebody looking at a page that will
 * not bind, through a render diagnostic — and Zod's default for a failed
 * `.regex()` is the word `Invalid`, so the less informed reader was getting the
 * less useful message. One constant rather than two strings, because the two
 * drifting apart is the same defect wearing a different hat.
 */
export const SOURCE_ID_EXPECTATION = 'expected dot-namespaced kebab-case, like "commerce.products"'

/**
 * The identifier of a registered data source — the contract between a binding
 * in the tree and whatever answers it.
 *
 * Same grammar as `PrimitiveType`, and for the same reason: a tree names a
 * capability, a registry decides what that name reaches, and the AST stays
 * independent of any particular host's data. `profile`, `commerce.products`.
 */
export const sourceIdSchema = z
  .string()
  .regex(NAMESPACED_ID_PATTERN, SOURCE_ID_EXPECTATION)
  .brand<"SourceId">()
export type SourceId = z.infer<typeof sourceIdSchema>

/** The grammar a binding name has to satisfy, for the same reader. */
export const BINDING_NAME_EXPECTATION = 'expected camelCase, like "services"'

/**
 * The name a primitive reads an answer under — `loom.data.services`. camelCase,
 * mirroring slot names and prop names, because it is the same kind of thing: a
 * named region of what a primitive receives.
 */
export const bindingNameSchema = z
  .string()
  .regex(/^[a-z][a-zA-Z0-9]*$/, BINDING_NAME_EXPECTATION)
  .brand<"BindingName">()
export type BindingName = z.infer<typeof bindingNameSchema>
