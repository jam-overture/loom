import type { NodeId } from "@jam-overture/loom"

import type { OutlineRow } from "./outline"

/**
 * Which rows of the address book are on the screen, and which are folded away.
 *
 * ## The measurement this exists to answer
 *
 * The audit of 12 October photographed `/portal/pages/t_home1` at full height
 * and the number it came back with was **5,594px**, of which 189 rows were the
 * address book. Measured again on the branch that wrote this, against the same
 * build with only these files reverted: 5,586px, and the list 4,594px of it.
 * Two consequences, both of which a reader meets before they meet anything
 * else:
 *
 * - **Nothing below the list is on the same screen as the list.** The pane that
 *   says what you picked sits under it, and `Nothing picked yet` started at
 *   y 5,298 — so clicking a part on the page changed something five screens
 *   away. (The audit's prose says *11,000 pixels below the thing you click*,
 *   which does not square with its own table; 5,298 is what the harness reads
 *   off the page.)
 * - **There is no way to find a part by name.** 191 rows of *Card*, *Prose* and
 *   *Link* is a list a person reads by scrolling it, and a page has as many of
 *   those as it has parts.
 *
 * The shape here is the one drawn in the prototype at `/portal/preview` on the
 * same morning and photographed there: the list arrives folded, with a search
 * box over it and a count under it. This is that, pointed at a real tree
 * instead of at a fixture.
 *
 * ## Nothing is removed, which is the rule this had to be written under
 *
 * Every row that was in the list is still in the list. A folded branch is one
 * click from being open, it carries the number of parts inside it rather than
 * hiding that there are any, a search shows every row that matches *and every
 * row it is inside* so a match is never shown without its context, and the
 * count under the list says how many of the page's parts are drawn. The reading
 * is **progressive disclosure, not a filter with a default**, which is the
 * distinction the whole portal brief turns on.
 */

/**
 * How many rows the list shows before it starts folding.
 *
 * Roughly what the box holds without scrolling, plus a few. It is a **budget
 * rather than a depth**, and that is the whole of the rule:
 *
 * > **The list opens as deep as it can without going over the budget, and never
 * > shallower than the page itself.**
 *
 * Two readings this replaced, each wrong on a page the other one handled.
 *
 * A fixed depth of two levels hid the thing a reader wants most on a short
 * page: on a page of two cards the words inside the headings sit at depth 3, so
 * *Autumn* and *Winter* arrived behind two chevrons while five rows of `Page`,
 * `Card` and `Heading` sat on the screen saying nothing. A test caught that
 * before a reader could.
 *
 * Opening a short page whole and a long one to a fixed depth fixed that end and
 * left the other: this deployment's front door is 191 rows that are **wide
 * rather than deep** — 1 at the root, 13 under it, 38 under those — so two
 * levels of it is 52 rows, which is a box scrolling through 1,256px of content
 * on arrival. The budget opens the same page to its 13 sections, and a reader
 * meets the shape of their page instead of a third of its contents.
 */
export const ROWS_BEFORE_FOLDING = 20

/** A row as the list draws it: the row, what is inside it, and whether that shows. */
export type OutlineEntry = {
  readonly row: OutlineRow
  /** How many parts are nested inside this one, at any depth. `0` for a leaf. */
  readonly partsInside: number
  /**
   * Whether this row's contents are showing, and `null` for a row with no
   * control to offer — a leaf, or any row while a search is running.
   *
   * `null` rather than `false` because a row with nothing inside it and a row
   * that is folded are different things, and drawing a closed control on the
   * first is the list promising something that is not there.
   */
  readonly open: boolean | null
}

export type OutlineView = {
  /** The rows to draw, in the order the page holds them. */
  readonly entries: readonly OutlineEntry[]
  /** How many rows matched the search, and `null` when there is no search. */
  readonly matched: number | null
}

export type OutlineViewState = {
  /** What the reader typed. Blank is the browsing list rather than an empty search. */
  readonly query: string
  /** The branches the reader has opened. */
  readonly open: ReadonlySet<NodeId>
  /**
   * Rows that must be reachable whatever the reader has folded — the parts they
   * have picked.
   *
   * A part can be picked by clicking the page rather than the list, and a page
   * is mostly made of parts nested deeper than the list arrives open to.
   * Without this, clicking a card in the preview marks a row that is not on the
   * screen, and the list silently disagrees with the page beside it.
   */
  readonly revealed: readonly NodeId[]
}

/**
 * The nesting, read once.
 *
 * Every question below is about ancestry, and ancestry asked per row off a flat
 * array is a walk to the root per row. `_lib/outline.ts` takes that cost
 * knowingly for `addressNode` because the alternative there is a second copy of
 * the delegation rule. Here there is no such excuse and the list is the one
 * thing on this screen a reader interacts with on every keystroke, so the walks
 * are done once into two maps and every reading below is a lookup.
 */
type Nesting = {
  readonly ancestors: ReadonlyMap<NodeId, readonly NodeId[]>
  readonly inside: ReadonlyMap<NodeId, number>
}

