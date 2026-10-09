import { createElement, type ReactNode } from "react"
import { z } from "zod"

import { BINDING_NAME_EXPECTATION } from "../data/source.js"
import type { DataOutcome } from "../data/resolution.js"
import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { ASPECT_NAMES, ASPECT_RATIOS, type AspectName } from "./layout.js"
import { colour, family, radius, size, space } from "./tokens.js"
import { mediaUrlSchema } from "./url.js"

/**
 * A picture read from a source — `loom.media`'s content model with the file
 * coming from wherever the files already are.
 *
 * ## The paragraph this primitive exists to delete
 *
 * `loom.media`'s own docblock said, until this run:
 *
 * > This is also where a Hermes *binding* would have been. Hermes' image field
 * > could resolve from a connected integration at render time; **Loom has no
 * > resolution layer**, so a src is a plain URL in the tree.
 *
 * That was true when it was written and stopped being true on 15 August, when
 * [0058](../../decisions/0058-a-binding-is-a-question-the-tree-asks-answered-before-the-walk.md)
 * gave the tree a way to ask a question of a registered source. It is the
 * second time this library has carried a docstring arguing that a mechanism
 * does not exist after the mechanism shipped —
 * [0096](../../decisions/0096-a-behaviour-publishes-a-value-on-the-element-the-primitive-placed-it-in.md)'s
 * was the first, on `loom.before-after`, and it cost twenty-eight days.
 *
 * ## What it fixes, and the larger thing it does not
 *
 * An image in a Loom tree is a URL a model wrote, and a model writing a URL to
 * a file is a model guessing. Every real deployment already has its pictures
 * somewhere that knows their addresses — a media library, a CMS, a product
 * table, an object store with a manifest — and that is a question with an
 * answer rather than a string to be invented. So this is the one shape of image
 * a page can carry that nobody had to type.
 *
 * **It does not close the catalogue's image problem**, and four reports have now
 * named that problem, so this is worth being exact about. Seven primitives are
 * unreachable from any band because `mediaUrlSchema` rightly refuses `data:`
 * and a `/path` is a broken image on every deployment that does not host it.
 * A binding does not reach them: a binding is read by a primitive that declares
 * `reads`, so unblocking `loom.embed`, `loom.lightbox`, `loom.carousel`,
 * `loom.overlay`, `loom.pin` and `loom.before-after` this way would mean six
 * more bound twins — six near-duplicates for one missing placeholder, which is
 * the shades-of-one mistake at scale and would not survive
 * [0233](../../decisions/0233-a-bound-twin-is-earned-by-a-system-of-record-and-a-row-shape-the-primitive-can-declare.md)'s
 * own test. The 5 October finding recommended a binding on the strength of the
 * seven; read properly it closes one of them. Re-filed with that correction.
 *
 * ## Why this is a second primitive and not a binding on `loom.media`
 *
 * `src` would have to become optional, and a `loom.media` with no `src` and no
 * binding would then be a valid tree — so every authored image in every stored
 * tree loses the one guarantee its schema is there to make. That is
 * `loom.tally`'s argument against folding itself into `loom.stat`, and 0233 is
 * the rule it turned into.
 *
 * ## The alt text comes with the picture, and this is the interesting call
 *
 * `loom.media` requires `alt` as a prop because props are AI-authored and *"the
 * model usually remembers alt text"* is not an accessibility strategy. Carrying
 * that forward literally would put a single `alt` prop over whatever picture a
 * source happens to return today — a description that is wrong the moment the
 * answer changes, which is worse than none because nothing can tell that it has
 * gone stale.
 *
 * So `alt` is a **field of the row**, and it is required there. A row that
 * carries no alt text does not read, and a plate with nothing to show draws its
 * `empty` region. The consequence is the point: **this primitive cannot put an
 * undescribed image on a page.** A media library that stores alt text beside
 * the file gets a picture; one that does not gets a designed placeholder and an
 * author who finds out immediately.
 *
 * `decorative` stays a prop, and the split is not arbitrary. Whether an image
 * needs describing is a fact about the *role it plays on this page* rather than
 * about the file: the same photograph is decoration behind a headline and
 * content in a product listing. A tree says *nothing here needs describing*,
 * which stays true when the answer changes, and the row's alt is then rendered
 * as `alt=""` rather than discarded.
 *
 * ## It arrives unconnected, and that state is drawn rather than broken
 *
 * With no answer this draws the `empty` region inside a frame at the declared
 * aspect, which is what a page looks like before anybody connected their
 * pictures — a real state of a real page, and the one a catalogue band can
 * honestly photograph.
 *
 * **This paragraph used to carry a borrowed reason, and the borrowing is the
 * lesson.** It read: *"`loom.feed` settled the shape: a bound primitive
 * declares only the regions it places without an answer, because
 * `auditRegistry` cannot supply one."* It can, and had been able to for
 * thirteen days when this file landed on 6 October. The sentence was copied
 * from `loom.feed`, where it was true on the day it was written, and copying it
 * moved a limit that one primitive had hit into a **rule about the library** —
 * stated in the present tense, with the instrument's name still in it. 0185's
 * own alternatives section names this as the thing it was most worried about:
 * *"an instrument that shapes the thing it measures, silently, is worse than
 * one that reports a false positive a person can dismiss."* The shaping did not
 * even need the instrument present; a sentence about it was enough.
 *
 * ## The failure region is a slot too, over the sentence rather than instead of it
 *
 * `loom.feed` set this shape and carried the paragraph that said it could not
 * be this way — a statement about `auditRegistry`'s reach, written in the
 * grammar of a statement about design.
 * [0185](../../decisions/0185-a-probe-is-handed-answers-the-way-it-is-handed-props.md)
 * discharged the reach on 23 September and left the design call to this lane;
 * [0246](../../decisions/0246-a-bound-primitives-failure-region-is-a-slot-over-its-declared-sentence.md) makes it. The region falls back to the declared
 * sentence, so a tree that says nothing renders exactly what it rendered
 * before, and one failure slot serves both failure answers because the
 * difference between them is the author's and not the reader's.
 */

