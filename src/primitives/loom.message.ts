import { createElement, type CSSProperties, type ReactNode } from "react"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive } from "../sdk/definition.js"

import { portrait } from "./portrait.js"
import { libraryStylesheet, LIBRARY_CLASS } from "./stylesheet.js"
import { colour, family, radius, size, space, weight } from "./tokens.js"
import { mediaUrlSchema } from "./url.js"

/**
 * One turn of a conversation: who said it, and what they said.
 *
 * There is no Hermes block behind this one. Hermes sold a person's *services*,
 * and a page that sells a **tool that answers you** has a band it never needed —
 * the exchange itself, shown rather than described. It is the band every
 * assistant's marketing page opens with, it is what a support product's page
 * puts under its hero, and until now this library could only fake it with a
 * column of `loom.card`s that carry no side, no voice and no attribution.
 *
 * ## What is a prop and what is a child
 *
 * The body is **children**, and that is
 * [0094](../../decisions/0094-a-cards-prose-is-a-child-when-the-card-has-a-flow.md)
 * rather than a preference: a message has a flow. A reply is routinely two
 * paragraphs, a list of three options and a snippet, which is exactly the
 * repeated part 0052 turns into nodes — so the sentence inside a turn takes its
 * place among them as a `loom.prose`, and "put the code above the explanation"
 * is one `move` instead of a prop nobody predicted.
 *
 * Everything else is one-per-record and stays a prop: who is speaking, their
 * name, the time on it, their portrait. None of them is a set of nodes, and a
 * name that outlived the turn it names would be a valid tree saying nothing.
 *
 * `avatar` is a prop rather than a `loom.avatar` child for the reason
 * `loom.quote` gives for the same field — one portrait per record, and a
 * portrait that could be reordered against the words it belongs to is a
 * reachability nobody wants. With no photograph it falls back to the speaker's
 * initials, and with no `name` either it draws nothing: `portrait.ts` owns both
 * halves and this primitive is the one caller that needs the second.
 *
 * ## Why the speakers are called that
 *
 * `person`, `assistant` and `system` are the three words every model already
 * reads a transcript in, and the catalogue is chosen from by a model
 * ([0054](../../decisions/0054-a-container-is-its-childs-name-plus-the-arrangement.md)
 * makes the same argument about container names). A page whose two speakers are
 * both people uses `person` and `assistant` for the two sides and gives each a
 * `name` — the enum names the *side of the exchange*, and the name names who.
 *
 * It is a prop and not a structure because it changes no node: the same turn
 * rendered on either side is the same turn. That is the granularity doc's test
 * applied literally — *does changing this prop change the set of nodes?*
 *
 * ## Why its layout is in the stylesheet
 *
 * `loom.milestone` learned this at the cost of a rewrite, and the lesson is
 * written into `stylesheet.ts`: **a child that lays itself out inline cannot be
 * rearranged by its container.** An inline `flex-direction` here would pin
 * these turns into bubbles forever, and the second arrangement of this content
 * model — a transcript set flush left, the way a published interview reads — is
 * exactly the container 0054 says to write when somebody wants it. So the
 * direction, the alignment and the body's measure are four rules in the
 * stylesheet, and what stays inline is the paint neither arrangement varies.
 *
 * ## The pairings it paints
 *
 * Nothing here is a colour combination the contrast audit does not already
 * carry. A person's bubble is `fg-default` on `accent-subtle`, which is the
 * pairing `loom.section`'s accent tone already paints; the assistant's is
 * `fg-default` on `bg-surface`. The composing dots are `fg-muted` rather than
 * `fg-subtle` **deliberately** — `fg-subtle` on `accent-subtle` is eight of the
 * nine composed contrast failures in the whole library (filed 25 August), and a
 * new primitive that reached for it would be the ninth palette's worth.
 */

const props = z
  .object({
    /**
     * Which side of the exchange this turn is. It selects among three
     * renderings and changes no node, which is what keeps it a prop.
     */
    speaker: z.enum(["person", "assistant", "system"]),
    /** Who is speaking, shown above the turn — "You", "Loom", "Ana". */
    name: z.string().min(1).max(80).optional(),
    /** The time on it, as the page wants it read: "09:41", "2 minutes ago". */
    stamp: z.string().min(1).max(40).optional(),
    avatar: mediaUrlSchema.optional(),
    /**
     * Whether this turn is still being composed — the three dots, in place of
     * or beneath whatever has arrived so far.
     *
     * It is the one piece of motion in the band, and it is a *variant* rather
     * than a duration, which is the only thing 0055 lets a tree say about
     * motion at all.
     */
    pending: z.boolean().optional(),
  })
  .strict()

type Props = z.infer<typeof props>
type Speaker = Props["speaker"]

const AVATAR_SIZE = "2.25rem"

/**
 * The paint, per side. The *layout* per side is in `stylesheet.ts`; these are
 * the surfaces, and a container has no reason to override a surface.
 *
 * The squared corner is the whole reason a bubble reads as speech rather than
 * as a rounded box: the tail corner is the one nearest its speaker, so it sits
 * at the end on a person's turn and at the start on the assistant's.
 */
