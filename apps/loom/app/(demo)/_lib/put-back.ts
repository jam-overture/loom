import {
  applyOperation,
  findNode,
  type JsonObject,
  type JsonValue,
  type LoomNode,
  type LoomTree,
  type NodeId,
  type TreeDelta,
  type TreeOperation,
} from "@loom/runtime"

/**
 * Whether a change put a setting back where the change before it moved it from.
 *
 * **The defect this exists for is on the demo's own front door.** *Re-theme the
 * whole page* and *Repaint the top band* are both toggles — `palette` swaps the
 * theme ids and back, `backdrop` swaps `aurora` for `panel` and back — so a
 * visitor who presses either one twice watches the page change and change back,
 * and gets two cards identical to the word:
 *
 * > **Applied** · *“Switch this page to the other palette.”*
 * > How the whole page looks changed. Not a word on it changed.
 *
 * > **Applied** · *“Switch this page to the other palette.”*
 * > How the whole page looks changed. Not a word on it changed.
 *
 * Both sentences are true and the second one is useless. The record is this
 * surface's entire argument — the change and the account of it, side by side —
 * and at the second press the account cannot answer the one question a stranger
 * has, which is **did that do anything**. Filed by this lane on 14 September,
 * where it was named as the honest limit of the unit that gave a landed card a
 * sentence at all.
 *
 * **Nothing here writes a new sentence, and that is the point.** The demo
 * already has a vocabulary for a change that puts something back — *“The whole
 * page went back to how it looked”* on the card, *“Changed back”* on the mark —
 * and it was reachable only by pressing **Put it back**, because `restoring` was
 * read off the record's provenance (`isUndo`). Provenance answers *which control
 * raised this*. What the second press needs answered is *what this did to the
 * page*. They are different questions with the same answer here, so this module
 * computes the second one and the words it unlocks are the words already
 * written.
 *
 * **Settings only, and deliberately so.** The finding named `configure`, and a
 * configure is the one operation whose reversal a visitor can reach without
 * asking for an undo: the other three change what the page says or where it says
 * it, and this surface offers no press that puts one of those back except the
 * undo — which already carries its own provenance and needs nothing from here.
 * Widening this to inserts and removes would be a second, weaker way of knowing
 * something the record already knows exactly.
 */

/**
 * One prop, on one node, moved from one value to another.
 *
 * `from` and `to` are **absent** rather than `null` when the prop was not there
 * and when the operation cleared it. `null` is a value a prop may honestly hold
 * — it is in `JsonValue` — so a reading that spent it on "no value" could not
 * tell a cleared prop from one set to null, and would report the two as each
 * other's reverse.
 */
export type SettingMove = {
  readonly nodeId: NodeId
  readonly key: string
  readonly from?: JsonValue
  readonly to?: JsonValue
}

/**
 * Compared by serialisation, which is the runtime's own rule for a props bag and
 * is borrowed here rather than reinvented: `src/tree/compare.ts` says every prop
 * is JSON by construction, and that `JSON.stringify` being order-sensitive on
 * object keys is *correct* for this comparison, because a delta rewrites a props
 * bag wholesale (0009) and two bags differing only in key order came from two
 * different writes.
 *
 * What that means here is the strict reading, and it is the one this surface
 * wants: a change counts as putting a setting back only when it restores the
 * value exactly. A near miss says nothing, which is better than a card claiming
 * the page came back when it did not.
 *
 * Absence is compared before value, so a prop that was not there and a prop set
 * to `null` are never the same thing.
 */
const sameValue = (left: JsonValue | undefined, right: JsonValue | undefined): boolean =>
  left === undefined || right === undefined
    ? left === right
    : JSON.stringify(left) === JSON.stringify(right)

const propsOf = (root: LoomNode, nodeId: NodeId): JsonObject => {
  const node = findNode(root, nodeId)

  return node !== null && node.kind === "element" ? node.props : {}
}

const withValue = (key: string, props: JsonObject): Pick<SettingMove, "from"> => {
  const value = props[key]

  return value === undefined ? {} : { from: value }
}

