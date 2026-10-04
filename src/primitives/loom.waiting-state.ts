import { createElement, type CSSProperties, type ReactNode } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { libraryStylesheet, LIBRARY_CLASS } from "./stylesheet.js"
import { radius, space } from "./tokens.js"

/**
 * The other half of what a bound region needs: a placeholder with the shape of
 * the thing that has not arrived — a skeleton.
 *
 * `loom.empty-state` says *there is nothing here*. This says *there is
 * something here and it is on its way*, and the two are not interchangeable:
 * [0058](../../decisions/0058-a-binding-is-a-question-the-tree-asks-answered-before-the-walk.md)
 * refuses to let a source express "empty" as a failure precisely so that a
 * reader never reads one as the other, and a library with only one of these
 * primitives would undo that at the last step.
 *
 * **Why a shape and not a spinner.** A spinner says the page is busy. A
 * skeleton says *what is coming and how much of it*, so the layout does not
 * jump when it lands — the whole reason the device exists is that it reserves
 * the geometry. That is also why the shapes are a closed enum rather than a
 * free composition: the value is in matching what will replace it, and four
 * named shapes a model can pick from match more reliably than a subtree a model
 * has to build to resemble another subtree.
 *
 * **`lines` counts bars and is still a prop, which is the near-miss worth
 * stating.** The granularity test is *does changing this prop change the set of
 * nodes?* — and a bar is not a node. Nobody moves the second bar of a skeleton,
 * nobody re-words it, and there is nothing at the other end of a `move` that
 * addressed one. It is `loom.rating` drawing five stars from one score and
 * `loom.meter` drawing one proportion: interior with nothing interesting in it,
 * which the granularity doc keeps atomic on purpose.
 *
 * **What is deliberately not a prop is `repeat`.** A waiting grid of three cards
 * is three nodes in a `loom.grid`, not one node with a count — because *there*
 * the repeated thing is the shape of a node, each one is what a card will
 * become, and a `repeat: 3` would be `insert` in a prop bag by the same test
 * that lets `lines` through.
 *
 * **It announces itself once and hides its bars.** `role="status"` with
 * `aria-busy` is the pairing a screen reader is built to handle; the bars are
 * `aria-hidden` because eleven rectangles read aloud is worse than silence. The
 * word is declared rather than taken from the tree
 * ([0060](../../decisions/0060-a-primitive-owns-a-string-and-a-deployment-may-replace-it.md)):
 * a model has nothing to say here that the shape does not already say, and a
 * deployment in French has one string to replace.
 */

const SHAPES = ["lines", "card", "media", "profile"] as const

type Shape = (typeof SHAPES)[number]

const props = z
  .object({
    /**
     * What is coming. `lines` is a paragraph, `card` is a tile in a grid,
     * `media` is an image or an embed holding its aspect ratio open, and
     * `profile` is an avatar with a name beside it.
     */
    shape: z.enum(SHAPES).optional(),
    /** How many text bars, where the shape has any. Four is a paragraph. */
    lines: z.number().int().min(1).max(6).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

/** Defaults per shape: a card carries a title and a line, a profile a name and a role. */
const LINES: Readonly<Record<Shape, number>> = { lines: 3, card: 2, media: 0, profile: 2 }

/**
 * The bars are not all the same width, and that is the whole of why this reads
 * as text rather than as a stack of rectangles. The last one is short, the way
 * the last line of a paragraph is.
 */
const widthOf = (index: number, count: number): string =>
  index === count - 1 && count > 1 ? "62%" : index === 0 && count > 2 ? "92%" : "100%"

const bar = (key: string, style: CSSProperties): ReactNode =>
  createElement("div", {
    key,
    "aria-hidden": true,
    className: LIBRARY_CLASS.waitingBar,
    style: { borderRadius: radius("sm"), ...style },
  })

const textBars = (count: number): readonly ReactNode[] =>
  Array.from({ length: count }, (_unused, index) =>
    bar(`line-${index}`, {
      height: space(3),
      width: widthOf(index, count),
    })
  )

const shapeOf = (shape: Shape, lines: number): ReactNode => {
  if (shape === "media") {
    return bar("media", {
      /**
       * An aspect ratio rather than a height, because the point of the shape is
       * that what replaces it lands in the same box. A height in `rem` is right
       * at one column width and wrong at every other.
       */
      width: "100%",
      aspectRatio: "16 / 10",
      borderRadius: radius("md"),
    })
  }

  if (shape === "profile") {
    return createElement(
      "div",
      { style: { display: "flex", alignItems: "center", gap: space(3), width: "100%" } },
      bar("avatar", { width: space(7), height: space(7), borderRadius: radius("full"), flex: "0 0 auto" }),
      createElement(
        "div",
        { style: { display: "flex", flexDirection: "column", gap: space(2), flex: "1 1 auto" } },
        ...textBars(lines)
      )
    )
  }

  const body = createElement(
    "div",
    { style: { display: "flex", flexDirection: "column", gap: space(2), width: "100%" } },
    ...textBars(lines)
  )

  return shape === "card"
    ? createElement(
        "div",
        { style: { display: "flex", flexDirection: "column", gap: space(3), width: "100%" } },
        bar("cover", { width: "100%", aspectRatio: "16 / 10", borderRadius: radius("md") }),
        body
      )
    : body
}

/**
 * Visually hidden and still read aloud. It is a `clip-path` rather than
 * `display: none`, which removes it from the accessibility tree, and rather
 * than a 0×0 box, which some screen readers skip.
 */
const ANNOUNCEMENT: CSSProperties = {
  position: "absolute",
  width: "1px",
  height: "1px",
  margin: "-1px",
  padding: "0",
  overflow: "hidden",
  clipPath: "inset(50%)",
  whiteSpace: "nowrap",
  border: "0",
}

export const loomWaitingState = definePrimitive({
  type: "loom.waiting-state",
  description:
    "The waiting state: a loading skeleton shaped like the thing that has not arrived — a paragraph, a card, a media box, or a person.",
  props,
  slots: [],
  copy: [],
  text: { loading: "Loading" },
  component: ({ loom, props: given, children: _unused }: LoomPrimitiveProps<Props, "loading">) => {
    const shape: Shape = given.shape ?? "lines"

    return createElement(
      "div",
      {
        ...loom.editable,
        role: "status",
        "aria-busy": true,
        style: { position: "relative", display: "flex", width: "100%" },
      },
      libraryStylesheet(),
      createElement("span", { style: ANNOUNCEMENT }, loom.text.loading),
      shapeOf(shape, given.lines ?? LINES[shape])
    )
  },
})
