import { buildElement, buildText } from "@jam-overture/loom"

import { nodeOfType, plans } from "./page"

/**
 * The changes both benched pages ask for.
 *
 * They are ordinary on purpose. *When something looks wrong* needs a history
 * somebody could plausibly have produced; *Answering a held change* needs a
 * queue with something real in it and a page that moved on underneath. Neither
 * is about the changes themselves, so the changes are the small ones anybody
 * would ask a page for — and they live here rather than being written out twice
 * with the same words and different ids.
 *
 * What is *not* here is a change a single page is making a point with: the card
 * that carries a sentence nobody asked for belongs to the attribution table, and
 * the plan a planner says it was half sure of belongs to the queue. A shared
 * module that collected those too would be a shared module with one user per
 * entry.
 */

/** One insert, at the end of the page. */
export const addASentence = plans(
  "One insert. A new sentence at the end of the page.",
  (tree, ids) => [
    {
      op: "insert",
      parentId: tree.root.id,
      index: tree.root.children.length,
      node: buildElement(ids, {
        type: "loom.prose",
        props: { tone: "muted", size: "small" },
        children: [buildText(ids, "Added while somebody was still deciding.")],
      }),
    },
  ]
)

/** One configure, on a node that was on the page before anybody arrived. */
export const quietenTheSentence = plans(
  "One configure. The page's first sentence goes to the muted tone.",
  (tree) => [
    { op: "configure", nodeId: nodeOfType(tree, "loom.prose").id, set: { tone: "muted" }, unset: [] },
  ]
)

/** One move, of the card to the top. */
export const moveTheCardUp = plans("One move. The card goes to the top of the page.", (tree) => [
  {
    op: "move",
    nodeId: nodeOfType(tree, "loom.card").id,
    parentId: tree.root.id,
    index: 0,
  },
])

/**
 * One configure, on the one primitive this site's policy calls protected.
 *
 * The smallest change on the site that the Gate will not apply on its own, which
 * is why both pages reach for it: one to have something waiting in a queue, the
 * other to have something nobody answered in time.
 */
export const demoteTheHeading = plans(
  "One configure. The heading's level prop goes from 1 to 2, and nothing else moves.",
  (tree) => [
    { op: "configure", nodeId: nodeOfType(tree, "loom.heading").id, set: { level: 2 }, unset: [] },
  ]
)
