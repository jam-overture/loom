import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { color, family, size, space, weight } from "./tokens.js"

/**
 * A run of `loom.link` under a heading — one column of a footer, a row of legal
 * links, the "everything else" list in a sidebar.
 *
 * 0054 names it: the child is `loom.link`, the arrangement is a list. What the
 * arrangement word does *not* claim is the markup — `loom.faq-list` and
 * `loom.stat-grid` are both `<div>`s, and `list` here means the same thing it
 * means there. That matters, because a `<ul>` would have forced a
 * `loom.link-list-item` under 0061 and split the one link primitive a page
 * needs into two that differ by their element and nothing else. A run of
 * anchors in a labelled landmark is what a footer column actually is.
 *
 * **`label` is a prop and not a heading node**, which is 0052's fixed-field
 * half: there is exactly one of it, and the group is meaningless without it in
 * a way a heading beside the group is not. It buys something no composition
 * can: the visible heading and the landmark's accessible name are the *same
 * string*, so a footer of five columns announces five named groups rather than
 * five anonymous ones. Composed out of `loom.stack` + `loom.heading` the two
 * facts drift apart the first time somebody re-words one of them.
 *
 * The element follows the label, for `loom.logo`'s reason. A labelled group is
 * a `<nav>` a reader can jump to; an unlabelled one is a `<div>`, because a
 * page of nameless `<nav>` landmarks is worse for the reader than no landmarks
 * at all — a screen reader's landmark menu fills with entries that all read
 * "navigation".
 */

const props = z
  .object({
    /** The group's name, shown above it and used as the landmark's accessible name. */
    label: z.string().min(1).max(60).optional(),
    /**
     * A column for a footer's groups, a row for the legal line under one.
     * Which way the links run is not how many there are, so it is a prop.
     */
    direction: z.enum(["column", "row"]).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

export const loomLinkList = definePrimitive({
  type: "loom.link-list",
  description: "A named run of loom.link — one column of a footer, or a row of secondary links.",
  props,
  slots: [],
  component: ({ loom, props: given, children }: LoomPrimitiveProps<Props>) => {
    const row = given.direction === "row"
    const labelled = given.label !== undefined

    return createElement(
      labelled ? "nav" : "div",
      {
        ...loom.editable,
        ...(labelled ? { "aria-label": given.label } : {}),
        style: {
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: space(3),
        },
      },
      given.label === undefined
        ? null
        : createElement(
            "p",
            {
              style: {
                margin: "0",
                fontFamily: family("heading"),
                fontWeight: weight("heading"),
                fontSize: size(1),
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: color("fg-subtle"),
              },
            },
            given.label
          ),
      createElement(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: row ? "row" : "column",
            alignItems: row ? "center" : "flex-start",
            /**
             * A row wraps and a column does not, for `loom.stack`'s reason:
             * `flex-wrap` on a column spills into a second column the moment
             * anything constrains the height.
             */
            ...(row ? { flexWrap: "wrap" as const } : {}),
            gap: row ? space(4) : space(2),
          },
        },
        children
      )
    )
  },
})
