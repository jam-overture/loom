import { createElement, type CSSProperties, type ReactNode } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { COLUMN_NAMES } from "./layout.js"
import { colour, hairline, space } from "./tokens.js"

/**
 * The band that closes a page: who this is, what else is here, and the small
 * print underneath.
 *
 * The counterpart to `loom.nav` and built the same way, because it is the same
 * shape of problem — a `brand` region and a `note` region the band places at
 * fixed positions, and however many link groups in between as ordinary
 * children. The marketing site composed one out of nested `loom.stack`s and
 * paid for it twice: nothing announced a `contentinfo` landmark, and the
 * groups of links had no names, so the "columns" were columns only in the sense
 * that they happened to be arranged that way.
 *
 * **The rule above the note is the primitive's, not a `loom.divider`.** It is
 * not decoration a tree chose — it is how this band separates its two halves,
 * the same way `loom.card` rules off its footer region, and a page that had to
 * remember to put a divider in the right place would be a page that renders
 * subtly wrong whenever it forgot. Nothing stops a tree adding a divider of its
 * own among the children.
 *
 * `columns` is `loom.feature-grid`'s prop and means what it means there: a
 * minimum width fed to `auto-fit`, a floor rather than a count. Changing it
 * moves no group in or out, which is what keeps it a prop and not `insert` in
 * disguise. What it does *not* borrow is that band's scale — see
 * `GROUP_MINIMUMS`, which is the one place this primitive declines to share —
 * and what it now also does is *hold*: see {@link promisedWidth}, which is the
 * difference between a floor a band declares and a floor a band gets.
 */