/**
 * What one operation moves, against the tree the operations before it left.
 *
 * Only a configure moves a setting. A configure that sets a prop to the value it
 * already holds moves nothing and is dropped here, so it can never be the thing
 * a later change is said to have reversed.
 */
const movedBy = (root: LoomNode, operation: TreeOperation): readonly SettingMove[] => {
  if (operation.op !== "configure") return []

  const props = propsOf(root, operation.nodeId)

  const set: readonly SettingMove[] = Object.entries(operation.set).map((entry) => ({
    nodeId: operation.nodeId,
    key: entry[0],
    ...withValue(entry[0], props),
    to: entry[1],
  }))

  const cleared: readonly SettingMove[] = operation.unset.map((key) => ({
    nodeId: operation.nodeId,
    key,
    ...withValue(key, props),
  }))

  return [...set, ...cleared].filter((move) => !sameValue(move.from, move.to))
}

type Walk = { readonly root: LoomNode | undefined; readonly moves: readonly SettingMove[] }

/**
 * Every setting a delta moves, against the tree it was planned against.
 *
 * **Operation by operation, against the tree the operations before it left**,
 * which is the walk `plain-change.ts` does and for the same reason: two
 * configures on one node inside one delta are legal, and reading both against
 * the original tree would report the second one's `from` as a value that had
 * already been replaced.
 *
 * An operation the tree cannot honour ends the walk. Everything after it was
 * planned against a tree that does not exist, and saying less is better than
 * guessing.
 */
export const settingsMoved = (before: LoomTree, delta: TreeDelta): readonly SettingMove[] =>
  delta.operations.reduce<Walk>((state, operation) => {
    if (state.root === undefined) return state

    const moves = [...state.moves, ...movedBy(state.root, operation)]
    const next = applyOperation(state.root, operation)

    return { root: next.ok ? next.value : undefined, moves }
  }, { root: before.root, moves: [] }).moves

/**
 * Whether these moves are exactly the reverse of the last change made to the
 * page.
 *
 * **The last change to the page, not the last change to this setting**, and the
 * difference is the whole of what keeps the card honest. The sentence this
 * unlocks is *“The whole page went back to how it looked”*, and that sentence is
 * only true if nothing else has happened to the page in between. Press the
 * palette, then the band, then the palette again: the third press does reverse
 * the last thing done to *the palette*, and the page is still carrying a
 * repainted band, so the card would be claiming the page came back when a
 * stranger can see that it did not.
 *
 * So `last` is what the change immediately before this one moved: an empty list
 * when that change moved no setting, and `undefined` when there was no change
 * before it at all. The empty list is what stops a removal or an insert being
 * silently stepped over — a change that took the numbers off the page moved no
 * setting, and the palette press after it has not put the page back.
 *
 * **Exactly, and all of them both ways.** Same count, and every move the exact
 * reverse of one in the change before: a change that puts one setting back and
 * moves a second somewhere new has put nothing back, and neither has one that
 * reverses half of what came before it.
 *
 * This is deliberately not *“the page is as it was N changes ago”*, which is the
 * larger claim and the one nothing here can honestly make: the demo's store
 * keeps a head and a log rather than a tree per revision. What is claimed is
 * what is checked — the last thing that happened, and this change undoing it.
 *
 * One case looks like a false positive and is not. Press a toggle three times
 * and the third press also counts, because the second was the last change and
 * the third reverses it exactly — after which the page does look as it looked
 * before, which is what the card says. Every press after the first is honestly a
 * change that put the one before it back.
 */
export const reversesTheLastChange = (
  moves: readonly SettingMove[],
  last: readonly SettingMove[] | undefined
): boolean =>
  last !== undefined &&
  moves.length > 0 &&
  moves.length === last.length &&
  moves.every((move) => {
    const before = last.find((one) => one.nodeId === move.nodeId && one.key === move.key)

    return before !== undefined && sameValue(before.from, move.to) && sameValue(before.to, move.from)
  })
