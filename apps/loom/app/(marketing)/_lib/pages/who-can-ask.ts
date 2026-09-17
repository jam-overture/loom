import {
  buildElement,
  buildSlot,
  buildText,
  createTree,
  ESCALATION_LADDER,
  sequentialIdFactory,
  type IdFactory,
  type LoomNode,
  type LoomTree,
} from "@loom/runtime"
import { THEME_PROP_KEY } from "@loom/runtime/react"

import {
  ASKERS,
  ceilingOf,
  DEMONSTRATED,
  peopleAmong,
  rulesThatReadWhoAsked,
  wentAhead,
  type Answer,
  type Asker,
  type WeighedRequest,
} from "../adapt/askers"
import { BECAUSE, WEIGHT } from "../adapt/record"
import { siteFooter, siteHeader, type ChromeContext } from "../chrome"
import { spell, spellCapitalised } from "../journey"
import { action, heading, prose, section, stack } from "../nodes"
import {
  askHref,
  internalHref,
  SITE_THEMES,
  THE_RECORD,
  THE_RULES,
  WHEN_IT_GOES_WRONG,
  WHO_CAN_ASK,
} from "../site"

import type { PageContext } from "./home"

/**
 * The page for the input to a verdict that is about people rather than about
 * the change.
 *
 * Six pages of this site argue about *what* a change is: how much it moves,
 * whether it can be taken back, whether a rule protects what it touches. One
 * line of the seventh says the other thing — that the same change is weighed
 * differently depending on who wanted it — and says it in a two-column table
 * that a reader has to take on trust.
 *
 * That line is the most structurally interesting fact this product has.
 * [0002](../../../../../../decisions/0002-the-gate-is-a-pure-function-of-two-independent-axes.md)
 * calls the per-origin ceiling **the one place origin is load-bearing rather
 * than merely recorded**, and the site was stating it. So this page runs it:
 * four of the front door's own requests, one for each weight the rules can
 * give a change, put by each of the four kinds of asker in turn, while the page
 * is being built. Sixteen answers, none of them typed.
 *
 * **The second half is the one the reader this site is for actually needs.** A
 * compliance reader told that a trusted asker gets more latitude asks the next
 * question immediately: *so what stops something claiming to be the trusted
 * one?* The answer is unusually good — of the eight rules, seven never look at
 * who asked at all, and the floor is sovereign over every one of them — and it
 * is read off the same sixteen runs rather than promised.
 *
 * **Seven rather than four, re-derived on 17 September** at the request of the
 * finding `Loom daily build` filed with the eighth rung. Four was a count of
 * the rungs whose comments say *whatever latitude its origin has*; the question
 * the sentence asks is which rungs read an origin, and the answer off
 * `ESCALATION_RULES` is one — `stakes-above-ceiling`, through
 * `ceilingFor(policy, origin)`. The band below says the measured half of it,
 * which is the same fact arrived at from the sixteen runs rather than from the
 * rules.
 *
 * Nothing here is positioning. Every claim is a description of code in this
 * repository or a measurement taken on this site's own front page.
 */

/** `PageContext` and the sixteen runs. See `BackContext` for why it is written this way. */
export type AskersContext = PageContext & {
  /**
   * The sixteen runs, made where a page builder cannot: a builder is
   * synchronous and a request through the whole sequence is not. The same seam,
   * and the same reason, as the refusal `/when-it-goes-wrong` prints and the
   * record `/how-it-works` does.
   */
  readonly weighed?: readonly WeighedRequest[]
}

/**
 * Where the hero's first action lands, and the band it lands on.
 *
 * A slug rather than the band's own eyebrow, because the eyebrow counts the
 * runs and an address that moved when a count moved would be a link somebody
 * had already sent to somebody else.
 */
export const COMPARISON_ANCHOR = "the-comparison"

/**
 * The mark a comparison cell carries, one per answer.
 *
 * Three answers and three marks, which is the whole reason this band is a
 * comparison rather than a table of sentences: *went ahead*, *stopped and
 * asked* and *was refused* are not two things and a caveat, and `partial` is
 * the mark that exists for the middle one. A reader scanning the column for a
 * timer sees two ticks, a half and a cross without reading a word.
 */
