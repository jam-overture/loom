import {
  buildElement,
  buildSlot,
  createTree,
  sequentialIdFactory,
  type IdFactory,
  type LoomNode,
  type LoomTree,
} from "@jam-overture/loom"
import { THEME_PROP_KEY } from "@jam-overture/loom/react"

import type { PaperTrail } from "../adapt/paper-trail"
import { siteFooter, siteHeader, siteReadingBand, type ChromeContext } from "../chrome"
import { JOURNEY, STEPS_CAPITALISED } from "../journey"
import { action, heading, prose, section, splitSection, stack } from "../nodes"
import { DEMO, DOCS, HOW_IT_WORKS, SITE_THEMES, surfaceHref } from "../site"

import { answerBand } from "./answer"
import type { PageContext } from "./home"
import { seeItHappenBand } from "./see-it-happen"

/**
 * The mechanism page: what happens between someone asking for a change and the
 * page being different.
 *
 * **Rewritten on 26 September at the maintainer's direction.** It was one of
 * four pages describing this mechanism — with `/the-rules`, `/the-record` and
 * `/when-it-goes-wrong` — and the four together ran to 5,398 words on a site
 * whose visitor has never heard of any of it. His instruction was to combine
 * them here in cliff-notes form, to cut most of the length, and to leave the
 * minutiae to the documentation.
 *
 * So this page is now the whole mechanism at one altitude: five steps, then one
 * short band each for the four questions the retired pages answered at length —
 * what a rule is, what the record holds, what happens when the answer is no,
 * and what putting it back means. Every band ends where the documentation
 * begins.
 *
 * **Two things went with the length, deliberately.** The glossary — five of our
 * words introduced to a stranger before the page used them — is gone, because a
 * page that never says those words does not need one; the docs teach the
 * vocabulary. And the raw record panel: 341 lines of printed JSON, 73% of the
 * visible text of the old page. The front door already shows a real record in
 * plain sentences, which is the version a stranger can read.
 */

const hero = (ids: IdFactory): LoomNode =>
  buildElement(ids, {
    type: "loom.hero",
    props: {
      backdrop: "grid",
      align: "start",
      stature: "standard",
      eyebrow: "The short version",
    },
    children: [
      buildSlot(ids, "heading", [heading(ids, 1, "How a change travels", { balance: true })]),
      prose(
        ids,
        "Someone asks for a change. Before anything moves, the change is measured and checked against rules you wrote. Then it is written down — every time, whether it happened or not.",
        { size: "lead", measured: true }
      ),
    ],
  })

/**
 * The five steps, and the one band on this page that was already the right
 * length.
 *
 * `JOURNEY` is shared with the front door so the two cannot disagree about how
 * many steps there are or what they are — a thing that has gone wrong on this
 * site once, when one band said four and the page under it said five.
 */
/**
 * The eyebrow of the journey band, exported because `adapt.test.ts` counts this
 * band's steps against the front door's panel and must find the band rather
 * than sweep the page for a primitive type.
 */
export const MECHANISM_JOURNEY_EYEBROW = "End to end"

const journey = (ids: IdFactory): LoomNode =>
  section(ids, { width: "wide", eyebrow: MECHANISM_JOURNEY_EYEBROW }, `${STEPS_CAPITALISED} steps, every time`, [
    buildElement(ids, {
      type: "loom.milestone-list",
      props: { rail: "line", density: "loose" },
      children: JOURNEY.map((step, index) =>
        buildElement(ids, {
          type: "loom.milestone",
          props: {
            marker: String(index + 1),
            title: step.title,
            body: step.body,
            state: "done",
          },
        })
      ),
    }),
  ])

/**
 * The four bands that replaced four pages.
 *
 * Written as data rather than as four near-identical builders, because the
 * shape is the argument: **each is one question, one short answer, and nothing
 * else.** A band that grew a second paragraph would be the page drifting back
 * toward what it was, and a list makes that visible at a glance instead of
 * three hundred lines apart.
 *
 * Each one names the page it replaces in a comment, so the history of what was
 * cut is readable from the thing that replaced it.
 */
