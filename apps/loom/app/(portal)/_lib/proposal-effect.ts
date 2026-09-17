import {
  applyDelta,
  applyOperation,
  configurationOf,
  describeTreeError,
  findNode,
  findParent,
  nodeLabel,
  nodePath,
  walkTree,
  type JsonValue,
  type LoomNode,
  type LoomTree,
  type NodeId,
  type TreeDelta,
  type TreeOperation,
} from "@loom/runtime"
import { copyIn, type CopyDeclarations } from "@loom/runtime/sdk"

import { partNameOf, placeNameOf, type PartName } from "./part-name"

/**
 * What a proposal would replace, read against the tree it names.
 *
 * A delta is self-contained by construction (0001), and that is exactly why it
 * cannot answer the question a reviewer actually has. `configure n_h1: value`
 * says a value is being written; it does not say what is *there now*, so the
 * reviewer answering a hold is being asked to approve a change whose before
 * side they cannot see. `remove n_band` names one id and destroys a subtree.
 * `insert … at 2` names a position in a child list nobody has in front of them.
 *
 * The tree holds the other half of every one of those sentences. Putting the
 * two together is the portal's job and nothing else's: the store has the tree,
 * the hold has the delta, and the answer exists nowhere until they are read
 * side by side. It is not in the repository — the change has not happened — and
 * it is not in the log, because a held proposal is precisely the change that
 * has not been logged.
 *
 * Pure, and takes both halves as arguments: 0019 makes the proposal the primary
 * object, so the mapping from "a delta and a tree" to "what a person would see
 * change" is the part worth testing, and it does not need React or a store to
 * be tested.
 */

/** How much of a value is shown before it is cut. Long enough for a sentence. */
const VALUE_LIMIT = 72

/** How many of a subtree's strings are previewed. Enough to recognise it by. */
const TEXT_PREVIEW_LIMIT = 3

/**
 * A part whose author has never said which of its settings a reader reads.
 *
 * `copyIn` reports one of these per part; this is grouped by type, because that
 * is the level a reader and a maintainer both act at. *Three stats carry
 * `value`, `label` and `caption`* is one fact about one primitive; three
 * separate entries saying the same thing is the same fact printed three times,
 * and the one thing somebody would go and do about it — declare `copy` on
 * `loom.stat` — is done once.
 */
export type UnreadablePart = {
  /** The registered type, exactly as the part carries it. */
  readonly type: string
  /** How many parts of this type the operation touches. */
  readonly parts: number
  /** Every string-valued setting they carry, in the order they were met. */
  readonly settings: readonly string[]
}

/**
 * The words a subtree holds, and what could not be read.
 *
 * `total` is before the preview cut, because a list of three that is really
 * nine is a reading that has quietly dropped six words from the account of a
 * deletion — and the preview limit exists to keep a card short, not to make
 * the count smaller than it is.
 */
type WordReading = {
  readonly preview: readonly string[]
  readonly total: number
  readonly unreadable: readonly UnreadablePart[]
}

const NO_WORDS: WordReading = { preview: [], total: 0, unreadable: [] }

const collapse = (value: string): string => value.replace(/\s+/gu, " ").trim()

const truncate = (value: string): string =>
  value.length > VALUE_LIMIT ? `${value.slice(0, VALUE_LIMIT)}…` : value

/**
 * A JSON value as a reader sees it. Strings are quoted so an empty string and a
 * cleared key are distinguishable, which is a difference the runtime treats as
 * real and a bare rendering would hide.
 */
export const formatValue = (value: JsonValue): string => {
  if (typeof value === "string") return `"${truncate(collapse(value))}"`
  if (value === null) return "null"
  if (typeof value === "number" || typeof value === "boolean") return String(value)

  return truncate(JSON.stringify(value))
}

/**
 * Sameness by serialisation rather than by structure.
 *
 * Two objects with the same entries in a different order compare as different
 * here, which over-reports change. That is the safe direction: a proposal
 * announced as a change that turns out to be inert costs a reader a moment,
 * and one announced as inert that quietly rewrites a prop costs them the thing
 * this whole surface is for.
 */
