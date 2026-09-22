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

import {
  emptyHistory,
  MAX_CHANGES,
  tallyOf,
  withApproval,
  withChange,
  withPutBack,
  withPutBackApproval,
  writeChangeSequence,
  type ChangeHistory,
  type ChangeStep,
  type ChangeToken,
} from "../adapt/history"
import { whatTheChoicesDo } from "../adapt/answers"
import { protectedInPlainWords } from "../adapt/run"
import { siteFooter, siteHeader, siteReadingBand, type ChromeContext } from "../chrome"
import { action, heading, prose, section, stack } from "../nodes"
import { outlineDiff, type OutlineRow } from "../outline"
import {
  HOME,
  HOW_IT_WORKS,
  internalHref,
  PORTAL,
  recordHref,
  SITE_THEMES,
  surfaceHref,
  THE_RECORD,
} from "../site"

import { homePageTree, type PageContext } from "./home"

/**
 * The page where one change becomes a history.
 *
 * The front door demonstrates a change: ask for something, watch the page move,
 * read what it wrote down. This page asks the question that comes next and is
 * the harder one — *after the fourth change, can anyone still say what happened
 * to this page?* Every product with an AI in it can rearrange a page once. What
 * is on this page is a list in order, each entry naming who asked, what it
 * turned out to be, how much of the page it moved, which rule answered and what
 * putting it back would restore, next to the page itself as those changes left
 * it.
 *
 * Nothing here is illustration. Every entry below was produced by running that
 * request against the front door as it is published, in the order the address
 * asks for, through the same sequence a change to a page of yours would take.
 * The page keeps nothing between one visit and the next: the list of requests is
 * in the address (0081), so a history can be copied to somebody else and read a
 * week later.
 */

/** What each band of this page is called. The front door's live in `bands.ts`. */
export const RECORD_BAND = {
  history: "The record",
  why: "Why a list",
  questions: "Questions",
} as const

const hero = (ids: IdFactory): LoomNode =>
  buildElement(ids, {
    type: "loom.hero",
    props: {
      backdrop: "grid",
      align: "start",
      stature: "standard",
      eyebrow: "What you are left holding",
    },
    children: [
      buildSlot(ids, "heading", [
        heading(ids, 1, "Four changes later, you can still say what happened", { balance: true }),
      ]),
      prose(
        ids,
        "Ask the front page for one change after another. Each request is answered on its own, against the page the one before it left — and every answer is written down here, in order, with the way back attached.",
        { size: "lead", measured: true }
      ),
    ],
  })

/**
 * The one sentence a visitor needs before they press anything.
 *
 * It says what this site protects, because one of the choices will be refused
 * and a refusal nobody saw coming reads as the page breaking rather than as a
 * rule holding. Read off the rules themselves rather than written beside them,
 * for the reason the front door's copy of this gives: a run that protects a
 * fourth thing and forgets the sentence gets a page making a promise its rules
 * no longer keep.
 *
 * **Its second sentence is the front door's, verbatim and from one source.**
 * Both pages offer the same five requests and both introduced them in their own
 * words, so both carried the same wrong claim — that everything not refused
 * happens on its own — and either could have been fixed without the other. It
 * is only shown when nothing has been asked for yet, which is the one state in
 * which all five are on the page for it to be counting.
 */
export const protectionNotice = (): string => {
  const things = protectedInPlainWords()
  const listed =
    things.length === 1
      ? things[0]
      : `${things.slice(0, -1).join(", ")} and ${things[things.length - 1]}`

  return `The front page is published under a set of rules that protect ${listed} from being taken away. ${whatTheChoicesDo()}`
}

/**
 * What the visitor may ask for next, and the way back to an untouched page.
 *
 * Only the requests that still have somewhere to go. The front door offers all
 * five whatever state it is in, and that is right on a page nobody has touched;
 * here the page has been moved three times, and a button whose only possible
 * outcome is "nothing happened" wastes the one click it gets.
 */
