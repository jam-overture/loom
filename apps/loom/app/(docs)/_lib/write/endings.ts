import {
  buildElement,
  buildText,
  err,
  fixedPolicy,
  noopEventSink,
  nodeIdSchema,
  ok,
  sequentialIdFactory,
  type ChangeInterpreter,
  type Clock,
  type EditIntent,
  type IdFactory,
  type InterpretationError,
  type LoomTree,
  type ProposalId,
  type ProposedChange,
  type Result,
  type TreeOperation,
} from "@jam-overture/loom"
import { memoryTreeStore } from "@jam-overture/loom/store"
import {
  commitIntent,
  confirmHeld,
  describeWriteOutcome,
  memoryHoldStore,
  type WriteOutcome,
  type WritePath,
} from "@jam-overture/loom/write"

import { docsExamples } from "../examples/catalogue"
import { docsGatePolicy } from "../propose/policy"

/**
 * Every way a write can end, produced by ending one.
 *
 * The page this feeds tells a host what its own code has to handle, and the
 * tempting way to write that page is a table of seven strings. It would be
 * right today and would quietly stop being right — the runtime is free to grow
 * an eighth ending, and a hand-typed list is exactly the kind of copy §4c says
 * not to keep.
 *
 * So each row here is a **real trip through `commitIntent`**: an in-memory
 * store, the site's own Gate policy, a scripted interpreter standing in for the
 * model, and whatever `WriteOutcome` came back. The sentence beside each one is
 * `describeWriteOutcome`'s, not a paraphrase.
 *
 * Two things make it hold. The recipes are a `Record` keyed by
 * `WriteOutcome["kind"]`, so an ending the runtime adds is a **type error in
 * this file** rather than a row nobody notices is missing. And every recipe
 * asserts that the outcome it produced is the one it claims, so a recipe that
 * stops reaching its ending — because a policy moved, or a check landed earlier
 * in the path — fails the build instead of printing a confident lie.
 *
 * The prose beside each ending is the site's, and it is the half a runtime
 * cannot supply: what an ordinary deployment does about it.
 */

/**
 * Fixed, so the page is byte-identical on every build.
 *
 * Nothing a reader sees here is a timestamp, but `appliedAt` and `heldAt` are
 * written into the store, and a wall clock would make two builds of the same
 * commit differ for no reason anybody could see.
 */
const ENDINGS_CLOCK: Clock = { now: () => "2026-08-27T09:00:00.000Z" }

/** What this site calls the person clicking, everywhere a name is required. */
const ASKER = "the reader"

const DOCS_ENDING_INTERPRETER = "loom/docs-ending"

/**
 * The tree the endings happen to: the first example on the site.
 *
 * Reused rather than built again here, because a reader meeting these seven
 * rows has already clicked chips on this exact page — a heading and a sentence
 * — three pages earlier. It also means the `held` and `refused` rows below are
 * produced by the same two asks the reader has already watched, against the
 * same policy, rather than by a scenario written to make a point.
 */
const seedTree = (): LoomTree => {
  const example = docsExamples.get("first-tree")

  if (example === undefined) {
    throw new Error("loom: the write endings need the first-tree example, and it is not registered")
  }

  return example.build()
}

const headingIn = (tree: LoomTree) => {
  const heading = tree.root.children.find(
    (child) => child.kind === "element" && child.type === "loom.heading"
  )

  if (heading === undefined) {
    throw new Error("loom: the write endings need a heading to protect, and the seed tree has none")
  }

  return heading
}

/** What an interpreter does, minus the guessing: tree in, proposal or refusal out. */
type Interpret = (
  tree: LoomTree,
  intent: EditIntent,
  ids: IdFactory
) => Result<ProposedChange, InterpretationError>

/**
 * An interpreter that plans, with the provenance a computed delta is entitled
 * to: `authoredBy: "runtime"` and a confidence of 1, because nothing here
 * guessed and a confidence nobody graded must not walk into calibration as a
 * model's perfect record (0031).
 */
const plans =
  (rationale: string, operations: (tree: LoomTree, ids: IdFactory) => readonly TreeOperation[]) =>
  (clock: Clock): Interpret =>
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
        interpreter: DOCS_ENDING_INTERPRETER,
        authoredBy: "runtime" as const,
        confidence: 1,
        interpretedAt: clock.now(),
      },
    })

/** An interpreter that could not answer. The one ending that is not about a delta. */
const fails =
  (error: InterpretationError) =>
  (): Interpret =>
  () =>
    err(error)

type Bench = {
  readonly tree: LoomTree
  /** One ask through the one write path, exactly as a route handler sends it. */
  readonly ask: (request: {
    readonly utterance: string
    readonly interpret: (clock: Clock) => Interpret
    /** The revision the asker was looking at. Defaults to the one head is at. */
    readonly baseRevision?: number
  }) => Promise<WriteOutcome>
  /** Answering a held proposal with yes, which is the second half of the path. */
  readonly answer: (proposalId: ProposalId) => Promise<WriteOutcome>
}