const sameValue = (left: JsonValue | undefined, right: JsonValue | undefined): boolean =>
  JSON.stringify(left ?? null) === JSON.stringify(right ?? null)

export type ValueChange = {
  readonly key: string
  /** What is there now, or `null` when the key is not set on this node. */
  readonly before: string | null
  /** What it would become, or `null` when the operation clears it. */
  readonly after: string | null
  /** The proposal writes the value that is already there. */
  readonly inert: boolean
}

export type OperationEffect = {
  /**
   * The delta model's own name for what this is. Kept because a plain reading
   * has to be chosen by what the operation *is*, and choosing it by the display
   * verb below would make a rewording of that verb silently change which
   * sentence is composed.
   */
  readonly op: TreeOperation["op"]
  /** The portal's verb, not the delta model's — `delta-summary` owns the mapping. */
  readonly verb: string
  /**
   * The part the operation is about, named — its words, its noun and its id.
   *
   * A bare `string` only where no node could be found under the id the
   * operation names, and then it is that id exactly. `part-name.ts` holds why
   * the fallback is the identifier itself rather than a phrase standing in for
   * it.
   *
   * **An insert's subject is named from the delta rather than from the tree.**
   * The node it places does not exist on the page yet, so the only account of
   * what is arriving is the one the proposal carries — the mirror of a removal,
   * whose only surviving account is its inverse.
   */
  readonly subject: string | PartName
  /**
   * The runtime's own word for the same part — `loom.card`, a slot's name,
   * `text` — or the bare id where there is no node. Kept because the technical
   * reading is composed from it and must go on saying what it always said.
   */
  readonly label: string
  /** Where it sits, root first, in labels rather than in minted ids. */
  readonly place: readonly string[]
  /** The same path, each step named as a place. What the plain row shows. */
  readonly placeNames: readonly string[]
  /** Where and how much, in one sentence. */
  readonly detail: string
  /**
   * Where it lands, and where it comes from, named as places rather than as
   * prose.
   *
   * `detail` above says the same things and says them in one composed string —
   * `into loom.band, before loom.heading` — which is exactly the shape a plain
   * reading cannot be built from without parsing it back apart. These are the
   * pieces, so `effect-view` can word a sentence and the disclosure can keep
   * `detail` verbatim. `null` throughout means the operation has no such part:
   * a remove lands nowhere, a move within one parent comes from and goes to the
   * same place, an insert at the end sits before nothing.
   *
   * Named by `placeNameOf`, which is what it is and not what it says: a
   * container's words are its contents' words, so quoting the page a change
   * lands in names the page's contents rather than the place.
   */
  readonly into: string | null
  readonly before: string | null
  readonly from: string | null
  /** Before and after, per key. Empty for anything but a reconfigure. */
  readonly changes: readonly ValueChange[]
  /**
   * The words this operation brings or takes, for a reader who knows the page
   * by its text. A preview: `textTotal` is how many there are.
   */
  readonly text: readonly string[]
  /** Every word the operation carries, of which `text` shows the first few. */
  readonly textTotal: number
  /**
   * The parts travelling with it whose words nobody has spoken for, grouped by
   * type. Empty when every type involved has declared — which is the ordinary
   * case and the one that keeps the card quiet.
   */
  readonly unreadable: readonly UnreadablePart[]
  /** How many nodes travel with it — an insert brings them, a remove takes them. */
  readonly carries: number | null
  /** This tree has no node under the id the operation names. */
  readonly missing: boolean
  /** Nothing about the tree would differ afterwards. */
  readonly inert: boolean
}

export type ProposalEffect = {
  readonly operations: readonly OperationEffect[]
  /** Whether the delta would still apply to this tree. */
  readonly applies: boolean
  /** Why it would not, in the runtime's own words. `null` when it would. */
  readonly obstacle: string | null
  /** The revision the proposal was judged against. */
  readonly baseRevision: number
  /** The revision it would land on. */
  readonly treeRevision: number
  /** The tree has moved since the proposal was made. */
  readonly stale: boolean
  /** Operations that would leave the tree exactly as it is. */
  readonly inertCount: number
}