const choices = (ids: IdFactory, context: RecordContext, history: ChangeHistory): LoomNode => {
  const started = history.steps.length > 0
  const full = history.tokens.length >= MAX_CHANGES
  const offers = full ? [] : history.offered

  return stack(ids, { direction: "column", gap: "snug", align: "start" }, [
    prose(ids, started ? "And then?" : "What shall it change?", { size: "lead" }),
    stack(ids, { direction: "row", gap: "snug", align: "center", wrap: true }, [
      ...offers.map((ask) =>
        buildElement(ids, {
          type: "loom.action",
          props: {
            href: recordHref(context.origin, {
              theme: context.theme,
              changes: writeChangeSequence(withChange(history.tokens, ask.id)),
            }),
            variant: "secondary",
          },
          children: [buildText(ids, ask.label)],
        })
      ),
      ...(started
        ? [
            action(ids, "Start again", recordHref(context.origin, { theme: context.theme }), {
              variant: "quiet",
            }),
          ]
        : []),
    ]),
    prose(
      ids,
      full
        ? `This page follows ${MAX_CHANGES} changes at a time, which is as many as the point needs. Start again to keep going.`
        : offers.length === 0
          ? "There is nothing left for these requests to change. Start again to run them from the beginning."
          : "Each one is a real request, worked out against the page as the changes above left it and put to the rules the front page is published under.",
      { tone: "muted", size: "small" }
    ),
    ...(started ? [] : [prose(ids, protectionNotice(), { tone: "muted", size: "small" })]),
  ])
}

/**
 * A card, in a column of its own.
 *
 * `loom.card` sets `height: 100%` on itself — right for a card sitting in a
 * grid row beside two others, and wrong for a column of them. Several cards as
 * siblings in one band all come out the same height, and whichever is tallest
 * is cut off by the card's own `overflow: hidden`: measured at 154px of the
 * outline missing and the last line of an entry sliced in half. Filed for
 * `Loom primitives` with the measurement.
 *
 * A column of one is where `height: 100%` means the card's own height, so each
 * card gets one until the primitive can be asked for what this page wants. It
 * is an arranger doing arranging rather than a component this lane grew, which
 * is the difference that matters.
 */
const alone = (ids: IdFactory, card: LoomNode): LoomNode =>
  stack(ids, { direction: "column", gap: "none" }, [card])

const PERK_STATE: Readonly<Record<OutlineRow["state"], string>> = {
  kept: "included",
  added: "included",
  moved: "included",
  "taken-away": "excluded",
}

/**
 * The page itself, as the history leaves it.
 *
 * A record that only lists requests is half a record — the other half is what
 * the page now reads like, and the two have to agree. This is built from the
 * changed page rather than from the list above it, so a request that claimed to
 * move something and did not would show up here as a row that never moved.
 */
const outline = (ids: IdFactory, context: RecordContext, history: ChangeHistory): LoomNode =>
  buildElement(ids, {
    type: "loom.card",
    props: { tone: "surface", padding: "roomy" },
    children: [
      heading(ids, 3, "The front page, band by band, as this leaves it"),
      buildElement(ids, {
        type: "loom.perk-list",
        props: { columns: "one", density: "tight" },
        children: outlineDiff(history.start, history.page).map((row) =>
          buildElement(ids, {
            type: "loom.perk-list-item",
            props: {
              label: row.name,
              state: PERK_STATE[row.state],
              ...(row.note === undefined ? {} : { note: row.note }),
            },
          })
        ),
      }),
      prose(
        ids,
        "Read off the changed page rather than off the list above, so the two can be checked against each other. The front page will show you any one of these happening live.",
        { size: "small", tone: "muted" }
      ),
      action(ids, "Try one on the page itself", internalHref(context.origin, HOME.path, context.theme), {
        variant: "quiet",
        scale: "small",
      }),
    ],
  })

