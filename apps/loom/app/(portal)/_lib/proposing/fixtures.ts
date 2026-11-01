import { ok, outlineTree, type LoomTree, type NodeId } from "@jam-overture/loom"
import {
  type PartDeclarations,
  type ReaderTally,
  type ReaderWindowSources,
  type StoredPageViews,
  type StoredTally,
} from "@jam-overture/loom/signals"
import { DEFAULT_AUDIENCE_ID } from "@jam-overture/loom/store"

/**
 * Readers on a page, for the proposing tests: counters for the nodes of a tree
 * and the door's page-view row, shaped as the stores return them.
 */

export const NOTHING_DECLARED: PartDeclarations = {
  copyFor: () => undefined,
  typesWithRole: () => [],
}

const UPDATED = "2026-11-01T00:00:00.000Z"

/** The element ids of a tree in reading order: the root first. */
export const elementIdsOf = (tree: LoomTree): readonly NodeId[] =>
  outlineTree(tree.root).flatMap((entry) => (entry.node.kind === "element" ? [entry.node.id] : []))

/** One node's counters on the page's published revision. */
export const tallyOf = (
  tree: LoomTree,
  node: NodeId,
  counters: Partial<ReaderTally> = {}
): StoredTally => {
  const found = outlineTree(tree.root).find((entry) => entry.node.id === node)

  if (found === undefined || found.node.kind !== "element") throw new Error(`no element ${node}`)

  return {
    treeId: tree.treeId,
    revision: tree.revision,
    nodeId: node,
    type: found.node.type,
    views: 0,
    reached: 0,
    engaged: 0,
    dwellMs: 0,
    activations: 0,
    opens: 0,
    closes: 0,
    completions: 0,
    audienceId: DEFAULT_AUDIENCE_ID,
    updatedAt: UPDATED,
    ...counters,
  }
}

export const pageViewsOf = (tree: LoomTree, opened: number): StoredPageViews => ({
  audienceId: DEFAULT_AUDIENCE_ID,
  treeId: tree.treeId,
  revision: tree.revision,
  opened,
  appearances: opened,
  updatedAt: UPDATED,
})

/** A window's stores that answer with exactly these rows, and nothing for funnels. */
export const sourcesOf = (
  tallies: readonly StoredTally[],
  pageViews: readonly StoredPageViews[]
): ReaderWindowSources => ({
  tallies: {
    tallies: () => Promise.resolve(ok(tallies)),
    funnels: () => Promise.resolve(ok([])),
    pageViews: () => Promise.resolve(ok(pageViews)),
  },
})

/** Every element of the page reached by `reached` of `opened` readers. */
export const readersOn = (
  tree: LoomTree,
  opened: number,
  reached: number = opened
): ReaderWindowSources =>
  sourcesOf(
    elementIdsOf(tree).map((node) => tallyOf(tree, node, { views: reached, reached })),
    [pageViewsOf(tree, opened)]
  )
