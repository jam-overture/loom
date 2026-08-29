import { createElement, type ReactNode } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { libraryStylesheet, LIBRARY_CLASS } from "./stylesheet.js"
import { colour, radius, size, space } from "./tokens.js"

/**
 * The browser or phone a product shot sits inside.
 *
 * A marketing page's single most valuable image is a picture of the thing
 * working, and a screenshot pasted flat onto a band does not read as one: it
 * reads as a picture of *something*, at the same weight as the stock photograph
 * two sections down. What separates the two is the chrome — a title bar with an
 * address in it, or a handset's rounded corners — because that is what tells a
 * reader in one glance that they are looking at software rather than at
 * artwork.
 *
 * Nothing in the library could say it. `loom.media` frames a file, `loom.card`
 * raises a surface, and `loom.embed` frames a document from somewhere else; a
 * page wanting the classic hero shot had to reach for an image that had the
 * chrome baked into it, which is a screenshot that cannot be re-themed, cannot
 * be re-cropped, and shows somebody's real browser and somebody's real tabs.
 *
 * **Its interior is its children rather than a `src`, which is the decision
 * worth arguing.** The obvious shape is an image URL and an `address` beside
 * it — one leaf, no interior, done. It is refused on 0052's test: the screen of
 * a mockup is a *region a page composes*, and the compositions a demo actually
 * wants are not images. A Loom page inside a Loom mockup is the demo's own
 * hero. A `loom.code` panel inside a phone is a terminal. A `loom.form` inside
 * a browser is a signup flow being pointed at. A `src` prop makes every one of
 * those unsayable to save one node.
 *
 * **The chrome is not a region.** It is three dots, a rounded address field and
 * a rule, none of which a tree would ever want to reorder or replace — the
 * granularity doc's second atomic exception, *things with no interesting
 * interior*, applied to a part rather than to a whole. The one thing anybody
 * would want to change about it is the address, and that is the one thing that
 * is a prop.
 *
 * **What it deliberately does not do.** There is no traffic-light colouring, no
 * vendor's window buttons and no notch cut into the screen. Those are somebody
 * else's operating system rendered from this library's palette, and they would
 * be the one part of a Loom page that does not re-theme (0049) — a red, amber
 * and green that stay red, amber and green under every palette a deployment
 * mounts. The dots are `border-default`, which is what a shell drawn in the
 * page's own ink looks like.
 */