export const MARK: Readonly<Record<Answer, "yes" | "partial" | "no">> = {
  "went-ahead": "yes",
  "stopped-and-asked": "partial",
  "was-refused": "no",
}

/** What each answer says when a reader asks the cell what it means. */
const ANSWER_MEANS: Readonly<Record<Answer, string>> = {
  "went-ahead": "went ahead on its own",
  "stopped-and-asked": "stopped and asked a person",
  "was-refused": "was refused",
}

const hero = (ids: IdFactory, context: AskersContext): LoomNode =>
  buildElement(ids, {
    type: "loom.hero",
    props: {
      backdrop: "grid",
      align: "start",
      stature: "standard",
      eyebrow: "Who is asking",
    },
    children: [
      buildSlot(ids, "heading", [
        /**
         * The two counts are the same count, and it is `ASKERS.length` rather
         * than a word. A fifth kind of asker is a real possibility — the
         * runtime publishes the list and this site does not own it — and a
         * headline that went on saying *four* would be the exact failure the
         * 9 September lesson names.
         */
        heading(
          ids,
          1,
          `The same request, from ${spell(ASKERS.length)} askers, ${spell(
            ASKERS.length
          )} different answers`,
          { balance: true }
        ),
      ]),
      /**
       * The first sentence is short because the register test reads the heading
       * and this together: a heading carries no full stop, so it joins the
       * sentence after it and the thirty-word limit is on the pair.
       */
      prose(
        ids,
        "A person typing what they want is not a job that woke at four in the morning. You say in advance how far each of them may go before somebody has to look.",
        { size: "lead", measured: true }
      ),
      stack(ids, { direction: "row", gap: "snug", wrap: true }, [
        action(
          ids,
          `See all ${spell(DEMONSTRATED.length * ASKERS.length)} answers`,
          internalHref(context.origin, `${WHO_CAN_ASK.path}#${COMPARISON_ANCHOR}`, context.theme),
          { variant: "primary", scale: "large" }
        ),
        action(
          ids,
          "The rules that decide",
          internalHref(context.origin, THE_RULES.path, context.theme),
          { variant: "secondary", scale: "large" }
        ),
      ]),
    ],
  })

/**
 * The four askers, one card each, in the order the runtime publishes them.
 *
 * The card says who they are and how far this site's own rules let them go —
 * and the second half is read off the policy the site is published under rather
 * than described, so a page that let a timer further than it says would be a
 * page that fails to build rather than a page that lies.
 */
const theFour = (ids: IdFactory): LoomNode =>
  section(
    ids,
    { tone: "surface", width: "wide", eyebrow: "The four" },
    "Not everything that asks for a change is a person",
    [
      prose(
        ids,
        `${spellCapitalised(
          ASKERS.length - peopleAmong().length
        )} of these ${spell(
          ASKERS.length
        )} are not people at all, and that is the point of telling them apart. The list is not ours to lengthen — a request arrives as one of these ${spell(
          ASKERS.length
        )}, and your rules give each of them a line of their own.`,
        { size: "lead", measured: true }
      ),
      buildElement(ids, {
        type: "loom.feature-grid",
        props: { columns: "two", density: "loose" },
        children: ASKERS.map((asker) =>
          buildElement(ids, {
            type: "loom.feature",
            props: {
              title: asker.who,
              body: `${asker.what} On this site, ${asker.name.toLowerCase()} may go ahead unwatched with anything ${WEIGHT[ceilingOf(asker)]}.`,
            },
          })
        ),
      }),
      prose(
        ids,
        `Those ${spell(
          ASKERS.length
        )} lines are a setting, not a law. They are what this site chose; on your own page you write them, and you can give a timer more room than a person if that is the page you are running.`,
        { measured: true }
      ),
    ]
  )

/** One subject column of the comparison: the asker's short name. */
const subject = (ids: IdFactory, asker: Asker): LoomNode =>
  buildElement(ids, {
    type: "loom.comparison",
    props: { role: "subject" },
    children: [buildText(ids, asker.name)],
  })