/**
 * A store with the seed tree in it, and the two calls a host makes against it.
 *
 * The interpreter is built per ask rather than per bench, because that is where
 * it belongs: a `WritePath` is a store, a hold store and a runtime, and the
 * runtime is assembled around whatever is answering this particular request.
 * The site's own propose box does the same thing for the same reason.
 */
const openBench = async (namespace: string): Promise<Bench> => {
  const tree = seedTree()
  const store = memoryTreeStore()
  const created = await store.create(tree)

  if (!created.ok) {
    throw new Error(`loom: the write endings could not open a store — ${created.error.code}`)
  }

  const holds = memoryHoldStore()
  let step = 0

  const pathWith = (interpret: Interpret): WritePath => {
    step += 1

    const ids = sequentialIdFactory(`${namespace}${step}`)

    return {
      store,
      holds,
      runtime: {
        interpreter: {
          interpret: (intent, against) => Promise.resolve(interpret(against, intent, ids)),
        } satisfies ChangeInterpreter,
        policySource: fixedPolicy(docsGatePolicy),
        events: noopEventSink,
        clock: ENDINGS_CLOCK,
        idFactory: ids,
      },
    }
  }

  /**
   * Answering re-judges rather than re-plans, so the seam is filled with
   * something that refuses. It is unreachable, and writing it down is cheaper
   * than reaching for the nearest interpreter and implying a confirmation plans
   * a second change.
   */
  const nothingToInterpret: Interpret = () =>
    err({ code: "refused", detail: "answering a held proposal does not plan a new change" })

  return {
    tree,

    ask: (request) => {
      const path = pathWith(request.interpret(ENDINGS_CLOCK))
      const ids = sequentialIdFactory(`${namespace}i${step}`)
      const intent: EditIntent = {
        intentId: ids.intentId(),
        treeId: tree.treeId,
        baseRevision: request.baseRevision ?? tree.revision,
        origin: "user-instruction",
        actor: ASKER,
        utterance: request.utterance,
        observedAt: ENDINGS_CLOCK.now(),
      }

      return commitIntent(path, intent)
    },

    answer: (proposalId) =>
      confirmHeld(pathWith(nothingToInterpret), { proposalId, actor: ASKER }),
  }
}

/**
 * A node id that parses and names nothing.
 *
 * The `not-applicable` ending needs a delta that is well-formed and does not
 * fit, which is what a model inventing an id produces — the shape is right and
 * the page has no such node. A malformed id would be caught by the schema
 * instead and would demonstrate a different failure entirely.
 */
const ABSENT_NODE = nodeIdSchema.parse("n_gone")

const addASentence = plans(
  "One insert. A new loom.prose node at the end of the page's children.",
  (tree, ids) => [
    {
      op: "insert",
      parentId: tree.root.id,
      index: tree.root.children.length,
      node: buildElement(ids, {
        type: "loom.prose",
        props: { tone: "muted", size: "small" },
        children: [buildText(ids, "Added while the page was being built.")],
      }),
    },
  ]
)

const demoteTheHeading = plans(
  "One configure. The heading's level prop goes from 1 to 2, and nothing else moves.",
  (tree) => [{ op: "configure", nodeId: headingIn(tree).id, set: { level: 2 }, unset: [] }]
)

const removeTheHeading = plans("One remove, against the page's only heading.", (tree) => [
  { op: "remove", nodeId: headingIn(tree).id },
])

const removeSomethingAbsent = plans(
  "One remove, against a node the planner believed was on the page.",
  () => [{ op: "remove", nodeId: ABSENT_NODE }]
)

const unreachableModel = fails({
  code: "interpreter-unavailable",
  detail: "the model did not answer in time",
})

export type WriteEndingKind = WriteOutcome["kind"]

type Recipe = {
  /** The ending in a reader's words, not the runtime's. */
  readonly title: string
  /** The ordinary situation that produces it. */
  readonly story: string
  /** What a deployment's own code has to do about it. This is the site's half. */
  readonly yourMove: string
  readonly produce: () => Promise<WriteOutcome>
}

/**
 * Keyed by kind, which is the whole point.
 *
 * `Record<WriteEndingKind, Recipe>` means an eighth ending in the runtime stops
 * this file compiling. A page that listed seven headings would just be seven
 * headings.
 */
