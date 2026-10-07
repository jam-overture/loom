import { sequentialIdFactory, type IdFactory } from "../ids.js"
import { THEME_PROP_KEY } from "../reserved-props.js"
import { themeSelectionSchema, type ThemeSelection } from "../theme/theme.js"
import { buildElement, buildSlot, buildText } from "../tree/builders.js"
import type { ElementNode, LoomNode } from "../tree/node.js"
import { createTree } from "../tree/tree.js"

import { defineSpecimen } from "../../tools/specimen/specimen.js"

import { compositionById } from "./compositions/index.js"

/**
 * The two controls whose word is the page's rather than the library's, in the
 * four states a camera can tell apart.
 *
 * ## What a photograph settles here that a test cannot
 *
 * `named-controls.test.ts` asserts that the button says *Book a call* and that
 * two menus say different things. Neither of those is in doubt by the time a
 * sheet is taken. What a picture settles is the thing the old seam's defect was
 * actually made of: **a bar with two buttons on it reads as a bar** rather than
 * as a UI kit demonstrating that two drop-downs are possible. *Product* and
 * *Account* have to sit at opposite ends of the same strip, at the same weight
 * as the links beside them, without the second one looking like a mistake.
 *
 * And for the dialog it settles the one thing `presentation.ts` says a stylesheet
 * has to get right and no render can check: the plate is **centred when it fits
 * and reachable when it does not.** §4 is that pair deliberately — the same
 * dialog at 1280 and at 390, where the form inside it is taller than the window.
 *
 * ## Why the shut state is the first shot and is not filler
 *
 * It is the only shot that says the regions ever close, and it is the one a
 * reader of a page actually meets. Every other state on this sheet is a state a
 * visitor arrives at by pressing something.
 *
 * ## The one state that is not photographed, and why that is honest
 *
 * There is no picture of a trigger that named nothing. The floor — *More* — is
 * what a reader is announced for a node that wrote no `label`, and shooting it
 * would be a picture of a correct page with a weak word on it, which says
 * nothing a reader of the report cannot take from the sentence. The states worth
 * a frame are the ones where the word on the control came out of the tree.
 */

const text = (ids: IdFactory, value: string) => buildText(ids, value)

const band = (id: string, ids: IdFactory): ElementNode => {
  const composition = compositionById(id)

  if (composition === undefined) throw new Error(`${id} is not in the phrasebook`)

  return composition.build(ids)
}

const heading = (ids: IdFactory, level: 1 | 2 | 3, words: string): LoomNode =>
  buildElement(ids, { type: "loom.heading", props: { level }, children: [text(ids, words)] })

const prose = (ids: IdFactory, words: string): LoomNode =>
  buildElement(ids, {
    type: "loom.prose",
    props: { tone: "muted", measured: true },
    children: [text(ids, words)],
  })

/**
 * §1 — the bar, which is the retraction.
 *
 * Shot as the band ships rather than as a fixture, because the claim is about a
 * header a deployment would actually get.
 */
const theBar = (ids: IdFactory): LoomNode =>
  buildElement(ids, {
    type: "loom.section",
    props: { width: "wide", eyebrow: "§1 · the bar that could not be built" },
    children: [
      buildSlot(ids, "heading", [heading(ids, 1, "Two drop-downs, with two different names")]),
      prose(
        ids,
        "Until 0234 a control's name was the primitive's and resolved once per type, so a bar with two of these was two buttons a screen reader announced identically. Both files that documented it as permanent are retracted on this branch."
      ),
      band("nav-menus", ids),
    ],
  })

