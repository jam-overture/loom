import { assertNever, type NodeId } from "@jam-overture/loom"

import type { OutlineRow } from "./outline"

/**
 * What a change asked for now would be about, when a reader has picked several
 * parts of one page.
 *
 * `docs/portal.md` phase 2 states the rule this module is: *"A multi-node
 * selection scopes to the nearest common ancestor, **stated rather than
 * performed silently**"*, which is 0019's promise about a delegated click
 * applied one level up — to a set rather than to a node.
 *
 * ## Why widening is the only honest answer
 *
 * A scope narrows *interpretation*: it says which subtree the model may propose
 * operations over. There is exactly one subtree, so a set of three parts cannot
 * be a scope. Three choices exist and two of them are worse:
 *
 * - **Refuse to scope, and ask about the whole page.** Correct and useless: a
 *   reader who has carefully picked two cards is told their picking counted for
 *   nothing.
 * - **Scope to the first, or the last, or the largest.** Silently drops the
 *   others. This is the failure 0019 named — a selection that resolves to
 *   something other than what was picked, without saying so.
 * - **Scope to the smallest part that holds all of them**, and say that it is
 *   bigger than what was picked. Nothing is dropped, and the reader is told the
 *   ask covers more than they highlighted, which is the fact they need before
 *   pressing a button that changes their page.
 *
 * ## The four answers
 *
 * They are four rather than two because *the whole page* arrives by two
 * different routes and a reader deserves to know which. Nothing picked is a
 * default; parts picked at opposite ends of a page is a consequence, and a
 * screen that gave both the same sentence would be hiding the consequence
 * inside the default.
 */
export type SelectionScope =
  /** Nothing is picked, so nothing is narrowed. */
  | { readonly kind: "nothing" }
  /** Exactly one part is picked, and the ask is about that part. */
  | { readonly kind: "part"; readonly row: OutlineRow }
  /** Several are picked and one part holds them all; the ask is about that part. */
  | { readonly kind: "around"; readonly row: OutlineRow; readonly count: number }
  /** Several are picked and only the page holds them all. */
  | { readonly kind: "spread"; readonly count: number }

/**
 * The chain of ids from the root down to this row, root first.
 *
 * Built from `parentId` and a lookup rather than from the tree, because this
 * runs in the browser where the flat rows are what there is. A row whose parent
 * is missing from the map ends the walk: the chain is then shorter than the
 * truth, which can only make the common part smaller and the scope wider, and
 * widening is the direction that cannot mislead.
 */
const ancestry = (byId: ReadonlyMap<NodeId, OutlineRow>, row: OutlineRow): readonly NodeId[] => {
  const chain: NodeId[] = [row.nodeId]
  let parentId = row.parentId

  while (parentId !== null) {
    const parent = byId.get(parentId)
    if (!parent) break

    chain.unshift(parent.nodeId)
    parentId = parent.parentId
  }

  return chain
}

/** The last id every chain agrees on, or null when they agree on nothing. */
const deepestShared = (chains: readonly (readonly NodeId[])[]): NodeId | null => {
  const [first, ...rest] = chains
  if (!first) return null

  let shared: NodeId | null = null

  for (const [depth, id] of first.entries()) {
    if (!rest.every((chain) => chain[depth] === id)) break
    shared = id
  }

  return shared
}

/**
 * The smallest part of the page that holds everything picked.
 *
 * A picked part that is itself the answer is a legitimate outcome — picking a
 * card and a heading inside it scopes to the card — and it is still `around`
 * rather than `part`, because the ask covers the card's other contents too and
 * that is the thing the reader has to be told.
 */
export const scopeOf = (
  rows: readonly OutlineRow[],
  picked: readonly OutlineRow[]
): SelectionScope => {
  const [only] = picked

  if (!only) return { kind: "nothing" }
  if (picked.length === 1) return { kind: "part", row: only }

  const byId = new Map(rows.map((row) => [row.nodeId, row]))
  const shared = deepestShared(picked.map((row) => ancestry(byId, row)))
  const row = shared === null ? undefined : byId.get(shared)

  /**
   * The root holds everything by construction, so a scope of the root is the
   * whole page said the long way. It is reported as `spread` and posted as no
   * scope at all, which is what the page screen has always sent when nothing is
   * picked — one behavior rather than two spellings of it.
   */
  if (!row || row.parentId === null) return { kind: "spread", count: picked.length }

  return { kind: "around", row, count: picked.length }
}

/**
 * What goes in the form.
 *
 * The empty string rather than a root id, because `actions.ts` already treats
 * `""` as *no scope* and omits the field — so the whole-page ask has one
 * encoding whichever of the two ways a reader arrived at it.
 */
export const scopeNodeIdOf = (scope: SelectionScope): string => {
  switch (scope.kind) {
    case "nothing":
    case "spread":
      return ""
    case "part":
    case "around":
      return scope.row.nodeId
    default:
      return assertNever(scope, "scopeNodeIdOf")
  }
}

/**
 * The scope in a person's words: a short line for the surface, and the sentence
 * under it that says what it means for the change they are about to ask for.
 *
 * The `around` and `spread` sentences both say *more than you picked*, because
 * that is the whole reason this module exists. Neither says *ancestor*, *scope*
 * or *node*: the plain-language guard in `_test/plain-language.ts` is what holds
 * that, and the runtime's own word for the widening is the part's id, which the
 * screen shows beside the name as it does everywhere else.
 */
export type ScopeWords = {
  readonly label: string
  readonly meaning: string
}

export const scopeWords = (scope: SelectionScope): ScopeWords => {
  switch (scope.kind) {
    case "nothing":
      return {
        label: "Anywhere on this page",
        meaning:
          "You haven't picked anything, so Loom may change any part of this page. Pick one or more parts to keep it to those.",
      }
    case "part":
      return {
        label: "Just this part",
        meaning: "Loom will only be asked about this part, and about what is inside it.",
      }
    case "around":
      return {
        label: "The part that holds all of them",
        meaning: `The ${scope.count} parts you picked all sit inside one part, so that is what Loom will be asked about — which means it may change other things inside it too.`,
      }
    case "spread":
      return {
        label: "The whole page",
        meaning: `The ${scope.count} parts you picked are too far apart for anything smaller to hold them, so Loom will be asked about the whole page.`,
      }
    default:
      return assertNever(scope, "scopeWords")
  }
}
