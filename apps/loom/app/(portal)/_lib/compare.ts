import { childrenOf, type LoomNode, type LoomTree } from "@jam-overture/loom"

import { partsOf } from "./goals/goal-view"
import type { PartName } from "./part-name"

/**
 * *Compare* on a version of a page's history (8c of `docs/portal.md`;
 * `docs/portal-wireframes.md`, *5 · Pages · History*): the page before the
 * version and the page it became, side by side as two small outlines, the way
 * *For review*'s drawer is drawn on the board. Not a diff of tree JSON. Pure.
 *
 * Each outline is the page's parts in the order the page reads, nested as the
 * page nests them (`partsOf`, the outline *New goal* picks a part on). What
 * changed is marked on the side it is seen on: a part added, moved or changed
 * on *After*; a part taken off, or moved from where it was, on *Before*.
 */

/** What happened to one part between the two versions; `undefined` where nothing did. */
export type Mark = "added" | "changed" | "moved" | "removed"

export type OutlineRow = PartName & {
  readonly depth: number
  readonly mark: Mark | undefined
}

export type Comparison = {
  readonly before: readonly OutlineRow[]
  readonly after: readonly OutlineRow[]
  /** What changed, in a sentence; *Nothing a reader can see changed* where no part did. */
  readonly summary: string
}

/** Where one part sits: the part it is inside (`""` for the page) and what it holds of its own. */
type Place = { readonly parent: string; readonly own: string }

/**
 * Every part's place, by id. What a part holds of its own is its type, its
 * props and the words directly inside it; the parts inside it are theirs.
 */
const placesWithin = (node: LoomNode, parent: string): ReadonlyMap<string, Place> =>
  new Map(
    childrenOf(node).flatMap((child): (readonly [string, Place])[] => {
      if (child.kind === "text") return []
      if (child.kind === "slot") return [...placesWithin(child, parent)]

      const words = childrenOf(child).flatMap((inner) =>
        inner.kind === "text" ? [inner.value] : []
      )

      return [
        [child.id, { parent, own: JSON.stringify([child.type, child.props, words]) }],
        ...placesWithin(child, child.id),
      ]
    })
  )

/** The longest run of ids both orders read in the same order, not necessarily side by side. */
const inOrderOnBoth = (was: readonly string[], is: readonly string[]): ReadonlySet<string> => {
  /** `lengths[i][j]`: the longest such run in `was` from `i` and `is` from `j`. */
  const lengths = was.reduceRight<readonly (readonly number[])[]>(
    (rows, id) => {
      const below = rows[0] ?? []
      const row = is.reduceRight<readonly number[]>(
        (right, other, j) => [
          id === other ? 1 + (below[j + 1] ?? 0) : Math.max(below[j] ?? 0, right[0] ?? 0),
          ...right,
        ],
        [0]
      )

      return [row, ...rows]
    },
    [[...is.map(() => 0), 0]]
  )
  const length = (i: number, j: number): number => lengths[i]?.[j] ?? 0
  const walk = (i: number, j: number): readonly string[] => {
    const id = was[i]
    const other = is[j]

    if (id === undefined || other === undefined) return []
    if (id === other) return [id, ...walk(i + 1, j + 1)]

    return length(i + 1, j) >= length(i, j + 1) ? walk(i + 1, j) : walk(i, j + 1)
  }

  return new Set(walk(0, 0))
}

/**
 * The parts that changed their order inside a part that holds them on both
 * sides: of the parts on both sides of one parent, the fewest that must have
 * moved for the rest to read in the same order. A part only added or taken off
 * moves nothing else, and one part moved to the top marks that part alone.
 */
const reordered = (
  before: readonly string[],
  after: readonly string[],
  stays: (id: string) => boolean
): readonly string[] => {
  const is = after.filter(stays)
  const still = inOrderOnBoth(before.filter(stays), is)

  return is.filter((id) => !still.has(id))
}

const childrenByParent = (
  order: readonly string[],
  places: ReadonlyMap<string, Place>
): ReadonlyMap<string, readonly string[]> =>
  order.reduce((byParent, id) => {
    const parent = places.get(id)?.parent ?? ""

    return new Map(byParent).set(parent, [...(byParent.get(parent) ?? []), id])
  }, new Map<string, readonly string[]>())

