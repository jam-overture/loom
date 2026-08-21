import { createElement, type ReactNode } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { monogramOf } from "./monogram.js"
import { libraryStylesheet, LIBRARY_CLASS } from "./stylesheet.js"
import { colour, family, radius, size, space, weight } from "./tokens.js"
import { linkUrlSchema, mediaUrlSchema } from "./url.js"

/**
 * A person: a face, a name, what they do, and optionally a sentence about them.
 *
 * Two Hermes blocks collapse here — `team-members` (name, role, bio, photo,
 * link) and `staff-roster` (name, role, portrait, specialties, bio, contact).
 * They differ by the words `photo`/`portrait` and `link`/`contact`, and by
 * `specialties`, which is a comma-joined string in Hermes and is the one field
 * not ported: a list of specialities is *repeated content*, so by 0052 it wants
 * to be nodes, and a `loom.badge` beside a person says it better than a field
 * that has to be parsed at a comma. That is a composition, not a prop, and it
 * is why this primitive has no slot for it — see the note below.
 *
 * The five fields stay props for 0052's fixed-field half: there is exactly one
 * name, one role and one face, they are meaningless apart, and changing a role
 * is exactly a `configure`. A person is the same shape as a `loom.stat` or a
 * `loom.feature`, and is a leaf for the same reason.
 *
 * **No photo is the interesting case**, because it is the common one — a team
 * page usually ships before its photographs do. It falls back to a monogram
 * rather than to a grey box or an empty space, which is the same call
 * `loom.logo` makes when it has no image and renders a wordmark: a fallback
 * that reads as a decision looks finished, and a placeholder looks unfinished.
 */

const props = z
  .object({
    name: z.string().min(1).max(80),
    /** What they do here — "Head of Platform", not a biography. */
    role: z.string().min(1).max(120),
    bio: z.string().min(1).max(320).optional(),
    photo: mediaUrlSchema.optional(),
    href: linkUrlSchema.optional(),
    align: z.enum(["start", "center"]).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

const PHOTO_SIZE = "4.5rem"

export const loomPerson = definePrimitive({
  type: "loom.person",
  description:
    "A person — face, name, role, and an optional sentence. A cell of a loom.person-grid; falls back to a monogram with no photo.",
  props,
  slots: [],
  component: ({ loom, props: given, children: _unused }: LoomPrimitiveProps<Props>) => {
    const centred = given.align === "center"
    const linked = given.href !== undefined

    const face: ReactNode =
      given.photo === undefined
        ? createElement(
            "span",
            {
              key: "face",
              "aria-hidden": true,
              style: {
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: PHOTO_SIZE,
                height: PHOTO_SIZE,
                borderRadius: radius("full"),
                background: colour("accent-subtle"),
                color: colour("accent-strong"),
                fontFamily: family("heading"),
                fontWeight: weight("heading"),
                fontSize: size(4),
                lineHeight: 1,
                letterSpacing: "0.02em",
              },
            },
            monogramOf(given.name)
          )
        : createElement("img", {
            key: "face",
            src: given.photo,
            /**
             * Empty, deliberately. The name is beside the photograph in the
             * same node; alt text repeating it makes a screen reader say the
             * name twice, and there is nothing else in a portrait a reader
             * needs described. `loom.media` requires alt precisely because it
             * has no such neighbour.
             */
            alt: "",
            loading: "lazy",
            decoding: "async",
            style: {
              display: "block",
              width: PHOTO_SIZE,
              height: PHOTO_SIZE,
              objectFit: "cover",
              borderRadius: radius("full"),
              background: colour("bg-surface-muted"),
            },
          })

    const name = createElement(
      "p",
      {
        key: "name",
        className: linked ? LIBRARY_CLASS.underline : undefined,
        style: {
          margin: "0",
          alignSelf: centred ? "center" : "flex-start",
          fontFamily: family("heading"),
          fontWeight: weight("heading"),
          fontSize: size(4),
          lineHeight: 1.2,
          color: colour("fg-default"),
        },
      },
      given.name
    )

    const role = createElement(
      "p",
      {
        key: "role",
        style: {
          margin: "0",
          fontFamily: family("body"),
          fontSize: size(2),
          lineHeight: 1.4,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: colour("accent"),
        },
      },
      given.role
    )

    return createElement(
      linked ? "a" : "div",
      {
        ...loom.editable,
        ...(linked ? { href: given.href } : {}),
        style: {
          display: "flex",
          flexDirection: "column",
          alignItems: centred ? "center" : "flex-start",
          gap: space(3),
          textAlign: centred ? "center" : "start",
          textDecoration: "none",
          color: colour("fg-default"),
        },
      },
      libraryStylesheet(),
      face,
      createElement(
        "div",
        {
          key: "who",
          style: {
            display: "flex",
            flexDirection: "column",
            alignItems: centred ? "center" : "flex-start",
            gap: space(1),
          },
        },
        name,
        role
      ),
      given.bio === undefined
        ? null
        : createElement(
            "p",
            {
              key: "bio",
              style: {
                margin: "0",
                fontFamily: family("body"),
                fontSize: size(3),
                lineHeight: 1.6,
                color: colour("fg-muted"),
              },
            },
            given.bio
          )
    )
  },
})