/**
 * §5 — the same pair of menus, outside a bar, and last on the sheet.
 *
 * **This section exists because of a real constraint rather than for variety,
 * and the constraint is the band's own.** At 390px `loom.nav` folds its children
 * behind its `disclose` control, so the two drop-downs in §1 are inside a
 * collapsed region and a camera cannot press them — correctly; that is what a
 * header does on a phone, and `navMenusBand`'s doc comment says so.
 *
 * A specimen's steps have to work at every viewport it declares (there are no
 * conditional steps, by design — an instrument reaches a state and never asks
 * whether it could). So the shipped bar is photographed **shut**, which is the
 * state that carries the claim anyway — two different names on one strip — and
 * the open panels are shot here, on two bare `loom.menu` nodes that no bar is
 * hiding.
 *
 * They carry the same two words as the band deliberately: what a reader should
 * see is that the panel which drops under *Product* is the one the bar would
 * have dropped.
 *
 * **Last on the sheet rather than second**, which is a photographic constraint
 * and not a narrative one: a dropped panel is drawn *over* the page, so in the
 * middle of a sheet it is a panel sitting on the next section's heading. At the
 * end it covers nothing, which is the only place a picture of it is readable.
 */
const thePairOutsideABar = (ids: IdFactory): LoomNode =>
  buildElement(ids, {
    type: "loom.section",
    props: { width: "wide", eyebrow: "§5 · the same two, where a camera can open them" },
    children: [
      buildSlot(ids, "heading", [heading(ids, 2, "What drops when you press them")]),
      prose(
        ids,
        "A bar on a phone folds its own children away, so these are the same two menus standing on their own. The rows are loom.link children, which is why a destination is an insert rather than a prop nobody predicted."
      ),
      buildElement(ids, {
        type: "loom.stack",
        props: { direction: "row", gap: "roomy", justify: "between", align: "start" },
        children: [
          buildElement(ids, {
            type: "loom.menu",
            props: { label: "Product", align: "start" },
            children: [
              buildElement(ids, {
                type: "loom.link",
                props: { href: "#what-it-does" },
                children: [text(ids, "What it does")],
              }),
              buildElement(ids, {
                type: "loom.link",
                props: { href: "#how-it-works" },
                children: [text(ids, "How it works")],
              }),
              buildElement(ids, {
                type: "loom.link",
                props: { href: "#changelog" },
                children: [text(ids, "The record")],
              }),
              buildElement(ids, {
                type: "loom.link",
                props: { href: "#comparison" },
                children: [text(ids, "Compare")],
              }),
            ],
          }),
          buildElement(ids, {
            type: "loom.menu",
            props: { label: "Account", align: "end" },
            children: [
              buildElement(ids, {
                type: "loom.link",
                props: { href: "/deployments" },
                children: [text(ids, "Your deployments")],
              }),
              buildElement(ids, {
                type: "loom.link",
                props: { href: "/billing" },
                children: [text(ids, "Billing")],
              }),
            ],
          }),
        ],
      }),
    ],
  })

/**
 * §2 — the closing band, shut. The trigger is the second control in the row and
 * has to read as one: a reader should not be able to tell from the strip that
 * one of these goes somewhere and the other opens something.
 */
const theClosingBand = (ids: IdFactory): LoomNode =>
  buildElement(ids, {
    type: "loom.section",
    props: { width: "wide", eyebrow: "§2 · a trigger that is the page's own words" },
    children: [
      buildSlot(ids, "heading", [heading(ids, 2, "Book a call, beside Start free")]),
      prose(
        ids,
        "The second control opens a form over the page instead of navigating to one. Nothing in the strip says so, which is the intended result: the words are the band's and the behaviour is the primitive's."
      ),
      band("cta-booking", ids),
    ],
  })

/**
 * §3 — the three measures, side by side and shut, so the prop's ceiling is
 * legible without opening three dialogs at once.
 *
 * Each is a real `loom.dialog`; what the shot shows at this size is only their
 * triggers in a row, which is itself the point of §2's claim repeated three
 * times. The open states are §4.
 */
