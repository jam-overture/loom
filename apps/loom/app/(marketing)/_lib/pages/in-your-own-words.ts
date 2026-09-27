import { buildElement, type IdFactory, type LoomNode } from "@jam-overture/loom"

import { ANCHOR, BAND } from "../bands"
import { action, prose, section, stack } from "../nodes"
import { DEMO, surfaceHref, type SiteThemeName } from "../site"

/**
 * The band where the site stops pointing at the demonstration and contains it.
 *
 * §4d has said since the plan was written that the marketing site **embeds the
 * demonstration rather than describing it**, and that this is the whole reason
 * the demonstration is public at all
 * ([0056](../../../../../decisions/0056-the-demo-is-public-and-shares-nothing-but-the-deployment.md)).
 * For a fortnight it did not, and the reason was not a judgment about whether
 * it should.
 *
 * **It was built on 4 September and withdrawn the same run.** The frame rendered
 * perfectly, the allowlist permitted it, and pressing the big green button
 * inside it did nothing at all: every control in `/demo` is a server action
 * reached through a form element with a server action on it, and `loom.embed`'s sandbox had no
 * `allow-forms`. On a site whose entire argument is that it can always tell you
 * what happened, a button that silently does nothing is materially worse than
 * the link it would have replaced, so nothing shipped and two findings went to
 * `Loom primitives` instead.
 *
 * Both came back on 12 September.
 * [0135](../../../../../decisions/0135-a-same-origin-frame-is-granted-what-its-own-document-needs.md)
 * grants `allow-forms` to a frame the deployment's own registry resolved as its
 * own — a host decision, never a prop a model can set — and `aspect: "adaptive"`
 * gives a framed *application* the one thing a fixed ratio cannot: a different
 * shape at a different width, read off the frame's own width rather than the
 * window's. This band is what those two were for.
 *
 * ## Why it belongs directly under the band above it
 *
 * The band above is this site changing itself, through five prepared choices,
 * and its closing line has apologized for that since 22 August: the hero
 * promises *ask for a change in your own words* and the band offers buttons. The
 * reason is real and unchanged — a text box on the most-loaded page the project
 * has is a model call for every visitor and a dead control on every deployment
 * without a key — and the answer has always been *there is a page for that*, one
 * click away.
 *
 * A visitor who has just watched the sequence run is the likeliest person on the
 * site to want a turn at it, and that is the worst possible moment to ask them
 * to leave. So the page for that is here instead, and the sentence above it now
 * points down rather than away.
 *
 * ## What this band is not
 *
 * It is not a video, a recording, or a picture of a product. It is the running
 * application, on this deployment, reached by the same address in the menu —
 * which is why framing it is safe enough to do at all, and why the caption says
 * so rather than leaving a visitor to wonder whether they are looking at a
 * screenshot. The one thing this site can show that a description of it cannot
 * is the thing working, and a box a stranger can type into is the strongest form
 * of that available on a landing page.
 */

/**
 * What the frame is announced as, to somebody who is not looking at it.
 *
 * Required and non-empty by `loom.embed`, on the argument its own comment makes:
 * a frame with no accessible name is announced as "frame" and nothing else. It
 * is written as what the visitor would *do* with it rather than what it is,
 * because "demo" is a word about this site's structure and a person arriving
 * with a screen reader needs the same sentence a sighted reader gets from the
 * heading.
 */
export const FRAME_TITLE = "A live page you can ask to change itself, and the record of every change"

/**
 * The line under the frame.
 *
 * Three things, in the order somebody needs them: it is live rather than a
 * recording, the page inside it is not ours, and nothing a visitor does in it
 * reaches anybody else. The middle one is the demonstration's own first sentence
 * and is repeated here on purpose — a visitor who reads the caption and never
 * scrolls the frame should not come away thinking Loom is a physiotherapy
 * clinic.
 */
export const FRAME_CAPTION =
  "This is the running page, not a recording. It belongs to a clinic that does not exist, and whatever you do to it is yours alone — it resets, and nobody else sees it."

