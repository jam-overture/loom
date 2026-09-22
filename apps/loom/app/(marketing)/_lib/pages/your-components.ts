import {
  buildElement,
  buildSlot,
  createTree,
  sequentialIdFactory,
  type CataloguedPrimitive,
  type IdFactory,
  type LoomNode,
  type LoomTree,
} from "@loom/runtime"
import { THEME_PROP_KEY } from "@loom/runtime/react"
import { catalogueOf } from "@loom/runtime/sdk"
/**
 * Two entry points for one idea, which is a seam rather than a mistake on this
 * page's part: `@loom/runtime/sdk` exports `catalogueOf` and not the type of
 * what it hands back, so the function comes from the SDK and the shape of its
 * answer from the root. Filed for `Loom daily build` on 8 September; both are
 * published entry points, so nothing here is reaching inside anything (0018).
 */

import { siteFooter, siteHeader, siteReadingBand, type ChromeContext } from "../chrome"
import { FACTS } from "../copy"
import { action, cell, columns, heading, prose, row, section, stack } from "../nodes"
import { siteRegistry } from "../registry"
import {
  DEMO,
  DOCS,
  HOW_IT_WORKS,
  internalHref,
  SITE_THEMES,
  surfaceHref,
  THE_RULES,
  YOUR_COMPONENTS,
} from "../site"

import type { PageContext } from "./home"

/**
 * The page for the question the other four left open.
 *
 * Read across its own links, this site said two different things about where
 * the pieces of a page come from — *"N ready-made pieces to build with"* in one
 * band, *"it can only use the pieces you handed it"* in the band below it. Both
 * are true. Neither is the answer to the question a developer is actually
 * asking, which is **do I have to rebuild my page in somebody else's
 * components?**
 *
 * So this page says the whole thing once: you describe what you already have,
 * the description is four things and none of them is your code, ours and yours
 * end up in one list, and there are three things no request can get past. Every
 * claim on it is a description of code in this repository rather than a
 * position, so none of it waited on an answer about audience or price.
 *
 * **The specimen band is the reason the page is worth reading rather than
 * skimming.** It does not describe what a description looks like — it prints the
 * one this very site handed over for the card the reader is looking at, taken
 * off the catalogue at build time. A page arguing "the AI only ever sees these
 * four things" while typing out an example of them would be making the argument
 * in exactly the form it says nobody should trust.
 */

/**
 * The piece the specimen band is about.
 *
 * A card, because the reader is looking at cards on the page it sits on and
 * because it is the one piece in the library whose four settings and two
 * regions can be read in a glance. It is named here rather than picked by any
 * rule — "the first one alphabetically" would be a specimen that changes
 * whenever the library grows, and a band whose subject moves is a band nobody
 * can write copy for.
 */
const SPECIMEN = "loom.card"

/**
 * What this site told Loom about that piece, read off the catalogue rather than
 * typed out beside it.
 *
 * `catalogueOf` is the one function that turns what a deployment registered into
 * something that can leave the process — it is what the AI is shown, what
 * telemetry records, and what a portal builds an insert menu from. So the four
 * rows below are not an illustration of the description: they *are* the
 * description, and there is no second copy of it to go stale.
 *
 * It throws rather than falling back, on the same terms as the front door's band
 * of ways in: a page whose whole argument is a specimen has nothing to say if
 * the specimen is missing, and rendering it half-empty would be worse than not
 * building.
 */
const specimen = (): CataloguedPrimitive => {
  const found = catalogueOf(siteRegistry).find((one) => one.type === SPECIMEN)

  if (found === undefined) {
    throw new Error(`loom: ${SPECIMEN} is not in the library ${YOUR_COMPONENTS.path} is about`)
  }

  return found
}

/**
 * The settings, listed the way the reader will meet them: by name, comma
 * separated, in the order the catalogue holds them.
 *
 * `undefined` is a real answer and is not the same as none — the catalogue says
 * so in as many words — so it is said in words rather than rendered as an empty
 * cell. No piece this site uses answers that way today; a page that quietly
 * printed nothing on the day one did would be the paper trail with a hole in it
 * that this whole site argues cannot happen.
 */
const settingsOf = (piece: CataloguedPrimitive): string =>
  piece.props === undefined
    ? "Not something this piece can say"
    : piece.props.map((prop) => prop.name).join(", ")