const props = z
  .object({
    /**
     * Three shells, and the third is not a lesser version of the other two:
     * `plain` is the bezel with no chrome at all, which is what a wide
     * dashboard shot wants when the point is the data rather than the browser.
     */
    shell: z.enum(["browser", "phone", "plain"]).optional(),
    /**
     * What the address field reads. Free text and never a URL — nothing is
     * navigable here, and a `linkUrlSchema` would refuse the thing a page
     * actually writes in it, which is a bare host with no scheme.
     *
     * It does nothing under the other two shells, which is the same bargain
     * `loom.hero`'s `align` makes under a centred layout: a prop that describes
     * one rendering is inert under the others rather than being a second
     * primitive.
     */
    address: z.string().min(1).max(80).optional(),
    /**
     * `raised` casts the shadow that lifts the shot off the band behind it. It
     * is `loom.lift`'s shadow to the pixel, and deliberately: a library with two
     * elevations is a library where two things at the same height look like
     * different heights.
     *
     * The shadow is drawn in `fg-default` because no palette declares a shadow
     * slot, which means on a dark palette it is a pale bloom rather than a dark
     * one. That reads as a light source and is the right answer often enough to
     * ship — but it is luck rather than design, and it is filed. The first
     * attempt here used twice this blur and read, under `bold`, as a smear of
     * white under the handset.
     */
    elevation: z.enum(["flat", "raised"]).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

/**
 * A phone is a phone at any width, so the shell caps itself and centres. Every
 * other primitive in this library takes the width it is given; this is the one
 * that would be absurd at 1120px, and a `maxWidth` prop would be asking a model
 * to know how wide a handset is.
 */
const PHONE_WIDTH = "22rem"

const dot = (key: string): ReactNode =>
  createElement("span", {
    key,
    style: {
      width: "0.55rem",
      height: "0.55rem",
      borderRadius: radius("full"),
      background: colour("border-default"),
    },
  })

const browserChrome = (address: string | undefined): ReactNode =>
  createElement(
    "div",
    {
      key: "chrome",
      style: {
        display: "flex",
        alignItems: "center",
        gap: space(2),
        paddingBlock: space(2),
        paddingInline: space(3),
        borderBlockEnd: `1px solid ${colour("border-subtle")}`,
        background: colour("bg-surface"),
      },
    },
    createElement(
      "div",
      { key: "dots", style: { display: "flex", gap: space(1), flex: "0 0 auto" } },
      dot("one"),
      dot("two"),
      dot("three")
    ),
    address === undefined
      ? null
      : createElement(
          "div",
          {
            key: "address",
            style: {
              /**
               * Centred in the *bar* rather than in the space left over, which
               * is what the `auto` margins do and what a flex `justify-content`
               * could not: the dots are on one side and nothing is on the
               * other, so a centred field would sit off-centre by their width.
               */
              marginInline: "auto",
              maxWidth: "60%",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              paddingBlock: space(1),
              paddingInline: space(3),
              borderRadius: radius("full"),
              background: colour("bg-canvas"),
              color: colour("fg-muted"),
              fontSize: size(1),
            },
          },
          address
        )
  )

/**
 * A handset's speaker slot, and the whole of the phone's chrome. It is drawn as
 * a bar above the screen rather than as a notch cut into it, because a notch
 * over the content means the content has to know it is in a phone.
 */
const phoneChrome = (): ReactNode =>
  createElement(
    "div",
    {
      key: "chrome",
      style: {
        display: "flex",
        justifyContent: "center",
        paddingBlock: space(2),
        background: colour("bg-surface"),
      },
    },
    createElement("span", {
      style: {
        width: "4rem",
        height: "0.35rem",
        borderRadius: radius("full"),
        background: colour("border-default"),
      },
    })
  )

export const loomMockup = definePrimitive({
  type: "loom.mockup",
  description:
    "A browser or phone shell around whatever is put in it — the product shot a marketing page opens with.",
  props,
  slots: [],
  component: ({ loom, props: given, children }: LoomPrimitiveProps<Props>) => {
    const shell = given.shell ?? "browser"
    const phone = shell === "phone"
    const raised = given.elevation !== "flat"

    return createElement(
      "div",
      {
        ...loom.editable,
        className: raised ? LIBRARY_CLASS.mockup : undefined,
        style: {
          display: "flex",
          flexDirection: "column",
          /** Clips the screen to the shell's corners, which is what makes it a shell. */
          overflow: "hidden",
          boxSizing: "border-box",
          width: "100%",
          maxWidth: phone ? PHONE_WIDTH : "100%",
          marginInline: phone ? "auto" : undefined,
          border: `1px solid ${colour("border-default")}`,
          borderRadius: phone ? "2rem" : radius("lg"),
          background: colour("bg-surface"),
        },
      },
      libraryStylesheet(),
      shell === "browser" ? browserChrome(given.address) : null,
      phone ? phoneChrome() : null,
      children === null
        ? null
        : createElement(
            "div",
            {
              key: "screen",
              style: {
                display: "flex",
                flexDirection: "column",
                /**
                 * The screen, not a padded body. A shot inside a mockup runs to
                 * the shell's edges or the illusion is gone, so anything that
                 * wants breathing room brings its own — which is what a
                 * `loom.stack` or a `loom.section` inside it already does.
                 */
                overflow: "hidden",
                background: colour("bg-canvas"),
                flex: "1 1 auto",
              },
            },
            children
          )
    )
  },
})
