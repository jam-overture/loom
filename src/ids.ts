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
 * Stability is not the same as uniqueness over time. A node that is removed
 * takes its id out of the live tree, and what stops that id being minted again
 * for a different node is `tree/identity.ts`, not this module — enforced within
 * a delta and reported by the audit across a log (0038).
 *
 * Ids are opaque strings with a one-character kind prefix. The prefix is a
 * debugging affordance and a cheap guard against passing a DeltaId where a
 * NodeId belongs; the brand types are the real enforcement.
 */

const ID_BODY_MAX_LENGTH = 32
const ID_BODY_ALPHABET = "[0-9a-z]"
const ID_BODY = `${ID_BODY_ALPHABET}{1,${ID_BODY_MAX_LENGTH}}`

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

export const intentIdSchema = z
  .string()
  .regex(new RegExp(`^i_${ID_BODY}$`))
  .brand<"IntentId">()
export type IntentId = z.infer<typeof intentIdSchema>

export const proposalIdSchema = z
  .string()
  .regex(new RegExp(`^p_${ID_BODY}$`))
  .brand<"ProposalId">()
export type ProposalId = z.infer<typeof proposalIdSchema>

/**
 * Id minting is a side effect, so it enters the runtime through this seam
 * rather than being called directly from pure code. Tests and replay tooling
 * inject a deterministic factory; production injects the random one.
 */
export interface IdFactory {
  readonly nodeId: () => NodeId
  readonly treeId: () => TreeId
  readonly deltaId: () => DeltaId
  readonly intentId: () => IntentId
  readonly proposalId: () => ProposalId
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
  intentId: () => intentIdSchema.parse(`i_${randomBody()}`),
  proposalId: () => proposalIdSchema.parse(`p_${randomBody()}`),
}

/**
 * The counter is appended to the namespace and the pair has to fit an id body,
 * so the namespace cannot have all of it. Eight characters of headroom is a
 * hundred million ids per kind, which is more than a deterministic run will ever
 * mint, and it means a namespace that is legal at the first node is still legal
 * at the last one — a bound that holds only until the counter grows a digit is
 * the same fault with a longer fuse.
 */
const NAMESPACE_COUNTER_HEADROOM = 8
const NAMESPACE_MAX_LENGTH = ID_BODY_MAX_LENGTH - NAMESPACE_COUNTER_HEADROOM
const namespacePattern = new RegExp(`^${ID_BODY_ALPHABET}{0,${NAMESPACE_MAX_LENGTH}}$`)

/**
 * The nearest legal namespace to the one that was refused, so the message ends
 * in something to paste rather than in a rule to re-read. A namespace with
 * nothing legal left in it has no repair to offer, and the caller is told to
 * drop the argument instead.
 */
const suggestNamespace = (namespace: string): string => {
  const repaired = namespace.toLowerCase().replace(/[^0-9a-z]/g, "").slice(0, NAMESPACE_MAX_LENGTH)

  return repaired === "" ? "pass no namespace at all" : JSON.stringify(repaired)
}

/**
 * Deterministic ids for tests and for replaying a recorded session. Counters
 * are per-kind so a tree and its deltas read as `n_1, n_2 … d_1, d_2`. The
 * namespace keeps two independent factories from minting the same id — a test
 * that builds nodes for an existing tree passes one.
 *
 * The namespace is checked here rather than at the first mint. Interpolating it
 * and validating only the result is what a lessons page hit with `set-n-q1`:
 * the factory accepted it, and the failure arrived later as a bare Zod regex
 * error inside whichever builder happened to run first, naming neither the
 * namespace nor this call. Every id the factory would go on to mint is decided
 * the moment the namespace is given, so this is the moment it can be refused.
 */
export const sequentialIdFactory = (namespace = ""): IdFactory => {
  if (!namespacePattern.test(namespace)) {
    throw new Error(
      `loom: sequentialIdFactory was given the namespace ${JSON.stringify(namespace)}, which cannot appear in an id. ` +
        `A namespace is lowercase letters and digits only, at most ${NAMESPACE_MAX_LENGTH} of them — no hyphens, ` +
        `underscores or capitals. Try ${suggestNamespace(namespace)}.`
    )
  }

  const counters = { node: 0, tree: 0, delta: 0, intent: 0, proposal: 0 }

  return {
    nodeId: () => nodeIdSchema.parse(`n_${namespace}${(counters.node += 1)}`),
    treeId: () => treeIdSchema.parse(`t_${namespace}${(counters.tree += 1)}`),
    deltaId: () => deltaIdSchema.parse(`d_${namespace}${(counters.delta += 1)}`),
    intentId: () => intentIdSchema.parse(`i_${namespace}${(counters.intent += 1)}`),
    proposalId: () => proposalIdSchema.parse(`p_${namespace}${(counters.proposal += 1)}`),
  }
}
