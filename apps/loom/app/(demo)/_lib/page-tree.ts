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
 * The page the demo changes.
 *
 * It is a real marketing page rather than a fixture: §4d builds the site from
 * this same vocabulary, so a demo page that could not stand as a landing page
 * would be demonstrating a library nobody would ship. Everything here is a node
 * — there is no markup in this file and no styling on any of it — which is the
 * property the demo exists to make visible.
 *
 * Ids are sequential and namespaced, so the tree is byte-identical on every
 * instance that builds it. That matters twice: the store keys the tree by an id
 * this derives, and the presets address nodes by id, so a demo whose ids drifted
 * per process would be a demo whose scripted changes stopped applying.
 */

export const DEMO_THEME_NODE_PROP = THEME_PROP_KEY

/** The theme a visitor arrives on, and the one a preset re-themes away from. */
export const DEMO_STARTING_THEME: JsonObject = {
  palette: "editorial",
  fontPack: "editorial-serif",
  stylePreset: "comfortable",
}

/** Where the presets re-theme to: the same tree, three different ids (0049). */
export const DEMO_ALTERNATE_THEME: JsonObject = {
  palette: "bold",
  fontPack: "bold-sans",
  stylePreset: "airy-modern",
}

const heading = (ids: IdFactory, level: number, text: string, balance = false): LoomNode =>
  buildElement(ids, {
    type: "loom.heading",
    props: balance ? { level, balance } : { level },
    children: [buildText(ids, text)],
  })

const prose = (ids: IdFactory, text: string, props: JsonObject = {}): LoomNode =>
  buildElement(ids, { type: "loom.prose", props, children: [buildText(ids, text)] })

const action = (ids: IdFactory, label: string, href: string, props: JsonObject): LoomNode =>
  buildElement(ids, { type: "loom.action", props: { href, ...props }, children: [buildText(ids, label)] })

const hero = (ids: IdFactory): LoomNode =>
  buildElement(ids, {
    type: "loom.hero",
    props: { backdrop: "aurora", align: "center", stature: "tall", eyebrow: "The AI-native UI runtime" },
    children: [
      buildSlot(ids, "heading", [
        heading(ids, 1, "Your AI can change this page. You can see exactly what it changed.", true),
      ]),
      prose(ids, "Loom makes the interface data. Every change arrives as a proposal with a rationale, is weighed against a policy, and carries its own way back.", {
        size: "lead",
        measured: true,
      }),
      /*
       * Neither of these says "change this page", and the first one used to.
       *
       * A filled primary button reading *Change this page* — pointing at
       * GitHub — sat six inches from the demo's actual primary control, in
       * larger type, on a page whose whole difficulty was that a visitor could
       * not tell the specimen from the instrument. It was the most clickable
       * thing on screen and it led away from the demonstration.
       *
       * The specimen still needs a plausible pair of calls to action, because a
       * marketing page with no buttons is not a marketing page and this tree
       * has to stand as one (§4d builds the real site from the same
       * vocabulary). They just must not be the *same* call the rail is making.
       */
      buildSlot(ids, "actions", [
        action(ids, "Read the source", "https://github.com/jam-overture/loom", {
          variant: "primary",
          scale: "large",
        }),
        action(ids, "Read the decisions", "https://github.com/jam-overture/loom/tree/main/decisions", {
          variant: "secondary",
          scale: "large",
        }),
      ]),
    ],
  })

const logos = (ids: IdFactory): LoomNode =>
  buildElement(ids, {
    type: "loom.logo-cloud",
    props: { label: "The runtime underneath", align: "center" },
    children: [
      buildElement(ids, { type: "loom.logo", props: { name: "Proposals" } }),
      buildElement(ids, { type: "loom.logo", props: { name: "The Gate" } }),
      buildElement(ids, { type: "loom.logo", props: { name: "Revisions" } }),
      buildElement(ids, { type: "loom.logo", props: { name: "Telemetry" } }),
    ],
  })

const feature = (ids: IdFactory, icon: string, title: string, body: string): LoomNode =>
  buildElement(ids, { type: "loom.feature", props: { icon, title, body } })

