/**
 * What the rail needs to turn a signal into words, read off the tree.
 *
 * A reader signal names a node and nothing else — no text, no URL. That is
 * deliberate, and this file is the other half of it: the tree already holds the
 * content, so the page hands the rail a small legend built from the same tree it
 * rendered. "activated n_17" becomes "jumped to goggles" here, never on the wire.
 */

/** Section names for the rail, by the `anchor` props the page gives them. */
const SECTION_LABELS = {
  top: "the opening",
  layers: "shell construction",
  helmets: "helmets",
  goggles: "goggles",
  fit: "the questions",
}

const walk = function* (node) {
  yield node
  if (node.kind !== "text") for (const child of node.children) yield* walk(child)
}

/** `/#goggles` and `#goggles` both jump to `goggles`; anything else jumps nowhere on this page. */
const anchorOf = (href) => (typeof href === "string" ? /^\/?#([\w-]+)$/.exec(href)?.[1] : undefined)

export const legendOf = (tree) => {
  const elements = [...walk(tree.root)].filter((node) => node.kind === "element")

  const sections = tree.root.children
    .filter((child) => child.kind === "element" && typeof child.props.anchor === "string")
    .map((child) => ({
      nodeId: child.id,
      anchor: child.props.anchor,
      label: SECTION_LABELS[child.props.anchor] ?? child.props.anchor,
    }))

  const jumps = Object.fromEntries(
    elements.flatMap((node) => {
      const anchor = anchorOf(node.props.href)
      return anchor === undefined ? [] : [[node.id, anchor]]
    })
  )

  const questions = Object.fromEntries(
    elements.filter((node) => node.type === "loom.faq").map((node) => [node.id, node.props.question])
  )

  return { revision: tree.revision, sections, jumps, questions }
}

/** The primitive types the rail has anything to say about — the host's `types` setting. */
export const RAIL_TYPES = ["loom.hero", "loom.section", "loom.link", "loom.action", "loom.faq"]
