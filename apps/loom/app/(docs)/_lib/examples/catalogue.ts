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
 *
 * **It is the house theme, which is also the one this site's chrome wears.**
 * That is the point rather than a coincidence: a reader looking at an example
 * is looking at the same three registered ids the page around it was built
 * from, so "the site is made of the thing it documents" is visible instead of
 * claimed. The registration lives in `src/theme/library.ts` and the site names
 * it here — a surface selects a theme, it does not define one.
 */
const MINIMAL: JsonObject = {
  palette: "minimal",
  fontPack: "minimal-sans",
  stylePreset: "precise",
}

/**
 * Where the themed example goes instead: the same tree, three different ids.
 *
 * `bold` rather than `editorial` now that the default is `minimal`, and the
 * distance is the reason — the lesson on that page is that swapping three
 * strings on the root changes everything below it, and the further apart the
 * two look, the harder that is to mistake for a coincidence.
 */
const BOLD: JsonObject = {
  palette: "bold",
  fontPack: "bold-sans",
  stylePreset: "airy-modern",
}

/**
 * Every example's root, and the one prop on it that is not obvious.
 *
 * **`fills: true`.** `loom.page` paints the theme's canvas only when asked,
 * because a page embedded in a host's own chrome should not repaint the host's
 * background out from under it — a good default, and the wrong one here. An
 * example frame is a *viewport onto a document*, not an embed: the reader is
 * being shown what the tree looks like as a page, and a page whose canvas is
 * whatever happens to be behind it is not that.
 *
 * It was absent until the site adopted the minimal theme, and cost nothing
 * visible for as long as every example's canvas was the same white as the frame
 * around it. The `bold` example was the exception and had been rendering pale
 * grey text on white — legible to nobody, diagnostic-free, and invisible to
 * every test, because "it rendered" is true of an unreadable page. Matching
 * backgrounds were hiding it.
 */
const page = (
  ids: IdFactory,
  theme: JsonObject,
  props: JsonObject,
  children: readonly LoomNode[]
): LoomTree =>
  createTree(
    buildElement(ids, {
      type: "loom.page",
      props: { fills: true, ...props, [THEME_PROP_KEY]: theme },
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

  return page(ids, MINIMAL, { width: "readable" }, [
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

  return page(ids, MINIMAL, { width: "readable" }, [
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

  return page(ids, MINIMAL, { width: "wide" }, [
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

  return page(ids, MINIMAL, { width: "readable" }, [
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

/**
 * A page with somewhere to look, something to press and something to open.
 *
 * *What your readers do* needs a tree that can produce all four kinds of reader
 * signal, and the four kinds are not arbitrary: two are about a node being on
 * screen, one is about a target a reader aims at, and one is about a region that
 * opens. A tree of three paragraphs can only ever demonstrate half of them.
 *
 * So: two sections to come into view and stay there, a link and a call to action
 * inside them, and a questions band whose rows disclose. Nothing on it is
 * instrumented — the broadcaster reads the markup, which is the point the page
 * makes by pointing at this and at the attribute table beside it.
 */
const aPageAReaderScrolls = (): LoomTree => {
  const ids = sequentialIdFactory("readersignals")

  return page(ids, MINIMAL, { width: "readable" }, [
    buildElement(ids, {
      type: "loom.section",
      props: { tone: "surface", width: "readable", eyebrow: "Vaughan & Rill" },
      children: [
        buildSlot(ids, "heading", [heading(ids, 2, "Bicycles built for one road")]),
        prose(ids, "Hand-brazed frames, made to measure, delivered anywhere in the country.", {
          measured: true,
        }),
        buildElement(ids, {
          type: "loom.action",
          props: { href: "https://example.com/frames", variant: "primary", scale: "small" },
          children: [buildText(ids, "See the frames")],
        }),
      ],
    }),
    buildElement(ids, {
      type: "loom.section",
      props: { tone: "canvas", width: "readable" },
      children: [
        buildSlot(ids, "heading", [heading(ids, 2, "Before you order")]),
        buildElement(ids, {
          type: "loom.faq-list",
          props: { columns: "one", width: "readable" },
          children: [
            buildElement(ids, {
              type: "loom.faq",
              props: {
                question: "How long does a frame take?",
                answer: "Between nine and fourteen weeks, depending on the finish you choose.",
              },
            }),
            buildElement(ids, {
              type: "loom.faq",
              props: {
                question: "Can I be measured remotely?",
                answer:
                  "Yes. We send a fitting kit and a short video call does the rest — most people never come to the workshop.",
              },
            }),
          ],
        }),
        prose(ids, "Anything else, ask us.", { tone: "muted", size: "small" }),
        buildElement(ids, {
          type: "loom.link",
          props: { href: "https://example.com/contact", tone: "accent" },
          children: [buildText(ids, "Send a question")],
        }),
      ],
    }),
  ])
}

/**
 * The same shape again, wearing three ids nobody on this project chose by hand.
 *
 * `tide` is one of the eighteen palettes in `palettes.ts` that were *derived*
 * — three hues and a mode through `derivePalette`, solved against the contrast
 * bar, looked at, and committed. `grotesque` and `technical` are likewise none of the
 * three the four surfaces wear.
 *
 * That is the whole argument of the page it sits on, made by the example rather
 * than by a sentence: the reader is looking at a combination this repository
 * has never rendered anywhere else, produced by typing three strings, and it
 * looks deliberate because a palette that clears the bar looks deliberate.
 */
const derivedTheme = (): LoomTree => {
  const ids = sequentialIdFactory("derivedtheme")

  return page(ids, { palette: "tide", fontPack: "grotesque", stylePreset: "technical" }, { width: "readable" }, [
    heading(ids, 1, "Hello from a tree"),
    prose(ids, "Nothing here was written as markup."),
    buildElement(ids, {
      type: "loom.card",
      props: { tone: "surface", padding: "loose" },
      children: [
        heading(ids, 2, "A palette nobody painted"),
        prose(ids, "Three hues went in. Seventeen slots came out, each measured against the ink it has to carry.", {
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
    id: "a-derived-theme",
    title: "Three ids nobody chose by hand",
    caption:
      "The palette on this one was derived from three hues and checked against the contrast bar rather than picked. The font pack and the style preset are two more of the registered set, and no component knows which.",
    build: derivedTheme,
  },
  {
    id: "a-card-and-a-control",
    title: "A card holding a control",
    caption:
      "A perfectly ordinary composition: a surface with a heading, a sentence and a button on it. Ask to make the whole card a link and watch what the Gate says.",
    build: cardWithAControl,
  },
  {
    id: "a-page-a-reader-scrolls",
    title: "A page with something to look at, press and open",
    caption:
      "Two sections, a call to action, a link, and two questions that open. Nothing on it is instrumented — the same tree is measured further down this page by reading its markup.",
    build: aPageAReaderScrolls,
  },
]

export const docsExamples: ReadonlyMap<string, DocsExample> = new Map(
  entries.map((example) => [example.id, example])
)

export const docsExampleIds: readonly string[] = entries.map((example) => example.id)