const RECIPES: Record<WriteEndingKind, Recipe> = {
  committed: {
    title: "It happened",
    story: "The Gate allowed the change, the page took it, and the log has a new row.",
    yourMove:
      "Show the page the store handed back — not the one you had — and remember the revision it is now at. That number is what the next ask will be written against.",
    produce: async () => {
      const bench = await openBench("endcommit")

      return bench.ask({ utterance: "Add a closing line to this page.", interpret: addASentence })
    },
  },

  held: {
    title: "Somebody has to say yes",
    story:
      "The change touches something this deployment called consequential, so the Gate put it in custody instead of applying it.",
    yourMove:
      "Nothing has changed yet, and the answer arrives later — from a different person, in a different request. Put the proposal in front of a reviewer with the Gate's reason, and keep its id: that id is the whole of what a confirmation sends.",
    produce: async () => {
      const bench = await openBench("endheld")

      return bench.ask({
        utterance: "Make the main heading on this page a smaller one.",
        interpret: demoteTheHeading,
      })
    },
  },

  refused: {
    title: "No, and confirming will not help",
    story:
      "The Gate judged the change too costly to offer at all. Destroying something protected is the plainest case.",
    yourMove:
      "Tell the asker what the Gate said, in the Gate's own words. There is nothing to undo — a refusal never touched the page — and there is no button that turns this into a yes.",
    produce: async () => {
      const bench = await openBench("endrefuse")

      return bench.ask({
        utterance: "Delete the heading from this page.",
        interpret: removeTheHeading,
      })
    },
  },

  "not-interpreted": {
    title: "Nothing was planned",
    story:
      "The step that guesses could not answer: the model timed out, the credential is missing, or it declined.",
    yourMove:
      "This is the one ending that is not about the change, so do not report it as a refusal. The error says which of the five actors has to do something — wait, fix a credential, or file a bug — and the page is untouched either way.",
    produce: async () => {
      const bench = await openBench("endnointerp")

      return bench.ask({ utterance: "Make this page friendlier.", interpret: unreachableModel })
    },
  },

  "not-applicable": {
    title: "The plan did not fit the page",
    story:
      "A delta arrived naming a node that is not there. A model that invents an id produces exactly this.",
    yourMove:
      "The asker did nothing wrong and the Gate never got a look in — the change failed before it was judged. Count these: a rising number is a planner going wrong, not readers asking for the impossible.",
    produce: async () => {
      const bench = await openBench("endnoapply")

      return bench.ask({
        utterance: "Take the introduction off this page.",
        interpret: removeSomethingAbsent,
      })
    },
  },

  "not-written": {
    title: "The page moved while they were looking at it",
    story:
      "The ask named revision 0, and by the time it arrived somebody else's change had made the page revision 1.",
    yourMove:
      "Show them the page as it stands and let them ask again. This one is refused before the model is called, so a stale ask costs nothing — which is why every ask has to carry the revision it was written against.",
    produce: async () => {
      const bench = await openBench("endstale")

      const first = await bench.ask({
        utterance: "Add a closing line to this page.",
        interpret: addASentence,
      })

      if (first.kind !== "committed") {
        throw new Error(`loom: the stale ending needed a commit first and got ${first.kind}`)
      }

      return bench.ask({
        utterance: "Add a closing line to this page.",
        interpret: addASentence,
        baseRevision: 0,
      })
    },
  },

  "not-answerable": {
    title: "That answer arrived twice",
    story:
      "Two tabs, one held change, both pressing yes. The first answer applied it; the second found nothing in custody.",
    yourMove:
      "Treat it as already answered rather than as an error to retry. Custody is taken, not read, so the change cannot apply twice however many times the button is pressed — that is a property of the hold store and not a rule your handler has to enforce.",
    produce: async () => {
      const bench = await openBench("endanswer")

      const held = await bench.ask({
        utterance: "Make the main heading on this page a smaller one.",
        interpret: demoteTheHeading,
      })

      if (held.kind !== "held") {
        throw new Error(`loom: the double-answer ending needed a hold and got ${held.kind}`)
      }

      const first = await bench.answer(held.held.proposalId)

      if (first.kind !== "committed") {
        throw new Error(`loom: the first answer should have applied, and it ${first.kind}`)
      }

      return bench.answer(held.held.proposalId)
    },
  },
}

/**
 * Reading order, which is not the type's order and could not be.
 *
 * The three a reader meets on a working deployment come first, then the four
 * that are somebody's problem. `endings.test.ts` holds this list against the
 * recipes so a new ending cannot be added to one and forgotten in the other.
 */
export const WRITE_ENDING_ORDER: readonly WriteEndingKind[] = [
  "committed",
  "held",
  "refused",
  "not-interpreted",
  "not-applicable",
  "not-written",
  "not-answerable",
]

export type WriteEnding = {
  readonly kind: WriteEndingKind
  readonly title: string
  readonly story: string
  readonly yourMove: string
  /** `describeWriteOutcome`, on the outcome this run actually produced. */
  readonly line: string
}

/**
 * Runs all seven, in reading order.
 *
 * The assertion is the load-bearing line: a recipe that no longer reaches its
 * ending throws here, which stops `next build`. The alternative — printing
 * whatever came back under the heading it was filed under — is how a page ends
 * up describing a refusal as a commit.
 */
export const produceWriteEndings = async (): Promise<readonly WriteEnding[]> =>
  Promise.all(
    WRITE_ENDING_ORDER.map(async (kind) => {
      const recipe = RECIPES[kind]
      const outcome = await recipe.produce()

      if (outcome.kind !== kind) {
        throw new Error(
          `loom: the ${kind} ending produced a ${outcome.kind} — ${describeWriteOutcome(outcome)}`
        )
      }

      return {
        kind,
        title: recipe.title,
        story: recipe.story,
        yourMove: recipe.yourMove,
        line: describeWriteOutcome(outcome),
      }
    })
  )
