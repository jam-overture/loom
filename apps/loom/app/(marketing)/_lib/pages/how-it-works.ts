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
        "Whatever asks for a change never gets to make it. The change is written down, measured, decided on and recorded first. Each of those is a separate step you can test, rather than a promise about a prompt.",
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
            title: "Someone asks for something",
            body: "In their own words, about one particular page. Nothing has been worked out yet and nothing has moved.",
            state: "done",
          },
        }),
        buildElement(ids, {
          type: "loom.milestone",
          props: {
            marker: "2",
            title: "The AI writes down what it wants to change",
            body: "It is shown an outline of the page and the list of pieces it is allowed to use. It answers with an exact list of changes — add this, remove that, move the other, change a setting — and with why it wants them and who asked. That list is called a delta, and it is the only thing that travels from here on.",
            state: "done",
          },
        }),
        buildElement(ids, {
          type: "loom.milestone",
          props: {
            marker: "3",
            title: "The change is measured",
            body: "Facts before opinions: what it touches, how much of the page it moves, and whether it can be taken back cleanly.",
            state: "done",
          },
        }),
        buildElement(ids, {
          type: "loom.milestone",
          props: {
            marker: "4",
            title: "Your rules decide",
            body: "They read those measurements and give one of three answers — do it, hold it for a person to look at, or refuse it — and name the rule that answered. The part that applies them is called the Gate.",
            state: "done",
          },
        }),
        buildElement(ids, {
          type: "loom.milestone",
          props: {
            marker: "5",
            title: "What happened is written down",
            body: "The change goes into a log with who asked for it and the change that would undo it. That log is the page\u2019s history — nothing is overwritten and nothing is lost.",
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
    "What the Gate weighs",
    [
      buildElement(ids, {
        type: "loom.feature-grid",
        props: { columns: "three", density: "tight" },
        children: [
          buildElement(ids, {
            type: "loom.feature",
            props: {
              icon: "▲",
              title: "How much is at stake",
              body: "Named factors rather than one score out of ten: how much of the page moves, and whether the thing it touches is holding something else up.",
            },
          }),
          buildElement(ids, {
            type: "loom.feature",
            props: {
              icon: "↺",
              title: "Whether it can be undone",
              body: "Worked out against the page as it stands right now, not in general. A change nobody can take back is a different kind of change, and it is weighed as one.",
            },
          }),
          buildElement(ids, {
            type: "loom.feature",
            props: {
              icon: "§",
              title: "Which rules applied",
              body: "Yours and the built-in ones together. Which of them judged a change is kept with the change, so months later you can work out why the answer was what it was.",
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
          heading(ids, 3, "A record, not a pile of file changes"),
          prose(
            ids,
            "Each entry names the change that produced it, who asked, which rule allowed it and what it replaced. You read the history instead of reconstructing it from what the files look like now.",
            { tone: "muted" }
          ),
        ]),
        buildSlot(ids, "end", [
          heading(ids, 3, "An undo that asks, like anything else"),
          prose(
            ids,
            "Putting something back means asking for the change that reverses it. It goes through the same rules, is written down as its own entry, and can itself be undone — so the way back is never a special case.",
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
            question: "What happens when the AI asks for something impossible?",
            answer:
              "It never reaches the page. Every piece it asks for is checked against what that kind of piece is allowed to hold, and a change that does not fit is refused whole rather than in part. A page is never left half-changed.",
            open: true,
          },
        }),
        buildElement(ids, {
          type: "loom.faq",
          props: {
            question: "Does the page need the AI to be up in order to load?",
            answer:
              "No. The AI is involved once, when a change is being worked out, and never when a page is being shown. Drawing the page is plain, predictable code that talks to nothing — and anything it could not draw is reported rather than thrown, so one bad piece cannot take the page down.",
          },
        }),
        buildElement(ids, {
          type: "loom.faq",
          props: {
            question: "Can I use my own components?",
            answer:
              "That is the point. What the AI may use is a list you write, one per site — the ready-made set is a starting point and not a requirement.",
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