/** The parts that moved: to another part, or to another place among the parts beside them. */
const movedOf = (
  beforeOrder: readonly string[],
  afterOrder: readonly string[],
  was: ReadonlyMap<string, Place>,
  is: ReadonlyMap<string, Place>
): ReadonlySet<string> => {
  const sameParent = (id: string): boolean => was.get(id)?.parent === is.get(id)?.parent
  const elsewhere = afterOrder.filter((id) => was.has(id) && !sameParent(id))
  const beforeBy = childrenByParent(beforeOrder, was)
  const stays = (id: string): boolean => was.has(id) && is.has(id) && sameParent(id)
  const shuffled = [...childrenByParent(afterOrder, is)].flatMap(([parent, ids]) =>
    reordered(beforeBy.get(parent) ?? [], ids, stays)
  )

  return new Set([...elsewhere, ...shuffled])
}

const count = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`

const summaryOf = (after: readonly OutlineRow[], before: readonly OutlineRow[]): string => {
  const tally = (rows: readonly OutlineRow[], mark: Mark): number =>
    rows.filter((row) => row.mark === mark).length
  const said = [
    [tally(after, "added"), "part added", "parts added"],
    [tally(after, "changed"), "part changed", "parts changed"],
    [tally(after, "moved"), "part moved", "parts moved"],
    [tally(before, "removed"), "part taken off", "parts taken off"],
  ] as const
  const lines = said.flatMap(([n, one, many]) => (n === 0 ? [] : [count(n, one, many)]))

  return lines.length === 0 ? "Nothing a reader can see changed." : `${lines.join(", ")}.`
}

/** The page before a version and after it, each part marked with what happened to it. */
export const compareTrees = (before: LoomTree, after: LoomTree): Comparison => {
  const was = placesWithin(before.root, "")
  const is = placesWithin(after.root, "")
  const beforeParts = partsOf(before)
  const afterParts = partsOf(after)
  const moved = movedOf(
    beforeParts.map((part) => part.nodeId),
    afterParts.map((part) => part.nodeId),
    was,
    is
  )

  const afterRows = afterParts.map((part): OutlineRow => {
    const then = was.get(part.nodeId)
    const mark: Mark | undefined =
      then === undefined
        ? "added"
        : moved.has(part.nodeId)
          ? "moved"
          : then.own === is.get(part.nodeId)?.own
            ? undefined
            : "changed"

    return { ...part, mark }
  })
  const beforeRows = beforeParts.map(
    (part): OutlineRow => ({
      ...part,
      mark: !is.has(part.nodeId) ? "removed" : moved.has(part.nodeId) ? "moved" : undefined,
    })
  )

  return { before: beforeRows, after: afterRows, summary: summaryOf(afterRows, beforeRows) }
}

/** One line of a drawn outline: a part, or a run of unmarked parts folded into one line. */
export type OutlineLine =
  | { readonly kind: "part"; readonly row: OutlineRow }
  | {
      readonly kind: "folded"
      readonly count: number
      readonly depth: number
      readonly key: string
    }

/** The parts `index` sits inside: the nearest part before it at each shallower depth. */
const ancestorsOf = (rows: readonly OutlineRow[], index: number): readonly number[] =>
  rows
    .slice(0, index)
    .reduceRight<{
      readonly depth: number
      readonly found: readonly number[]
    }>((seen, row, at) => (row.depth < seen.depth ? { depth: row.depth, found: [...seen.found, at] } : seen), { depth: rows[index]?.depth ?? 0, found: [] })
    .found

/**
 * An outline as the drawer draws it: every marked part with the parts it sits
 * inside and the part either side of it, and each run of other parts folded
 * into one line saying how many, so a long page stays a small outline. Where
 * nothing is marked, the whole page is one folded line.
 */
export const foldedOutlineOf = (rows: readonly OutlineRow[]): readonly OutlineLine[] => {
  const marked = rows.flatMap((row, index) => (row.mark === undefined ? [] : [index]))
  const shown = new Set(
    marked.flatMap((index) => [index - 1, index, index + 1, ...ancestorsOf(rows, index)])
  )

  return rows.reduce<readonly OutlineLine[]>((lines, row, index) => {
    if (shown.has(index)) return [...lines, { kind: "part", row }]

    const last = lines.at(-1)

    return last?.kind === "folded"
      ? [
          ...lines.slice(0, -1),
          { ...last, count: last.count + 1, depth: Math.min(last.depth, row.depth) },
        ]
      : [...lines, { kind: "folded", count: 1, depth: row.depth, key: `folded-${row.nodeId}` }]
  }, [])
}
