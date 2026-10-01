import { Children, createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { libraryStylesheet, LIBRARY_CLASS } from "./stylesheet.js"
import { color, family, size, space } from "./tokens.js"

/**
 * Where the reader is, and every step back out — a run of `loom.link` with the
 * way home between them.
 *
 * 0054 names it: the child is `loom.link`, the arrangement is a trail. The
 * arrangement word is not one of the five the record listed, and it earns its
 * place the way `cloud` did — it names what the container does with its
 * children, which is the only thing it does, and it is what a person calls that
 * row. What it is *not* is `loom.breadcrumbs`, because the record forbids a
 * bare plural, or `loom.crumb-trail` over a `loom.crumb`, because a crumb is a
 * link and 0054's own consequence is that one link primitive must not become
 * two that differ by the element they render.
 *
 * ## Why this is not `loom.link-list` with a prop
 *
 * The library already arranges links in a row, and the honest question is
 * whether a separator is a third `direction`. It is not, and the difference is
 * not decoration:
 *
 * - A trail's last link is the page the reader is on, which is
 *   `aria-current="page"` and not a destination.
 * - A trail is one landmark whose name is the same on every page of a site, so
 *   the primitive owns the string and the tree never writes it (0063). A
 *   footer column's name is the tree's, and `loom.link-list` takes it as a prop
 *   for exactly that reason.
 * - The separators sit **between** items, which no primitive can know from one
 *   node. They are drawn by the stylesheet on a wrapper this container makes,
 *   rather than by the links, so nothing announces a slash as part of a link's
 *   name.
 *
 * ## Why the separator is a shape by default
 *
 * A `::before` carrying `content: "/"` is announced by some screen readers as
 * part of the row's text and skipped by others, so a page reads *slash docs
 * slash* to one reader and not to another. The default is a rotated corner with
 * `content: ""` — a pure shape with nothing to announce, and the same thing on
 * every reader's machine. The two typographic separators are kept because a
 * documentation site's trail set in a serif wants a slash, and a page that
 * chooses one is choosing a rendering rather than a structure (0052).
 */

const props = z
  .object({
    /**
     * What sits between two crumbs. Three renderings of one arrangement, in
     * `loom.divider`'s `ornament` sense: none of them changes which links
     * exist, and none of them is reachable by any delta.
     */
    separator: z.enum(["chevron", "slash", "dot"]).optional(),
    /** `small` for a trail above a heading; `medium` where it is the only chrome on the page. */
    scale: z.enum(["small", "medium"]).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

/**
 * The landmark's name, which is the primitive's own rather than the tree's — a
 * model writes no part of it — and travels with it into every deployment, where
 * a dictionary may translate it and nothing has to remember to (0063).
 */
const TRAIL_TEXT = { label: "Breadcrumb" } as const

type TrailTextKey = keyof typeof TRAIL_TEXT

const SEPARATORS: Readonly<Record<NonNullable<Props["separator"]>, string>> = {
  chevron: LIBRARY_CLASS.trailChevron,
  slash: LIBRARY_CLASS.trailSlash,
  dot: LIBRARY_CLASS.trailDot,
}

export const loomLinkTrail = definePrimitive({
  type: "loom.link-trail",
  description:
    "The trail back out of a page — loom.link children with a separator between them, in a named landmark.",
  props,
  text: TRAIL_TEXT,
  slots: [],
  component: ({ loom, props: given, children }: LoomPrimitiveProps<Props, TrailTextKey>) => {
    const crumbs = Children.toArray(children).map((child, index) =>
      createElement("span", { key: `crumb-${index}`, className: LIBRARY_CLASS.trailCrumb }, child)
    )

    return createElement(
      "nav",
      {
        ...loom.editable,
        "aria-label": loom.text.label,
        className: `${LIBRARY_CLASS.trail} ${SEPARATORS[given.separator ?? "chevron"]}`,
        style: {
          /**
           * The row wraps, and that is the whole of what makes a trail usable
           * on a phone: nothing in a render reads a viewport (0008), so a row
           * that cannot wrap is a row that overflows. What it must not do is
           * truncate — a trail whose middle is hidden is a trail that has
           * stopped being the thing it is for.
           */
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: space(2),
          fontFamily: family("body"),
          fontSize: given.scale === "medium" ? size(3) : size(2),
          color: color("fg-muted"),
        },
      },
      libraryStylesheet(),
      ...crumbs
    )
  },
})
