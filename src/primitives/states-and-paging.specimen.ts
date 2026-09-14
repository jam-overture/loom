import { sequentialIdFactory } from "../ids.js"
import type { JsonObject } from "../json.js"
import { THEME_PROP_KEY } from "../reserved-props.js"
import { buildElement, buildSlot, buildText } from "../tree/builders.js"
import { createTree } from "../tree/tree.js"
import { themeSelectionSchema, type ThemeSelection } from "../theme/theme.js"

import { defineSpecimen } from "../../tools/specimen/specimen.js"

/**
 * The four things this run built, arranged so each is beside the thing it is
 * *not*.
 *
 * That rule is the debts specimen's and the last run restated it: a photograph
 * of the fixed state alone proves nothing, because it looks like every other
 * photograph. So the waiting band runs a card that has arrived beside three
 * that have not, the empty band shows the region both ways, and the pager sets
 * its own tiles beside the same links in a plain row — which is the primitive
 * this one would be if the ends were children.
 *
 * **What it cannot show is the sweep travelling.** A still frame catches the
 * sheen at whatever position the animation had reached, so what the image
 * settles is that the bars are *there* and the right shape; that they move, and
 * that they stop moving for a reader who asked for calm, is asserted in
 * `library.test.ts` where it can be read rather than guessed at.
 */

