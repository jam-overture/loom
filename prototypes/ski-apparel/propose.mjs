import {
  composeChange,
  confirmChange,
  defaultGatePolicy,
  fixedPolicy,
  ok,
  sequentialIdFactory,
} from "@loom/runtime"
import { buildIntent, buildProposal, collectingEventSink, fixedClock } from "@loom/runtime/testing"

import { derive } from "./signals.mjs"

/**
 * The page's own reading of itself, put through the ordinary pipeline.
 *
 * Nothing here is a special path. A derivation becomes an `EditIntent` with
 * `origin: "system-signal"`, an interpreter turns it into operations, and the
 * Gate decides — the same three steps a person typing a sentence goes through.
 *
 * **The origin is the whole point.** The default policy lets a developer apply a
 * `high` stakes change unattended and a person's instruction a `medium` one, and
 * caps anything derived from behaviour at `low`. So a change nobody asked for
 * has to be small to land on its own. Opening a question is small. Reordering
 * the page is not, and that one comes back for a human.
 */

const ORIGIN = "system-signal"

const ids = sequentialIdFactory("sig")

const runtimeWith = (interpreter, events) => ({
  interpreter,
  policySource: fixedPolicy(defaultGatePolicy),
  events,
  clock: fixedClock(),
  idFactory: ids,
})

/**
 * The page's section order, read off the tree rather than remembered.
 *
 * Everything that reasons about position asks the tree, because the tree is the
 * thing that moves. A remembered order survives exactly one accepted proposal.
 */
export const orderOf = (tree) =>
  tree.root.children
    .map((child) => child.props?.anchor)
    .filter((anchor) => typeof anchor === "string")

/** Every node in the tree, depth first, so an operation can find what it names. */
const walk = function* (node) {
  yield node
  if (node.kind !== "text") for (const child of node.children) yield* walk(child)
}

/**
 * Move a section to the Nth *anchored* position.
 *
 * These are two different coordinate systems and conflating them is a quiet
 * disaster. A derivation counts sections a reader can see — "section 4 of 5".
 * A `move` operation counts the parent's children, and this page's root has
 * eight of them: the nav bar, the hero and the footer carry no anchor and are
 * invisible to the derivation but very much present in the index.
 *
 * So the position is translated here, against the tree, at the moment the
 * operation is built — never carried along as a number that was right once.
 */
const moveToPosition = (tree, section, position) => {
  const children = tree.root.children
  const from = children.findIndex((child) => child.props?.anchor === section)

  if (from === -1) return undefined

  /** `index` on a move is the final position, so measure the list without it. */
  const remaining = children.filter((_child, at) => at !== from)
  const anchored = remaining
    .map((child, at) => ({ at, anchor: child.props?.anchor }))
    .filter((entry) => typeof entry.anchor === "string")

  const landBefore = anchored[position]
  const index = landBefore === undefined ? remaining.length : landBefore.at

  return [{ op: "move", nodeId: children[from].id, parentId: tree.root.id, index }]
}

const operationsFor = (derivation, tree) => {
  if (derivation.kind === "move-section") {
    return moveToPosition(tree, derivation.section, derivation.toPosition)
  }

  const faq = [...walk(tree.root)].find(
    (node) => node.kind === "element" && node.type === "loom.faq" && node.props.question === derivation.question
  )

  return faq === undefined ? undefined : [{ op: "configure", nodeId: faq.id, set: { open: true }, unset: [] }]
}

const interpreterFor = (derivation) => ({
  interpret: async (intent, tree) => {
    const operations = operationsFor(derivation, tree)

    if (operations === undefined) {
      return { ok: false, error: { code: "no-change-needed", detail: "that is not on the page any more" } }
    }

    return ok(
      buildProposal(ids, {
        intentId: intent.intentId,
        delta: { deltaId: ids.deltaId(), treeId: tree.treeId, baseRevision: tree.revision, operations },
        rationale: derivation.utterance,
        origin: ORIGIN,
        authoredBy: "runtime",
        confidence: 0.72,
      })
    )
  },
})

/** The shape the sidebar reads. Kept flat on purpose — it crosses a wire. */
const summaryOf = (derivation, outcome, events) => ({
  status: "proposed",
  derivation,
  kind: outcome.kind,
  rule: outcome.disposition?.reason?.code,
  detail: outcome.disposition?.reason?.detail,
  stakes: outcome.assessment?.stakes?.level,
  factors: outcome.assessment?.stakes?.factors?.map((factor) => factor.detail) ?? [],
  reversible: outcome.assessment?.reversibility?.reversible,
  /**
   * Read off the assessment, not the outcome. A held change has no `inverse` yet
   * because nothing was applied — but it has already been *measured* as
   * reversible, and the undo it would get is the interesting half of that.
   */
  inverse: outcome.assessment?.reversibility?.inverse?.operations?.map((operation) => operation.op) ?? [],
  events: events.types(),
})

/**
 * Look at the readings and, if they say something, run it.
 *
 * Returns the summary the sidebar renders plus — when the Gate held it — the
 * proposal and intent the server keeps so a human can say yes. Those two are not
 * sent to the browser: a confirmation names a proposal the server already has,
 * so a page cannot invent one (0021).
 */
export const proposeFrom = async (readings, tree, { skip = [] } = {}) => {
  const derivation = derive(readings, orderOf(tree), { skip })

  if (derivation === undefined) return { summary: { status: "watching" } }

  const events = collectingEventSink()
  const runtime = runtimeWith(interpreterFor(derivation), events)
  const intent = buildIntent(ids, {
    treeId: tree.treeId,
    baseRevision: tree.revision,
    utterance: derivation.utterance,
    origin: ORIGIN,
  })

  const outcome = await composeChange(runtime, tree, intent)
  const summary = summaryOf(derivation, outcome, events)

  if (outcome.kind === "applied") return { summary, tree: outcome.tree }
  if (outcome.kind === "awaiting-confirmation") {
    return { summary, held: { proposal: outcome.assessment.proposal, intent, derivation } }
  }

  return { summary }
}

/**
 * A person said yes.
 *
 * `confirmChange` re-assesses against the tree as it stands rather than trusting
 * the verdict captured when the proposal was made — so a yes cannot smuggle in a
 * decision about a page that has since moved, and a change the Gate would now
 * refuse outright stays refused with a human saying yes.
 */
export const confirmHeld = (held, tree) => {
  const events = collectingEventSink()
  const runtime = runtimeWith(interpreterFor(held.derivation), events)
  const outcome = confirmChange(runtime, tree, held.proposal, held.intent)

  return {
    applied: outcome.kind === "applied",
    kind: outcome.kind,
    rule: outcome.disposition?.reason?.code,
    detail: outcome.disposition?.reason?.detail,
    events: events.types(),
    tree: outcome.kind === "applied" ? outcome.tree : undefined,
  }
}
