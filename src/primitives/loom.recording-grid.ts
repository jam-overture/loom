import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { GAP_NAMES, GAPS } from "./layout.js"
import { space } from "./tokens.js"

/**
 * A band of `loom.recording` cells — the video reel, the episode feed, the
 * playlist.
 *
 * **Named neither half of what `docs/hermes-port-map.md` proposed.** That map
 * predicted `loom.episode-list`, and said in the same breath to read the
 * arrangement word as a prediction rather than a commitment. Both words changed
 * and each for its own reason:
 *
 * - **`-grid` rather than `-list`**, which is 0054 applied exactly as
 *   `loom.offering-grid` applied it: the arrangement word names *what the
 *   container does with its children*, and what this one does is
 *   `repeat(auto-fit, minmax(…))`. Every primitive in this library that lays out
 *   that way is a `-grid`, and 0054's own consequence is why the word has to be
 *   right before it ships — a container that changes its arrangement changes its
 *   name, and a rename is a breaking change to every stored tree.
 * - **`recording` rather than `episode`**, which is a question about the child
 *   and is argued in `loom.recording.ts`. In short: `episode` is one of the four
 *   Hermes blocks' words rather than the name of what all four are, and this
 *   library has consistently taken the general noun — `loom.milestone` over
 *   *timeline-item*, `loom.credential` over *award*, `loom.offering` over
 *   *service*. A track on a playlist is not an episode of anything.
 *
 * **Its column vocabulary is its own, and `one` is the point of it**, for
 * `loom.offering-grid`'s reason repeated at a different width. The shared
 * `COLUMN_NAMES` has no name for a single full-width column, and that column is
 * not a degenerate grid here — it is the arrangement half of these blocks were
 * always in. A podcast feed and a playlist are a column of rows, and a
 * `loom.recording` *becomes* a row exactly when it is given that width. So
 * `columns: "three"` is a video reel and `columns: "one"` is a feed, out of one
 * set of children and one primitive.
 *
 * It is still a **floor and never a count** — the distinction
 * `docs/primitive-granularity.md` names as the easiest one to get wrong.
 * Nothing here truncates the band, so changing it changes no node.
 *
 * `alignItems: stretch` is load-bearing rather than copied along: a
 * `loom.recording` pins its meta strip to the card's floor with an `auto`
 * margin, which means nothing unless the cell fills the row's height. A grid
 * that let its cells shrink to content would leave a reel's badges at six
 * different heights and no primitive able to say why.
 *
 * Like every container here it lays out and nothing else — it does not style its
 * children and does not require them to be recordings. Rendering is total
 * (0008), and a grid that blanked itself over an unexpected child fails worse
 * than one with something odd in a cell.
 */

const COLUMNS = ["auto", "one", "two", "three"] as const

const props = z
  .object({
    /**
     * A floor for each column, never a count. `one` is a full-width column,
     * which is the arrangement a feed and a playlist want — and the width at
     * which a `loom.recording` becomes a queue row rather than a card.
     */
    columns: z.enum(COLUMNS).optional(),
    gap: z.enum(GAP_NAMES).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

/**
 * Wider than `loom.feature-grid`'s, narrower than `loom.article-grid`'s. A
 * recording cell carries artwork at a fixed ratio with a runtime pinned into its
 * corner, and below about 17rem the pill and the play mark start to collide;
 * above about 26rem in a two-column band the artwork reads as a poster rather
 * than a thumbnail, which is the point of a reel.
 */
const MINIMUMS: Readonly<Record<(typeof COLUMNS)[number], string>> = {
  auto: "19rem",
  one: "100%",
  two: "26rem",
  three: "18rem",
}

export const loomRecordingGrid = definePrimitive({
  type: "loom.recording-grid",
  description:
    "A band of loom.recording cells — a video reel, an episode feed, a playlist. Set columns to one for a full-width queue.",
  props,
  slots: [],
  copy: [],
  component: ({ loom, props: given, children }: LoomPrimitiveProps<Props>) =>
    createElement(
      "div",
      {
        ...loom.editable,
        style: {
          display: "grid",
          gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${MINIMUMS[given.columns ?? "auto"]}), 1fr))`,
          gap: given.gap === undefined ? space(4) : GAPS[given.gap],
          width: "100%",
          /** Equal-height cells, which is what makes a pinned meta strip mean anything. */
          alignItems: "stretch",
        },
      },
      children
    ),
})
