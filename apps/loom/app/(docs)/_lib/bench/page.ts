import {
  err,
  fixedPolicy,
  noopEventSink,
  ok,
  sequentialIdFactory,
  walkTree,
  type ChangeInterpreter,
  type Clock,
  type EditIntent,
  type GatePolicy,
  type IdFactory,
  type InterpretationError,
  type LoomNode,
  type LoomTree,
  type ProposalId,
  type ProposedChange,
  type Result,
  type TreeOperation,
} from "@loom/runtime"
import { memoryTreeStore, type TreeStore } from "@loom/runtime/store"
import {
  commitIntent,
  confirmHeld,
  describeHoldError,
  discardHeld,
  memoryHoldStore,
  type HeldProposal,
  type HoldError,
  type HoldStore,
  type WriteOutcome,
  type WritePath,
} from "@loom/runtime/write"

import { docsExamples } from "../examples/catalogue"
import { docsGatePolicy } from "../propose/policy"

/**
 * A page in a store, and the calls a host makes against it.
 *
 * Several pages on this site are written about a deployment that has already
 * been used: *When something looks wrong* asks who put a node on a page, and
 * *Answering a held change* asks what is waiting for a person. Neither can be
 * written from a tree that nothing ever happened to, and neither should be
 * written from a table of outcomes typed beside the functions that produce
 * them — that table is right on the day it is written and free to drift
 * afterwards, and the reader who finds out is the one running the command in an
 * incident.
 *
 * So both open a real store, send real asks through `commitIntent`, and print
 * what came back. This module is the part of that they have in common: the
 * store, the holds, the interpreter that plans instead of guessing, and the two
 * calls that answer a hold. What each page is *about* stays in its own file,
 * because a bench that also knew which changes were interesting would be a
 * bench with one real user wearing two names.
 *
 * It was extracted when the second page needed it, rather than built when the
 * first one did. That is the lesson this lane wrote down on 5 September about
 * the fence readers and then got to apply: an abstraction with one consumer is
 * a guess about what the second one will want.
 */

/**
 * Fixed, so a page is byte-identical on every build.
 *
 * Nothing a reader sees on either page is a timestamp, and `appliedAt` still
 * reaches the store, where a wall clock would make two builds of one commit
 * differ for no visible reason.
 */
export const BENCH_CLOCK: Clock = { now: () => "2026-09-07T09:00:00.000Z" }

/**
 * The name these pages' planned changes are interpreted under.
 *
 * It is not a model and does not claim to be one. A proposal's `interpreter` is
 * how a host tells its own planners apart afterwards, and a documentation build
 * is a planner like any other.
 */
export const DOCS_BENCH_INTERPRETER = "loom/docs-bench"

/** Two names, so "who asked for this" has an answer worth printing. */
export const DANA = "dana"
export const RAVI = "ravi"

/** The page every bench opens: the tree the site's first example builds. */
export const seedTree = (): LoomTree => {
  const example = docsExamples.get("first-tree")

  if (example === undefined) {
    throw new Error("loom: the bench needs the first-tree example, and it is not registered")
  }

  return example.build()
}

/** The first element of a type on a page, for a change that has to name a node. */
export const nodeOfType = (tree: LoomTree, type: string): LoomNode => {
  const found = Array.from(walkTree(tree.root)).find(
    (node) => node.kind === "element" && node.type === type
  )

  if (found === undefined) {
    throw new Error(`loom: the bench expected a ${type} on the page, and there is none`)
  }

  return found
}

/** What an interpreter does, minus the guessing: tree in, proposal or refusal out. */
export type Interpret = (
  tree: LoomTree,
  intent: EditIntent,
  ids: IdFactory
) => Result<ProposedChange, InterpretationError>

/**
 * How sure the planner says it was, and who it says wrote the plan.
 *
 * The default is the honest one for a computed delta: nothing guessed, so
 * `authoredBy: "runtime"` and a confidence of 1 — a confidence nobody graded
 * must not walk into calibration as a model's perfect record (0031).
 *
 * The override exists for one row of one page. A queue a person answers has
 * changes in it that the Gate held because *the machine was not sure*, and a
 * site that could not show that row would be teaching a reviewer to expect only
 * half of what they will see. Saying it here rather than in the page's own file
 * so that the exception is one parameter with a reason attached, and not a
 * second way of planning a change.
 */
export type Authorship = {
  readonly authoredBy: "model" | "runtime"
  readonly confidence: number
}

const CERTAIN: Authorship = { authoredBy: "runtime", confidence: 1 }

