import {
  buildElement,
  buildText,
  err,
  ok,
  THEME_PROP_KEY,
  type ChangeInterpreter,
  type Clock,
  type ElementNode,
  type IdFactory,
  type JsonObject,
  type LoomNode,
  type LoomTree,
  type TreeOperation,
} from "@loom/runtime"

/**
 * The changes a reader can ask for on this site, and what each of them plans.
 *
 * Every one is a **real** trip through the runtime: interpreted, analysed,
 * assessed for stakes and reversibility, judged by a policy, and applied or
 * held or refused. The only thing missing is the guess. A preset computes its
 * operations from the tree in front of it rather than producing them from a
 * model, which is what 0057 settles and what makes a documentation site
 * possible at all — dozens of examples that must behave the same way on every
 * visit is not a thing to point at a model, and a page whose examples only
 * worked when an API key was configured would be broken for everyone who
 * cloned the repository.
 *
 * Two properties keep this honest rather than a mock:
 *
 * - **A preset re-plans against the tree it is handed.** Click "add a
 *   sentence" twice and the second proposal is computed from the page as it is
 *   after the first, not from the page the button was drawn on.
 * - **A preset may decline.** `plan` returns `undefined` when this tree gives
 *   it nothing to do, and the surface then does not offer the button — which is
 *   better than a button whose only outcome is "nothing changed".
 *
 * The provenance says what these are: `authoredBy: "runtime"`, `confidence: 1`.
 * A computed delta is not a guess, and a confidence nobody graded must not walk
 * into calibration as a model's perfect record (0031).
 */

export const DOCS_PRESET_INTERPRETER = "loom/docs-preset"

export type DocsPresetId =
  | "add-a-sentence"
  | "reorder-the-page"
  | "retheme"
  | "demote-the-heading"
  | "remove-the-heading"
  | "link-the-card"

export type DocsPreset = {
  readonly id: DocsPresetId
  /** The chip's label. Short, and never a different claim from the utterance. */
  readonly label: string
  /** What a person would have typed. It is the intent's utterance, verbatim. */
  readonly utterance: string
  /** The interpreter's own words about why these operations answer that. */
  readonly rationale: string
  /**
   * One sentence for the reader about what this is here to show. It is the
   * site's voice rather than the runtime's, so it says what to watch for —
   * never what the verdict will be, because the verdict is computed and a
   * caption that predicted it could be wrong.
   */
  readonly watchFor: string
  /** The operations, or `undefined` when this tree gives the preset nothing to do. */
  readonly plan: (tree: LoomTree, ids: IdFactory) => readonly TreeOperation[] | undefined
}

const elementsOf = (node: LoomNode): readonly ElementNode[] => {
  if (node.kind === "text") return []

  const here = node.kind === "element" ? [node] : []

  return [...here, ...node.children.flatMap(elementsOf)]
}

const firstOfType = (tree: LoomTree, type: string): ElementNode | undefined =>
  elementsOf(tree.root).find((element) => element.type === type)

const themeOf = (tree: LoomTree): JsonObject | undefined => {
  const value = tree.root.props[THEME_PROP_KEY]

  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : undefined
}

const EDITORIAL: JsonObject = {
  palette: "editorial",
  fontPack: "editorial-serif",
  stylePreset: "comfortable",
}

const BOLD: JsonObject = {
  palette: "bold",
  fontPack: "bold-sans",
  stylePreset: "airy-modern",
}

/**
 * An `insert`, and the plainest change there is: one new node at the end of the
 * page. It is the first chip because a reader who has just met the four
 * operations should see the smallest one land without argument.
 */
const addASentence: DocsPreset = {
  id: "add-a-sentence",
  label: "Add a sentence",
  utterance: "Add a closing line to the end of this page.",
  rationale:
    "One insert. A new loom.prose node at the end of the page's children — nothing already on the page is touched, so there is nothing to weigh but the addition itself.",
  watchFor:
    "The delta is a single insert, and the new node's id is minted by the change rather than found in the tree.",
  plan: (tree, ids) => [
    {
      op: "insert",
      parentId: tree.root.id,
      index: tree.root.children.length,
      node: buildElement(ids, {
        type: "loom.prose",
        props: { tone: "muted", size: "small" },
        children: [buildText(ids, "This line was proposed, judged and applied while you watched.")],
      }),
    },
  ],
}

/**
 * A `move`. The one operation whose reach is bigger than the node it names —
 * the subtree travels with it — which is why the analysis counts it separately
 * from a rewrite (0044).
 */
const reorderThePage: DocsPreset = {
  id: "reorder-the-page",
  label: "Move the last block to the top",
  utterance: "Move the last block on this page up to the top.",
  rationale:
    "One move. The node keeps its id, its props and everything under it; only its position among its parent's children changes.",
  watchFor:
    "Nothing is created or destroyed. The same node ids are on the page afterwards, in a different order.",
  plan: (tree) => {
    const children = tree.root.children
    if (children.length < 2) return undefined

    const last = children[children.length - 1]
    if (last === undefined || last.kind === "text") return undefined

    return [{ op: "move", nodeId: last.id, parentId: tree.root.id, index: 0 }]
  },
}

/**
 * A `configure` against the root, and the clearest thing the theme model has to
 * show: three registered ids swapped for three others (0049). The whole page
 * changes appearance and not one primitive is touched.
 */