const insideOf = (piece: CataloguedPrimitive): string =>
  piece.slots.length === 0 ? "None — whatever it holds simply goes in it" : piece.slots.join(", ")

const hero = (ids: IdFactory, context: PageContext): LoomNode =>
  buildElement(ids, {
    type: "loom.hero",
    props: {
      backdrop: "grid",
      align: "start",
      stature: "standard",
      eyebrow: "What Loom is allowed to touch",
    },
    children: [
      buildSlot(ids, "heading", [
        heading(ids, 1, "Nothing here asks you to rebuild your page", { balance: true }),
      ]),
      prose(
        ids,
        "You keep the components you already built. You describe each one — its name, what it is for, and which settings may be changed. That description is all the AI ever sees.",
        { size: "lead", measured: true }
      ),
      buildSlot(ids, "actions", [
        action(ids, "Read the docs", surfaceHref(context.origin, DOCS), {
          variant: "primary",
          scale: "large",
        }),
        action(
          ids,
          "See how a change travels",
          internalHref(context.origin, HOW_IT_WORKS.path, context.theme),
          { variant: "secondary", scale: "large" }
        ),
      ]),
    ],
  })

/**
 * The four things, and the sentence under them is the one that matters.
 *
 * A reader who has been told an AI will rearrange their interface assumes the
 * price is handing over the interface. It is not: what is handed over is a
 * description of it, and the components themselves stay in the repository they
 * are in now, imported by the same build, reviewed by the same people.
 */
const handedOver = (ids: IdFactory): LoomNode =>
  section(
    ids,
    { width: "wide", eyebrow: "What you hand over" },
    "Four things about a component, and none of them is its code",
    [
      prose(
        ids,
        "Describing a component is a short piece of code you write once, next to the component itself. Your own code never leaves your repository and no part of it travels with a change.",
        { size: "lead", measured: true }
      ),
      buildElement(ids, {
        type: "loom.feature-grid",
        props: { columns: "four", density: "tight" },
        children: [
          buildElement(ids, {
            type: "loom.feature",
            props: {
              title: "What it is called",
              body: "The name a page uses to reach it. Yours are named after your own application, so a name tells you at a glance whose piece it is.",
            },
          }),
          buildElement(ids, {
            type: "loom.feature",
            props: {
              title: "What it is for",
              body: "One line, written by you. It is what the AI reads when it is working out whether this is the piece the request is asking for.",
            },
          }),
          buildElement(ids, {
            type: "loom.feature",
            props: {
              title: "Which settings may be changed",
              body: "Listed by name, each with the values it will accept. Anything not on that list cannot be set, however the request is worded.",
            },
          }),
          buildElement(ids, {
            type: "loom.feature",
            props: {
              title: "The places things can go inside it",
              body: "A card has a region for a picture and a region at its foot. Naming them is what lets something be put in one of them rather than just after the last thing.",
            },
          }),
        ],
      }),
    ]
  )

/**
 * The card on the left is the subject of the table on the right.
 *
 * `loom.split` rather than two bands, because the claim is a comparison and a
 * comparison a reader has to scroll between is a comparison they take on trust.
 * It stacks below its own wrap width, so the phone gets the card and then the
 * table it is about, in that order, which is the reading order anyway.
 */
