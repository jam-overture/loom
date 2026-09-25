import { createElement, type ReactNode } from "react"

import { monogramOf } from "./monogram.js"
import { colour, family, radius, size, weight, type RampStep } from "./tokens.js"

/**
 * The face a primitive draws for a person, with or without a photograph.
 *
 * ## Why this is a file and not four copies
 *
 * `monogram.ts` already left `loom.person` for exactly this reason — *"a second
 * copy is how two faces on one page end up disagreeing about what a three-word
 * name reduces to"* — and it took the two letters with it and left the circle
 * behind. Four primitives went on drawing that circle separately, and by 25
 * September two of them had stopped drawing it at all:
 *
 * | | with a photograph | without one |
 * | --- | --- | --- |
 * | `loom.person` | the photograph | the initials |
 * | `loom.avatar` | the photograph | the initials |
 * | `loom.quote` | the photograph | **nothing** |
 * | `loom.message` | the photograph | **nothing** |
 *
 * Nothing said so. Every one of the four renders cleanly, satisfies its schema,
 * emits no diagnostic and measures no overflow, and the catalogue ships no
 * image source — so *every* quote and *every* turn in this library was
 * faceless, permanently, and the band that placed them said in its own doc
 * comment that they were not. The whole-page photograph is what found it, which
 * is [0187](../../decisions/0187-a-frame-with-no-picture-in-it-is-not-the-pictures-shape.md)'s
 * lesson arriving a second time: this class of fault is only ever visible in a
 * picture.
 *
 * So the divergence is closed the way `monogramOf` closed the first half — one
 * function, and a caller that cannot forget the fallback because it cannot
 * reach the photograph without going through it.
 *
 * ## What stays with the caller
 *
 * The **box**, because a portrait is answerable to its content rather than to
 * the theme (`loom.avatar` says why) and four primitives legitimately want four
 * sizes: a team card's 4.5rem, an attribution's 2.75rem, a chat turn's 2.25rem.
 *
 * The **accessible name**, because the two cases are genuinely different and
 * getting it wrong is a screen reader saying a name twice. A portrait with the
 * name beside it in the same node is decoration and says nothing; a portrait
 * standing on its own is a picture of somebody and has to say who. That is
 * `labelled`, and it is the one argument here that is not about paint.
 */

export type PortraitRequest = {
  /** Whose face this is. It is the monogram's source and, when `labelled`, the accessible name. */
  readonly name: string | undefined
  readonly image: string | undefined
  /** A length, not a spacing step — see `loom.avatar` for why a face is not on the preset's scale. */
  readonly box: string
  /** The type step the initials take, chosen to sit inside the box rather than fill it. */
  readonly glyph: RampStep
  /** `soft` is the rounded square a product avatar tends to be; `circle` is a person. */
  readonly corners: "circle" | "soft"
  /**
   * Whether this portrait carries the person's name itself, or sits beside a
   * node that already says it.
   *
   * `false` is the common case in this library — a person card, an attribution,
   * a chat turn all print the name next to the face — and it is also the case
   * that may draw **nothing**: a turn with neither a photograph nor a name has
   * no face to draw and an empty circle in its place is a hole rather than a
   * decision.
   */
  readonly labelled: boolean
  /** React's key, when the caller is placing this among siblings. */
  readonly key?: string | undefined
  /** Anything the caller must put on the element itself — `loom.editable`, in practice. */
  readonly attributes?: Readonly<Record<string, unknown>> | undefined
}

export const portrait = (given: PortraitRequest): ReactNode => {
  const shape = given.corners === "soft" ? radius("md") : radius("full")

  const box = {
    width: given.box,
    height: given.box,
    /** A face never absorbs a row's slack: it is the one thing in an attribution with a fixed size. */
    flex: "0 0 auto",
    borderRadius: shape,
  } as const

  if (given.image !== undefined) {
    return createElement("img", {
      ...given.attributes,
      key: given.key,
      src: given.image,
      /**
       * Empty when something beside it already says the name. Alt text that
       * repeats the neighbouring name makes a screen reader read the person
       * twice, and there is nothing else in a portrait a reader needs
       * described — `loom.media` requires alt precisely because it has no such
       * neighbour.
       */
      alt: given.labelled ? given.name : "",
      loading: "lazy",
      decoding: "async",
      style: {
        ...box,
        display: "block",
        objectFit: "cover",
        /** Shows through while the photograph loads, so the row never has a hole in it. */
        backgroundColor: colour("bg-surface-muted"),
      },
    })
  }

  const initials = monogramOf(given.name)

  /**
   * Nothing, rather than an empty circle. A labelled portrait is drawn even so:
   * it is the whole of what its primitive is, and a `loom.avatar` that rendered
   * `null` would be a primitive the conformance probe cannot find
   * `loom.editable` on.
   */
  if (initials === "" && !given.labelled) return null

  return createElement(
    "span",
    {
      ...given.attributes,
      key: given.key,
      /**
       * A monogram beside a name is decoration and is hidden; a monogram
       * standing alone is a picture of somebody, and `role="img"` with a label
       * is how a span says so. An `img` with no `alt` is the wrong shape for
       * either.
       */
      ...(given.labelled ? { role: "img", "aria-label": given.name } : { "aria-hidden": true }),
      style: {
        ...box,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        /**
         * The accent tint rather than a grey. `loom.avatar` argues it and it is
         * the whole reason this fallback is worth drawing: a monogram in the
         * accent reads as a decision, an empty grey circle reads as something
         * that failed to load.
         */
        backgroundColor: colour("accent-subtle"),
        color: colour("accent-strong"),
        fontFamily: family("heading"),
        fontWeight: weight("heading"),
        fontSize: size(given.glyph),
        lineHeight: 1,
        letterSpacing: "0.02em",
        userSelect: "none",
      },
    },
    initials
  )
}