export type ShortAnswer = {
  readonly eyebrow: string
  readonly heading: string
  readonly body: string
  /** One example, concrete, in the second person. Never a second paragraph. */
  readonly example: string
}

export const SHORT_ANSWERS: readonly ShortAnswer[] = [
  {
    /** Replaces `/the-rules`, which was 1,382 words. */
    eyebrow: "Your rules",
    heading: "You decide what may change, before anyone asks",
    body: "A rule is a line you write once: this part may be rearranged, that part may not, and anything bigger than this waits for a person. They are read the same way every time, whether or not somebody is watching.",
    example: "Say the price may never be edited, and no request edits the price — not yours, not a visitor's, not the AI's.",
  },
  {
    /** Replaces `/the-record`, which was 951 words. */
    eyebrow: "The record",
    heading: "Every change leaves a note you can read later",
    body: "Who asked, what they asked for, what actually moved, which of your rules allowed it, and what putting it back would restore. It is kept whether the change happened or not.",
    example: "Six months later you can ask why a section moved, and get an answer rather than a guess.",
  },
  {
    /** Replaces `/when-it-goes-wrong`, which was 1,116 words. */
    eyebrow: "When the answer is no",
    heading: "A refused change leaves the page exactly as it was",
    body: "Nothing is half-applied. If the AI asks for something your rules do not allow, or asks for something that does not make sense, the page you are serving does not move — and the attempt is still written down.",
    example: "A request to delete your contact details is refused, your page is untouched, and the refusal is in the record.",
  },
  {
    /** Replaces `/putting-it-back`, which was 984 words. */
    eyebrow: "Putting it back",
    heading: "The undo is written at the same moment as the change",
    body: "It is not reconstructed afterwards from what the page looks like now. The change that reverses it is worked out when the change is made, and kept beside it.",
    example: "Press once and the questions that were removed come back word for word, not rewritten.",
  },
]

const shortAnswer = (ids: IdFactory, answer: ShortAnswer): LoomNode =>
  splitSection(ids, { width: "wide", eyebrow: answer.eyebrow }, answer.heading, [
    prose(ids, answer.body),
    prose(ids, answer.example, { tone: "muted" }),
  ])

/**
 * Who is asking, which is the one thing from `/who-can-ask` that belongs on a
 * marketing site.
 *
 * That page put sixteen real runs side by side to show the same request
 * answered differently for four askers. The comparison was good and it was a
 * page of it; what a visitor needs is the sentence.
 */
const whoAsks = (ids: IdFactory): LoomNode =>
  splitSection(
    ids,
    /**
     * Plain, like the four above it, and for a second reason on top of the one
     * in `nodes.ts`: this **is** the fifth of those four. It is one more short
     * answer in the same shape — an eyebrow, a heading beside a paragraph — and
     * plating the last item in a run of five says *this one is different* about
     * the one thing on the page that is not.
     */
    { width: "wide", eyebrow: "Who is asking" },
    "The same request can get a different answer",
    [
      prose(
        ids,
        "Your rules can tell the difference between you, a colleague, a visitor and the page reacting on its own. The same words from a stranger and from you do not have to mean the same thing."
      ),
    ]
  )

/**
 * Where the detail lives now, said out loud.
 *
 * The four retired pages were the site's answer to *but how does it actually
 * work?* and deleting them without saying where that went would be this site
 * losing an argument it used to win. The documentation is the answer, and this
 * band is the handover.
 */
