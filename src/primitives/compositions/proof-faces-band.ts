import type { IdFactory } from "../../ids.js"
import { buildElement, buildText } from "../../tree/builders.js"
import type { ElementNode } from "../../tree/node.js"

import type { Composition } from "./composition.js"

/**
 * Social proof as people rather than as companies — a cluster of faces, a
 * score, and one line saying what both are of.
 *
 * ## The pair this makes, which is the reason to build it
 *
 * `proof` is a row of six customer wordmarks. That is the right proof for a
 * product sold to companies, and it is the wrong proof for one sold to the
 * person using it: a logo wall says *organisations have signed contracts* and
 * a reader deciding whether to spend an afternoon on something wants to know
 * *people like me are using this and they do not regret it*. Both are the
 * `proof` region — the quiet band under the hero that answers *is this real* —
 * and neither substitutes for the other.
 *
 * So this is a design of `proof` under 0162 and not a new part under
 * [0171](../../../decisions/0171-a-page-part-is-earned-by-the-region-it-occupies.md):
 * the region is occupied, and a page takes one of the two.
 *
 * ## Three primitives the catalogue had never said
 *
 * `loom.avatar`, `loom.avatar-row` and `loom.rating` were registered, tested
 * and unreachable from the phrasebook until this band. They are part of the
 * forty-four this run measured, and they are the cheapest three in the list:
 * nothing about them was blocked, no framework decision was in the way, and no
 * Hermes block happened to be shaped like them.
 *
 * ## No image, and the monogram is not a fallback
 *
 * `loom.avatar` takes an optional `image` and draws a monogram from `name`
 * when there is none. The catalogue ships no image source at all — there is a
 * test — so every face here is a monogram, and it is worth being clear that
 * this is the band at full strength rather than the band with its pictures
 * missing. `loom.avatar`'s own header makes the point: `name` is the
 * accessible name *and* the monogram's source, so a face with a photograph and
 * a face without one are described identically to a screen reader. A
 * deployment that has photographs sets `image` on six nodes and changes
 * nothing else.
 *
 * What the monograms do give up is the one thing a photograph of strangers
 * buys, and a page should know it is giving it up: six initials read as a
 * *count* of people, and six faces read as *those* people.
 *
 * ## The rating is a node beside the row, not a prop on it
 *
 * `loom.rating` is its own node rather than a `score` prop on the avatar row,
 * and the granularity doc's sharper question is what decides it: a page that
 * has faces and no score, or a score and no faces, is an ordinary page, and
 * with a prop neither is reachable without a `configure` that means *hide the
 * thing*. As two nodes it is a `remove`.
 *
 * The score's `caption` is the source — *on G2* — because a number out of five
 * with nothing saying where it came from is the least trustworthy element a
 * marketing page can carry, and this band's entire job is trust.
 *
 * ## Two stacks rather than one row, which the first photograph decided
 *
 * It shipped as a single `row` of three — faces, score, sentence — and at
 * 1280 the three spread across the full width with the sentence stranded at
 * the far right, reading as three unrelated items rather than as one claim.
 * The faces and the score are **the same assertion measured two ways** and
 * belong on one line; the sentence is what both are *of* and belongs under
 * them. So it is a column holding a row, and the sentence is centred to the
 * pair above it rather than left to the band's edge.
 *
 * Nothing failed and nothing could have: a row of three renders exactly as
 * well as a column of two at every viewport, and on a phone the two versions
 * stack identically. This is the class of defect only a picture reaches.
 *
 * ## Why the row overlaps
 *
 * `spacing: "overlap"` is the cluster; `spaced` is the same faces set apart.
 * The cluster is right here because these faces are a *quantity* — the sentence
 * beside them says two thousand — and overlapping is how a row of six says
 * *and more* without a seventh node saying it. A row of authors, where each
 * face is a person the reader might recognise, would take `spaced`, and that
 * is one `configure` away.
 */
const FACES = ["Ada Okonkwo", "Rui Tavares", "Martine Lefèvre", "Jonas Kirk", "Priya Raman", "Tom Hedlund"] as const

export const proofFacesBand: Composition = {
  id: "proof-faces",
  part: "proof",
  label: "Faces and a score",
  promise: "A cluster of six faces, a score out of five with its source, and one line saying what both are of.",
  rationale:
    "Proof by people is a loom.avatar-row holding one loom.avatar per person, beside a loom.rating. Each face is a node so a page adds and drops them one at a time, and the score is a sibling rather than a prop so a page can carry either without the other.",
  uses: ["loom.section", "loom.stack", "loom.avatar-row", "loom.avatar", "loom.rating", "loom.prose"],
  build: (ids: IdFactory): ElementNode =>
    buildElement(ids, {
      type: "loom.section",
      props: { width: "wide" },
      children: [
        buildElement(ids, {
          type: "loom.stack",
          props: { direction: "column", gap: "normal", align: "center" },
          children: [
            buildElement(ids, {
              type: "loom.stack",
              props: { direction: "row", gap: "loose", align: "center", justify: "center" },
              children: [
                buildElement(ids, {
                  type: "loom.avatar-row",
                  props: { spacing: "overlap" },
                  children: FACES.map((name) =>
                    buildElement(ids, { type: "loom.avatar", props: { name, size: "medium", shape: "circle" } })
                  ),
                }),
                buildElement(ids, {
                  type: "loom.rating",
                  props: { score: 4.8, caption: "on G2, from 214 reviews", size: "medium" },
                }),
              ],
            }),
            buildElement(ids, {
              type: "loom.prose",
              props: { size: "small", tone: "muted", align: "center" },
              children: [buildText(ids, "Two thousand teams have shipped a change through Loom this month.")],
            }),
          ],
        }),
      ],
    }),
}