/**
 * What a row has to have for this to draw it.
 *
 * `src` is held to the same scheme allowlist every URL in this library is held
 * to (0053), and it is the second URL in the library arriving from a *host's
 * data* rather than from the tree — the Gate never saw this string, so this is
 * the only place it can be refused.
 *
 * Unlike `loom.feed`'s `href`, a bad address here is **not** degraded past: an
 * entry whose link fails is still words worth reading, and an image whose
 * address fails is nothing at all. It reads as no picture, and the frame says
 * so.
 */
const pictureSchema = z.object({
  src: mediaUrlSchema,
  /** Required here, where it is optional on nothing — see the note above. */
  alt: z.string().min(1).max(280),
  /** The row's own words under the picture: a credit, a title, a date taken. */
  caption: z.string().min(1).max(240).optional(),
})

type Picture = z.infer<typeof pictureSchema>

const props = z
  .object({
    /**
     * Which of this node's own answers to draw — `loom.data[binding]`, where the
     * names come from the `loom:data` this node declared.
     */
    binding: z
      .string()
      .regex(/^[a-z][a-zA-Z0-9]*$/, BINDING_NAME_EXPECTATION)
      .max(60)
      .optional(),
    /**
     * That this picture needs no description *on this page*, whatever the row
     * says. A fact about the role rather than the file — see the note above —
     * and the HTML convention it renders is `alt=""`.
     */
    decorative: z.boolean().optional(),
    /**
     * The shape the frame holds, answered and unanswered alike. It is why this
     * is the one bound primitive in the library whose unconnected state takes up
     * exactly as much room as its connected one: a band that reflowed when a
     * source answered would be a band nobody could lay out.
     */
    aspect: z.enum(["auto", ...ASPECT_NAMES]).optional(),
    fit: z.enum(["cover", "contain"]).optional(),
    corners: z.enum(["none", "sm", "md", "lg"]).optional(),
  })
  .strict()

type Props = z.infer<typeof props>

const DEFAULT_BINDING = "image"

/**
 * The twin's three named shapes, from `layout.ts`, because a frame that says
 * `wide` has to mean the same ratio wherever it is said. `auto` belongs to a
 * photograph and to nothing else — but see the note on it below, which is where
 * this primitive and its twin genuinely differ.
 */
const ASPECTS: Readonly<Record<"auto" | AspectName, string | undefined>> = {
  auto: undefined,
  ...ASPECT_RATIOS,
}

/** What the primitive made of the answer it was handed. */
type Reading =
  | { readonly kind: "picture"; readonly picture: Picture }
  /** Asked and told there is nothing, or never asked at all. */
  | { readonly kind: "empty" }
  | { readonly kind: "unavailable" }
  | { readonly kind: "mismatched" }

/**
 * The answer, read.
 *
 * Four states where `loom.media` has one, and the two in the middle are the
 * ones worth separating: a source that answered `null` has told this page it
 * has no picture for it, which is the `empty` region; a source that answered
 * something this cannot draw has answered a different question, which is the
 * failure line. 0058 is explicit that collapsing *nothing to report* into
 * *could not be reached* is the mistake, and a picture has both.
 */
const readAnswer = (outcome: DataOutcome | undefined): Reading => {
  if (outcome === undefined) return { kind: "empty" }
  if (outcome.status === "unavailable") return { kind: "unavailable" }
  if (outcome.value === null) return { kind: "empty" }

  const picture = pictureSchema.safeParse(outcome.value)

  return picture.success ? { kind: "picture", picture: picture.data } : { kind: "mismatched" }
}

const bindingNameOf = (props_: Readonly<Record<string, unknown>>): string =>
  typeof props_["binding"] === "string" ? props_["binding"] : DEFAULT_BINDING

/**
 * The frame, which is the whole of this primitive's own design.
 *
 * It is drawn in every state, and that is the decision: a picture, a
 * placeholder and a failure line all sit in the same box at the same ratio, so
 * connecting a source changes what is in the frame and never where the frame
 * is. The twin has no frame at all — an authored image is its own box, because
 * an authored image is always there.
 */
