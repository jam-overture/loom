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
 * What a malformed source id is told, in one place because two seams say it.
 *
 * The registry described this properly and the render diagnostic did not: a node
 * whose `loom:data` named something ungrammatical reported `bio.source: Invalid`
 * — Zod's default for a failed `.regex()` — while the same mistake made at
 * registration time got the full sentence. The asymmetry ran the wrong way.
 * The registry error reaches somebody with the code open who could have guessed;
 * the diagnostic reaches somebody looking at a page that will not bind.
 *
 * Shared rather than written twice so the two cannot drift into describing the
 * same grammar differently. Filed by `Loom lessons` on 3 September, from a real
 * run of lesson 18's Exercise D.
 */
export const SOURCE_ID_EXPECTATION =
  'expected dot-namespaced kebab-case, like "commerce.products"'

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

/** The same gap `sourceIdSchema` had, for the same reason, in the name beside it. */
export const BINDING_NAME_EXPECTATION = 'expected camelCase, like "featuredProducts"'

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
