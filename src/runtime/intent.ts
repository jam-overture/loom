import { z } from "zod"

import { intentIdSchema, nodeIdSchema, treeIdSchema, type IntentId, type NodeId, type TreeId } from "../ids.js"

/**
 * An EditIntent is what someone — or something — wants, before any
 * interpretation. It is deliberately unstructured: a sentence, plus enough
 * context to interpret it against a specific tree at a specific revision.
 *
 * Origin is carried from here all the way to the Gate, because who asked is a
 * real input to how much latitude a change gets. An explicit human instruction
 * earns more than an inference nobody requested.
 *
 * `actor` is the identity behind the origin, and it travels the same route:
 * whatever raises an intent states who is behind it, and the interpreter copies
 * it into provenance rather than inventing it (0027). It is optional here
 * because a `system-signal` or a `scheduled-adaptation` has no one to name — not
 * because a host may skip it for a human ask.
 */

export const intentOriginSchema = z.enum([
  "user-instruction",
  "system-signal",
  "scheduled-adaptation",
  "developer",
])
export type IntentOrigin = z.infer<typeof intentOriginSchema>

export const editIntentSchema = z.object({
  intentId: intentIdSchema,
  treeId: treeIdSchema,
  baseRevision: z.number().int().nonnegative(),
  origin: intentOriginSchema,
  /** Who is behind the origin, named by whoever raised the intent. */
  actor: z.string().min(1).optional(),
  utterance: z.string().min(1),
  /** Narrows interpretation to a subtree — "make *this card* quieter". */
  scopeNodeId: nodeIdSchema.optional(),
  observedAt: z.string().datetime(),
})

export type EditIntent = {
  readonly intentId: IntentId
  readonly treeId: TreeId
  readonly baseRevision: number
  readonly origin: IntentOrigin
  readonly actor?: string
  readonly utterance: string
  readonly scopeNodeId?: NodeId
  readonly observedAt: string
}
