import {
  buildElement,
  buildSlot,
  buildText,
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
import { FACTS, PLACEHOLDER_COPY } from "../copy"
import { action, heading, prose, section, stack } from "../nodes"
import { seeItHappenBand } from "./see-it-happen"
import {
  DECISIONS_URL,
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
        heading(ids, 1, "Your AI can change this page. You can see exactly what it changed.", {
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
        action(ids, "Read the source", REPOSITORY_URL, {
          variant: "secondary",
          scale: "large",
          external: true,
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

const capabilities = (ids: IdFactory): LoomNode =>
  section(ids, { eyebrow: BAND.capabilities, width: "wide" }, "Change, with a paper trail", [
    buildElement(ids, {
      type: "loom.feature-grid",
      props: { columns: "four" },
      children: [
        buildElement(ids, {
          type: "loom.feature",
          props: {
            icon: "◇",
            title: "Your page is made of parts",
            body: "Every heading, card and button is a piece the AI can move, add or remove. It cannot write new code into your page — only rearrange the pieces you gave it.",
          },
        }),
        buildElement(ids, {
          type: "loom.feature",
          props: {
            icon: "◈",
            title: "Nothing changes without asking",
            body: "The AI says what it wants to change and why, before anything moves. You get a request to look at, not a surprise to discover.",
          },
        }),
        buildElement(ids, {
          type: "loom.feature",
          props: {
            icon: "◆",
            title: "Your rules decide, not a vibe",
            body: "Every request is weighed against rules you write: how much of the page moves, what it touches, whether it can be taken back. Ask twice, get the same answer twice.",
          },
        }),
        buildElement(ids, {
          type: "loom.feature",
          props: {
            icon: "◊",
            title: "One click puts it back",
            body: "Every change arrives with the change that reverses it. Undoing goes through the same rules and is written down too, so the history never gains a hole.",
          },
        }),
      ],
    }),
  ])

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

const perk = (ids: IdFactory, label: string, state?: string): LoomNode =>
  buildElement(ids, {
    type: "loom.perk-list-item",
    props: state === undefined ? { label } : { label, state },
  })

const tier = (
  ids: IdFactory,
  name: string,
  price: string,
  perks: readonly LoomNode[],
  options: { readonly featured?: boolean; readonly period?: string } = {}
): LoomNode =>
  buildElement(ids, {
    type: "loom.tier",
    props: {
      name,
      price,
      ...(options.period === undefined ? {} : { period: options.period }),
      ...(options.featured === true ? { emphasis: "featured" } : {}),
    },
    children: [
      ...(options.featured === true
        ? [
            buildSlot(ids, "badge", [
              buildElement(ids, {
                type: "loom.badge",
                props: { tone: "accent" },
                children: [buildText(ids, "Placeholder")],
              }),
            ]),
          ]
        : []),
      buildElement(ids, { type: "loom.perk-list", props: { density: "tight" }, children: [...perks] }),
    ],
  })

/**
 * The pricing band.
 *
 * Pricing is the maintainer's and is not an engineering question, so what is
 * built here is the *shape* — three tiers, a featured one, a perk list each —
 * with the words marked placeholder on the page rather than invented. It is
 * here rather than deferred because the shape is the part that is expensive to
 * review late, and because a tier table is the band the library gained most
 * recently: this is the first page it has appeared on.
 */
const pricing = (ids: IdFactory): LoomNode =>
  section(ids, { width: "wide", eyebrow: BAND.pricing }, "Pricing", [
    prose(ids, PLACEHOLDER_COPY.pricingNotice, { tone: "muted", size: "small" }),
    buildElement(ids, {
      type: "loom.tier-table",
      props: { columns: "three" },
      children: [
        tier(ids, PLACEHOLDER_COPY.tierStarterName, PLACEHOLDER_COPY.tierStarterPrice, [
          perk(ids, "Everything that runs your pages, and the ready-made pieces"),
          perk(ids, "Requests, your rules, and the record of what changed"),
          perk(ids, "A review site we host for you", "excluded"),
        ]),
        tier(
          ids,
          PLACEHOLDER_COPY.tierTeamName,
          PLACEHOLDER_COPY.tierTeamPrice,
          [
            perk(ids, "Everything in the tier above"),
            perk(ids, "The review site, with a name against every change"),
            perk(ids, "Reports on how well it is doing", "coming"),
          ],
          { featured: true }
        ),
        tier(ids, PLACEHOLDER_COPY.tierEnterpriseName, PLACEHOLDER_COPY.tierEnterprisePrice, [
          perk(ids, "Everything in the tier above"),
          perk(ids, "Your own pieces, your own rules"),
          perk(ids, "Support terms", "coming"),
        ]),
      ],
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
 */
const waysIn = (ids: IdFactory, context: PageContext): LoomNode =>
  section(ids, { tone: "surface", width: "wide", eyebrow: BAND.waysIn }, "Where to go from here", [
    buildElement(ids, {
      type: "loom.feature-grid",
      props: { columns: "four" },
      children: [
        ...PRODUCT_SURFACES.map((surface) => {
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
        buildElement(ids, {
          type: "loom.feature",
          props: {
            icon: "⟨⟩",
            title: "Read the source",
            body: "Every decision written down, every test in the open. The best way to check whether any of this is true is to look.",
            href: REPOSITORY_URL,
          },
        }),
      ],
    }),
  ])

const closing = (ids: IdFactory, context: PageContext): LoomNode =>
  section(ids, { tone: "accent", width: "full" }, "This page was built the way yours would be.", [
    prose(
      ids,
      "The menu, the pricing table, this sentence — every one of them is a piece the AI could be asked to move. None of it was written by hand.",
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
        capabilities(ids),
        /**
         * A rule rather than the diamond this band wants: `loom.divider`'s
         * `diamond` and `dots` ornaments collapse to a mark at the start of the
         * line instead of spanning it, filed as a finding on 19 August. The
         * page uses what renders correctly today.
         */
        buildElement(ids, { type: "loom.divider", props: { ornament: "rule" } }),
        facts(ids),
        pricing(ids),
        questions(ids),
        waysIn(ids, context),
        closing(ids, context),
        siteFooter(ids, chrome),
      ],
    }),
    ids
  )
}