const VERBS: Readonly<Record<TreeOperation["op"], string>> = {
  insert: "add",
  remove: "delete",
  move: "move",
  configure: "reconfigure",
}

/**
 * The path to a node, in both vocabularies at once.
 *
 * Read once and mapped twice rather than walked twice: the two readings are the
 * same path and a caller that could take one without the other would eventually
 * show a breadcrumb that disagrees with the record beside it.
 *
 * `through` is what a *parent's* place is — the path down to and including the
 * node — and the default is the path down to but not including it, which is
 * where the node itself sits.
 */
const pathReadings = (
  root: LoomNode,
  nodeId: NodeId,
  through = false
): { readonly labels: readonly string[]; readonly names: readonly string[] } => {
  const path = nodePath(root, nodeId)
  if (path === null) return { labels: [], names: [] }

  const steps = through ? path : path.slice(0, -1)

  return { labels: steps.map(nodeLabel), names: steps.map(placeNameOf) }
}

const countNodes = (node: LoomNode): number => Array.from(walkTree(node)).length

/**
 * The words a subtree puts on, or takes off, a page.
 *
 * This walked text children and kept only those, which is the reading
 * [0052](../../../../../decisions/0052-a-repeated-item-is-a-node-and-a-fixed-field-is-a-prop.md)
 * made wrong: a fixed field stays a prop, so `loom.stat` holds its figure, its
 * label and its caption as settings and has no text children at all. A
 * proposal deleting three headline numbers was described to a reviewer as
 * *"Deletes the stat grid, and the 3 pieces inside it"* with **no words line** —
 * on a band that is nothing but words. `Loom demo` filed it on 1 September
 * against this function by name.
 *
 * `copyIn` is the runtime's answer and this is a consumer of it (0018). The
 * part worth knowing is that it has three outcomes rather than two: the words
 * it read, and — separately — the parts whose author has said nothing, which
 * are neither *no words* nor words it can show. That third answer is why this
 * returns a shape rather than a list. A reading that rounded *I cannot tell
 * you* down to *there are none* would be wrong in exactly the direction nobody
 * checks, which is what the old one did to every primitive in the library.
 */
const wordsIn = (node: LoomNode, copy: CopyDeclarations): WordReading => {
  const read = copyIn(node, copy)

  const byType = new Map<string, { parts: number; settings: string[] }>()
  for (const part of read.unread) {
    const seen = byType.get(part.type) ?? { parts: 0, settings: [] }

    byType.set(part.type, {
      parts: seen.parts + 1,
      settings: [...seen.settings, ...part.props.filter((name) => !seen.settings.includes(name))],
    })
  }

  return {
    preview: read.words.slice(0, TEXT_PREVIEW_LIMIT).map((value) => truncate(collapse(value))),
    total: read.words.length,
    unreadable: [...byType].map(([type, seen]) => ({
      type,
      parts: seen.parts,
      settings: seen.settings,
    })),
  }
}

const childrenOfNode = (node: LoomNode | null): readonly LoomNode[] =>
  node === null || node.kind === "text" ? [] : node.children

const indexOfChild = (parent: LoomNode | null, nodeId: NodeId): number =>
  childrenOfNode(parent).findIndex((child) => child.id === nodeId)

const plural = (count: number, noun: string): string =>
  `${count} ${noun}${count === 1 ? "" : "s"}`

/**
 * An insert's neighbours. "at 2" is a coordinate; "before the pricing band" is
 * a place, and a reviewer can only picture the second one.
 */
const insertDetail = (root: LoomNode, parentId: NodeId, index: number, carries: number): string => {
  const parent = findNode(root, parentId)
  if (parent === null) return `into a node this tree does not have (${parentId})`

  const siblings = childrenOfNode(parent)
  const occupant = siblings[index]
  const where =
    occupant === undefined
      ? `at the end of ${nodeLabel(parent)}`
      : `into ${nodeLabel(parent)}, before ${nodeLabel(occupant)}`

  return carries > 1 ? `${where}, bringing ${plural(carries, "node")}` : where
}

