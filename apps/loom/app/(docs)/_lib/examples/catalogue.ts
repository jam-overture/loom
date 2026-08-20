import {
  buildElement,
  buildSlot,
  buildText,
  createTree,
  sequentialIdFactory,
  type IdFactory,
  type JsonObject,
  type LoomNode,
  type LoomTree,
} from "@loom/runtime"
import { THEME_PROP_KEY } from "@loom/runtime/react"

/**
 * Every example on the site, as a tree.
 *
 * §4c settles that an example is a real `LoomTree` mounted through the runtime
 * rather than a snippet of prose that looks like one. The consequence is the
 * point: an example that stops rendering is a failing test, not a stale
 * screenshot nobody noticed. `catalogue.test.tsx` mounts all of them and
 * refuses a single render diagnostic, so a primitive whose schema changes takes
 * the documentation red before it takes a reader by surprise.
 *
 * Ids are sequential and namespaced per example, so a tree is byte-identical on
 * every instance that builds it. Nothing on this site persists a tree yet, but
 * the propose-a-change box that follows addresses nodes by id, and an id that
 * drifted per process would make every scripted change miss.
 */

/**
 * The theme every example wears unless it is about themes.
 *
 * It is on the root of each one rather than left off, because a theme is
 * mounted by the *root primitive* (0050) and `loom.page` is the one in the
 * starter library that does it. A tree with no theme renders with none of the
 * `--loom-*` properties set, which is legal, diagnostic-free, and looks like a
 * stylesheet failed to load — not the first impression a documented example
 * should make.
 */
const EDITORIAL: JsonObject = {
  palette: "editorial",
  fontPack: "editorial-serif",
  stylePreset: "comfortable",
}

/** Where the themed example goes instead: the same tree, three different ids. */
const BOLD: JsonObject = {
  palette: "bold",
  fontPack: "bold-sans",
  stylePreset: "airy-modern",
}

const page = (
  ids: IdFactory,
  theme: JsonObject,
  props: JsonObject,
  children: readonly LoomNode[]
): LoomTree =>
  createTree(
    buildElement(ids, {
      type: "loom.page",
      props: { ...props, [THEME_PROP_KEY]: theme },
      children,
    }),
    ids
  )

const heading = (ids: IdFactory, level: number, text: string, props: JsonObject = {}): LoomNode =>
  buildElement(ids, {
    type: "loom.heading",
    props: { level, ...props },
    children: [buildText(ids, text)],
  })

const prose = (ids: IdFactory, text: string, props: JsonObject = {}): LoomNode =>
  buildElement(ids, { type: "loom.prose", props, children: [buildText(ids, text)] })

export type DocsExample = {
  readonly id: string
  /** Shown above the frame. What the reader is looking at, in a few words. */
  readonly title: string
  /**
   * One sentence under the frame: what this example is here to demonstrate.
   * Plain text — it is rendered as a `figcaption`, not as MDX, so a backtick in
   * here reaches the reader as a backtick.
   */
  readonly caption: string
  readonly build: () => LoomTree
}

/** A page, a heading and a sentence — the smallest tree that renders. */
const firstTree = (): LoomTree => {
  const ids = sequentialIdFactory("firsttree")

  return page(ids, EDITORIAL, { width: "readable" }, [
    heading(ids, 1, "Hello from a tree"),
    prose(ids, "Nothing here was written as markup."),
  ])
}

/** The same shape, wearing three different registered ids (0049). */
const themedTree = (): LoomTree => {
  const ids = sequentialIdFactory("themedtree")

  return page(ids, BOLD, { width: "readable" }, [
    heading(ids, 1, "Hello from a tree"),
    prose(ids, "Nothing here was written as markup."),
  ])
}