/**
 * The way out, and it is **above** the frame rather than below it.
 *
 * A frame on a landing page is a compromise, and the compromise is not evenly
 * distributed. Measured on this band against the built application: at 1280 and
 * at 1440 the frame is 1078 × 673 and the demonstration's one green button sits
 * 470px into it, comfortably in view. At 390 the frame is 348 × 465 and the
 * button is **778px in** — three hundred pixels below the fold of the box. A
 * phone visitor meets the demonstration's bar, its two opening paragraphs, and
 * no control at all.
 *
 * `adaptive` is already the best shape available and this is what it costs; the
 * measurement is filed for `Loom primitives` rather than worked around here,
 * because a taller narrow shape is a prop this lane does not own. What this lane
 * *can* do is put the way out where the person who needs it will reach it first.
 * Below the frame it sits behind 465px of box on exactly the device that cannot
 * use the box.
 *
 * So the line is an offer rather than a reaction — it cannot say *cramped?* to a
 * reader who has not seen the frame yet — and it reads correctly on a laptop,
 * where it is a second way in rather than a rescue. It is the same address the
 * menu carries, so nobody is being sent anywhere new.
 */
const wayOut = (ids: IdFactory, origin: string): LoomNode =>
  stack(ids, { direction: "row", gap: "snug", align: "center", wrap: true }, [
    prose(ids, "It is a whole page of its own as well, which is the roomier way to read it on a phone.", {
      tone: "muted",
      size: "small",
      measured: true,
    }),
    action(ids, "Open it full size", surfaceHref(origin, DEMO), { variant: "quiet" }),
  ])

/**
 * The name this band answers to, read off the one list rather than spelled here.
 *
 * It was a literal in this file until the notice at the top of the page needed
 * an anchor of its own and there were about to be two of these in two files.
 * The argument for writing it down once has not changed — the band above writes
 * the link and this one writes the anchor, and a link pointing at a band that
 * has since been renamed is a control that silently does nothing — it is just
 * that the one place is now `ANCHOR`, beside the eyebrows it is the smaller
 * version of.
 *
 * The export stays because two files already import this name.
 */
export const YOUR_TURN_ANCHOR = ANCHOR.inYourOwnWords

export type InYourOwnWordsContext = {
  readonly origin: string
  readonly theme: SiteThemeName
}

/**
 * The frame, held to the one shape that suits a framed application.
 *
 * `adaptive` rather than a fixed ratio, and the measurements that settled it
 * were taken on this exact band: `wide` left the demonstration's one control
 * twelve pixels below the fold of the box at 1440, and `square` on a phone
 * showed its bar and two paragraphs and no control at all. A photograph has an
 * intrinsic shape and a framed application has a layout, which is the whole of
 * the difference.
 *
 * `panel` rather than `flush` because the band is making a claim about a
 * boundary — this is a different page, running on its own — and a frame that
 * bled into the section would be quietly asserting the opposite.
 */
const frame = (ids: IdFactory, context: InYourOwnWordsContext): LoomNode =>
  buildElement(ids, {
    type: "loom.embed",
    props: {
      src: surfaceHref(context.origin, DEMO),
      title: FRAME_TITLE,
      aspect: "adaptive",
      caption: FRAME_CAPTION,
      frame: "panel",
    },
  })

export const inYourOwnWordsBand = (ids: IdFactory, context: InYourOwnWordsContext): LoomNode =>
  section(
    ids,
    { width: "wide", eyebrow: BAND.inYourOwnWords, anchor: YOUR_TURN_ANCHOR },
    "Now type one of your own",
    [
      prose(
        ids,
        "The band above runs five requests that were written in advance. This one takes whatever you type. It is a real page — somebody else's, so nothing here is arranged to flatter us — and beside it the same five lines fill in: what you asked for, what the change turned out to be, how much of the page it moved, which rule allowed it, and what putting it back would restore.",
        { measured: true }
      ),
      wayOut(ids, context.origin),
      frame(ids, context),
    ]
  )
