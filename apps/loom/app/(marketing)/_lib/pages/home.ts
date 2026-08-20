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

import { siteFooter, siteHeader, type ChromeContext } from "../chrome"
import { FACTS, PLACEHOLDER_COPY } from "../copy"
import { action, heading, prose, section, stack } from "../nodes"
import {
  DECISIONS_URL,
  HOME,
  HOW_IT_WORKS,
  internalHref,
  REPOSITORY_URL,
  SITE_THEMES,
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
}

const hero = (ids: IdFactory, context: PageContext): LoomNode =>
  buildElement(ids, {
    type: "loom.hero",
    props: {
      backdrop: "grid",
      align: "center",
      stature: "tall",
      eyebrow: "An AI-native UI runtime",
    },
    children: [
      buildSlot(ids, "heading", [
        heading(ids, 1, "Your AI can change this page. You can see exactly what it changed.", {
          balance: true,
        }),
      ]),
      prose(
        ids,
        "Loom makes the interface data. A page is a tree of registered primitives, every change to it arrives as a proposal with a rationale, is weighed against a policy before it lands, and carries the change that undoes it.",
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

/** The four nouns the rest of the page is about, before it is about them. */
const vocabulary = (ids: IdFactory): LoomNode =>
  buildElement(ids, {
    type: "loom.logo-cloud",
    props: { label: "The four things underneath", align: "center" },
    children: ["Proposals", "The Gate", "Revisions", "Inverses"].map((name) =>
      buildElement(ids, { type: "loom.logo", props: { name } })
    ),
  })

const capabilities = (ids: IdFactory): LoomNode =>
  section(ids, { eyebrow: "What the runtime does", width: "wide" }, "Change, with a paper trail", [
    buildElement(ids, {
      type: "loom.feature-grid",
      props: { columns: "four" },
      children: [
        buildElement(ids, {
          type: "loom.feature",
          props: {
            icon: "◇",
            title: "A page is a tree, not a file",
            body: "Nodes of registered primitives, addressed by id. A change is four operations over that tree — insert, remove, move, configure — and nothing else.",
          },
        }),
        buildElement(ids, {
          type: "loom.feature",
          props: {
            icon: "◈",
            title: "Every change is proposed first",
            body: "What a model wants arrives as a delta with a rationale and its provenance attached, before anything has moved.",
          },
        }),
        buildElement(ids, {
          type: "loom.feature",
          props: {
            icon: "◆",
            title: "A policy decides, not a vibe",
            body: "The Gate is a pure function of the change, its stakes and whether it can be taken back. The same proposal always gets the same verdict.",
          },
        }),
        buildElement(ids, {
          type: "loom.feature",
          props: {
            icon: "◊",
            title: "Undo is a change like any other",
            body: "Every delta has an inverse. Taking one back is proposed, weighed and recorded the same way — the log never gains a hole.",
          },
        }),
      ],
    }),
  ])

/** Numbers held against the repository by a test, rather than typed from memory. */
const facts = (ids: IdFactory): LoomNode =>
  section(ids, { tone: "surface", width: "wide", eyebrow: "Where it is today" }, "Built in the open", [
    buildElement(ids, {
      type: "loom.stat-grid",
      props: { columns: "three", align: "center" },
      children: [
        buildElement(ids, {
          type: "loom.stat",
          props: {
            value: FACTS.primitives,
            label: "primitives in the starter library",
            caption: "Every one reads its colour and type from the theme, and hard-codes none of it.",
          },
        }),
        buildElement(ids, {
          type: "loom.stat",
          props: {
            value: FACTS.decisions,
            label: "decision records",
            caption: "What was chosen, what was rejected, and why — written before the code, kept after it.",
          },
        }),
        buildElement(ids, {
          type: "loom.stat",
          props: {
            value: FACTS.operations,
            label: "delta operations",
            caption: "Insert, remove, move, configure. A vocabulary small enough to review by hand.",
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
  section(ids, { width: "wide", eyebrow: "Plans" }, "Pricing", [
    prose(ids, PLACEHOLDER_COPY.pricingNotice, { tone: "muted", size: "small" }),
    buildElement(ids, {
      type: "loom.tier-table",
      props: { columns: "three" },
      children: [
        tier(ids, PLACEHOLDER_COPY.tierStarterName, PLACEHOLDER_COPY.tierStarterPrice, [
          perk(ids, "The runtime and the starter primitives"),
          perk(ids, "Proposals, the Gate and the revision log"),
          perk(ids, "Hosted portal", "excluded"),
        ]),
        tier(
          ids,
          PLACEHOLDER_COPY.tierTeamName,
          PLACEHOLDER_COPY.tierTeamPrice,
          [
            perk(ids, "Everything in the tier above"),
            perk(ids, "The review portal, with attribution"),
            perk(ids, "Telemetry and calibration", "coming"),
          ],
          { featured: true }
        ),
        tier(ids, PLACEHOLDER_COPY.tierEnterpriseName, PLACEHOLDER_COPY.tierEnterprisePrice, [
          perk(ids, "Everything in the tier above"),
          perk(ids, "Your own primitives, your own policy"),
          perk(ids, "Support terms", "coming"),
        ]),
      ],
    }),
  ])

const questions = (ids: IdFactory): LoomNode =>
  section(ids, { width: "wide", eyebrow: "Questions" }, "The ones worth asking first", [
    buildElement(ids, {
      type: "loom.faq-list",
      props: { columns: "two" },
      children: [
        buildElement(ids, {
          type: "loom.faq",
          props: {
            question: "Can the model write arbitrary code into my page?",
            answer:
              "No. It configures nodes of primitives you registered. Behaviour lives in the registered component and never travels in the tree, so the worst a proposal can say is something your vocabulary already has a word for.",
            open: true,
          },
        }),
        buildElement(ids, {
          type: "loom.faq",
          props: {
            question: "What stops a bad change from landing?",
            answer:
              "The Gate. It reads the change, its stakes and whether it can be reversed, and applies a policy — allow, hold for review, or refuse. It is a pure function, so its verdict can be tested rather than trusted.",
          },
        }),
        buildElement(ids, {
          type: "loom.faq",
          props: {
            question: "Is this a page builder?",
            answer:
              "It is the runtime underneath one. There is no editor assumed and no hosting required: a tree, a registry of primitives and a renderer are the whole surface, and the page renders per request with no hooks and no IO.",
          },
        }),
        buildElement(ids, {
          type: "loom.faq",
          props: {
            question: "What happens when a change is wrong?",
            answer:
              "Every delta has an inverse, computed from the tree it applied to. Undoing is proposing that inverse — it is weighed like anything else and appends a revision rather than erasing one.",
          },
        }),
      ],
    }),
  ])

const closing = (ids: IdFactory, context: PageContext): LoomNode =>
  section(ids, { tone: "accent", width: "full" }, "This page is a tree. So is yours.", [
    prose(
      ids,
      "Everything above — the header, the pricing table, this sentence — is a node a proposal could address. Nothing on it is markup.",
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
  const chrome: ChromeContext = { ...context, current: HOME }

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
        closing(ids, context),
        siteFooter(ids, chrome),
      ],
    }),
    ids
  )
}