const nestingOf = (rows: readonly OutlineRow[]): Nesting => {
  const parents = new Map(rows.map((row) => [row.nodeId, row.parentId]))
  const ancestors = new Map<NodeId, readonly NodeId[]>()

  /*
   * One pass in the order the page holds them, which is the order that makes
   * this a lookup rather than a walk: a pre-order traversal names a parent
   * before any of its children, so by the time a row is reached its parent's
   * own ancestors are already recorded.
   *
   * **A row naming a parent that is not in the list is read as top level**, and
   * that clause is load bearing rather than defensive. Without it such a row
   * carries an ancestor nothing can ever open, so it is folded away for good —
   * a part of somebody's page that no search and no click could reach, with
   * nothing anywhere saying why. Reading it as top level shows it. `outlineRows`
   * cannot produce one, because it reads a parsed tree; a flat array that
   * crossed a serialisation boundary is the thing this list is actually handed.
   */
  for (const row of rows) {
    const parentId = row.parentId

    ancestors.set(
      row.nodeId,
      parentId === null || !parents.has(parentId)
        ? []
        : [parentId, ...(ancestors.get(parentId) ?? [])]
    )
  }

  const inside = new Map<NodeId, number>(rows.map((row) => [row.nodeId, 0]))

  for (const row of rows) {
    for (const ancestorId of ancestors.get(row.nodeId) ?? []) {
      inside.set(ancestorId, (inside.get(ancestorId) ?? 0) + 1)
    }
  }

  return { ancestors, inside }
}

/** Every row this one is nested inside, nearest first. */
export const ancestorsOf = (
  rows: readonly OutlineRow[],
  nodeId: NodeId
): readonly NodeId[] => nestingOf(rows).ancestors.get(nodeId) ?? []

/** How many parts are nested inside this one, at any depth. */
export const partsInside = (rows: readonly OutlineRow[], nodeId: NodeId): number =>
  nestingOf(rows).inside.get(nodeId) ?? 0

/**
 * The branches a reader has not touched yet, which is where the list starts.
 *
 * The deepest level the budget allows, and the page itself whatever the budget
 * says — a list drawn as one row saying `Page` would be hiding the page's
 * structure rather than disclosing it, so a page whose top level alone is over
 * the budget shows its top level and goes over. That is the floor and it is
 * deliberate.
 *
 * The count is monotonic in depth, so the deepest allowed level is the last one
 * that fits.
 */
export const initiallyOpen = (rows: readonly OutlineRow[]): ReadonlySet<NodeId> => {
  const { inside } = nestingOf(rows)
  const deepest = rows.reduce((held, row) => Math.max(held, row.depth), 0)

  const fits = (depth: number): boolean =>
    rows.filter((row) => row.depth <= depth + 1).length <= ROWS_BEFORE_FOLDING

  const limit =
    Array.from({ length: deepest + 1 }, (_unused, depth) => depth).filter(fits).pop() ?? 0

  return new Set(
    rows
      .filter((row) => row.depth <= limit && (inside.get(row.nodeId) ?? 0) > 0)
      .map((row) => row.nodeId)
  )
}

/**
 * Whether a row answers to what was typed.
 *
 * The registry's own word is searched along with the person's, which is the
 * *technical record is one click away* half of the brief read as a search
 * rather than as a disclosure: a developer who knows the part is a `loom.card`
 * should not have to learn that this portal calls it a card before they can
 * find it. A text row has no registered name and is matched on its words, which
 * are the only name it has.
 */
const matches = (row: OutlineRow, query: string): boolean =>
  `${row.label} ${row.technical ?? ""}`.toLowerCase().includes(query)

/**
 * The list, as the component draws it.
 *
 * A search takes over from the folding rather than composing with it, and that
 * is the one decision here a reader could notice. Composing them means a row
 * that matched can still be folded away behind a branch the reader closed
 * earlier, which is a search that quietly does not answer; and a chevron on a
 * result is a control that appears to do nothing, because the search is what
 * decides the list. So while something is typed, every shown row is a result or
 * something holding one, and no row offers a control. Clearing the box gives
 * the reader their own folding back, every branch they had opened included.
 */
export const outlineView = (
  rows: readonly OutlineRow[],
  state: OutlineViewState
): OutlineView => {
  const { ancestors, inside } = nestingOf(rows)
  const query = state.query.trim().toLowerCase()
  const searching = query !== ""

  const hits = searching ? rows.filter((row) => matches(row, query)) : []

  /*
   * A search shows every match and every row each match is inside. The
   * ancestors are not decoration: *Words* three levels inside a card is a match
   * that means nothing on its own, and a match shown without what holds it is
   * the list answering a question the reader did not ask.
   */
  const open = new Set([
    ...state.open,
    ...state.revealed.flatMap((nodeId) => ancestors.get(nodeId) ?? []),
  ])

  const shown: ReadonlySet<NodeId> = searching
    ? new Set(hits.flatMap((hit) => [hit.nodeId, ...(ancestors.get(hit.nodeId) ?? [])]))
    : new Set(
        rows
          .filter((row) => (ancestors.get(row.nodeId) ?? []).every((id) => open.has(id)))
          .map((row) => row.nodeId)
      )

  return {
    entries: rows
      .filter((row) => shown.has(row.nodeId))
      .map((row) => {
        const held = inside.get(row.nodeId) ?? 0

        return {
          row,
          partsInside: held,
          open: searching || held === 0 ? null : open.has(row.nodeId),
        }
      }),
    matched: searching ? hits.length : null,
  }
}