const features = (ids: IdFactory): LoomNode =>
  buildElement(ids, {
    type: "loom.section",
    props: { eyebrow: "Why a runtime", tone: "canvas" },
    children: [
      buildSlot(ids, "heading", [heading(ids, 2, "A record beside every change")]),
      buildElement(ids, {
        type: "loom.feature-grid",
        props: { columns: "three" },
        children: [
          feature(ids, "📝", "Proposed, not written", "A model emits a delta against the tree it was shown. Nothing reaches the page without passing the Gate first."),
          feature(ids, "⚖️", "Weighed, then decided", "Stakes and reversibility are assessed on separate axes, and one named rule under one named policy decides."),
          feature(ids, "↩️", "Reversible by construction", "The inverse delta is computed when the change is judged, so undo is a button rather than a promise."),
          feature(ids, "🔍", "Attributable forever", "Who asked, what was interpreted, how confident it was, and which revision it produced — all of it survives the request."),
          feature(ids, "🎨", "Themed by three ids", "A palette, a font pack and a style preset live on the root node. Re-theming a page is an ordinary change."),
          feature(ids, "🧩", "Composed from primitives", "The tree names registered components. A proposal can only build what this deployment registered."),
        ],
      }),
    ],
  })

const stats = (ids: IdFactory): LoomNode =>
  buildElement(ids, {
    type: "loom.stat-grid",
    props: { columns: "three" },
    children: [
      buildElement(ids, { type: "loom.stat", props: { value: "4", label: "delta operations", caption: "insert, remove, move, configure" } }),
      buildElement(ids, { type: "loom.stat", props: { value: "2", label: "axes the Gate weighs", caption: "damage and reversibility, never blended" } }),
      buildElement(ids, { type: "loom.stat", props: { value: "0", label: "lines of markup in this page", caption: "it is a tree, all the way down" } }),
    ],
  })

const quote = (ids: IdFactory): LoomNode =>
  buildElement(ids, {
    type: "loom.quote",
    props: {
      quote: "The interesting part was never that the AI changed the page. It is that the change came with its reasoning, its verdict and its way back attached.",
      author: "The thesis, in one sentence",
      role: "decisions/0002",
      emphasis: "feature",
    },
  })

const faqs = (ids: IdFactory): LoomNode =>
  buildElement(ids, {
    type: "loom.section",
    props: { eyebrow: "Questions" },
    children: [
      buildSlot(ids, "heading", [heading(ids, 2, "What people ask first")]),
      buildElement(ids, {
        type: "loom.faq-list",
        children: [
          buildElement(ids, {
            type: "loom.faq",
            props: {
              question: "Can the model change anything it likes?",
              answer: "No. It may only name primitives this deployment registered, and only with props their schemas accept. Anything else is refused before it is judged.",
              open: true,
            },
          }),
          buildElement(ids, {
            type: "loom.faq",
            props: {
              question: "What stops a change nobody wanted?",
              answer: "The Gate. It weighs how much damage a change does and whether it can be taken back, and a policy decides which of those may apply on their own and which wait for a person.",
            },
          }),
          buildElement(ids, {
            type: "loom.faq",
            props: {
              question: "Where does the animation come from, if props are JSON?",
              answer: "The registered component. Behaviour never travels in the tree — a model configures content, variant and theme, and cannot reach the motion.",
            },
          }),
          buildElement(ids, {
            type: "loom.faq",
            props: {
              question: "Is undo a rewind?",
              answer: "No. An undo is proposed, assessed and gated like any other change, and appends a new revision. The log never has a hole in it.",
            },
          }),
        ],
      }),
    ],
  })

const closing = (ids: IdFactory): LoomNode =>
  buildElement(ids, {
    type: "loom.section",
    props: { tone: "accent", width: "readable" },
    children: [
      buildSlot(ids, "heading", [heading(ids, 2, "Ask it for something", true)]),
      prose(ids, "The controls are beside this page. Whatever happens next, the record of it appears with it.", {
        tone: "muted",
        align: "center",
      }),
      action(ids, "Read the build order", "https://github.com/jam-overture/loom#readme", {
        variant: "primary",
        scale: "large",
      }),
    ],
  })

/**
 * The tree a visitor arrives at. Rebuilt per session rather than shared,
 * because a demo whose visitors edited one another's page would be a
 * multiplayer surface nobody asked for — and the ids are deterministic, so two
 * sessions still address the same nodes by the same names.
 */
export const demoPageTree = (): LoomTree => {
  const ids = sequentialIdFactory("demo")

  return createTree(
    buildElement(ids, {
      type: "loom.page",
      props: { [DEMO_THEME_NODE_PROP]: DEMO_STARTING_THEME, width: "wide", fills: true },
      children: [
        hero(ids),
        logos(ids),
        features(ids),
        buildElement(ids, { type: "loom.divider", props: { ornament: "diamond" } }),
        stats(ids),
        quote(ids),
        faqs(ids),
        closing(ids),
      ],
    }),
    ids
  )
}