const SKINS: Readonly<Record<Speaker, CSSProperties>> = {
  person: {
    background: colour("accent-subtle"),
    border: `1px solid ${colour("border-accent")}`,
    borderEndEndRadius: radius("sm"),
  },
  assistant: {
    background: colour("bg-surface"),
    border: `1px solid ${colour("border-subtle")}`,
    borderEndStartRadius: radius("sm"),
  },
  /**
   * A system line is not speech and is not drawn as any. It is the page saying
   * something about the conversation — *the model refused this*, *Ana joined* —
   * so it takes no surface, no border and no side, and reads as a caption
   * between two turns.
   */
  system: {
    background: "transparent",
    border: "1px solid transparent",
    borderRadius: "0",
    padding: `${space(1)} 0`,
    fontSize: size(2),
    color: colour("fg-muted"),
    textAlign: "center",
  },
}

/** The two sides that have a rule of their own. `assistant` is the base. */
const SIDE_CLASS: Readonly<Record<Speaker, string | undefined>> = {
  person: LIBRARY_CLASS.messagePerson,
  assistant: undefined,
  system: LIBRARY_CLASS.messageSystem,
}

const BUBBLE: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: space(2),
  margin: "0",
  padding: `${space(3)} ${space(4)}`,
  borderRadius: radius("lg"),
  fontFamily: family("body"),
  fontSize: size(3),
  lineHeight: 1.6,
  color: colour("fg-default"),
  textWrap: "pretty",
}

export const loomMessage = definePrimitive({
  type: "loom.message",
  description:
    "One turn of a conversation — who is speaking, when, and what they said. A row of a loom.message-list.",
  props,
  slots: [],
  copy: ["name", "stamp"],
  text: {
    /** Named rather than mute: three dots with no accessible name are silence. */
    pending: "Still writing",
  },
  component: ({ loom, props: given, children }: LoomPrimitiveProps<Props, "pending">) => {
    const speaker: Speaker = given.speaker
    const side = SIDE_CLASS[speaker]

    const meta: ReactNode =
      given.name === undefined && given.stamp === undefined
        ? null
        : createElement(
            "p",
            {
              key: "meta",
              style: {
                display: "flex",
                alignItems: "baseline",
                gap: space(2),
                margin: "0",
                fontFamily: family("body"),
                fontSize: size(2),
                lineHeight: 1.4,
              },
            },
            given.name === undefined
              ? null
              : createElement(
                  "span",
                  { key: "name", style: { fontWeight: weight("heading"), color: colour("fg-default") } },
                  given.name
                ),
            given.stamp === undefined
              ? null
              : createElement(
                  "span",
                  {
                    key: "stamp",
                    style: { color: colour("fg-subtle"), fontVariantNumeric: "tabular-nums" },
                  },
                  given.stamp
                )
          )

    /**
     * `role="img"` with a name rather than a live region. A page that ships
     * this rendering is showing a conversation that already happened — nothing
     * is going to arrive and announce itself — so a `status` would promise an
     * update that never comes. What a reader needs is the same thing a sighted
     * one gets: *this turn is unfinished*.
     */
    const dots = createElement(
      "span",
      {
        key: "pending",
        className: LIBRARY_CLASS.messageDots,
        role: "img",
        "aria-label": loom.text.pending,
        style: { display: "inline-flex", alignItems: "center", gap: "0.3rem", paddingBlock: space(1) },
      },
      [0, 1, 2].map((index) =>
        createElement("span", {
          key: index,
          className: LIBRARY_CLASS.messageDot,
          style: {
            width: "0.4rem",
            height: "0.4rem",
            borderRadius: radius("full"),
            background: colour("fg-muted"),
          },
        })
      )
    )

    return createElement(
      "li",
      {
        ...loom.editable,
        className: [LIBRARY_CLASS.message, side].filter((name) => name !== undefined).join(" "),
      },
      libraryStylesheet(),
      /**
       * **A turn with a name gets a face; a turn with neither gets nothing.**
       * The second half is the reason this call passes `name` rather than a
       * string the primitive could always supply: `name` is optional here, and
       * a transcript that is obviously one person talking to one assistant
       * routinely leaves it off. An empty circle in that case is a hole, not a
       * decision — which is the distinction `portrait.ts` makes and the one
       * thing this primitive would have had to remember on its own.
       */
      portrait({
        /**
         * A system turn is not somebody speaking — it is the room saying
         * something — so it never gets a face, whatever it is called. Every
         * chat surface draws that line the same way and this is the one place
         * the enum's third member means something other than *a side*.
         */
        name: given.speaker === "system" ? undefined : given.name,
        image: given.avatar,
        box: AVATAR_SIZE,
        glyph: 1,
        corners: "circle",
        labelled: false,
        key: "avatar",
      }),
      createElement(
        "div",
        { key: "body", className: LIBRARY_CLASS.messageBody },
        meta,
        createElement(
          "div",
          { key: "bubble", style: { ...BUBBLE, ...SKINS[speaker] } },
          children,
          given.pending === true ? dots : null
        )
      )
    )
  },
})