const theThreeMeasures = (ids: IdFactory): LoomNode =>
  buildElement(ids, {
    type: "loom.section",
    props: { width: "wide", eyebrow: "§3 · three ceilings, three words" },
    children: [
      buildSlot(ids, "heading", [heading(ids, 2, "A ceiling is a prop; the words are not")]),
      prose(
        ids,
        "measure is a maximum the plate may reach and changes nothing about which children exist, which is why it is a prop and not a delta in disguise. The word on each trigger is the tree's."
      ),
      buildElement(ids, {
        type: "loom.stack",
        props: { direction: "row", gap: "snug", justify: "start", align: "center" },
        children: [
          buildElement(ids, {
            type: "loom.dialog",
            props: { label: "See the panel", title: "A panel", measure: "panel" },
            children: [prose(ids, "Thirty-two rem, which is what a short form or a single column wants.")],
          }),
          buildElement(ids, {
            type: "loom.dialog",
            props: { label: "Read the note", title: "A measure of prose", measure: "prose" },
            children: [
              prose(
                ids,
                "Forty-four rem, which is about the measure a paragraph wants to be read at — the same reasoning loom.prose applies to its own body text, applied to a plate that holds some."
              ),
            ],
          }),
          buildElement(ids, {
            type: "loom.dialog",
            props: { label: "Open the wide one", title: "Room for a document", measure: "media" },
            children: [
              prose(
                ids,
                "Sixty-four rem, wide enough for an embedded document to sit at its own aspect rather than be letterboxed by the plate it is in."
              ),
            ],
          }),
        ],
      }),
    ],
  })

/**
 * §4 — the long body, which is the one thing on this sheet that is a defect
 * if the stylesheet is wrong.
 *
 * Eight fields is deliberately more than a dialog should hold: a plate taller
 * than the window is the case `place-items: center` breaks, by putting the
 * plate's top above the viewport with the heading and the first field
 * unreachable. The frame starts the block axis and the plate re-centres itself
 * with `margin-block: auto` only while it fits, and the two shots of this
 * section at two widths are the whole evidence for that pairing.
 */
const LONG_FORM = [
  { name: "name", label: "Your name", required: true },
  { name: "email", label: "Work email", type: "email", required: true },
  { name: "organisation", label: "Company" },
  { name: "role", label: "Your role" },
  { name: "repository", label: "Which repository" },
  { name: "surface", label: "Which surface" },
  { name: "when", label: "When suits" },
  { name: "anything", label: "Anything else", type: "textarea" },
] as const

const theLongBody = (ids: IdFactory): LoomNode =>
  buildElement(ids, {
    type: "loom.section",
    props: { width: "wide", eyebrow: "§4 · taller than the window" },
    children: [
      buildSlot(ids, "heading", [heading(ids, 2, "Centred when it fits, reachable when it does not")]),
      prose(
        ids,
        "A lightbox holds a picture, which has a height. A dialog holds whatever the tree gave it. At 390px the plate below is taller than the viewport, and a centred overflow would put its heading above the top of the screen with nothing able to scroll to it."
      ),
      buildElement(ids, {
        type: "loom.dialog",
        props: { label: "Open the long one", title: "Eight questions", measure: "panel" },
        children: [
          buildElement(ids, {
            type: "loom.form",
            props: { layout: "stacked", width: "readable" },
            children: [
              ...LONG_FORM.map((field) => buildElement(ids, { type: "loom.field", props: { ...field } })),
              buildSlot(ids, "submit", [
                buildElement(ids, {
                  type: "loom.button",
                  props: { variant: "primary", scale: "large", width: "full" },
                  children: [text(ids, "Send it")],
                }),
              ]),
            ],
          }),
        ],
      }),
    ],
  })

const build = (theme: ThemeSelection) => {
  const ids = sequentialIdFactory()

  return createTree(
    buildElement(ids, {
      type: "loom.page",
      props: { [THEME_PROP_KEY]: theme, width: "wide", fills: true },
      children: [theBar(ids), theClosingBand(ids), theThreeMeasures(ids), theLongBody(ids), thePairOutsideABar(ids)],
    }),
    ids
  )
}

