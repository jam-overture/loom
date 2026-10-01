import type { NodeId } from "../ids.js"
import type { JsonObject, JsonValue } from "../json.js"
import { DATA_PROP_KEY } from "../reserved-props.js"
import { walkTree } from "../tree/navigation.js"
import type { LoomNode } from "../tree/node.js"
import type { LoomTree } from "../tree/tree.js"

import { parseBindings, type BindingError } from "./binding.js"
import type { BindingName, SourceId } from "./source.js"

/**
 * What a tree wants to know, worked out before anything is asked.
 *
 * Planning is a pure function of the tree, which is the whole reason the seam is
 * shaped this way. `renderLoomTree` is synchronous and does no IO — that is what
 * lets it run inside a Server Component and what makes two renders of one
 * revision agree — and resolving a binding is IO by definition. So the tree is
 * read once, in a pass that only reads, and the asking happens outside the
 * renderer entirely (0058).
 *
 * Identical questions are asked once. Hermes' `about` block bound three fields
 * to one profile, and three round trips for one row is a cost paid on every
 * request forever; two bindings naming the same source with the same params
 * share a key here and therefore share an answer.
 */

/** Identifies one question. Two bindings sharing it share an answer. */
export type RequestKey = string

export type PlannedRequest = {
  readonly key: RequestKey
  readonly source: SourceId
  readonly params: JsonObject
}

export type PlannedBinding = {
  readonly nodeId: NodeId
  readonly name: BindingName
  readonly key: RequestKey
}

/** A node whose `loom:data` could not be read at all. */
export type BindingProblem = {
  readonly nodeId: NodeId
  readonly error: BindingError
}

export type DataPlan = {
  /** Deduplicated, in first-encountered order. */
  readonly requests: readonly PlannedRequest[]
  readonly bindings: readonly PlannedBinding[]
  readonly problems: readonly BindingProblem[]
}

export const EMPTY_DATA_PLAN: DataPlan = Object.freeze({
  requests: Object.freeze([]),
  bindings: Object.freeze([]),
  problems: Object.freeze([]),
})

export const planIsEmpty = (plan: DataPlan): boolean =>
  plan.requests.length === 0 && plan.problems.length === 0

/**
 * Key ordering has to be irrelevant: `{ limit: 6, kind: "a" }` and
 * `{ kind: "a", limit: 6 }` are the same question, and a model writes them in
 * whichever order it happens to. Arrays keep their order, because there they
 * mean something.
 */
const canonical = (value: JsonValue): string => {
  if (value === null || typeof value !== "object") return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`

  return `{${Object.keys(value)
    .sort()
    .flatMap((key) => {
      const member = value[key]

      return member === undefined ? [] : [`${JSON.stringify(key)}:${canonical(member)}`]
    })
    .join(",")}}`
}

/**
 * The byte between a source id and its canonical params, which can occur in
 * neither: a source id is dot-namespaced kebab-case and the params half is
 * `JSON.stringify` output, so no key collides by accident.
 *
 * Written as an escape rather than as the byte itself. A literal NUL in the
 * source makes `git` call this module binary, which costs nothing at runtime
 * and costs a reviewer the whole diff: every change to this file printed as a
 * pair of byte counts instead. Named as well as escaped, because a bare
 * `"\u0000"` inside a template literal reads like a typo at the one place
 * somebody might delete it.
 */
const SEPARATOR = "\u0000"

const requestKey = (source: SourceId, params: JsonObject): RequestKey =>
  `${source}${SEPARATOR}${canonical(params)}`

export const planTreeData = (tree: LoomTree): DataPlan => planDataIn(tree.root)

/**
 * The same plan, for a root that is not a stored tree.
 *
 * Exactly the split `planSubmissionsIn` carries next door, for the reason its
 * comment gives: the runtime needs a plan for a tree that exists only as the
 * result of applying a delta, which is a node and never a `LoomTree`. Reading
 * the bindings twice would be two walks that had to agree about which
 * declarations parse, and the second one would drift.
 */
export const planDataIn = (root: LoomNode): DataPlan => {
  const requests: PlannedRequest[] = []
  const bindings: PlannedBinding[] = []
  const problems: BindingProblem[] = []
  const seen = new Set<RequestKey>()

  for (const node of walkTree(root)) {
    if (node.kind !== "element") continue

    const declared = node.props[DATA_PROP_KEY]
    if (declared === undefined) continue

    const parsed = parseBindings(declared)
    if (!parsed.ok) {
      problems.push({ nodeId: node.id, error: parsed.error })
      continue
    }

    for (const [name, binding] of parsed.value) {
      const key = requestKey(binding.source, binding.params)

      if (!seen.has(key)) {
        seen.add(key)
        requests.push({ key, source: binding.source, params: binding.params })
      }

      bindings.push({ nodeId: node.id, name, key })
    }
  }

  return { requests, bindings, problems }
}