const props = z
  .object({
    /** `surface` lifts the band off the page; `plain` sits on the canvas with a rule above it. */
    tone: z.enum(["plain", "surface"]).optional(),
    /** A floor for each group's column — never a limit on how many groups there are. */
    columns: z.enum(COLUMN_NAMES).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

/**
 * The brand region is given a column of its own that is wider than a group's,
 * because what goes in it is a wordmark and a sentence rather than four links.
 * It is a basis and not a width — it wraps to the full measure on a phone like
 * everything else here. It does **not** grow: a footer whose blurb takes half
 * the band and leaves two of its four columns to wrap is what `flex-grow: 1`
 * on both halves produces, and it is the first thing that went wrong here.
 */
const BRAND_BASIS = "20rem"

/**
 * A floor per group column, and deliberately **not** `COLUMN_MINIMUMS`.
 *
 * That scale is shared by `loom.feature-grid`, `loom.perk-list` and every band
 * that lays out *cards*, and its narrowest step is 13rem because a card holds a
 * glyph, a title and a sentence. A footer column holds a five-character label
 * and four links. Fed the card scale, `columns: "four"` renders two — the names
 * stop meaning what they say, which is worse than a second constant.
 *
 * It is a floor rather than a count for the same reason theirs is: nothing here
 * truncates the list, so changing it moves no group in or out.
 */
const GROUP_MINIMUMS: Readonly<Record<(typeof COLUMN_NAMES)[number], string>> = {
  auto: "10rem",
  two: "17rem",
  three: "12rem",
  four: "9rem",
}

/**
 * How many columns each name is promising, which until 25 September nothing
 * here knew.
 *
 * `auto` promises none — it is the one value that means *as many as fit*, which
 * is what `auto-fit` does on its own.
 */
const GROUP_PROMISES: Readonly<Record<(typeof COLUMN_NAMES)[number], number>> = {
  auto: 0,
  two: 2,
  three: 3,
  four: 4,
}

/**
 * The width the groups need before they will give any back to the brand.
 *
 * **This is the fix for the fault the whole-page photograph found**, and the
 * fault is worth stating because the constant above was already written against
 * it: `GROUP_MINIMUMS` exists so that *"`columns: "four"` renders two — the
 * names stop meaning what they say"* could not happen. It happened anyway, one
 * step smaller. A four-group footer on the canonical wide page, with
 * `tone: "surface"`, rendered **three columns and an orphan on a second row**,
 * under both starter palettes.
 *
 * Nothing was wrong with the floor. `auto-fit` divides what is *left over*, and
 * what is left over is decided by the brand column and the surface tone's own
 * inset: four 9rem tracks with a `space(5)` between them need 672px, and after
 * a 20rem wordmark-and-blurb had taken its share of a 1120px page there was
 * less than that. Six and a half rem of blurb was deciding how many link groups
 * a footer has, which is not a thing `columns` says anywhere.
 *
 * So `columns` stops competing with the brand for room. The groups reserve the
 * width their promise needs, and the row resolves it the two ways flexbox has:
 * where the line still fits, the brand shrinks (it has `flex-shrink` and has
 * never grown — see {@link BRAND_BASIS}); where it does not, the row **wraps**
 * and the groups get a line of their own, which is what happens at the
 * canonical wide page and is what the photograph beside this run's report
 * shows — a wordmark, then four columns across the band. Both outcomes keep the
 * four columns, which is the whole of what the name promised.
 *
 * `min(100%, …)` is what stops the reservation becoming an overflow: on a phone
 * it is capped at the band's own width, so the grid falls to one column instead
 * of demanding four and pushing the page sideways.
 *
 * It is still not a count — nothing here truncates or pads the list, and a
 * footer with five groups under `columns: "four"` wraps the fifth exactly as
 * before. What it is, is the floor being *kept* rather than merely declared.
 */
const promisedWidth = (name: (typeof COLUMN_NAMES)[number]): string | undefined => {
  const columns = GROUP_PROMISES[name]
  if (columns === 0) return undefined

  return `min(100%, calc(${columns} * ${GROUP_MINIMUMS[name]} + ${columns - 1} * ${space(5)}))`
}

export const loomFooter = definePrimitive({
  type: "loom.footer",
  description:
    "The band that closes a page: a brand region, loom.link-list children as its columns, and a note beneath a rule.",
  props,
  slots: ["brand", "note"],
  component: ({ loom, props: given, children }: LoomPrimitiveProps<Props>) => {
    const tone = given.tone ?? "plain"
    const brand = loom.slots["brand"]
    const note = loom.slots["note"]

    const region = (key: string, style: CSSProperties, content: ReactNode): ReactNode =>
      content === undefined || content === null
        ? null
        : createElement("div", { key, style }, content)

    const groups =
      children === null
        ? null
        : createElement(
            "div",
            {
              key: "groups",
              style: {
                display: "grid",
                gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${GROUP_MINIMUMS[given.columns ?? "four"]}), 1fr))`,
                /** Tighter across than down: columns of links read as columns, not as a grid of blocks. */
                columnGap: space(5),
                rowGap: space(6),
                flex: "1 1 20rem",
                minWidth: promisedWidth(given.columns ?? "four"),
              },
            },
            children
          )

    return createElement(
      "footer",
      {
        ...loom.editable,
        style: {
          display: "flex",
          flexDirection: "column",
          gap: space(6),
          /** No stylesheet resets these, so padding would otherwise widen the band past its parent. */
          boxSizing: "border-box",
          width: "100%",
          paddingBlock: space(7),
          ...(tone === "surface"
            ? { background: colour("bg-surface"), paddingInline: space(5) }
            : { borderBlockStart: `1px solid ${hairline()}` }),
        },
      },
      brand === undefined && groups === null
        ? null
        : createElement(
            "div",
            {
              key: "top",
              style: {
                display: "flex",
                flexWrap: "wrap",
                alignItems: "flex-start",
                gap: space(6),
              },
            },
            region(
              "brand",
              { display: "flex", flexDirection: "column", gap: space(3), flex: `0 1 ${BRAND_BASIS}` },
              brand
            ),
            groups
          ),
      note === undefined
        ? null
        : createElement(
            "div",
            {
              key: "note",
              style: {
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: space(4),
                paddingBlockStart: space(5),
                borderBlockStart: `1px solid ${hairline()}`,
                color: colour("fg-subtle"),
              },
            },
            note
          )
    )
  },
})