/** An interpreter that plans, with the provenance a computed delta is entitled to. */
export const plans =
  (
    rationale: string,
    operations: (tree: LoomTree, ids: IdFactory) => readonly TreeOperation[],
    authorship: Authorship = CERTAIN
  ): Interpret =>
  (tree, intent, ids) =>
    ok({
      proposalId: ids.proposalId(),
      intentId: intent.intentId,
      delta: {
        deltaId: ids.deltaId(),
        treeId: tree.treeId,
        baseRevision: tree.revision,
        operations: operations(tree, ids),
      },
      rationale,
      provenance: {
        origin: intent.origin,
        ...(intent.actor === undefined ? {} : { actor: intent.actor }),
        interpreter: DOCS_BENCH_INTERPRETER,
        ...authorship,
        interpretedAt: BENCH_CLOCK.now(),
      },
    })

export type Ask = {
  readonly actor: string
  readonly utterance: string
  readonly interpret: Interpret
}

export type Bench = {
  readonly seed: LoomTree
  readonly store: TreeStore
  readonly holds: HoldStore
  /** The page as it stands now. */
  readonly head: () => Promise<LoomTree>
  readonly ask: (request: Ask) => Promise<WriteOutcome>
  /**
   * Says yes to a held change. The policy may be given, because whether the
   * policy that judged a hold is still the policy answering it is a fact one
   * page is entirely about.
   */
  readonly confirm: (
    proposalId: ProposalId,
    actor: string,
    policy?: GatePolicy
  ) => Promise<WriteOutcome>
  /** Says no to one. */
  readonly discard: (
    proposalId: ProposalId,
    actor: string
  ) => Promise<Result<HeldProposal, HoldError>>
  /** Everything waiting for a person, oldest first — the review queue itself. */
  readonly waiting: () => Promise<readonly HeldProposal[]>
}

/**
 * Opens a store with the site's example page in it, ready to be asked for
 * changes.
 *
 * The namespace keeps two benches in one build from minting the same ids, which
 * matters because a page may print them.
 */
export const openBench = async (namespace: string): Promise<Bench> => {
  const seed = seedTree()
  const store = memoryTreeStore()
  const created = await store.create(seed)

  if (!created.ok) {
    throw new Error(`loom: the bench could not open a store — ${created.error.code}`)
  }

  const holds = memoryHoldStore()
  let step = 0

  const pathWith = (interpret: Interpret, policy: GatePolicy = docsGatePolicy): WritePath => {
    step += 1

    const ids = sequentialIdFactory(`${namespace}${step}`)

    return {
      store,
      holds,
      runtime: {
        interpreter: {
          interpret: (intent, against) => Promise.resolve(interpret(against, intent, ids)),
        } satisfies ChangeInterpreter,
        policySource: fixedPolicy(policy),
        events: noopEventSink,
        clock: BENCH_CLOCK,
        idFactory: ids,
      },
    }
  }

  /**
   * Answering a held proposal plans nothing: the plan was made when the change
   * was interpreted and is what is being answered.
   */
  const nothingToInterpret: Interpret = () =>
    err({ code: "refused", detail: "answering a held proposal does not plan a new change" })

  const head = async (): Promise<LoomTree> => {
    const read = await store.head(seed.treeId)

    if (!read.ok) {
      throw new Error(`loom: the bench could not read its own page — ${read.error.code}`)
    }

    return read.value
  }

  return {
    seed,
    store,
    holds,
    head,

    ask: async (request) => {
      const at = await head()
      const path = pathWith(request.interpret)
      const ids = sequentialIdFactory(`${namespace}i${step}`)

      const intent: EditIntent = {
        intentId: ids.intentId(),
        treeId: seed.treeId,
        baseRevision: at.revision,
        origin: "user-instruction",
        actor: request.actor,
        utterance: request.utterance,
        observedAt: BENCH_CLOCK.now(),
      }

      return commitIntent(path, intent)
    },

    confirm: (proposalId, actor, policy) =>
      confirmHeld(pathWith(nothingToInterpret, policy), { proposalId, actor }),

    discard: (proposalId, actor) =>
      discardHeld(pathWith(nothingToInterpret), { proposalId, actor }),

    waiting: async () => {
      const queue = await holds.forTree(seed.treeId)

      if (!queue.ok) {
        throw new Error(`loom: the review queue could not be read — ${describeHoldError(queue.error)}`)
      }

      return queue.value.held
    },
  }
}

/**
 * Asserts an ask reached the ending a page's story needs, and says which one it
 * did reach when it did not.
 *
 * Every producer depends on its setup having worked. A history that silently
 * stopped growing would print a shorter table rather than a wrong one, which is
 * the failure most likely to survive review.
 */
export const applied = (outcome: WriteOutcome, what: string): WriteOutcome => {
  if (outcome.kind !== "committed") {
    throw new Error(`loom: the bench needed ${what} to apply, and it ended ${outcome.kind}`)
  }

  return outcome
}

/** The same, for an ask the story needs the Gate to have held. */
export const heldIn = (outcome: WriteOutcome, what: string): HeldProposal => {
  if (outcome.kind !== "held") {
    throw new Error(`loom: the bench needed ${what} to be held, and it ended ${outcome.kind}`)
  }

  return outcome.held
}
