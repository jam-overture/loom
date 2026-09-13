import {
  DATA_PROP_KEY,
  describeBindingError,
  describeDataUnavailable,
  parseBindings,
  planTreeData,
  resolveTreeData,
  walkTree,
  type DataUnavailable,
  type JsonValue,
  type LoomTree,
  type NodeId,
} from "@loom/runtime"

import {
  boundPage,
  pageOfThingsThatGoWrong,
  pageWithAMisdeclaredBinding,
  shopRegistry,
  troubleRegistry,
} from "./shop"

/**
 * What the seam did, produced by doing it.
 *
 * Three runs, all of them real: the shop's page is planned, the plan is
 * resolved against the shop's own registry, and a second page asks six questions
 * that cannot be answered. Every number, sentence and reason code the page prints
 * comes back from one of the three — including the ones a reader is most likely
 * to take on trust, which are the count of questions and the promise that an
 * empty answer is not a failure.
 *
 * Nothing here calls a model, a clock or a network. A producer that stops
 * reaching its outcome throws rather than letting the page print a confident lie.
 */

const asJson = (value: JsonValue): string => JSON.stringify(value)

/**
 * The same value over several lines, for the one place a reader is meant to read
 * the answer rather than recognise it. A list of rows on one line is a line that
 * scrolls out of the box it is in, and an answer nobody can see the end of makes
 * a poor demonstration of what came back.
 */
const asReadableJson = (value: JsonValue): string => JSON.stringify(value, null, 2)

/** One question the tree produced, and everybody who is waiting on it. */
export type Question = {
  readonly source: string
  /** The params, canonicalised by the planner rather than by this file. */
  readonly params: string
  /** The bound nodes sharing this answer, by the name each reads it under. */
  readonly askedBy: readonly string[]
}

/** One binding as it is written in the tree, before anything is deduplicated. */
export type WrittenBinding = {
  readonly where: string
  readonly reads: string
  readonly source: string
  /** Verbatim, in the key order whoever wrote it happened to use. */
  readonly params: string
}

export type QuestionsAsked = {
  readonly written: readonly WrittenBinding[]
  readonly questions: readonly Question[]
  /** How many round trips the page costs: one per question, not one per binding. */
  readonly asked: number
  /** How many of the bindings share an answer with another one. */
  readonly shared: number
}

const labelFor = (labels: ReadonlyMap<NodeId, string>, nodeId: NodeId): string => {
  const label = labels.get(nodeId)

  if (label === undefined) throw new Error(`loom: this page has no name for the node ${nodeId}`)

  return label
}

/**
 * The bindings as written, and the questions they come to.
 *
 * The two halves are produced separately on purpose. The left is the tree read
 * literally — four declarations, two of which say the same thing with their keys
 * in different orders — and the right is `planTreeData`'s answer to it. A page
 * that printed only the second would be asking a reader to take the dedup on
 * trust.
 */
export const produceQuestions = (): QuestionsAsked => {
  const { tree, labels } = boundPage()
  const plan = planTreeData(tree)

  const written: WrittenBinding[] = []

  for (const node of walkTree(tree.root)) {
    if (node.kind !== "element") continue

    const declared = node.props[DATA_PROP_KEY]
    if (declared === undefined) continue

    const parsed = parseBindings(declared)
    if (!parsed.ok) throw new Error(`loom: ${describeBindingError(parsed.error)}`)

    for (const [name, binding] of parsed.value) {
      written.push({
        where: labelFor(labels, node.id),
        reads: `loom.data.${name}`,
        source: binding.source,
        params: asJson(binding.params),
      })
    }
  }

  const questions = plan.requests.map((request) => ({
    source: request.source,
    params: asJson(request.params),
    askedBy: plan.bindings
      .filter((binding) => binding.key === request.key)
      .map((binding) => `${labelFor(labels, binding.nodeId)} · ${binding.name}`),
  }))

  return {
    written,
    questions,
    asked: questions.length,
    shared: written.length - questions.length,
  }
}

/** What one bound node's primitive is handed, once the asking is done. */
export type BindingAnswer = {
  readonly where: string
  readonly reads: string
  readonly source: string
  readonly status: "ready" | "unavailable"
  /** The answer itself, as the primitive receives it. */
  readonly value: string
  /** Its length where the answer is a list, and `undefined` where it is not. */
  readonly rows: number | undefined
  /**
   * Where this answer was already shown, when an earlier binding asked the same
   * question. The deduplication is the point of the section above, and printing
   * one answer twice would hide it.
   */
  readonly sharedWith: string | undefined
}

/**
 * The answers, read back the way a primitive reads them.
 *
 * `lookup` is what the renderer calls for each node, so this is the same call
 * through the same resolution — not a summary of one. The `rows` column is the
 * page's evidence for the sentence a reader is most likely to disbelieve: the
 * opening hours are `ready` with nothing in them, which is a shop that has not
 * filled them in rather than a database that could not be reached.
 */