const oneOfThem = (ids: IdFactory): LoomNode => {
  const piece = specimen()

  return section(
    ids,
    { tone: "surface", width: "wide", eyebrow: "One of them, for real" },
    "This is everything the AI is told about the card on the left",
    [
      /**
       * *Everything the AI is told* rather than *everything Loom knows*, and the
       * difference is a real one worth getting right on the one band that quotes
       * the machinery. What a piece hands over includes the values each setting
       * will accept, which is how a wrong one is refused; what leaves the process
       * — to a model, to telemetry, to a portal's insert menu — is this shallower
       * projection, names and no types, by a deliberate decision recorded on
       * `catalogueOf`. The narrower sentence is the one that is exactly true, and
       * it is also the more interesting claim.
       */
      prose(
        ids,
        "Not an example of a description — the description. It is read off this site's own list as the page is built, so what you are reading is what a model asking to change this card would be handed.",
        { size: "lead", measured: true }
      ),
      buildElement(ids, {
        type: "loom.split",
        props: { ratio: "end-wide", align: "start" },
        children: [
          buildSlot(ids, "start", [
            buildElement(ids, {
              type: "loom.card",
              props: { tone: "outline", padding: "normal" },
              children: [
                heading(ids, 3, "A card, on this page"),
                prose(
                  ids,
                  "The heading above and this sentence are ordinary content put on it. The line below sits in the second of the two places the table names, which is why it is ruled off and pinned there.",
                  { tone: "muted" }
                ),
                buildSlot(ids, "footer", [
                  prose(ids, "Its foot, pinned here", { size: "small", tone: "muted" }),
                ]),
              ],
            }),
          ]),
          buildSlot(ids, "end", [
            buildElement(ids, {
              type: "loom.table",
              props: {
                tone: "panel",
                rules: "rows",
                density: "comfortable",
                caption: "What anything outside Loom is ever told about one piece of this page.",
              },
              children: [
                columns(ids, ["What the AI is told", "What it says for this card"]),
                row(ids, [cell(ids, "What it is called"), cell(ids, piece.type)]),
                row(ids, [cell(ids, "What it is for"), cell(ids, piece.description)]),
                row(ids, [cell(ids, "Which settings may be changed"), cell(ids, settingsOf(piece))]),
                row(ids, [cell(ids, "The places things can go inside it"), cell(ids, insideOf(piece))]),
              ],
            }),
          ]),
        ],
      }),
      prose(
        ids,
        "A component of yours would have the same four rows, with your name in the first one and your settings in the third. There is no fifth row where the code goes.",
        { measured: true, tone: "muted" }
      ),
    ]
  )
}

/**
 * The band this page exists for, and it is a reconciliation rather than a claim.
 *
 * Two true sentences, one screen apart on the front door, that answered the same
 * question differently. Said together they stop being a contradiction and start
 * being the offer: here is something to start with, and it is not the deal.
 */
const oursAndYours = (ids: IdFactory, context: PageContext): LoomNode =>
  section(
    ids,
    { width: "wide", eyebrow: "Where the pieces come from" },
    "The ready-made ones are a starting point, not the deal",
    [
      prose(
        ids,
        `Loom comes with ${FACTS.primitives} pieces so that you have something to build with on day one, and this whole site is built from them and nothing else. They are not a requirement. A component you describe joins the same list, and from then on the two are treated identically: the same rules weigh a change to it, the same record is kept of what happened, and a request can ask for it by name exactly as it asks for one of ours.`,
        { size: "lead", measured: true }
      ),
      buildElement(ids, {
        type: "loom.callout",
        props: { tone: "accent", title: "They are told apart by name, and they cannot collide" },
        children: [
          prose(
            ids,
            "Everything the library ships is named beginning with “loom.”, and that beginning is reserved: the tool that sets a component up for you refuses to write a name under it and offers you one under your own application's name instead. Two pieces cannot share a name either — a list holding the same name twice is refused rather than quietly resolved to one of them. So nothing of yours can be shadowed by something of ours, and no version of the library can arrive and take a name you were already using.",
          ),
        ],
      }),
      stack(ids, { direction: "row", gap: "snug", wrap: true }, [
        action(
          ids,
          "See what your rules can say",
          internalHref(context.origin, THE_RULES.path, context.theme),
          { variant: "secondary", scale: "medium" }
        ),
        action(ids, "Try it on a page you did not write", surfaceHref(context.origin, DEMO), {
          variant: "quiet",
          scale: "medium",
        }),
      ]),
    ]
  )

/**
 * Three limits, and each one is a mechanism rather than an intention.
 *
 * Everything on this band is something the machinery refuses, at a named moment,
 * whatever the request said — which is the difference between a limit and a
 * promise, and is the same distinction the rules page draws about prompts.
 */
