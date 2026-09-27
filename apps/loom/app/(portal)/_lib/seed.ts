import { buildElement, buildText, createTree, sequentialIdFactory, type LoomTree } from "@jam-overture/loom"

/**
 * A tree to look at. Built through the public builders rather than written as a
 * literal, so it cannot drift out of the shape `parseTree` accepts — the seed is
 * the first thing the preview pane renders, and a seed that failed to parse would
 * look like a renderer bug.
 */
export const seedTree = (): LoomTree => {
  const ids = sequentialIdFactory("seed")

  return createTree(
    buildElement(ids, {
      type: "loom.page",
      children: [
        buildElement(ids, {
          type: "loom.heading",
          props: { level: 1 },
          children: [buildText(ids, "Loom")],
        }),
        buildElement(ids, {
          type: "loom.prose",
          props: { tone: "muted" },
          children: [buildText(ids, "This page is a stored tree, rendered through the runtime.")],
        }),
        buildElement(ids, {
          type: "loom.card",
          props: { variant: "outlined" },
          children: [
            buildElement(ids, {
              type: "loom.heading",
              props: { level: 3 },
              children: [buildText(ids, "Every change is a delta")],
            }),
            buildElement(ids, {
              type: "loom.prose",
              children: [
                buildText(ids, "Nothing here was written as markup. A proposal produced it."),
              ],
            }),
          ],
        }),
      ],
    }),
    ids
  )
}