const retheme: DocsPreset = {
  id: "retheme",
  label: "Re-theme the page",
  utterance: "Put this page in the other palette.",
  rationale:
    "One configure against the root node. A theme is three registered ids, so switching palette changes three strings and nothing else — no component is edited and no colour is named anywhere in the tree.",
  watchFor:
    "The delta touches one node and sets one prop. Every colour, typeface and spacing on the page moves anyway.",
  plan: (tree) => {
    const current = themeOf(tree)
    if (current === undefined) return undefined

    const next = current["palette"] === "bold" ? EDITORIAL : BOLD

    return [{ op: "configure", nodeId: tree.root.id, set: { [THEME_PROP_KEY]: next }, unset: [] }]
  },
}

/**
 * A `configure` against a primitive this deployment declared protected. Same
 * operation as the re-theme above and a different verdict, which is the point:
 * stakes are a property of what a change touches, not of how it is phrased.
 */
const demoteTheHeading: DocsPreset = {
  id: "demote-the-heading",
  label: "Demote the page's heading",
  utterance: "Make the main heading on this page a smaller one.",
  rationale:
    "One configure. The heading's level prop goes from 1 to 2 — the text, the node and its position are untouched.",
  watchFor:
    "The same kind of operation as the re-theme, against a primitive this site declared consequential.",
  plan: (tree) => {
    const heading = firstOfType(tree, "loom.heading")
    if (heading === undefined) return undefined

    const level = heading.props["level"]
    if (typeof level !== "number" || level >= 6) return undefined

    return [{ op: "configure", nodeId: heading.id, set: { level: level + 1 }, unset: [] }]
  },
}

/**
 * A `remove` of that same protected primitive. Destroying one outranks
 * reconfiguring one — the runtime's ordering, not this site's — so the two
 * chips differ by one word and land in two different places.
 */
const removeTheHeading: DocsPreset = {
  id: "remove-the-heading",
  label: "Delete the page's heading",
  utterance: "Take the main heading off this page.",
  rationale:
    "One remove. The heading node and the text inside it leave the tree together, because a node's children go where it goes.",
  watchFor: "What the Gate does when a change would destroy something the deployment protects.",
  plan: (tree) => {
    const heading = firstOfType(tree, "loom.heading")

    return heading === undefined ? undefined : [{ op: "remove", nodeId: heading.id }]
  },
}

/**
 * A `configure` that breaks something several nodes away from the one it names.
 *
 * Giving a card an `href` makes the whole card the thing a reader aims at, and
 * every link already inside it becomes an anchor inside an anchor — invalid
 * markup a browser resolves by dropping one of the two, so the page renders and
 * something on it silently stops working. Nothing about the operation looks
 * dangerous; the damage is only visible in the *resulting tree*, which is where
 * the analysis measures it (0064).
 */
const linkTheCard: DocsPreset = {
  id: "link-the-card",
  label: "Make the whole card a link",
  utterance: "Make this whole card clickable, so the reader can aim anywhere on it.",
  rationale:
    "One configure. The card gains an href, which is what makes a card the target a reader aims at rather than a surface holding one.",
  watchFor: "A change that names one node and breaks a different one.",
  plan: (tree) => {
    const card = elementsOf(tree.root).find(
      (element) => element.type === "loom.card" && element.props["href"] === undefined
    )
    if (card === undefined) return undefined

    return [{ op: "configure", nodeId: card.id, set: { href: "https://example.com/archive" }, unset: [] }]
  },
}

export const DOCS_PRESETS: readonly DocsPreset[] = [
  addASentence,
  reorderThePage,
  retheme,
  demoteTheHeading,
  removeTheHeading,
  linkTheCard,
]

export const docsPresetById = (id: string): DocsPreset | undefined =>
  DOCS_PRESETS.find((preset) => preset.id === id)

/**
 * Which chips this tree can be offered.
 *
 * Planned with a throwaway id factory: the question is only whether the preset
 * has anything to do, and the ids it would mint are computed again for real
 * when the reader actually asks. A preset that plans nothing here is not shown,
 * so a button on this site always does something.
 */
export const availableDocsPresets = (
  tree: LoomTree,
  ids: IdFactory
): readonly DocsPresetId[] =>
  DOCS_PRESETS.filter((preset) => {
    const planned = preset.plan(tree, ids)

    return planned !== undefined && planned.length > 0
  }).map((preset) => preset.id)

/**
 * A preset, wrapped as an ordinary `ChangeInterpreter`.
 *
 * Everything downstream is unable to tell the difference, which is the whole
 * claim of 0057 and is worth stating where the wrapping happens: `composeChange`
 * takes this and a model interpreter through exactly the same sequence, and the
 * disposition it produces records which of them authored the proposal.
 */
export const docsPresetInterpreter = (
  preset: DocsPreset,
  idFactory: IdFactory,
  clock: Clock
): ChangeInterpreter => ({
  interpret: (intent, tree) => {
    const operations = preset.plan(tree, idFactory)

    return Promise.resolve(
      operations === undefined || operations.length === 0
        ? err({
            code: "refused",
            detail: `there is nothing on this page for "${preset.label}" to change`,
          })
        : ok({
            proposalId: idFactory.proposalId(),
            intentId: intent.intentId,
            delta: {
              deltaId: idFactory.deltaId(),
              treeId: tree.treeId,
              baseRevision: tree.revision,
              operations,
            },
            rationale: preset.rationale,
            provenance: {
              origin: intent.origin,
              ...(intent.actor === undefined ? {} : { actor: intent.actor }),
              interpreter: DOCS_PRESET_INTERPRETER,
              authoredBy: "runtime" as const,
              confidence: 1,
              interpretedAt: clock.now(),
            },
          })
    )
  },
})
