import {
  buildElement,
  buildSlot,
  createTree,
  sequentialIdFactory,
  type IdFactory,
  type LoomNode,
  type LoomTree,
} from "@loom/runtime"
import { THEME_PROP_KEY } from "@loom/runtime/react"

import type { AskId } from "../adapt/asks"
import type { ChangeRecord } from "../adapt/record"
import { BAND } from "../bands"
import { siteFooter, siteHeader, type ChromeContext } from "../chrome"
import { FACTS } from "../copy"
import { action, heading, prose, section, stack } from "../nodes"
import { seeItHappenBand } from "./see-it-happen"
import {
  DECISIONS_URL,
  DEMO,
  DOCS,
  HOME,
  HOW_IT_WORKS,
  internalHref,
  LESSONS,
  PORTAL,
  PRODUCT_SURFACES,
  REPOSITORY_URL,
  SITE_THEMES,
  surfaceHref,
  type SiteThemeName,
} from "../site"

/**
 * The landing page, as a tree.
 *
 * There is no markup in this file, no styling on anything in it, and no colour
 * named anywhere — which is the property the site exists to demonstrate rather
 * than to claim. What it says divides in two, deliberately: the mechanism is
 * described in plain fact because the repository is the source for all of it,
 * and everything that is a *positioning* decision is marked placeholder on the
 * page itself (see `copy.ts`).
 */

export type PageContext = {
  readonly origin: string
  readonly theme: SiteThemeName
  /**
   * What the visitor has asked the page for, off the address.
   *
   * Optional because two of the site's three pages have no such thing and
   * because the landing page has to be buildable *before* the ask is run —
   * the change is worked out against a page, so a page has to exist first.
   */
  readonly ask?: AskId
  /**
   * Whether the visitor has answered a change the rules held back.
   *
   * It changes nothing about how the page is *built* and everything about what
   * is run against it, which is why it sits here beside `ask` rather than in the
   * runner: both are what the address said, and the address is what a page of
   * this site is a function of.
   */
  readonly approve?: boolean
  /** What happened, once it has. See `render.ts` for why this arrives in a second pass. */
  readonly record?: ChangeRecord
}

const hero = (ids: IdFactory, context: PageContext): LoomNode =>
  buildElement(ids, {
    type: "loom.hero",
    props: {
      backdrop: "grid",
      align: "center",
      stature: "tall",
      eyebrow: "For pages that AI is allowed to change",
    },
    children: [
      buildSlot(ids, "heading", [
        /**
         * The maintainer's line, 21 August, verbatim.
         *
         * It is the first headline on this site that says what Loom *is* rather
         * than what it does to a page, and the contrast is the whole
         * positioning: everything else with an AI in it hands you parts, and
         * the argument is that parts are not the hard bit. Written as he wrote
         * it, comma and all — positioning is his, and a routine that "improved"
         * the punctuation of a line it was given would be rewriting the one
         * thing it was told not to invent.
         */
        heading(ids, 1, "AI creates components, Loom creates experiences.", {
          balance: true,
        }),
      ]),
      prose(
        ids,
        "Ask for a change in your own words and the page rearranges itself. Nothing lands until it has been checked against your rules — and every change keeps a record of who asked, what moved, and how to put it back.",
        { size: "lead", measured: true, align: "center" }
      ),
      buildSlot(ids, "actions", [
        action(
          ids,
          "See how a change travels",
          internalHref(context.origin, HOW_IT_WORKS.path, context.theme),
          { variant: "primary", scale: "large" }
        ),
        /**
         * The second action is the demo rather than the repository, as of
         * 22 August.
         *
         * The sentence directly above it promises the reader they can ask for a
         * change *in their own words*, and until today the nearest thing this
         * site offered was a link to GitHub. Sending someone who has just read
         * that promise to a source tree is answering "can I try it?" with "here
         * is the code", which is the wrong answer to a question nobody asked.
         *
         * Nothing is lost by moving it: the repository is still the closing
         * band's second action, a card in the facts band, and a named group in
         * the footer. It is reachable three ways from this page and none of
         * them is the first screen.
         */
        action(ids, "Try it yourself", surfaceHref(context.origin, DEMO), {
          variant: "secondary",
          scale: "large",
        }),
      ]),
    ],
  })