/** How it came out, in one line, before the reader starts on the entries. */
const tally = (ids: IdFactory, history: ChangeHistory): LoomNode => {
  const counts = tallyOf(history)
  const parts = [
    `${counts.landed} went through`,
    ...(counts.waiting > 0 ? [`${counts.waiting} is waiting for you`] : []),
    ...(counts.refused > 0 ? [`${counts.refused} was refused`] : []),
  ]

  /**
   * Named rather than left to be inferred from the entries. An undo counted
   * among the requests is the honest tally and it is also a surprising one — a
   * reader who pressed three buttons and is told there were four requests should
   * be told which the fourth was, in the same breath.
   */
  const back =
    counts.putBack === 0
      ? ""
      : counts.putBack === 1
        ? " One of them was a change being put back, judged like any other."
        : ` ${counts.putBack} of them were changes being put back, judged like any other.`

  return prose(
    ids,
    `${counts.asked} ${counts.asked === 1 ? "request" : "requests"}, in order: ${parts.join(", ")}.${back}`,
    { size: "lead" }
  )
}

/**
 * What the visitor can do about one entry.
 *
 * Two questions, and which one an entry asks depends on whether it is a change
 * or the undo of one. Both are answered the same way — by an address — because
 * this page holds nothing between one visit and the next (0081), and both are
 * the *same* answer: the rules are asked again with the visitor's yes on the
 * record, rather than being stepped around.
 */
const entryActions = (
  ids: IdFactory,
  context: RecordContext,
  history: ChangeHistory,
  step: ChangeStep,
  last: boolean
): readonly LoomNode[] => {
  const putsBack = step.putsBack
  const answered =
    putsBack === undefined
      ? withApproval(history.tokens, step.position)
      : withPutBackApproval(history.tokens, putsBack)

  const buttons = [
    ...(step.record.awaitingYou
      ? [
          action(
            ids,
            putsBack === undefined ? "I say yes — go ahead" : "I say yes — put it back",
            recordHref(context.origin, {
              theme: context.theme,
              changes: writeChangeSequence(answered),
            }),
            { variant: "primary", scale: "small" }
          ),
        ]
      : []),
    /**
     * Offered on the most recent entry, and only when it is a change that
     * landed: there is nothing to reverse in a request the rules turned down,
     * and an undo of an undo is a thing this page can express and nobody needs
     * to be offered a button for.
     */
    ...(last && putsBack === undefined && step.record.landed
      ? [
          action(
            ids,
            "Put this back",
            recordHref(context.origin, {
              theme: context.theme,
              changes: writeChangeSequence(withPutBack(history.tokens, step.position)),
            }),
            { variant: "secondary", scale: "small" }
          ),
        ]
      : []),
  ]

  return buttons.length === 0
    ? []
    : [stack(ids, { direction: "row", gap: "snug", wrap: true }, buttons)]
}

/**
 * Where an entry sits in the history, in the words a reader needs.
 *
 * A change is numbered. An undo is not a further thing the visitor asked the
 * page to become — it is what happened to one of the numbered ones — so it says
 * whose it is instead of taking a number of its own. `history.tokens.length` is
 * the count of changes rather than of entries, which is why the total is read
 * off the address and not off the list: an undo would otherwise make the page
 * announce a fourth change that nobody asked for.
 */
const entryPlace = (history: ChangeHistory, step: ChangeStep): string =>
  step.putsBack === undefined
    ? `Change ${step.position} of ${history.tokens.length}`
    : `Putting change ${step.putsBack} back`

/**
 * One entry, and it is the same five things the front door's panel says about a
 * single change: what was asked, what that turned out to mean, how much moved,
 * which rules answered and what putting it back would restore.
 *
 * **An undo is one of these entries and not a footnote to one.** That is the
 * claim the page has been making in prose since it was written, and it now
 * renders it: the same card, the same five lines, its own verdict from the same
 * named rules. A visitor who reads an undo held back by the very rules that held
 * the change has understood the product, and no arrangement of words does that
 * as well as the page doing it in front of them.
 *
 * Only the most recent change is offered as a button to put back, and the
 * sentence under the list says why. Taking one out of the middle is a different
 * question — everything after it was worked out against the page it left behind
 * — and answering it properly is what the portal is for.
 */