const neverDoes = (ids: IdFactory): LoomNode =>
  section(
    ids,
    { tone: "surface", width: "wide", eyebrow: "The limits, which are not promises" },
    "Three things no request gets past",
    [
      buildElement(ids, {
        type: "loom.feature-grid",
        props: { columns: "three", density: "tight" },
        children: [
          buildElement(ids, {
            type: "loom.feature",
            props: {
              title: "It cannot use a piece you never described",
              body: "A name nobody handed over reaches nothing. The page is drawn without it and says which name it was, rather than guessing at what might have been meant.",
            },
          }),
          buildElement(ids, {
            type: "loom.feature",
            props: {
              title: "It cannot set an option that does not exist",
              body: "Settings are checked against your description before anything is drawn. One you never listed, or a value your description does not allow, is reported instead of shown.",
            },
          }),
          buildElement(ids, {
            type: "loom.feature",
            props: {
              title: "It cannot write code into your page",
              body: "The only thing that ever travels is a short list: move this, take that away, change one of those settings. There is nothing in it for anybody to read afterwards.",
            },
          }),
        ],
      }),
      prose(
        ids,
        "None of the three is a rule you write. They are how the machinery is built, so they hold on the day somebody wires up a model you have never heard of.",
        { measured: true, tone: "muted" }
      ),
    ]
  )

const asked = (ids: IdFactory): LoomNode =>
  section(ids, { width: "wide", eyebrow: "Questions" }, "The ones people ask about their own code", [
    buildElement(ids, {
      type: "loom.faq-list",
      props: { columns: "one", width: "readable" },
      children: [
        buildElement(ids, {
          type: "loom.faq",
          props: {
            question: "Do I have to rebuild my page out of your components?",
            answer:
              "No. That is the point of describing a component rather than importing one. The components you have keep their own code, their own tests and their own place in your repository, and describing one does not change how anything else in your application uses it.",
            open: true,
          },
        }),
        buildElement(ids, {
          type: "loom.faq",
          props: {
            question: "How much of my application can I leave alone?",
            answer:
              "All of it except the pages you want a request to be able to rearrange. Describing a component costs you a few lines beside it; a page nobody has asked to be adaptable is a page nothing here touches.",
          },
        }),
        buildElement(ids, {
          type: "loom.faq",
          props: {
            question: "What happens when I change one of my components?",
            answer:
              "Nothing, until you change what you said about it. The description names the settings that may be changed, so adding one nobody has described leaves it exactly as private as it was — and taking a described setting away is a change to the description, which is ordinary code and goes through your review like anything else.",
          },
        }),
        buildElement(ids, {
          type: "loom.faq",
          props: {
            question: "Can I start with the ready-made ones and add my own later?",
            answer:
              "Yes, and it is the usual way round. This site did exactly that: it is built from the ready-made ones and has added none of its own, which is why every claim on this page is one you can check against a page you are already reading.",
          },
        }),
      ],
    }),
  ])

const closing = (ids: IdFactory, context: PageContext): LoomNode =>
  section(
    ids,
    { tone: "accent", width: "full" },
    "Your components, on a page that can rearrange itself",
    [
      prose(
        ids,
        "Describing the first one is the whole of the setting up. The documentation walks it through on a page of your own, and the demonstration lets you watch it happen on somebody else's first.",
        { size: "lead", align: "center", measured: true }
      ),
      stack(ids, { direction: "row", gap: "snug", wrap: true, align: "center", justify: "center" }, [
        action(ids, "Read the docs", surfaceHref(context.origin, DOCS), {
          variant: "primary",
          scale: "large",
        }),
        action(ids, "Try it yourself", surfaceHref(context.origin, DEMO), {
          variant: "secondary",
          scale: "large",
        }),
      ]),
    ],
    { align: "center" }
  )

export const yourComponentsPageTree = (context: PageContext): LoomTree => {
  const ids = sequentialIdFactory("yours")
  const chrome: ChromeContext = {
    origin: context.origin,
    theme: context.theme,
    current: YOUR_COMPONENTS,
    counting: context.counting === true,
  }

  return createTree(
    buildElement(ids, {
      type: "loom.page",
      props: {
        [THEME_PROP_KEY]: SITE_THEMES[context.theme].selection,
        width: "wide",
        fills: true,
      },
      children: [
        siteHeader(ids, chrome),
        hero(ids, context),
        handedOver(ids),
        oneOfThem(ids),
        oursAndYours(ids, context),
        neverDoes(ids),
        asked(ids),
        closing(ids, context),
        ...siteReadingBand(ids, chrome),
        siteFooter(ids, chrome),
      ],
    }),
    ids
  )
}

/** What the specimen band prints, for the tests that hold it to the catalogue. */
export const SPECIMEN_ROWS = {
  type: SPECIMEN,
  description: (): string => specimen().description,
  settings: (): string => settingsOf(specimen()),
  inside: (): string => insideOf(specimen()),
} as const
