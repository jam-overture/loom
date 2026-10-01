import { createElement } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { ASPECT_NAMES, ASPECT_RATIOS, type AspectName } from "./layout.js"
import { libraryStylesheet, LIBRARY_CLASS } from "./stylesheet.js"
import { color, family, radius, size, space } from "./tokens.js"
import { mediaUrlSchema } from "./url.js"

/**
 * Somebody else's document, framed and held to a shape — a product video, a
 * map, a prototype, a track.
 *
 * Ported from Hermes' `embed`, and genuinely atomic: an `<iframe>` has no
 * interior this library can address, no children worth naming, and one
 * behavior — maintaining a ratio around content whose height it cannot
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
 * `sameOrigin`, and the seam says it out loud in the diagnostics.
 *
 * **That paragraph used to end "it stays a disclosure rather than something
 * this file acts on", and it no longer does.** `Loom marketing` filed on
 * 4 September that §4d — *the site embeds the demo rather than describing it*,
 * which is the whole reason the demo is public
 * ([0056](../../decisions/0056-the-demo-is-public-and-shares-nothing-but-the-deployment.md))
 * — cannot be built, because every control in `/demo` is a server action
 * reached through a `<form action={…}>`, and this sandbox has no `allow-forms`.
 * The band was built, rendered perfectly, silently did nothing when pressed,
 * and was withdrawn rather than shipped.
 *
 * So a frame the seam resolves as **same-origin** is granted `allow-forms`, and
 * the argument for it is the one the paragraph above already makes rather than a
 * new concession. For a same-origin frame the sandbox is **already not a
 * boundary**: `allow-same-origin` beside `allow-scripts` hands the framed
 * document its real origin, from which it can reach `parent.document` and the
 * deployment's own cookies and storage. Withholding `allow-forms` on top of
 * that buys no security whatsoever — it cannot, since the document can submit
 * the same request with `fetch` and always could — and it costs the one thing
 * a visitor tries. **It is not a widening of the sandbox so much as the removal
 * of an inconsistency in it.**
 *
 * Two things are deliberately *not* done, and both are the reason this is
 * narrow enough to be safe:
 *
 * - **Nothing in the tree can ask for it.** There is no prop. The only way to
 *   be granted `allow-forms` is for the deployment's own frame registry to have
 *   resolved the URL as `self` (0095) — a host decision, made in code the
 *   maintainer wrote, never a prop a model can set. A deployment that has
 *   registered no origin of its own gets today's sandbox exactly, byte for
 *   byte, which is what keeps every existing tree unchanged.
 * - **`allow-top-navigation` is still withheld**, from every frame including
 *   this one. That is the grant that turns an embedded document into a
 *   redirect, and a framed application has no business moving the page it is
 *   sitting on.
 *
 * `allow-same-origin` is still never dropped for a same-origin frame: doing so
 * would give the document a null origin and break the embed a host deliberately
 * registered.
 */