const moveDetail = (root: LoomNode, operation: Extract<TreeOperation, { op: "move" }>): string => {
  const from = findParent(root, operation.nodeId)
  const to = findNode(root, operation.parentId)
  const currentIndex = indexOfChild(from, operation.nodeId)

  if (to === null) return `into a node this tree does not have (${operation.parentId})`
  if (from === null) return `to ${nodeLabel(to)}, position ${operation.index}`

  return from.id === to.id
    ? `within ${nodeLabel(from)}, position ${currentIndex} → ${operation.index}`
    : `out of ${nodeLabel(from)} and into ${nodeLabel(to)}, at position ${operation.index}`
}

/**
 * A move that puts a node back where it already is. `index` is read against the
 * child list the node has already left (0001), so returning it to its own index
 * in its own parent reproduces the tree exactly.
 */
const isInertMove = (root: LoomNode, operation: Extract<TreeOperation, { op: "move" }>): boolean => {
  const parent = findParent(root, operation.nodeId)

  return (
    parent !== null &&
    parent.id === operation.parentId &&
    indexOfChild(parent, operation.nodeId) === operation.index
  )
}

const changesFor = (
  node: LoomNode,
  operation: Extract<TreeOperation, { op: "configure" }>
): readonly ValueChange[] => {
  const current = configurationOf(node)

  const set = Object.entries(operation.set).map(([key, value]) => ({
    key,
    before: current[key] === undefined ? null : formatValue(current[key]),
    after: formatValue(value),
    inert: sameValue(current[key], value),
  }))

  const unset = operation.unset.map((key) => ({
    key,
    before: current[key] === undefined ? null : formatValue(current[key]),
    after: null,
    /** Clearing a key that is not set leaves the node exactly as it was. */
    inert: current[key] === undefined,
  }))

  return [...set, ...unset]
}

const configureDetail = (changes: readonly ValueChange[]): string => {
  if (changes.length === 0) return "no values"

  const changing = changes.filter((change) => !change.inert).length

  return changing === changes.length
    ? plural(changes.length, "value")
    : `${plural(changes.length, "value")}, ${changes.length - changing} already set this way`
}