const answerCell = (ids: IdFactory, answer: Answer): LoomNode =>
  buildElement(ids, {
    type: "loom.comparison",
    props: { mark: MARK[answer], note: ANSWER_MEANS[answer] },
  })

/**
 * The band, and the whole argument of the page.
 *
 * Four requests down the side — the front door's own buttons, one for each
 * weight the rules can give a change — and the four askers across the top.
 * Every one of the sixteen cells is a run that happened while this page was
 * being built, against the page this site publishes at `/`.
 *
 * The rows rise deliberately: light, middling, heavy, and then the one at the
 * floor. Read down any column and you are reading where that asker's line is;
 * read across any row and you are reading the thing the site has been claiming
 * in prose since August.
 */
const comparison = (ids: IdFactory, requests: readonly WeighedRequest[]): LoomNode =>
  section(
    ids,
    {
      width: "wide",
      eyebrow: `${spellCapitalised(requests.length * ASKERS.length)} answers`,
      anchor: COMPARISON_ANCHOR,
    },
    `${spellCapitalised(requests.length)} requests, each one put by all ${spell(ASKERS.length)} of them`,
    [
      prose(
        ids,
        `Each of these is a button on the front page of this site. Each was put ${spell(
          ASKERS.length
        )} times over, changing nothing but who was asking, with nobody standing by to say yes. Not one mark in the table was typed out by hand.`,
        { size: "lead", measured: true }
      ),
      buildElement(ids, {
        type: "loom.comparison-table",
        props: {
          caption: "What each asker was told, with nobody watching",
          density: "loose",
        },
        children: [
          buildSlot(ids, "columns", [
            buildElement(ids, {
              type: "loom.comparison-row",
              props: { heading: "The request" },
              children: ASKERS.map((asker) => subject(ids, asker)),
            }),
          ]),
          ...requests.map((request) =>
            buildElement(ids, {
              type: "loom.comparison-row",
              props: {
                heading: request.asked,
                note: `Weighed as ${request.weighedAs}`,
              },
              children: ASKERS.map((asker) => {
                const answer = request.answers.find((given) => given.origin === asker.origin)

                if (answer === undefined) {
                  throw new Error(`loom: ${asker.name} was never asked "${request.ask}"`)
                }

                return answerCell(ids, answer.answer)
              }),
            })
          ),
        ],
      }),
      prose(ids, readingOf(requests), { measured: true }),
    ]
  )

/**
 * The row-by-row reading, composed from the runs rather than written under
 * them.
 *
 * A comparison is only as good as the sentence that tells a reader what they
 * are looking at, and that sentence is exactly the thing that goes stale: it
 * survived eight runs on the refusal band of `/when-it-goes-wrong` by being
 * true about a run the page was no longer printing. So it is built here out of
 * `wentAhead`, which reads the answers.
 */
export const readingOf = (requests: readonly WeighedRequest[]): string =>
  requests
    .map((request) => {
      const allowed = wentAhead(request)

      if (allowed.length === ASKERS.length) {
        return `Weighed ${request.weighedAs}, every one of them could do it unwatched.`
      }

      /**
       * Nobody went ahead is two different sentences, and the difference is the
       * whole distinction this site keeps: a request every asker was refused is
       * a floor, and one every asker was held on is a ceiling nobody cleared.
       *
       * Today only the floor produces it, because the highest ceiling this site
       * sets is `high` and a `high` request clears it. That is a fact about
       * this policy rather than a law — lower the developers' line and the
       * other branch is reachable — so the branch is here rather than the one
       * sentence that happens to be true today.
       */
      if (allowed.length === 0) {
        return request.answers.every((answer) => answer.answer === "was-refused")
          ? `Weighed ${request.weighedAs}, not one of them could — and there is no yes that moves that one.`
          : `Weighed ${request.weighedAs}, not one of them could, and every one of them stopped to ask.`
      }

      return `Weighed ${request.weighedAs}, ${allowed
        .map((asker) => asker.name.toLowerCase())
        .join(" and ")} could go ahead; the rest stopped and asked.`
    })
    .join(" ")