/** A container that places a named region, and children that fill the rest. */
const slotTree = (): LoomTree => {
  const ids = sequentialIdFactory("slottree")

  return page(ids, EDITORIAL, { width: "readable" }, [
    buildElement(ids, {
      type: "loom.section",
      props: { tone: "surface", width: "readable", eyebrow: "Slots" },
      children: [
        buildSlot(ids, "heading", [heading(ids, 2, "A slot is a region the primitive places")]),
        prose(
          ids,
          "The heading above sits in a named region. Everything after it is an ordinary child, placed in order.",
          { measured: true }
        ),
        prose(ids, "Fill the slot or leave it, and the section still knows where its heading goes.", {
          tone: "muted",
          size: "small",
        }),
      ],
    }),
  ])
}

/** A container over a repeated child — how every list block decomposes (0052). */
const containerAndChildren = (): LoomTree => {
  const ids = sequentialIdFactory("featuregrid")

  const feature = (icon: string, title: string, body: string): LoomNode =>
    buildElement(ids, { type: "loom.feature", props: { icon, title, body, surface: "card" } })

  return page(ids, EDITORIAL, { width: "wide" }, [
    buildElement(ids, {
      type: "loom.feature-grid",
      props: { columns: "three" },
      children: [
        feature(
          "◇",
          "A tree, not a template",
          "The page is data, so a change to it is addressable rather than a diff of generated code."
        ),
        feature(
          "◈",
          "A delta, not a rewrite",
          "Four operations against an existing tree — insert, remove, move, configure."
        ),
        feature(
          "◆",
          "A gate, not a hope",
          "A pure function decides what is allowed, before anything is applied."
        ),
      ],
    }),
  ])
}

/**
 * A card that holds a control, which is an ordinary and correct composition —
 * and the tree in which one `configure` breaks something several nodes away.
 *
 * Giving this card an `href` would make the whole card the thing a reader aims
 * at, and the button inside it would become an anchor inside an anchor: invalid
 * markup a browser resolves by dropping one of the two links. Nothing about that
 * operation looks dangerous, which is exactly why it is worth a documented
 * example — the "make the whole card a link" chip on this page is the only one
 * on the site whose damage is invisible in the operation and only shows up in
 * the resulting tree (0064, 0068).
 */
const cardWithAControl = (): LoomTree => {
  const ids = sequentialIdFactory("cardcontrol")

  return page(ids, EDITORIAL, { width: "readable" }, [
    heading(ids, 1, "A card, and a control on it"),
    buildElement(ids, {
      type: "loom.card",
      props: { tone: "surface", padding: "loose" },
      children: [
        heading(ids, 2, "Everything in the archive"),
        prose(ids, "Two hundred issues, searchable, with the whole back catalogue.", {
          tone: "muted",
        }),
        buildElement(ids, {
          type: "loom.action",
          props: { href: "https://example.com/archive", variant: "primary", scale: "small" },
          children: [buildText(ids, "Read the archive")],
        }),
      ],
    }),
  ])
}

const entries: readonly DocsExample[] = [
  {
    id: "first-tree",
    title: "The smallest tree that renders",
    caption:
      "A page with a heading and a sentence. Every node names a registered primitive and carries props that primitive declared.",
    build: firstTree,
  },
  {
    id: "themed-tree",
    title: "The same nodes, three different ids",
    caption:
      "Identical to the tree on “Your first tree” but for the palette, font pack and style preset named on its root. No component was touched.",
    build: themedTree,
  },
  {
    id: "a-slot-and-its-children",
    title: "A named region, and the children after it",
    caption:
      "The section places its heading slot itself. Its other children are an ordered list it lays out below.",
    build: slotTree,
  },
  {
    id: "a-container-and-its-children",
    title: "A container over a repeated child",
    caption:
      "A feature grid arranges feature nodes. The repeated thing is a node, so a proposal can add one — a fixed field would have needed a new primitive.",
    build: containerAndChildren,
  },
  {
    id: "a-card-and-a-control",
    title: "A card holding a control",
    caption:
      "A perfectly ordinary composition: a surface with a heading, a sentence and a button on it. Ask to make the whole card a link and watch what the Gate says.",
    build: cardWithAControl,
  },
]

export const docsExamples: ReadonlyMap<string, DocsExample> = new Map(
  entries.map((example) => [example.id, example])
)

export const docsExampleIds: readonly string[] = entries.map((example) => example.id)