const frameStyle = (
  given: Props,
  ratio: string | undefined,
  filled: boolean
): Record<string, unknown> => {
  const corners = given.corners ?? "md"

  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    width: "100%",
    boxSizing: "border-box",
    borderRadius: corners === "none" ? "0" : radius(corners),
    /**
     * `auto` with no answer has no height to take, so the frame falls back to the
     * one named ratio most pictures on a landing page are. An unconnected plate
     * collapsing to nothing is the one way this could draw a layout the connected
     * page does not have.
     */
    ...(ratio === undefined
      ? filled
        ? {}
        : { aspectRatio: ASPECT_RATIOS["wide"] }
      : { aspectRatio: ratio }),
    ...(filled
      ? {}
      : {
          background: colour("bg-surface-muted"),
          border: `1px dashed ${colour("border-subtle")}`,
          padding: space(4),
        }),
  }
}

const noticeOf = (words: string): ReactNode =>
  createElement(
    "p",
    {
      role: "status",
      style: {
        margin: "0",
        textAlign: "center",
        fontFamily: family("body"),
        fontSize: size(2),
        color: colour("fg-muted"),
      },
    },
    words,
  )

export const loomPlate = definePrimitive({
  type: "loom.plate",
  description:
    "A picture read from a data binding, with the alt text the row carries — an image from a media library or a product table, rather than a URL somebody typed. Use loom.media for an image the tree authors. Regions: empty, unavailable.",
  props,
  slots: ["empty", "unavailable"],
  /**
   * Nothing a reader reads is in these props. The alt text and the caption are
   * the row's, which is this primitive's whole argument, and `binding` is a name
   * an answer arrives under. What a tree may put words in is the `empty` and
   * `unavailable` regions.
   *
   * Declared empty rather than left out, which 0122 says are different answers:
   * this one has been asked and the answer is *none*, where absence would say
   * nobody had looked.
   */
  copy: [],
  /**
   * The name this looks its picture up under: whichever name `binding` gives and
   * `image` when it gives none. 0184's second form.
   */
  reads: [{ fromProp: "binding", default: "image" }],
  /**
   * Two sentences, declared (0060), and they are two facts: one is worth trying
   * again for and the other is a source answering a question this did not ask.
   *
   * There is no third. `loom.feed`'s *"some entries could not be shown"* has no
   * analogue here, because one picture cannot be partly drawn — a row that does
   * not read is the whole answer not reading, which is the second line.
   */
  text: {
    unavailable: "This picture could not be loaded.",
    mismatched: "This picture could not be shown.",
  },
  /**
   * What it was given and what it drew, for the one answer it reads (0206).
   *
   * **One row, not many, and that is a legitimate reading** — `UnshownReading`
   * counts rows in an answer and an answer that is one object is one row. It
   * reports `1` given and `0` shown for the case that matters and is otherwise
   * invisible: a media library answering with a file whose `alt` column is
   * empty, or an address on a scheme the allowlist refuses. Both resolve
   * cleanly, both draw a placeholder, and before this neither reached anybody
   * who could fix it.
   *
   * `unavailable` returns no reading: the source did not answer, which the walk
   * already reports, and there were no rows to be given.
   */
  unshown: (props_, data) => {
    const name = bindingNameOf(props_)
    const reading = readAnswer(data[name])

    return reading.kind === "mismatched" ? [{ name, given: 1, shown: 0 }] : []
  },
  component: ({
    loom,
    props: given,
    children: _unused,
  }: LoomPrimitiveProps<Props, "unavailable" | "mismatched">) => {
    const reading = readAnswer(loom.data[given.binding ?? DEFAULT_BINDING])
    const ratio = ASPECTS[given.aspect ?? "auto"]
    const filled = reading.kind === "picture"

    const inside: ReactNode =
      reading.kind === "picture"
        ? createElement("img", {
            src: reading.picture.src,
            /**
             * The row's words, unless the tree said this picture plays a
             * decorative part on this page — in which case the convention is an
             * empty string and `role="presentation"`, exactly as the twin spells
             * it.
             */
            alt: given.decorative === true ? "" : reading.picture.alt,
            ...(given.decorative === true ? { role: "presentation" } : {}),
            loading: "lazy",
            decoding: "async",
            style: {
              display: "block",
              width: "100%",
              height: ratio === undefined ? "auto" : "100%",
              objectFit: given.fit ?? "cover",
            },
          })
        : reading.kind === "unavailable"
          ? (loom.slots["unavailable"] ?? noticeOf(loom.text.unavailable))
          : reading.kind === "mismatched"
            ? (loom.slots["unavailable"] ?? noticeOf(loom.text.mismatched))
            : (loom.slots["empty"] ?? null)

    const caption = reading.kind === "picture" ? reading.picture.caption : undefined

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
        },
      },
      createElement("div", { style: frameStyle(given, ratio, filled) }, inside),
      caption === undefined
        ? null
        : createElement(
            "figcaption",
            {
              style: {
                fontFamily: family("body"),
                fontSize: size(2),
                color: colour("fg-muted"),
              },
            },
            caption,
          ),
    )
  },
})