const entry = (
  ids: IdFactory,
  context: RecordContext,
  history: ChangeHistory,
  step: ChangeStep,
  last: boolean
): LoomNode =>
  buildElement(ids, {
    type: "loom.card",
    props: { tone: step.record.awaitingYou ? "accent" : "outline", padding: "roomy" },
    children: [
      stack(ids, { direction: "row", gap: "snug", align: "center", wrap: true }, [
        buildElement(ids, {
          type: "loom.badge",
          props: { tone: step.record.landed ? "accent" : "outline" },
          children: [buildText(ids, step.record.verdictLabel)],
        }),
        prose(ids, entryPlace(history, step), {
          size: "small",
          tone: "muted",
        }),
      ]),
      heading(ids, 3, `“${step.record.asked}”`),
      prose(ids, step.record.proposed, { tone: "muted" }),
      prose(ids, `${step.record.measured} ${step.record.weighed}`, { size: "small", tone: "muted" }),
      prose(ids, step.record.verdictLine, { size: "small", tone: "muted" }),
      prose(ids, step.record.undo, { size: "small", tone: "muted" }),
      ...entryActions(ids, context, history, step, last),
    ],
  })

const waiting = (ids: IdFactory): LoomNode =>
  buildElement(ids, {
    type: "loom.card",
    props: { tone: "surface", padding: "roomy" },
    children: [
      prose(ids, "Nothing has been asked for yet.", { size: "lead" }),
      prose(
        ids,
        "Pick one above and this list starts. Every request you make is added to the end of it, and the address in your browser is the whole of it — send it to someone and they will read exactly what you are reading.",
        { tone: "muted" }
      ),
    ],
  })

const historyBand = (ids: IdFactory, context: RecordContext, history: ChangeHistory): LoomNode =>
  section(
    ids,
    { tone: "surface", width: "wide", eyebrow: RECORD_BAND.history },
    "Ask for a change, then another, then another",
    [
      prose(
        ids,
        "Nothing on this page is an illustration. Each entry below is a real request run against the front page of this site, in the order you asked for it, and the list above them is that page as your requests left it.",
        { size: "lead", measured: true }
      ),
      choices(ids, context, history),
      alone(ids, outline(ids, context, history)),
      ...(history.steps.length === 0
        ? [waiting(ids)]
        : [
            tally(ids, history),
            ...history.steps.map((step, index) =>
              alone(ids, entry(ids, context, history, step, index === history.steps.length - 1))
            ),
            prose(
              ids,
              "Putting the most recent change back adds an entry rather than removing one: the change that reverses it is put to the same rules, and you will see them hold it for the same reason they held the change. Taking one out of the middle is a harder question — everything after it was worked out against the page it left behind — and the place built to answer that is the portal, where each entry can be reviewed and reversed on its own.",
              { size: "small", tone: "muted" }
            ),
          ]),
    ]
  )

/**
 * What a list of changes gives you that a single change cannot.
 *
 * Deliberately not a second telling of the front door's four problems. These
 * three are true only of a *history*, and each is a property of the sequence
 * rather than of any one run through it.
 */
const why = (ids: IdFactory): LoomNode =>
  section(
    ids,
    { width: "wide", eyebrow: RECORD_BAND.why },
    "Ask most tools what changed last Tuesday",
    [
      prose(
        ids,
        "The honest answer is usually a list of file changes and a good memory. That is a poor way to answer for a page, and an impossible way to answer for someone else's.",
        { size: "lead", measured: true }
      ),
      buildElement(ids, {
        type: "loom.feature-grid",
        props: { columns: "three" },
        children: [
          buildElement(ids, {
            type: "loom.feature",
            props: {
              icon: "≡",
              title: "It reads in order",
              body: "Each entry says who asked, in their own words, and what that turned out to mean. You read the history rather than reconstructing it from what the page looks like now.",
            },
          }),
          buildElement(ids, {
            type: "loom.feature",
            props: {
              icon: "⟳",
              title: "The answer can change",
              body: "Your rules are asked again for every request, against the page as it stands. A change that was nobody's crisis on Monday can be held on Friday because of what landed in between, and the entry says which rule stopped it.",
            },
          }),
          buildElement(ids, {
            type: "loom.feature",
            props: {
              icon: "↺",
              title: "The way back is part of it",
              body: "Every change arrives with the change that reverses it, written at the same moment and stored beside it. Putting one back is itself a request, judged and written down like any other.",
            },
          }),
        ],
      }),
    ]
  )