/**
 * Every trigger addressed through the class the runtime stamps on it, scoped by
 * its own primitive's root.
 *
 * There are seven `present` controls on this page — two menus and five dialogs
 * — so a bare `.loom-control-present` is a strict-mode violation rather than a
 * press. `nth=` is counted in document order and each use below says which one
 * it means and why that one.
 */
const triggerIn = (primitive: string): string => `.${primitive} > .loom-control-present`

export default defineSpecimen({
  /**
   * **Short deliberately, and it is a rule rather than a taste.** This lane
   * measured the pull-request URL mangler on 6 October: every URL in a body
   * over roughly 148 characters comes back wrapped in injected backticks, and
   * `https://raw.githubusercontent.com/jam-overture/loom/<branch>/reports/` is
   * already 99 of them. The full slug of this sheet would put every picture at
   * 181 and break all twenty-four.
   *
   * The finding's own remedy is this line: **let the specimen's name be a short
   * slug and let the report keep the long one.** Nothing joins them but a
   * relative link inside the report, which has no length problem at all. The
   * theme and viewport labels are abbreviated for the same reason and for no
   * other.
   */
  name: "2026-10-07-prim-named",
  title:
    "A bar with two named drop-downs, a closing band whose second control opens a form, the three measures a plate may take, and a dialog taller than the window",
  build,
  /**
   * Tall because §3 is a row of three triggers and §4 holds an eight-field form
   * that is only shut in the first shot. The phone height is the real 844 rather
   * than a long canvas: §4's whole claim is about a plate against a viewport,
   * and a 3000px-tall phone has no viewport to be taller than.
   */
  viewports: [
    { label: "w", width: 1280, height: 2000, deviceScaleFactor: 2 },
    { label: "p", width: 390, height: 844, deviceScaleFactor: 2 },
  ],
  themes: [
    {
      label: "ed",
      selection: themeSelectionSchema.parse({
        palette: "editorial",
        fontPack: "editorial-serif",
        stylePreset: "comfortable",
      }),
    },
    {
      label: "bo",
      selection: themeSelectionSchema.parse({
        palette: "bold",
        fontPack: "bold-sans",
        stylePreset: "airy-modern",
      }),
    },
  ],
  live: {
    states: [
      /** The only shot that says the regions ever close, and the page a reader meets. */
      { label: "shut", do: [] },
      {
        /**
         * **`nth=2`, and the index is the whole of §5's reason.** There are
         * four `loom.menu` triggers on this page: the bar's two come first in
         * document order and are inside a region a phone folds away, so these
         * steps address §5's pair instead. Pressing *Product* alone is also
         * what shows that *Account* stayed shut — the property 0176's rejected
         * alternative would have broken.
         */
        label: "product",
        do: [{ click: `${triggerIn("loom-menu")} >> nth=2` }, { wait: 400 }],
      },
      {
        /** The other one, where `align: "end"` hangs the panel leftwards. */
        label: "account",
        do: [{ click: `${triggerIn("loom-menu")} >> nth=3` }, { wait: 400 }],
      },
      {
        /** §2's dialog: the first of the five in document order. */
        label: "dialog",
        do: [{ click: `${triggerIn("loom-dialog")} >> nth=0` }, { wait: 400 }],
      },
      {
        /** §3's widest plate, which is the third of the three in that row. */
        label: "plate",
        do: [{ click: `${triggerIn("loom-dialog")} >> nth=3` }, { wait: 400 }],
      },
      {
        /**
         * §4, and the shot the stylesheet's comment is about. Last of the five,
         * and the one whose phone frame is the evidence that a plate taller than
         * the window starts at the top instead of being centred off it.
         */
        label: "long",
        do: [{ click: `${triggerIn("loom-dialog")} >> nth=4` }, { wait: 400 }],
      },
    ],
  },
})
