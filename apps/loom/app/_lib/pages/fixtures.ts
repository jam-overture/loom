import {
  buildElement,
  buildText,
  createTree,
  sequentialIdFactory,
  type LoomTree,
} from "@jam-overture/loom"

/**
 * A small page with a heading, for the pages tests: `prefix` keeps two pages'
 * ids apart, and `revision` says which version the site published.
 */
export const pageFixture = (prefix: string, heading: string, revision = 0): LoomTree => {
  const ids = sequentialIdFactory(prefix)
  const tree = createTree(
    buildElement(ids, {
      type: "loom.stack",
      children: [buildElement(ids, { type: "loom.heading", children: [buildText(ids, heading)] })],
    }),
    ids
  )

  return { ...tree, revision }
}