export const produceAnswers = async (): Promise<readonly BindingAnswer[]> => {
  const { tree, labels } = boundPage()
  const plan = planTreeData(tree)
  const resolution = await resolveTreeData(tree, { registry: shopRegistry() })

  const shownAt = new Map<string, string>()

  return plan.bindings.map((binding) => {
    const outcome = resolution.lookup(binding.nodeId)[binding.name]

    if (outcome === undefined) {
      throw new Error(`loom: ${binding.name} was planned and never resolved`)
    }

    const source = plan.requests.find((request) => request.key === binding.key)?.source

    if (source === undefined) throw new Error(`loom: ${binding.name} has no request in the plan`)

    const where = labelFor(labels, binding.nodeId)
    const sharedWith = shownAt.get(binding.key)

    if (sharedWith === undefined) shownAt.set(binding.key, where)

    return {
      where,
      sharedWith,
      reads: `loom.data.${binding.name}`,
      source,
      status: outcome.status,
      value:
        outcome.status === "ready"
          ? asReadableJson(outcome.value)
          : describeDataUnavailable(outcome.unavailable),
      rows:
        outcome.status === "ready" && Array.isArray(outcome.value) ? outcome.value.length : undefined,
    }
  })
}

/** One way an answer does not arrive, produced by making it not arrive. */
export type MissingAnswer = {
  readonly reason: DataUnavailable["reason"]
  /** What happened, in the words somebody would use about their own deployment. */
  readonly when: string
  /** What the runtime says about it, which is what a diagnostic prints. */
  readonly sentence: string
  /** Whether the deployment's own code ever ran. */
  readonly reached: "the adapter was never called" | "the adapter answered"
}

/**
 * What a person did, for each reason the seam has. Written beside the produced
 * rows rather than inside them, because the reason code is the runtime's and
 * this sentence is the page's.
 */
const WHAT_HAPPENED: Readonly<Record<DataUnavailable["reason"], MissingAnswer["when"]>> = {
  "no-such-source": "The plan named a source this deployment never registered.",
  "not-resolved": "The render was handed answers resolved for a different tree than the one it drew.",
  "invalid-params": "The plan asked for forty services, and the source accepts at most twelve.",
  "invalid-answer": "A column was renamed, so the source answered with something its own schema refuses.",
  "adapter-threw": "The integration threw instead of answering.",
  unavailable: "The query timed out.",
  refused: "Nobody is signed in, and these are somebody's own orders.",
}

/** Whether the host's own code got as far as running. */
const REACHED: Readonly<Record<DataUnavailable["reason"], MissingAnswer["reached"]>> = {
  "no-such-source": "the adapter was never called",
  "not-resolved": "the adapter was never called",
  "invalid-params": "the adapter was never called",
  "invalid-answer": "the adapter answered",
  "adapter-threw": "the adapter answered",
  unavailable: "the adapter answered",
  refused: "the adapter answered",
}

/**
 * Six bindings, six reasons, one resolve.
 *
 * The page's claim is that a binding never merely goes missing — every failure
 * arrives with a name, and the names are different because a primitive shows
 * different things for them. The way to check that claim is to cause all six and
 * print what came back, which is this.
 */
export const produceMissingAnswers = async (): Promise<readonly MissingAnswer[]> => {
  const tree = pageOfThingsThatGoWrong()
  const plan = planTreeData(tree)
  const resolution = await resolveTreeData(tree, { registry: troubleRegistry() })

  return plan.bindings.map((binding) => {
    const outcome = resolution.lookup(binding.nodeId)[binding.name]

    if (outcome === undefined || outcome.status === "ready") {
      throw new Error(`loom: ${binding.name} was supposed to fail and did not`)
    }

    const { reason } = outcome.unavailable

    return {
      reason,
      when: WHAT_HAPPENED[reason],
      sentence: describeDataUnavailable(outcome.unavailable),
      reached: REACHED[reason],
    }
  })
}

/**
 * The other kind of failure: a `loom:data` that is not a binding map at all.
 *
 * It is reported against the node rather than thrown, and it is not an outcome —
 * there is no binding to have one. A tree comes back from a database like
 * anything else that crossed a boundary, so the seam needs an answer for a
 * declaration it cannot read, and a page that renders with a diagnostic is a
 * better answer than a page nobody can see.
 */
export const produceMisdeclared = (): string => {
  const tree: LoomTree = pageWithAMisdeclaredBinding()
  const plan = planTreeData(tree)
  const [problem] = plan.problems

  if (problem === undefined) throw new Error("loom: the misdeclared binding was read without complaint")

  return describeBindingError(problem.error)
}
