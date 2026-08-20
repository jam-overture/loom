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

import { siteFooter, siteHeader, type ChromeContext } from "../chrome"
import { action, heading, prose, section, stack } from "../nodes"
import {
  DECISIONS_URL,
  HOME,
  HOW_IT_WORKS,
  internalHref,
  SITE_THEMES,
} from "../site"

import type { PageContext } from "./home"

/**
 * The mechanism page: what happens between someone asking for a change and the
 * page being different.
 *
 * Nothing on it is positioning. Every claim here is a description of code in
 * this repository, which is why it could be written before the maintainer has
 * answered anything — and it is the page the site needed second, because the
 * landing page's whole argument is that the middle step exists.
 */

const hero = (ids: IdFactory): LoomNode =>
  buildElement(ids, {
    type: "loom.hero",
    props: { backdrop: "grid", align: "start", stature: "standard", eyebrow: "The path a change takes" },
    children: [
      buildSlot(ids, "heading", [
        heading(ids, 1, "Five steps, every time, in the same order", { balance: true }),
      ]),
      prose(
        ids,
        "A change to a Loom page is never applied by whatever asked for it. It is described, weighed, decided and recorded first — and each of those is a separate, testable step rather than a promise about a prompt.",
        { size: "lead", measured: true }
      ),
    ],
  })

const journey = (ids: IdFactory): LoomNode =>
  section(ids, { width: "wide", eyebrow: "End to end" }, "How a change travels", [
    buildElement(ids, {
      type: "loom.milestone-list",
      props: { rail: "line", density: "loose" },
      children: [
        buildElement(ids, {
          type: "loom.milestone",
          props: {
            marker: "1",
            title: "An intent arrives",
            body: "Someone says what they want in their own words, against a named tree. Nothing has been interpreted yet, and nothing has moved.",
            state: "done",
          },
        }),
        buildElement(ids, {
          type: "loom.milestone",
          props: {
            marker: "2",
            title: "It is interpreted into a delta",
            body: "The model is shown the tree as an outline and the catalogue of primitives it may name, and answers with a structural change — insert, remove, move or configure — plus a rationale and its provenance.",
            state: "done",
          },
        }),
        buildElement(ids, {
          type: "loom.milestone",
          props: {
            marker: "3",
            title: "The change is analysed",
            body: "Pure facts first: what it touches, how much of the page it is, whether it can be inverted against the tree it would apply to.",
            state: "done",
          },
        }),
        buildElement(ids, {
          type: "loom.milestone",
          props: {
            marker: "4",
            title: "The Gate decides",
            body: "A policy reads those facts and returns one of three answers — apply it, hold it for a person, or refuse it — and says which rule fired.",
            state: "done",
          },
        }),
        buildElement(ids, {
          type: "loom.milestone",
          props: {
            marker: "5",
            title: "A revision is appended",
            body: "What applied is written to a log with its author and its inverse. The page's history is the log; nothing is overwritten and nothing is lost.",
            state: "done",
          },
        }),
      ],
    }),
  ])

const weighed = (ids: IdFactory): LoomNode =>
  section(
    ids,
    { tone: "surface", width: "wide", eyebrow: "The middle step" },
    "What the Gate actually weighs",
    [
      buildElement(ids, {
        type: "loom.feature-grid",
        props: { columns: "three", density: "tight" },
        children: [
          buildElement(ids, {
            type: "loom.feature",
            props: {
              icon: "▲",
              title: "Stakes",
              body: "How much damage this could do, as named factors rather than one score: how much of the page moves, and whether what it touches is load-bearing.",
            },
          }),
          buildElement(ids, {
            type: "loom.feature",
            props: {
              icon: "↺",
              title: "Reversibility",
              body: "Whether the change has an inverse that applies to the tree it would land on. A change that cannot be taken back is a different kind of change.",
            },
          }),
          buildElement(ids, {
            type: "loom.feature",
            props: {
              icon: "§",
              title: "Policy",
              body: "The host's rules and the structural ones, together. Which policy judged a change is part of the record, so a verdict can be re-derived later.",
            },
          }),
        ],
      }),
    ]
  )

const record = (ids: IdFactory): LoomNode =>
  section(ids, { width: "wide", eyebrow: "Afterwards" }, "What you are left holding", [
    buildElement(ids, {
      type: "loom.split",
      props: { ratio: "even", align: "start" },
      children: [
        buildSlot(ids, "start", [
          heading(ids, 3, "A record, not a diff of files"),
          prose(
            ids,
            "Each revision names the delta that produced it, who proposed it, which rule allowed it and what it replaced. Reading the history is reading the log rather than reconstructing it.",
            { tone: "muted" }
          ),
        ]),
        buildSlot(ids, "end", [
          heading(ids, 3, "An undo that is a proposal"),
          prose(
            ids,
            "Reversing a revision means proposing its inverse. It passes the same Gate, appends a new revision, and can itself be reversed — so the way back is never a special case.",
            { tone: "muted" }
          ),
        ]),
      ],
    }),
  ])

const questions = (ids: IdFactory): LoomNode =>
  section(ids, { width: "wide", eyebrow: "Questions" }, "About the mechanism", [
    buildElement(ids, {
      type: "loom.faq-list",
      props: { columns: "one" },
      children: [
        buildElement(ids, {
          type: "loom.faq",
          props: {
            question: "What happens when the model proposes something invalid?",
            answer:
              "It never reaches the tree. A proposed node is validated against its primitive's schema, and a change that does not apply cleanly is refused as a whole — application is atomic, so a page is never half-changed.",
            open: true,
          },
        }),
        buildElement(ids, {
          type: "loom.faq",
          props: {
            question: "Does rendering depend on the model being available?",
            answer:
              "No. Interpretation is the only non-deterministic step and it happens before anything is applied. Rendering a tree is pure and total: no hooks, no IO, and anything it could not render comes back as a diagnostic rather than a thrown error.",
          },
        }),
        buildElement(ids, {
          type: "loom.faq",
          props: {
            question: "Can I use my own primitives?",
            answer:
              "That is the intended shape. A registry is a per-surface decision about what a model may name there; the starter library is a default, not a requirement.",
          },
        }),
      ],
    }),
  ])

const closing = (ids: IdFactory, context: PageContext): LoomNode =>
  section(ids, { tone: "accent", width: "full" }, "Read the decisions behind it", [
    prose(
      ids,
      "Every constraint above was argued in writing before it was code, and the arguments are in the repository next to it.",
      { tone: "muted", align: "center", measured: true }
    ),
    stack(ids, { direction: "row", gap: "snug", justify: "center", wrap: true }, [
      action(ids, "The decision records", DECISIONS_URL, {
        variant: "primary",
        scale: "large",
        external: true,
      }),
      action(ids, "Back to the start", internalHref(context.origin, HOME.path, context.theme), {
        variant: "secondary",
        scale: "large",
      }),
    ]),
  ], { align: "center" })

export const howItWorksPageTree = (context: PageContext): LoomTree => {
  const ids = sequentialIdFactory("how")
  const chrome: ChromeContext = { ...context, current: HOW_IT_WORKS }

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
        hero(ids),
        journey(ids),
        weighed(ids),
        record(ids),
        questions(ids),
        closing(ids, context),
        siteFooter(ids, chrome),
      ],
    }),
    ids
  )
}