/**
 * The four steps every change takes, in four words.
 *
 * This band used to read *Proposals · The Gate · Revisions · Inverses* under the
 * heading "The four things underneath" — our four nouns, taught to a stranger in
 * the first screen and a half, before the page had said what any of them were
 * for. It is the exact thing the brief forbids, and the maintainer named it on
 * 20 August reading the page against `nextjs.org`.
 *
 * The four words below are the same four things. Nobody has to be taught them.
 */
const vocabulary = (ids: IdFactory): LoomNode =>
  buildElement(ids, {
    type: "loom.logo-cloud",
    props: { label: "Every change takes the same four steps", align: "center" },
    children: ["Ask", "Check", "Record", "Undo"].map((name) =>
      buildElement(ids, { type: "loom.logo", props: { name } })
    ),
  })

/**
 * What this is for: the problem, and what Loom does about it.
 *
 * The band that stood here listed four capabilities under "Change, with a paper
 * trail" — four true sentences about what the product has, which is the shape
 * every framework's landing page takes and the shape that persuades nobody. On
 * 21 August the maintainer said the core of this site is **the problems we are
 * solving and how Loom solves them**, so the band is rewritten as pairs: the
 * headline is the thing that is wrong today, and the sentence under it is the
 * answer.
 *
 * Every problem here is one this repository can actually speak to, and none of
 * them is a claim about who has it. Whether the people who care most are
 * regulated teams, agencies or hobbyists is positioning and is the maintainer's;
 * *that un-reviewable AI output is a problem* is not a market claim, it is the
 * reason the Gate exists.
 *
 * `loom.mosaic` rather than the feature grid it used to be, which closes the
 * finding this lane filed on 20 August: eight identical rectangles read as a
 * table of specifications, and the band that says what a product is for should
 * not look like a kit list. The primitives lane shipped exactly that on #121.
 */
const problems = (ids: IdFactory): LoomNode =>
  section(
    ids,
    { eyebrow: BAND.problems, width: "wide" },
    "Letting AI near your interface is the easy part",
    [
      prose(
        ids,
        "Getting a machine to produce a page has stopped being hard. Being able to answer for what it produced has not.",
        { size: "lead", measured: true }
      ),
      buildElement(ids, {
        type: "loom.mosaic",
        props: { rhythm: "alternating" },
        children: [
          buildElement(ids, {
            type: "loom.feature",
            props: {
              icon: "◇",
              title: "It writes code, and somebody has to read all of it",
              body: "A tool that generates components hands you work. Every line has to be reviewed, tested and owned before it is safe to ship. Loom never writes code into your page — it can only rearrange the pieces you already built and trust, so there is no new code to review.",
            },
          }),
          buildElement(ids, {
            type: "loom.feature",
            props: {
              icon: "◈",
              title: "Nobody can say what changed, or why",
              body: "Ask most tools what happened to a page last Tuesday and the honest answer is a diff, if you are lucky. Every change here is written down: who asked, in their own words, what moved, and which rule allowed it.",
            },
          }),
          buildElement(ids, {
            type: "loom.feature",
            props: {
              icon: "◆",
              title: "It is live before anyone has looked at it",
              body: "Changes land because a model was confident, which is not the same as being right. Here every change is weighed against rules you write — how much of the page moves, what it touches, whether it can be taken back — and anything past your line waits for a person.",
            },
          }),
          buildElement(ids, {
            type: "loom.feature",
            props: {
              icon: "◊",
              title: "Undoing it means finding the commit and hoping",
              body: "A change you cannot reverse cleanly is a change you should never have let land. Every change here arrives with the change that reverses it, written at the same moment. Putting it back is one step, and it is recorded like anything else.",
            },
          }),
        ],
      }),
    ]
  )

