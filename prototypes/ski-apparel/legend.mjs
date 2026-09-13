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

/** The primitives that make up the page's bands, top to bottom. */
const BANDS = ["loom.hero", "loom.section"]

const walk = function* (node) {
  yield node
  if (node.kind !== "text") for (const child of node.children) yield* walk(child)
}

/** `/#goggles` and `#goggles` both jump to `goggles`; anything else jumps nowhere on this page. */
const anchorOf = (href) => (typeof href === "string" ? /^\/?#([\w-]+)$/.exec(href)?.[1] : undefined)

export const legendOf = (tree) => {
  const elements = [...walk(tree.root)].filter((node) => node.kind === "element")

  /**
   * Every band, not only the ones a link can jump to. A band without an `anchor`
   * is read as much as any other — the broadcaster reports it by node id either
   * way — and listing only anchored bands silently dropped "This season" from
   * the rail. It takes its name from its eyebrow instead.
   */
  const sections = tree.root.children
    .filter((child) => child.kind === "element" && BANDS.includes(child.type))
    .map((child) => ({
      nodeId: child.id,
      anchor: child.props.anchor,
      label: SECTION_LABELS[child.props.anchor] ?? String(child.props.eyebrow ?? child.type).toLowerCase(),
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

/**
 * What the rail asks the broadcaster for, per kind — the host's `types` setting.
 *
 * Time on screen for the five bands, activations for what jumps between them,
 * disclosures for the questions. Asking per kind is what keeps a batch to what
 * the rail shows: one list for all four would also buy dwell for every link.
 */
export const RAIL_TYPES = {
  viewed: BANDS,
  dwelled: BANDS,
  activated: ["loom.link", "loom.action"],
  disclosed: ["loom.faq"],
}