const build = (theme: ThemeSelection) => {
  const idFactory = sequentialIdFactory()
  const text = (value: string) => buildText(idFactory, value)

  const heading = (level: number, words: string) =>
    buildSlot(idFactory, "heading", [
      buildElement(idFactory, { type: "loom.heading", props: { level }, children: [text(words)] }),
    ])

  const link = (href: string, label: string, props: JsonObject = {}) =>
    buildElement(idFactory, { type: "loom.link", props: { href, ...props }, children: [text(label)] })

  const waiting = (props: JsonObject) =>
    buildElement(idFactory, { type: "loom.waiting-state", props })

  const card = (inside: ReturnType<typeof waiting>) =>
    buildElement(idFactory, {
      type: "loom.card",
      props: { padding: "normal", tone: "surface" },
      children: [inside],
    })

  /**
   * The arrived card and the waiting one are the same card at the same width,
   * so the geometry the skeleton reserves can be read against the geometry it
   * is reserving it for. That is the whole claim a skeleton makes over a
   * spinner and it is only checkable side by side.
   */
  const arriving = buildElement(idFactory, {
    type: "loom.section",
    props: { eyebrow: "Waiting", anchor: "waiting" },
    children: [
      heading(2, "The shape of what has not arrived"),
      buildElement(idFactory, {
        type: "loom.prose",
        props: { size: "lead", tone: "muted" },
        children: [
          text("One card has answered. The three beside it are holding their geometry open, so nothing moves when they do."),
        ],
      }),
      buildElement(idFactory, {
        type: "loom.grid",
        props: { columns: "four", gap: "loose" },
        children: [
          buildElement(idFactory, {
            type: "loom.card",
            props: { padding: "normal", tone: "surface" },
            children: [
              buildElement(idFactory, {
                type: "loom.media",
                props: { src: "https://example.com/cover.jpg", alt: "", decorative: true, aspect: "wide" },
              }),
              buildElement(idFactory, {
                type: "loom.heading",
                props: { level: 3 },
                children: [text("The one that answered")],
              }),
              buildElement(idFactory, {
                type: "loom.prose",
                children: [text("Rendered from a source that came back inside the ceiling.")],
              }),
            ],
          }),
          card(waiting({ shape: "card" })),
          card(waiting({ shape: "profile" })),
          card(waiting({ shape: "lines", lines: 5 })),
        ],
      }),
    ],
  })

  const nothing = buildElement(idFactory, {
    type: "loom.section",
    props: { eyebrow: "Empty", anchor: "empty" },
    children: [
      heading(2, "The answer that is legitimately none"),
      buildElement(idFactory, {
        type: "loom.grid",
        props: { columns: "two", gap: "loose", align: "start" },
        children: [
          buildElement(idFactory, {
            type: "loom.empty-state",
            props: { outline: "dashed", align: "center" },
            children: [
              buildSlot(idFactory, "media", [
                buildElement(idFactory, {
                  type: "loom.icon",
                  props: { shape: "bare", tone: "neutral", size: "large" },
                  children: [text("✶")],
                }),
              ]),
              heading(3, "No proposals yet"),
              text(
                "Every change a visitor asks for lands here first, with who asked for it and what it would cost."
              ),
              buildSlot(idFactory, "actions", [
                buildElement(idFactory, {
                  type: "loom.action",
                  props: { href: "https://example.com/propose", variant: "primary" },
                  children: [text("Propose a change")],
                }),
              ]),
            ],
          }),
          /**
           * The same absence inside a card, where a dashed rectangle would be a
           * box drawn in a box. `outline: none` is the reason the prop is an
           * enum rather than a boolean nobody would have set.
           */
          buildElement(idFactory, {
            type: "loom.card",
            props: { padding: "normal", tone: "outline" },
            children: [
              buildElement(idFactory, {
                type: "loom.heading",
                props: { level: 3 },
                children: [text("Archive")],
              }),
              buildElement(idFactory, {
                type: "loom.empty-state",
                props: { outline: "none", align: "start", stature: "compact" },
                children: [text("Nothing archived this quarter.")],
              }),
            ],
          }),
        ],
      }),
    ],
  })

  const along = buildElement(idFactory, {
    type: "loom.section",
    props: { eyebrow: "Paging", anchor: "paging" },
    children: [
      heading(2, "Along a run, rather than out of it or across it"),
      buildElement(idFactory, {
        type: "loom.link-pager",
        props: { align: "center" },
        children: [
          buildSlot(idFactory, "previous", [link("/archive/1", "← Newer", { tone: "muted" })]),
          link("/archive/1", "1"),
          link("/archive/2", "2", { current: true }),
          link("/archive/3", "3"),
          text("…"),
          link("/archive/9", "9"),
          buildSlot(idFactory, "next", [link("/archive/3", "Older →", { tone: "muted" })]),
        ],
      }),
      /**
       * The same pager asking for `spread` — the archive-footer shape, with the
       * two ends at the band's edges. Both arrangements are here because the
       * difference between them is the only thing the prop does, and a
       * photograph of one of them says nothing about the choice.
       */
      buildElement(idFactory, {
        type: "loom.link-pager",
        props: { align: "spread" },
        children: [
          buildSlot(idFactory, "previous", [link("/archive/1", "← Newer", { tone: "muted" })]),
          link("/archive/1", "1"),
          link("/archive/2", "2", { current: true }),
          link("/archive/3", "3"),
          text("…"),
          link("/archive/9", "9"),
          buildSlot(idFactory, "next", [link("/archive/3", "Older →", { tone: "muted" })]),
        ],
      }),
      /**
       * The same links with no pager around them — what the library had before
       * this run, and what the tiles and the two placed ends are worth.
       */
      buildElement(idFactory, {
        type: "loom.link-list",
        props: { label: "The same links, in the row this library already had", direction: "row" },
        children: [
          link("/archive/1", "← Newer", { tone: "muted" }),
          link("/archive/1", "1"),
          link("/archive/2", "2", { current: true }),
          link("/archive/3", "3"),
          link("/archive/9", "9"),
          link("/archive/3", "Older →", { tone: "muted" }),
        ],
      }),
      buildElement(idFactory, {
        type: "loom.link-list",
        props: { label: "On this page", direction: "row" },
        children: [
          link("#waiting", "Waiting"),
          link("#empty", "Empty"),
          link("#paging", "Paging"),
          link("#consent", "Consent"),
        ],
      }),
    ],
  })

  const consent = buildElement(idFactory, {
    type: "loom.section",
    props: { eyebrow: "Consent", anchor: "consent" },
    children: [
      heading(2, "The question a contact form could not ask"),
      /**
       * A `loom.stack` and not a `loom.form`, which is the specimen harness
       * showing through rather than a design choice. Nothing here can wire a
       * submission destination, so a form in a specimen always renders as the
       * disabled fieldset `loom.form` correctly draws when nobody said where to
       * post — at `opacity: 0.6`, which is an honest photograph of a form and a
       * useless one of a checkbox. Filed for the harness.
       */
      buildElement(idFactory, {
        type: "loom.stack",
        props: { gap: "normal", align: "stretch" },
        children: [
          buildElement(idFactory, {
            type: "loom.field",
            props: { name: "email", label: "Email", type: "email", required: true, placeholder: "you@example.com" },
          }),
          buildElement(idFactory, {
            type: "loom.field",
            props: {
              name: "consent",
              label: "Email me when something I proposed is decided.",
              type: "checkbox",
              required: true,
              hint: "One message per decision. Nothing else, ever.",
            },
          }),
          buildElement(idFactory, {
            type: "loom.button",
            props: { variant: "primary" },
            children: [text("Subscribe")],
          }),
        ],
      }),
    ],
  })

  const page = buildElement(idFactory, {
    type: "loom.page",
    props: { [THEME_PROP_KEY]: theme, width: "wide", fills: true },
    children: [arriving, nothing, along, consent],
  })

  return createTree(page, idFactory)
}

export default defineSpecimen({
  name: "states-and-paging",
  title: "The states a region is in, and the control that walks along one",
  build,
  themes: [
    {
      label: "editorial",
      selection: themeSelectionSchema.parse({
        palette: "editorial",
        fontPack: "editorial-serif",
        stylePreset: "comfortable",
      }),
    },
    {
      label: "bold",
      selection: themeSelectionSchema.parse({
        palette: "bold",
        fontPack: "bold-sans",
        stylePreset: "airy-modern",
      }),
    },
  ],
})