const questions = (ids: IdFactory): LoomNode =>
  section(ids, { width: "wide", eyebrow: RECORD_BAND.questions }, "About this list", [
    buildElement(ids, {
      type: "loom.faq-list",
      props: { columns: "two" },
      children: [
        buildElement(ids, {
          type: "loom.faq",
          props: {
            question: "Where is my history kept?",
            answer:
              "Nowhere. It is in the address bar, and this page rebuilds it from the published page every time you load it. Nothing about you is stored, there is nothing here to fill up, and the link works for whoever you send it to. On a page of your own the history is kept properly — this is a landing page, and a landing page should not be holding anything.",
            open: true,
          },
        }),
        buildElement(ids, {
          type: "loom.faq",
          props: {
            question: "Was any of this written in advance?",
            answer:
              "The requests were. What happened to each of them was not: the wording you are reading is assembled from what the rules actually answered, so a change to those rules changes these entries. If a request stopped being allowed, this page would say so rather than keep the old sentence.",
          },
        }),
        buildElement(ids, {
          type: "loom.faq",
          props: {
            question: "Why is one of them refused?",
            answer:
              "Because the front page is published under rules that protect a couple of things, and one of the requests destroys one of them. There is no button to override that. A page that only ever demonstrated changes it was happy with would be demonstrating nothing.",
          },
        }),
        buildElement(ids, {
          type: "loom.faq",
          props: {
            question: "Does an AI decide any of this?",
            answer:
              "Not here. These requests are worked out from the page itself, which is why they are so sure of themselves. Your rules do not treat the two differently — they weigh the change and never who wrote it — so what you are watching is the same sequence a request from a model would take.",
          },
        }),
      ],
    }),
  ])

const closing = (ids: IdFactory, context: RecordContext): LoomNode =>
  section(
    ids,
    { tone: "accent", width: "full" },
    "The same record, on a page of your own",
    [
      prose(
        ids,
        "This is a landing page keeping a history in its address bar. The place built to keep one properly — every change reviewed, and any of them reversed on its own — is the portal.",
        { tone: "muted", align: "center", measured: true }
      ),
      /**
       * The same door, described the same way, because this band offers it in
       * the same breath as the front door's card does.
       *
       * This one is the sharper of the two. *The same record, on a page of your
       * own* is the band's heading, and the button under it opened a portal that
       * is not the reader's — the one place on the site where *yours* and *this
       * deployment's* were a sentence apart and read as the same thing. `door`
       * is what makes the heading true: a portal comes with the site, so the one
       * on a page of your own would be yours.
       */
      prose(ids, PORTAL.door, { size: "small", tone: "muted", align: "center", measured: true }),
      stack(ids, { direction: "row", gap: "snug", justify: "center", wrap: true }, [
        action(ids, "Open the portal", surfaceHref(context.origin, PORTAL), {
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
    { align: "center" }
  )

/**
 * What the page needs beyond the route and the palette.
 *
 * `history` arrives already run, because working a sequence out is asynchronous
 * and building a tree is not. It is optional for the same reason the front
 * door's record is: a visitor who has asked for nothing gets a page with the
 * published outline and the choices on it, and that page has to be buildable
 * without awaiting anything.
 */
export type RecordContext = PageContext & {
  /** What the address asked for, before it has been run. */
  readonly changes?: readonly ChangeToken[]
  readonly history?: ChangeHistory
}

export const theRecordPageTree = (context: RecordContext): LoomTree => {
  const ids = sequentialIdFactory("record")
  const chrome: ChromeContext = {
    origin: context.origin,
    theme: context.theme,
    current: THE_RECORD,
    counting: context.counting === true,
  }

  /**
   * A history of nothing is still a history: it knows the published page, so
   * the outline and the choices are the same code on the first visit as on the
   * fourth. The front door is built here rather than passed in because this
   * page is *about* that page — a record of some other tree would be a record
   * of nothing a visitor can check.
   */
  const history =
    context.history ??
    emptyHistory(homePageTree({ origin: context.origin, theme: context.theme }))

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
        historyBand(ids, context, history),
        why(ids),
        questions(ids),
        closing(ids, context),
        ...siteReadingBand(ids, chrome),
        siteFooter(ids, chrome),
      ],
    }),
    ids
  )
}