/**
 * The band the reader this site is for arrives at the page needing.
 *
 * Everything above says a trusted asker gets more room, and a reader who
 * answers to a client or a regulator hears one thing in that: *so the way to
 * get a change through is to be, or to claim to be, the trusted one.* The
 * answer is the best thing on this page and it is a measurement rather than a
 * promise — across the sixteen runs above, exactly one of the eight rules ever
 * gave two askers different answers.
 *
 * The three printed under it are the ones whose sentences say so in their own
 * words: `BECAUSE` is the map the front door's panel prints, so the page that
 * teaches this and the panel that reports it are one set of sentences.
 */
const cannotBuy = (
  ids: IdFactory,
  context: AskersContext,
  requests: readonly WeighedRequest[]
): LoomNode => {
  const reading = rulesThatReadWhoAsked(requests)

  return section(
    ids,
    { tone: "accent", width: "wide", eyebrow: "And what it does not buy" },
    "Being the trusted one does not get you past the rest of them",
    [
      prose(
        ids,
        `There are ${spell(
          ESCALATION_LADDER.length
        )} rules between a request and your page. Across all ${spell(
          requests.length * ASKERS.length
        )} runs above, ${
          reading.length === 1 ? "exactly one of them" : `${spell(reading.length)} of them`
        } ever gave two askers a different answer: the one that asks how far this particular asker may go unwatched. The others never asked who wanted it.`,
        { size: "lead", measured: true }
      ),
      buildElement(ids, {
        type: "loom.feature-grid",
        props: { columns: "three", density: "loose" },
        children: [
          buildElement(ids, {
            type: "loom.feature",
            props: {
              title: "Something you could not undo",
              body: BECAUSE["irreversible"],
            },
          }),
          buildElement(ids, {
            type: "loom.feature",
            props: {
              title: "Something that writes over later work",
              body: BECAUSE["discards-later-work"],
            },
          }),
          buildElement(ids, {
            type: "loom.feature",
            props: {
              title: "Something that moves where a form goes",
              body: BECAUSE["redirected-submission"],
            },
          }),
        ],
      }),
      prose(
        ids,
        `And under all of them there is a floor. ${BECAUSE["stakes-at-refusal-floor"]} The last row of the comparison is that floor holding against all four at once.`,
        { measured: true }
      ),
      stack(ids, { direction: "row", gap: "snug", wrap: true }, [
        action(
          ids,
          "The eight, one by one",
          internalHref(context.origin, THE_RULES.path, context.theme),
          { variant: "secondary", scale: "medium" }
        ),
        action(
          ids,
          "What happens when one is stopped",
          internalHref(context.origin, WHEN_IT_GOES_WRONG.path, context.theme),
          { variant: "secondary", scale: "medium" }
        ),
      ]),
    ]
  )
}

const closing = (ids: IdFactory, context: AskersContext): LoomNode =>
  section(
    ids,
    { tone: "accent", width: "full" },
    "You are the first of the four",
    [
      prose(
        ids,
        "Reading this page makes you a person typing what they want, which is the asker in the first column. Every request in the comparison is a button on the front page, and you can put one of them yourself.",
        { size: "lead", align: "center", measured: true }
      ),
      stack(ids, { direction: "row", gap: "snug", wrap: true, align: "center", justify: "center" }, [
        action(ids, "Ask the front page for one", askHref(context.origin, { theme: context.theme }), {
          variant: "primary",
          scale: "large",
        }),
        action(
          ids,
          "What gets written down either way",
          internalHref(context.origin, THE_RECORD.path, context.theme),
          { variant: "secondary", scale: "large" }
        ),
      ]),
    ],
    { align: "center" }
  )

export const whoCanAskPageTree = (context: AskersContext): LoomTree => {
  const ids = sequentialIdFactory("asks")
  const chrome: ChromeContext = {
    origin: context.origin,
    theme: context.theme,
    current: WHO_CAN_ASK,
    counting: context.counting === true,
  }
  const weighed = context.weighed ?? []

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
        theFour(ids),
        ...(weighed.length === 0
          ? []
          : [comparison(ids, weighed), cannotBuy(ids, context, weighed)]),
        closing(ids, context),
        siteFooter(ids, chrome),
      ],
    }),
    ids
  )
}
