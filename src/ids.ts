import { z } from "zod"

/**
 * Identity scheme.
 *
 * A NodeId is minted once, when the node is first inserted, and never changes
 * again — not on move, not on configure, not on re-render. Positional paths are
 * derived views; the id is the ground truth. Every downstream system (deltas,
 * provenance, telemetry, the editable decorator) addresses nodes by id, so id
 * stability is what makes an edit to a live tree meaningful over time.
 *
 * Ids are opaque strings with a one-character kind prefix. The prefix is a
 * debugging affordance and a cheap guard against passing a DeltaId where a
 * NodeId belongs; the brand types are the real enforcement.
 */

const ID_BODY = "[0-9a-z]{1,32}"

export const nodeIdSchema = z
  .string()
  .regex(new RegExp(`^n_${ID_BODY}$`))
  .brand<"NodeId">()
export type NodeId = z.infer<typeof nodeIdSchema>

export const treeIdSchema = z
  .string()
  .regex(new RegExp(`^t_${ID_BODY}$`))
  .brand<"TreeId">()
export type TreeId = z.infer<typeof treeIdSchema>

export const deltaIdSchema = z
  .string()
  .regex(new RegExp(`^d_${ID_BODY}$`))
  .brand<"DeltaId">()
export type DeltaId = z.infer<typeof deltaIdSchema>

/**
 * Id minting is a side effect, so it enters the runtime through this seam
 * rather than being called directly from pure code. Tests and replay tooling
 * inject a deterministic factory; production injects the random one.
 */
export interface IdFactory {
  readonly nodeId: () => NodeId
  readonly treeId: () => TreeId
  readonly deltaId: () => DeltaId
}

const RANDOM_ID_LENGTH = 20
const BASE36_ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz"

const randomBody = (): string => {
  const bytes = new Uint8Array(RANDOM_ID_LENGTH)
  globalThis.crypto.getRandomValues(bytes)

  return Array.from(bytes, (byte) => BASE36_ALPHABET[byte % BASE36_ALPHABET.length] ?? "0").join("")
}

export const randomIdFactory: IdFactory = {
  nodeId: () => nodeIdSchema.parse(`n_${randomBody()}`),
  treeId: () => treeIdSchema.parse(`t_${randomBody()}`),
  deltaId: () => deltaIdSchema.parse(`d_${randomBody()}`),
}

/**
 * Deterministic ids for tests and for replaying a recorded session. Counters
 * are per-kind so a tree and its deltas read as `n_1, n_2 … d_1, d_2`. The
 * namespace keeps two independent factories from minting the same id — a test
 * that builds nodes for an existing tree passes one.
 */
export const sequentialIdFactory = (namespace = ""): IdFactory => {
  const counters = { node: 0, tree: 0, delta: 0 }

  return {
    nodeId: () => nodeIdSchema.parse(`n_${namespace}${(counters.node += 1)}`),
    treeId: () => treeIdSchema.parse(`t_${namespace}${(counters.tree += 1)}`),
    deltaId: () => deltaIdSchema.parse(`d_${namespace}${(counters.delta += 1)}`),
  }
}
