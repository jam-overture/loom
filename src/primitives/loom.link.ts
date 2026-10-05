import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { libraryStylesheet, LIBRARY_CLASS } from "./stylesheet.js"
import { colour, family, size, weight, type RampStep } from "./tokens.js"
import { linkUrlSchema } from "./url.js"

/**
 * A link that is a link — text, a destination, and nothing drawn around it.
 *
 * The library had no such thing for thirty-seven primitives, which is longer
 * than it sounds: `loom.action` is a *button*, and a page that wanted a row of
 * navigation items or a column of footer links had to spend one on each. The
 * marketing site did exactly that and said so in a comment — five `quiet`
 * buttons across the top, because a quiet button is the closest thing the
 * catalogue offered to a nav item. A quiet button is not a nav item. It carries
 * a button's padding, a button's pill radius and a button's `align-self`, and
 * five of them in a row read as five dismissed choices rather than as a menu.
 *
 * Its label is a `text` child rather than a prop, which is 0059 exactly: one
 * string is the whole of what the node says, so re-wording it is a `configure`
 * on a text node that the analysis reports as a change to that string alone.
 *
 * **`current` is the prop the chrome could not do without.** A site's header
 * knows which page it is on; nothing in the tree could say so, so the marketing
 * site's header dropped the current route from its own links rather than mark
 * it — a menu that changes length as you walk through the site. It is a real
 * prop under the granularity test: no delta operation reorders or removes
 * anything when it flips, and what it emits is `aria-current="page"`, which is
 * the accessible fact and the styling hook at once.
 */

const props = z
  .object({
    href: linkUrlSchema,
    /**
     * `default` for a menu across the top, `muted` for the columns in a footer
     * where the links are a reference rather than an invitation, and `accent`
     * for the one item in either that is louder than the rest.
     *
     * **`accent` used to say *the one link in a paragraph that is the point of
     * the paragraph*, and that job is `loom.inline-link`'s** (0227). It was
     * never a job this primitive could do: the sentence survived a month
     * because nothing had tried it, and when `Loom marketing` did, all three of
     * the properties below defeated it. The prop is unchanged and still right
     * for a louder footer item; only the claim about where it goes was wrong.
     */
    tone: z.enum(["default", "muted", "accent"]).optional(),
    scale: z.enum(["small", "medium"]).optional(),
    /** The page the reader is already on. Emits `aria-current`, and pins the underline. */
    current: z.boolean().optional(),
    /** Opens in a new tab, with the `rel` that has to accompany it. */
    external: z.boolean().optional(),
  })
  .strict()

type Props = z.infer<typeof props>

const TONES = {
  default: colour("fg-default"),
  muted: colour("fg-muted"),
  accent: colour("accent"),
} as const

const SCALES: Readonly<Record<"small" | "medium", RampStep>> = { small: 2, medium: 3 }

export const loomLink = definePrimitive({
  type: "loom.link",
  description:
    "A plain text link. Its label is child text. Use it for navigation and footers; loom.action is the button.",
  props,
  /** `href` is required, so it is a target however it is configured (0064). */
  interactive: "always",
  slots: [],
  copy: [],
  component: ({ loom, props: given, children }: LoomPrimitiveProps<Props>) => {
    const current = given.current === true

    return createElement(
      "a",
      {
        ...loom.editable,
        href: given.href,
        ...(current ? { "aria-current": "page" } : {}),
        ...(given.external === true ? { target: "_blank", rel: "noreferrer noopener" } : {}),
        /**
         * The wipe-in underline the library already draws for a linked feature
         * tile, which is where the whole of this primitive's motion lives. The
         * stylesheet pins it open for `[aria-current="page"]`, so the current
         * page is marked by the same mark hovering makes rather than by a
         * second treatment a reader has to learn.
         */
        className: `${LIBRARY_CLASS.link} ${LIBRARY_CLASS.underline}`,
        style: {
          /**
           * `inline-block`, not `inline`. The underline is a background the
           * element paints under itself, and a wrapped inline box paints two
           * of them at two widths — the animation would run on each fragment
           * separately. Nav and footer links are short enough that losing
           * mid-phrase wrapping costs nothing.
           */
          display: "inline-block",
          /**
           * Room for the 2px underline to sit below the text rather than
           * through it — in `.loom-link` rather than here, and that placement
           * is load-bearing. An inline value beats a rule, so block padding set
           * on the element is block padding no container can ever vary, and
           * `loom.link-pager` needs exactly that to give a page number a hit
           * area rather than a word with a box drawn tight around it. The
           * stylesheet's first trap, applied before it was sprung.
           */
          fontFamily: family("body"),
          fontWeight: current ? weight("heading") : weight("body"),
          fontSize: size(SCALES[given.scale ?? "medium"]),
          lineHeight: 1.4,
          color: current ? colour("accent") : TONES[given.tone ?? "default"],
          textDecoration: "none",
        },
      },
      libraryStylesheet(),
      children
    )
  },
})