/** Numbers held against the repository by a test, rather than typed from memory. */
const facts = (ids: IdFactory): LoomNode =>
  section(ids, { tone: "surface", width: "wide", eyebrow: BAND.facts }, "Built in the open", [
    buildElement(ids, {
      type: "loom.stat-grid",
      props: { columns: "three", align: "center" },
      children: [
        buildElement(ids, {
          type: "loom.stat",
          props: {
            value: FACTS.primitives,
            label: "ready-made pieces to build with",
            caption: "Each one takes its colours and type from whatever theme the page is wearing.",
          },
        }),
        buildElement(ids, {
          type: "loom.stat",
          props: {
            value: FACTS.decisions,
            label: "decisions written down",
            caption: "What was chosen, what was rejected, and why — written before the code, kept after it.",
          },
        }),
        buildElement(ids, {
          type: "loom.stat",
          props: {
            value: FACTS.operations,
            label: "kinds of change there are",
            caption: "Add something, remove something, move something, change a setting. That is the whole list.",
          },
        }),
      ],
    }),
    action(ids, "Read the decisions", DECISIONS_URL, {
      variant: "quiet",
      scale: "small",
      external: true,
    }),
  ])

const questions = (ids: IdFactory): LoomNode =>
  section(ids, { width: "wide", eyebrow: BAND.questions }, "The ones worth asking first", [
    buildElement(ids, {
      type: "loom.faq-list",
      props: { columns: "two" },
      children: [
        buildElement(ids, {
          type: "loom.faq",
          props: {
            question: "Can the AI write code into my page?",
            answer:
              "No. It can only use the pieces you handed it, and it can only set the options those pieces already have. Your code stays in your own components and never travels with a change, so the worst the AI can ask for is something your page already knows how to do.",
            open: true,
          },
        }),
        buildElement(ids, {
          type: "loom.faq",
          props: {
            question: "What stops a bad change from landing?",
            answer:
              "Your rules do. Each request is weighed on how much of the page it moves, what it touches and whether it can be taken back, and then it is allowed, held for a person to look at, or refused. The rules are ordinary code, so you can test them instead of hoping.",
          },
        }),
        buildElement(ids, {
          type: "loom.faq",
          props: {
            question: "Is this a page builder?",
            answer:
              "It is the part a page builder would be built on. There is no editor to learn and nothing you have to host with us: you keep your own components, and Loom decides what may change and keeps the record of what did.",
          },
        }),
        buildElement(ids, {
          type: "loom.faq",
          props: {
            question: "What happens when a change is wrong?",
            answer:
              "You put it back. Every change is stored together with the change that reverses it, and undoing is checked against your rules and written down like anything else. Nothing is erased to make room for it.",
          },
        }),
      ],
    }),
  ])

/**
 * How a surface is offered here: the verb, and the mark above it.
 *
 * The sentence is **not** here — it is `Surface.blurb`, so the words a visitor
 * reads on this card and the words under the same link in the footer cannot
 * drift apart. What lives here is the part that is this band's rather than the
 * surface's: a card invites, so it says *Read the docs* where a menu item says
 * *Docs*.
 *
 * Keyed by path and held total by a test. The band enumerated its three cards by
 * hand until 21 August, and the merge that added the lessons course to
 * `PRODUCT_SURFACES` proved why that was wrong: the course appeared in the
 * header and in the footer and silently not here, in a band whose own comment
 * promised it could not.
 */
const WAYS_IN: Readonly<Record<string, { readonly icon: string; readonly title: string }>> = {
  [DEMO.path]: { icon: "▶", title: "Try it yourself" },
  [DOCS.path]: { icon: "▤", title: "Read the docs" },
  [LESSONS.path]: { icon: "◍", title: "Take the course" },
  [PORTAL.path]: { icon: "◉", title: "Open the portal" },
}