const props = z
  .object({
    src: mediaUrlSchema,
    /** The frame's accessible name — "Loom in ninety seconds", not "video". */
    title: z.string().min(1).max(160),
    /**
     * The shape the frame is held to, since the framed document has no say.
     *
     * The three fixed names are `layout.ts`'s, shared with `loom.media` and
     * `loom.overlay`. **`adaptive` is this primitive's alone**, and it is not
     * in that shared list on purpose: a photograph has an intrinsic shape and
     * honouring it at every width is correct, so a fourth member there would be
     * a shape offered to two primitives that have no use for it.
     *
     * What `adaptive` is for is the case a fixed ratio cannot serve — **a
     * framed document that reflows.** `Loom marketing` measured it on
     * 4 September, framing `/demo` in a 1080px band:
     *
     * | aspect | at 1440 | at 390 |
     * | --- | --- | --- |
     * | `wide` | 1080 × 608 — **12px short** of the one control the band promised | 350 × 197 |
     * | `square` | 1080 × 1080 — correct | 350 × 350 — no control |
     * | `portrait` | 1080 × 1440 — taller than a viewport | 350 × 467 |
     *
     * There is no single number in that table, which is the finding: a video
     * has a shape and an application has a layout. `adaptive` is portrait while
     * the frame is narrow and 16/10 once it is not — and the threshold is read
     * off **the frame's own width rather than the window's**, so an embed in one
     * column of a `loom.split` gets the narrow shape on a 1440px screen, which
     * is where it is actually narrow.
     */
    aspect: z.enum([...ASPECT_NAMES, "adaptive"] as const).optional(),
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

/** The three fixed shapes plus this primitive's own reflowing one. */
type FrameShape = AspectName | "adaptive"

/**
 * How the frame is held to its shape, which is two different mechanisms for one
 * prop and has to be, because **an inline style beats a rule**.
 *
 * A fixed shape is an inline `aspect-ratio`, exactly as before. `adaptive` is a
 * class and *no* inline ratio at all — setting one would make the stylesheet's
 * container query unreachable, which is the trap `stylesheet.ts` names first in
 * its own list of mechanics.
 */
const shapeOf = (
  aspect: FrameShape
): { readonly className?: string; readonly aspectRatio?: string } =>
  aspect === "adaptive"
    ? { className: LIBRARY_CLASS.frameAdaptive }
    : { aspectRatio: ASPECT_RATIOS[aspect] }

/**
 * The narrowest set every real provider needs: script, its own origin, and the
 * presentation API that full-screen video uses. No form submission, no pointer
 * lock, no downloads, and no top-level navigation.
 */
const SANDBOX = "allow-scripts allow-same-origin allow-presentation"

/**
 * The one grant added for a frame the deployment resolved as its own, argued at
 * length in this file's opening comment. It is appended rather than being a
 * second full string, so the base set above stays the single place the sandbox
 * is stated and the two cannot drift.
 */
const SAME_ORIGIN_SANDBOX = `${SANDBOX} allow-forms`

const sandboxFor = (sameOrigin: boolean): string => (sameOrigin ? SAME_ORIGIN_SANDBOX : SANDBOX)

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
    const aspect: FrameShape = given.aspect ?? "wide"
    const outcome = loom.frames["src"]

    /**
     * `undefined` cannot happen while `src` is required and declared, and is
     * treated as a refusal rather than asserted away: a later schema that made
     * the URL optional would otherwise start rendering an unchecked frame, and
     * the failure would be silent. Absence means no frame, which is what this
     * branch draws.
     */
    const framed = outcome !== undefined && outcome.status === "allowed" ? outcome : undefined
    const shape = shapeOf(aspect)

    const frame = createElement(
      "div",
      {
        key: "frame",
        className: shape.className,
        style: {
          /**
           * The ratio is the wrapper's rather than the iframe's, so the box
           * keeps its shape while the framed document is still loading and the
           * band above it does not jump when it arrives.
           *
           * Absent for `adaptive`, where the stylesheet sets it — see `shapeOf`.
           */
          aspectRatio: shape.aspectRatio,
          /** No stylesheet resets this, so the size below is the border box rather than the content box. */
          boxSizing: "border-box",
          width: "100%",
          overflow: "hidden",
          background: color("bg-surface-muted"),
          ...(flush
            ? {}
            : {
                border: `1px solid ${color("border-subtle")}`,
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
                color: color("fg-muted"),
              },
            },
            loom.text.refused
          )
        : createElement("iframe", {
            src: framed.url,
            title: given.title,
            loading: "lazy",
            sandbox: sandboxFor(framed.sameOrigin),
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
          /**
           * What `adaptive`'s query reads, declared here rather than in the
           * stylesheet on `loom.card`'s precedent — and **only** for `adaptive`,
           * so a frame holding a fixed ratio establishes no containment context
           * it does not need and nothing about today's embeds changes.
           *
           * It is the figure rather than the frame because a container query
           * is answered by an *ancestor*: an element cannot size itself from
           * its own width. The two are the same width, since the frame is
           * `width: 100%` of this box.
           */
          ...(aspect === "adaptive" ? { containerType: "inline-size" as const } : {}),
        },
      },
      /**
       * Only where a rule is actually needed. Every other shape is inline, so a
       * page of videos emits no stylesheet on their account.
       */
      aspect === "adaptive" ? libraryStylesheet() : null,
      frame,
      given.caption === undefined
        ? null
        : createElement(
            "figcaption",
            {
              style: {
                fontFamily: family("body"),
                fontSize: size(1),
                color: color("fg-muted"),
              },
            },
            given.caption
          )
    )
  },
})