/** The effect of one operation on the tree as the operations before it left it. */
const effectOf = (
  root: LoomNode,
  operation: TreeOperation,
  copy: CopyDeclarations
): OperationEffect => {
  const verb = VERBS[operation.op]

  switch (operation.op) {
    case "insert": {
      const carries = countNodes(operation.node)
      const words = wordsIn(operation.node, copy)
      const parent = findNode(root, operation.parentId)
      const occupant = childrenOfNode(parent)[operation.index]
      const path = pathReadings(root, operation.parentId, true)

      return {
        op: operation.op,
        verb,
        subject: partNameOf(operation.node),
        label: nodeLabel(operation.node),
        place: path.labels,
        placeNames: path.names,
        detail: insertDetail(root, operation.parentId, operation.index, carries),
        into: parent === null ? null : placeNameOf(parent),
        before: occupant === undefined ? null : placeNameOf(occupant),
        from: null,
        changes: [],
        text: words.preview,
        textTotal: words.total,
        unreadable: words.unreadable,
        carries,
        missing: parent === null,
        inert: false,
      }
    }

    case "remove": {
      const node = findNode(root, operation.nodeId)
      const carries = node === null ? null : countNodes(node)
      const path = pathReadings(root, operation.nodeId)
      const words = node === null ? NO_WORDS : wordsIn(node, copy)

      return {
        op: operation.op,
        verb,
        subject: node === null ? operation.nodeId : partNameOf(node),
        label: node === null ? operation.nodeId : nodeLabel(node),
        place: path.labels,
        placeNames: path.names,
        detail:
          node === null
            ? "this tree has no such node"
            : carries !== null && carries > 1
              ? `and ${plural(carries - 1, "node")} under it`
              : "a single node, with nothing under it",
        into: null,
        before: null,
        from: null,
        changes: [],
        text: words.preview,
        textTotal: words.total,
        unreadable: words.unreadable,
        carries,
        missing: node === null,
        inert: false,
      }
    }

    case "move": {
      const node = findNode(root, operation.nodeId)
      const from = findParent(root, operation.nodeId)
      const to = findNode(root, operation.parentId)
      const path = pathReadings(root, operation.nodeId)

      return {
        op: operation.op,
        verb,
        subject: node === null ? operation.nodeId : partNameOf(node),
        label: node === null ? operation.nodeId : nodeLabel(node),
        place: path.labels,
        placeNames: path.names,
        detail: node === null ? "this tree has no such node" : moveDetail(root, operation),
        into: to === null ? null : placeNameOf(to),
        before: null,
        /** `null` when it is not leaving: a move within one parent has no elsewhere to name. */
        from: from === null || from.id === operation.parentId ? null : placeNameOf(from),
        changes: [],
        /**
         * A move carries its words to a different place and neither adds nor
         * takes one, so there is nothing to report in either direction — and
         * nothing that could go unread either, which is why this is empty
         * rather than unknown.
         */
        text: [],
        textTotal: 0,
        unreadable: [],
        carries: null,
        missing: node === null,
        inert: node !== null && isInertMove(root, operation),
      }
    }

    case "configure": {
      const node = findNode(root, operation.nodeId)
      const changes = node === null ? [] : changesFor(node, operation)
      const path = pathReadings(root, operation.nodeId)

      return {
        op: operation.op,
        verb,
        subject: node === null ? operation.nodeId : partNameOf(node),
        label: node === null ? operation.nodeId : nodeLabel(node),
        place: path.labels,
        placeNames: path.names,
        detail: node === null ? "this tree has no such node" : configureDetail(changes),
        into: null,
        before: null,
        from: null,
        changes,
        /**
         * A reconfigure that writes over a setting a reader reads *is* a change
         * of words, and `changes` is already the sharper account of it: it
         * shows the old value and the new one side by side, which a list of
         * words cannot. Reporting the same fact twice, once without its before
         * side, would be the weaker half shouting over the stronger.
         */
        text: [],
        textTotal: 0,
        unreadable: [],
        carries: null,
        missing: node === null,
        inert: node !== null && changes.length > 0 && changes.every((change) => change.inert),
      }
    }
  }
}

/**
 * What this proposal would do to this tree.
 *
 * Two readings, and they are deliberately produced by different means. The
 * **verdict** — would it still apply — is `applyDelta`'s, because a portal that
 * re-implemented applicability would eventually disagree with the runtime and
 * the reviewer would believe the portal. The **description** walks the
 * operations one at a time, so each is described against the tree the ones
 * before it left, which is how they are applied (0001).
 *
 * The walk keeps going after a failure rather than stopping at it. An operation
 * that cannot be described is the interesting one — it is why the whole delta
 * would be refused — and hiding the four operations after it would leave the
 * reviewer unable to see what was being asked for at all.
 *
 * **`copy` is the deployment's registry**, and it is a third argument rather
 * than a module import for the reason the other two are arguments: which
 * settings a reader reads is the *host's* answer, declared by whoever wrote the
 * component (0018), so a portal that reached for its own registry here would be
 * answering for every deployment from the four primitives it happens to
 * register. Anything with a `copyFor` satisfies it, which is what lets a test
 * state the declarations it is testing against in two lines.
 */
export const describeProposalEffect = (
  tree: LoomTree,
  delta: TreeDelta,
  copy: CopyDeclarations
): ProposalEffect => {
  const applied = applyDelta(tree, delta)

  const operations: OperationEffect[] = []
  let state: LoomNode = tree.root

  for (const operation of delta.operations) {
    operations.push(effectOf(state, operation, copy))

    const advanced = applyOperation(state, operation)
    if (advanced.ok) state = advanced.value
  }

  return {
    operations,
    applies: applied.ok,
    obstacle: applied.ok ? null : describeTreeError(applied.error),
    baseRevision: delta.baseRevision,
    treeRevision: tree.revision,
    stale: delta.baseRevision !== tree.revision,
    inertCount: operations.filter((operation) => operation.inert).length,
  }
}
