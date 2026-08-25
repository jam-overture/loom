import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { ASPECT_NAMES, ASPECT_RATIOS, type AspectName } from "./layout.js"
import { colour, family, radius, size, space } from "./tokens.js"
import { mediaUrlSchema } from "./url.js"

/**
 * Somebody else's document, framed and held to a shape — a product video, a
 * map, a prototype, a track.
 *
 * Ported from Hermes' `embed`, and genuinely atomic: an `<iframe>` has no
 * interior this library can address, no children worth naming, and one
 * behaviour — maintaining a ratio around content whose height it cannot
 * measure. An unsized iframe is 300 × 150 by the HTML specification, and a
 * video that renders as a small grey rectangle is the failure this primitive
 * exists to make impossible.
 *
 * `title` is **required and non-empty**, on the same argument `loom.media`
 * makes for `alt`: the props here are AI-authored, a frame with no accessible
 * name is announced as "frame" and nothing else, and "the model usually
 * remembers" is not an accessibility strategy. Unlike an image there is no
 * decorative case — a document nobody should reach does not belong on the page
 * at all — so there is no escape hatch and no `refine` beside it.
 *
 * ## The part that is a security surface, and the part of it this cannot fix
 *
 * Every other URL in this library reaches an `href` or an `img src`, which is
 * why [0053](../../decisions/0053-a-url-in-the-tree-is-checked-against-a-scheme-allowlist.md)'s
 * scheme allowlist was enough for them. **This one reaches an `iframe src`,
 * which is a whole document with a script host in it**, chosen by a model.
 * `https:` says nothing about who is on the other end.
 *
 * What is done here is what a primitive can do alone:
 *
 * - `sandbox` is set rather than omitted, and set to the narrowest triple every
 *   real provider actually needs — script, its own origin, and the
 *   presentation API that full-screen video uses. No form submission, no
 *   pointer lock, no downloads, and no top-level navigation, which is the one
 *   that turns an embedded map into a redirect.
 * - `allow` grants the four capabilities a media embed asks for and no others,
 *   which matters because the default for a same-site frame is to inherit.
 * - `referrerPolicy` sends the origin and never the path, so a private preview
 *   URL is not handed to whoever is being embedded.
 *
 * What cannot be done here is the check that would actually matter: **which
 * origins this deployment is willing to frame.** That is a per-deployment list
 * and it belongs beside the endpoint registry (0065), not in a props schema —
 * a primitive that carried its own allowlist would be a primitive every host
 * has to fork. Note also that `allow-scripts` with `allow-same-origin` is only
 * a sandbox at all *because* the framed document is cross-origin; a host that
 * embeds its own origin gets nothing from it, and nothing here can tell.
 * Filed for the framework lane rather than guessed at.
 */

const props = z
  .object({
    src: mediaUrlSchema,
    /** The frame's accessible name — "Loom in ninety seconds", not "video". */
    title: z.string().min(1).max(160),
    /** The shape the frame is held to, since the framed document has no say. */
    aspect: z.enum(ASPECT_NAMES).optional(),
    /** A sentence under the frame, the way `loom.media` captions a picture. */
    caption: z.string().min(1).max(240).optional(),
    /**
     * Whether the frame is drawn as a surface with a border, or sits flush
     * against the page. Two renderings of one content model, one `configure`
     * apart, and neither adds or removes a node.
     */
    frame: z.enum(["panel", "flush"]).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

const SANDBOX = "allow-scripts allow-same-origin allow-presentation"

const ALLOW = "accelerometer; encrypted-media; picture-in-picture; fullscreen"

export const loomEmbed = definePrimitive({
  type: "loom.embed",
  description:
    "A third-party document — a video, a map, a prototype — framed at a fixed aspect ratio with a required accessible name.",
  props,
  slots: [],
  component: ({ loom, props: given }: LoomPrimitiveProps<Props>) => {
    const flush = given.frame === "flush"
    const aspect: AspectName = given.aspect ?? "wide"

    const frame = createElement(
      "div",
      {
        key: "frame",
        style: {
          /**
           * The ratio is the wrapper's rather than the iframe's, so the box
           * keeps its shape while the framed document is still loading and the
           * band above it does not jump when it arrives.
           */
          aspectRatio: ASPECT_RATIOS[aspect],
          width: "100%",
          overflow: "hidden",
          background: colour("bg-surface-muted"),
          ...(flush
            ? {}
            : {
                border: `1px solid ${colour("border-subtle")}`,
                borderRadius: radius("md"),
              }),
        },
      },
      createElement("iframe", {
        src: given.src,
        title: given.title,
        loading: "lazy",
        sandbox: SANDBOX,
        allow: ALLOW,
        allowFullScreen: true,
        referrerPolicy: "strict-origin-when-cross-origin",
        style: { display: "block", width: "100%", height: "100%", border: "0" },
      })
    )

    return createElement(
      "figure",
      {
        ...loom.editable,
        style: {
          display: "flex",
          flexDirection: "column",
          gap: space(2),
          margin: "0",
          width: "100%",
          minWidth: "0",
          boxSizing: "border-box",
        },
      },
      frame,
      given.caption === undefined
        ? null
        : createElement(
            "figcaption",
            {
              style: {
                fontFamily: family("body"),
                fontSize: size(1),
                color: colour("fg-muted"),
              },
            },
            given.caption
          )
    )
  },
})
