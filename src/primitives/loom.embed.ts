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
 * The check that would actually matter — **which origins this deployment is
 * willing to frame** — is not a primitive's to make, and for six days it was
 * not made at all. It belongs beside the endpoint registry (0065), because a
 * primitive carrying its own allowlist is a primitive every host has to fork.
 * It was filed for the framework lane rather than guessed at, and it arrived on
 * 26 August as
 * [0095](../../decisions/0095-a-frame-carries-its-url-and-the-deployment-carries-the-origins.md).
 *
 * So this file no longer decides anything about the URL and no longer reads
 * one. `frames: ["src"]` is the declaration — the one thing the runtime cannot
 * work out for itself, since a `src` reaching an `iframe` and a `src` reaching
 * an `img` are the same JSON string and very different documents — and what
 * comes back on `loom.frames.src` is a verdict rather than a prop.
 *
 * Two consequences worth stating, because both are easy to get wrong:
 *
 * - **The `src` placed is the seam's `url`, never `given.src`.** The seam
 *   normalises through `URL` so that what the browser resolves is what the
 *   allowlist matched. Echoing the prop instead would leave the check advisory:
 *   two strings that differ only in case or a trailing dot are one origin to
 *   the allowlist and can be two to a browser.
 * - **A refusal renders the box and says so**, on 0073's precedent for a form
 *   with nowhere to post. The alternative is rendering nothing, which reads as
 *   a page that forgot a section, or rendering the frame anyway, which makes
 *   the allowlist decoration. The notice names no origin and no registry: the
 *   reason belongs in the render diagnostics, where the person who can fix it
 *   is looking, and the visitor only needs to know the page is not broken.
 *
 * What the seam also settles is the sandbox footnote this comment used to end
 * on. `allow-scripts` with `allow-same-origin` is a boundary only because the
 * framed document is cross-origin, and a host framing its own origin gets
 * nothing from it — *and nothing here could tell*. The outcome now carries
 * `sameOrigin`, and the seam says it out loud in the diagnostics. It stays a
 * disclosure rather than something this file acts on: dropping
 * `allow-same-origin` for a same-origin frame would give the document a null
 * origin and break the embed a host deliberately registered.
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

/**
 * One string for all three refusals, where `loom.form` has three.
 *
 * The form distinguishes them because a visitor reads them differently — one is
 * a page that is not finished, one is worth trying again in a minute, and one
 * is not. A frame has no such split: every refusal here is a deployment that
 * will not frame this document, none of them is transient, and there is nothing
 * a visitor could do differently on being told which. The reason is in the
 * render diagnostics for the person who can act on it.
 */
const EMBED_TEXT = {
  refused: "This content cannot be shown here.",
} as const

type EmbedTextKey = keyof typeof EMBED_TEXT

export const loomEmbed = definePrimitive({
  type: "loom.embed",
  description:
    "A third-party document — a video, a map, a prototype — framed at a fixed aspect ratio with a required accessible name.",
  props,
  slots: [],
  text: EMBED_TEXT,
  /**
   * The declaration, and the whole of this primitive's part in the check. Which
   * props reach a frame is the author's to say because it is the one thing the
   * runtime cannot derive; whether a given URL may be framed is the
   * deployment's, and neither half is the other's business.
   */
  frames: ["src"],
  component: ({ loom, props: given }: LoomPrimitiveProps<Props, EmbedTextKey>) => {
    const flush = given.frame === "flush"
    const aspect: AspectName = given.aspect ?? "wide"
    const outcome = loom.frames["src"]

    /**
     * `undefined` cannot happen while `src` is required and declared, and is
     * treated as a refusal rather than asserted away: a later schema that made
     * the URL optional would otherwise start rendering an unchecked frame, and
     * the failure would be silent. Absence means no frame, which is what this
     * branch draws.
     */
    const framed = outcome !== undefined && outcome.status === "allowed" ? outcome : undefined

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
      framed === undefined
        ? /**
           * The box keeps its ratio, so a refused embed holds the same space
           * its frame would have and the bands around it do not move. The
           * notice is the figure's only text and is read as such — there is no
           * frame to name, so nothing here is `aria-hidden`.
           */
          createElement(
            "p",
            {
              style: {
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                height: "100%",
                margin: "0",
                paddingInline: space(4),
                boxSizing: "border-box",
                textAlign: "center",
                fontFamily: family("body"),
                fontSize: size(2),
                color: colour("fg-muted"),
              },
            },
            loom.text.refused
          )
        : createElement("iframe", {
            src: framed.url,
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