const closing = (ids: IdFactory, context: PageContext): LoomNode =>
  section(
    ids,
    { tone: "accent", width: "wide", eyebrow: "Going deeper" },
    "That is the whole of it, at this level",
    [
      prose(
        ids,
        "This page is the short version on purpose. The documentation has the long one — what a rule can say, what the record holds field by field, and how to wire it into a page you already have.",
        { measured: true }
      ),
      stack(ids, { direction: "row", gap: "snug", align: "center", wrap: true }, [
        action(ids, "Read the docs", surfaceHref(context.origin, DOCS), {
          variant: "primary",
        }),
        action(ids, "Try it yourself", surfaceHref(context.origin, DEMO), {
          variant: "secondary",
        }),
      ]),
    ]
  )

export type MechanismContext = PageContext & {
  /**
   * The record of a real run, still resolved and still unused by this page.
   *
   * It was the raw panel this page printed until 26 September. The field stays
   * because `pageTreeFor` resolves it for the front door's notice, which links
   * here carrying an `ask`; what this page does with it is nothing, and that is
   * the point of the rewrite rather than an oversight.
   */
  readonly trail?: PaperTrail
}

export const howItWorksPageTree = (context: MechanismContext): LoomTree => {
  const ids = sequentialIdFactory("how")
  /**
   * The most recent thing that happened to this page, which the notice at the
   * top reports: the undo once the visitor has put a change back, and the change
   * itself until then.
   */
  const latest = context.undone ?? context.record
  const chrome: ChromeContext = {
    ...context,
    current: HOW_IT_WORKS,
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
        /**
         * The answer, before anything else on the page, and only for a visitor
         * who asked for something.
         *
         * It moved here from the front door on 1 October with the band that
         * offers the five choices. It sits above the opening band rather than
         * inside it because the opening band is one of the things a request may
         * configure, and a band whose props are a demonstration must not also be
         * a status display. Above it, the notice is the first thing under the
         * menu in every state, which is where a browser leaves a reader who has
         * just followed one of the choices.
         *
         * Nothing is spread here when there is no record: the arrival page is
         * the tree it has always been, node for node.
         */
        ...(latest === undefined
          ? []
          : [
              answerBand(ids, {
                origin: context.origin,
                theme: context.theme,
                record: latest,
                ...(context.ask === undefined ? {} : { ask: context.ask }),
                ...(context.approve === undefined ? {} : { approve: context.approve }),
                ...(context.back === undefined ? {} : { back: context.back }),
                ...(context.backApprove === undefined ? {} : { backApprove: context.backApprove }),
              }),
            ]),
        hero(ids),
        journey(ids),
        ...SHORT_ANSWERS.map((answer) => shortAnswer(ids, answer)),
        whoAsks(ids),
        /**
         * **The five choices, and the page they change is this one.**
         *
         * The maintainer, 1 October: *"Remove the see it happen section from the
         * main landing page and only let it exist in the How it works
         * section."* It was the front door's from 22 August until then.
         *
         * It sits after the page has explained itself and before the closing
         * band, so a reader meets the explanation, then the thing working, then
         * the way onward. On the front door it came third, before any of the
         * argument; here the argument is the page, so the demonstration goes at
         * the end of it.
         *
         * **All three answers still happen here**, which is the part that had to
         * be measured rather than assumed. The five choices were bound to the
         * front door's bands, and two of them to what that page protects, so the
         * obvious worry was that a page with no `loom.mosaic` could only ever
         * show a change landing. It cannot be read off the policy: *held* comes
         * from how much a change moves as well as from what it touches, and
         * taking all four short answers away at once is enough. *Refused* is the
         * menu, which the rules protect on every page of this site.
         */
        seeItHappenBand(ids, {
          origin: context.origin,
          theme: context.theme,
          ...(context.ask === undefined
            ? {}
            : { ask: context.ask, approve: context.approve === true }),
          ...(context.record === undefined ? {} : { record: context.record }),
          ...(context.undone === undefined ? {} : { undone: context.undone }),
        }),
        closing(ids, context),
        ...siteReadingBand(ids, chrome),
        siteFooter(ids, chrome),
      ],
    }),
    ids
  )
}