/**
 * The ways further in, on the page rather than only in the chrome.
 *
 * The front door's job is not finished when a visitor has read it. Every other
 * surface is a path on this same origin (0067, 0070), so the band that sends
 * someone to them is part of this page and not a footer afterthought — and each
 * card is honest about what is behind it, which is why the portal's says that
 * signing in is required rather than pretending the whole product is one click
 * away.
 *
 * **It is the four surfaces and nothing else**, as of 22 August. A fifth card
 * pointed at the repository, which was fine while there were three of them and
 * wrong once the demo made it four: five cards in a grid that wraps at four
 * leaves one card alone on a second row, and the odd one out would have been the
 * only card in the band that is not a page of this product. The repository is
 * still offered twice on this page — the facts band and the closing band — and a
 * third time in the footer's map, so nothing was taken away from a reader.
 *
 * The band is now exactly `PRODUCT_SURFACES`, which is what makes the throw
 * below the whole of its contract rather than half of it.
 */
const waysIn = (ids: IdFactory, context: PageContext): LoomNode =>
  section(ids, { tone: "surface", width: "wide", eyebrow: BAND.waysIn }, "Where to go from here", [
    buildElement(ids, {
      type: "loom.feature-grid",
      props: { columns: "four" },
      children: PRODUCT_SURFACES.map((surface) => {
        const way = WAYS_IN[surface.path]

        if (way === undefined) {
          throw new Error(`loom: ${surface.path} is offered nowhere on the front door`)
        }

        return buildElement(ids, {
          type: "loom.feature",
          props: {
            icon: way.icon,
            title: way.title,
            body: surface.blurb,
            href: surfaceHref(context.origin, surface),
          },
        })
      }),
    }),
  ])

const closing = (ids: IdFactory, context: PageContext): LoomNode =>
  section(ids, { tone: "accent", width: "full" }, "This page was built the way yours would be.", [
    prose(
      ids,
      "The menu, the questions, this sentence — every one of them is a piece the AI could be asked to move. None of it was written by hand.",
      { tone: "muted", align: "center", measured: true }
    ),
    stack(ids, { direction: "row", gap: "snug", justify: "center", wrap: true }, [
      action(
        ids,
        "See how a change travels",
        internalHref(context.origin, HOW_IT_WORKS.path, context.theme),
        { variant: "primary", scale: "large" }
      ),
      action(ids, "Read the source", REPOSITORY_URL, {
        variant: "secondary",
        scale: "large",
        external: true,
      }),
    ]),
  ], { align: "center" })

export const homePageTree = (context: PageContext): LoomTree => {
  const ids = sequentialIdFactory("home")
  const chrome: ChromeContext = {
    origin: context.origin,
    theme: context.theme,
    current: HOME,
    ...(context.ask === undefined ? {} : { ask: context.ask, approve: context.approve === true }),
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
        vocabulary(ids),
        /**
         * Third band, and deliberately before anything that argues for the
         * product. The hero has made the claim and the four words have named
         * the steps; the next thing a visitor meets should be the claim being
         * true, not four features explaining why it would be.
         */
        seeItHappenBand(ids, {
          origin: context.origin,
          theme: context.theme,
          ...(context.ask === undefined ? {} : { ask: context.ask }),
          ...(context.record === undefined ? {} : { record: context.record }),
        }),
        problems(ids),
        /**
         * A rule rather than the diamond this band wants: `loom.divider`'s
         * `diamond` and `dots` ornaments collapse to a mark at the start of the
         * line instead of spanning it, filed as a finding on 19 August. The
         * page uses what renders correctly today.
         */
        buildElement(ids, { type: "loom.divider", props: { ornament: "rule" } }),
        facts(ids),
        questions(ids),
        waysIn(ids, context),
        closing(ids, context),
        siteFooter(ids, chrome),
      ],
    }),
    ids
  )
}
