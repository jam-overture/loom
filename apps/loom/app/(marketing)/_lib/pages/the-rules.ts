import {
  buildElement,
  buildSlot,
  createTree,
  dispositionKindSchema,
  ESCALATION_LADDER,
  sequentialIdFactory,
  type DispositionKind,
  type DispositionReasonCode,
  type IdFactory,
  type LoomNode,
  type LoomTree,
} from "@loom/runtime"
import { THEME_PROP_KEY } from "@loom/runtime/react"

import { EXCEPTIONS_SPELLED } from "../adapt/answers"
import { ASKERS, ceilingOf } from "../adapt/askers"
import { BECAUSE, WEIGHT } from "../adapt/record"
import { FRONT_DOOR_POLICY, protectedInPlainWords } from "../adapt/run"
import { siteFooter, siteHeader, type ChromeContext } from "../chrome"
import { spellCapitalised } from "../journey"
import { action, cell, columns, heading, link, prose, row, section, stack } from "../nodes"
import {
  askHref,
  DOCS,
  HOW_IT_WORKS,
  internalHref,
  recordHref,
  SITE_THEMES,
  surfaceHref,
  THE_RULES,
  WHO_CAN_ASK,
} from "../site"

import type { PageContext } from "./home"

/**
 * The page about the half of the product a visitor has no words for yet.
 *
 * Every other page here says some version of *nothing lands until it has been
 * checked against your rules*. This is the page that answers the question that
 * sentence raises and nothing else on the site was answering: **what is a rule,
 * who writes it, and what can it actually say?**
 *
 * Like the mechanism page and unlike anything about audience or price, nothing
 * on it is positioning. Every claim is a description of code in this
 * repository, and most of them are not written here at all — they are read off
 * the rules this site is itself published under, so the page cannot describe a
 * policy the site does not have.
 *
 * **The sentences are the record's own.** The list of questions below prints
 * `BECAUSE` out of `adapt/record.ts`, which is the map the front door's panel
 * uses to say why a change was allowed or stopped. So the page that teaches the
 * rules and the panel that reports a verdict cannot drift: they are one set of
 * sentences used twice. Writing the explanation out again over here would have
 * been easier and the drift would have been invisible, because no reader ever
 * sees the two on one screen.
 */

/**
 * A rule, as a reader meets it: the question it asks, in the second person.
 *
 * The **codes** are checked against the runtime — `the-rules.test.ts` holds this
 * list against `dispositionReasonCodeSchema` minus the one code that is not a
 * rule at all, so a rule added to the runtime and not to this page fails rather
 * than quietly making the page's count a lie. That is the deliberate side of the
 * asymmetry this lane settled on 27 August: a number that moves without changing
 * a claim should need nobody, and this page's claim is *these are all of them*.
 *
 * The **order is the runtime's too, as of 13 September.** It was this file's
 * until today, and the note here said so and called it the honest limit: the
 * Gate asks them in the order of `ESCALATION_RULES` in `src/runtime/gate.ts`,
 * that constant was not exported, and a reordering there would have left this
 * page listing the right eight questions in a stale order. Filed for
 * `Loom daily build` on 28 August and answered by #181 — `ESCALATION_LADDER` is
 * exported from `@loom/runtime`, **derived from the rules themselves rather than
 * declared beside them**, so it cannot disagree with the order it describes.
 *
 * The finding recorded that this file *"still writes the order by hand and can
 * now stop"*, and the whole point of the band is *the first no wins*, which is a
 * claim about precedence. So the questions are now written in any order that
 * reads well and **sorted into the runtime's** before they are printed: a rung
 * inserted in the middle of the ladder moves on this page in the same deploy,
 * and a question for a rule the ladder does not have throws while the page is
 * being built.
 */
type Rule = {
  readonly code: Exclude<DispositionReasonCode, "within-policy">
  /** What the rule wants to know, phrased as the reader's own question. */
  readonly asks: string
}

/** What each rung asks, unordered — `RULES` is this list in the ladder's order. */
const QUESTIONS: readonly Rule[] = [
  { code: "confidence-below-floor", asks: "Did whatever asked for this actually know what it was asking?" },
  { code: "stakes-at-refusal-floor", asks: "Is this the kind of change you said may never happen?" },
  { code: "irreversible", asks: "Could you put the page back afterwards?" },
  { code: "discards-later-work", asks: "Would this quietly wipe out something done since?" },
  { code: "redirected-submission", asks: "Would this change where the page sends what people type?" },
  { code: "repointed-binding", asks: "Would this change which of your data the page shows?" },
  { code: "stakes-above-ceiling", asks: "Is this bigger than what whoever asked may do unwatched?" },
  { code: "confidence-below-minimum", asks: "Was it sure enough to go through with nobody looking?" },
]

/**
 * The eight questions, in the order the rules are actually asked in.
 *
 * Built by walking the ladder rather than by sorting the list, so the runtime's
 * order is the one thing that decides: a rung with no question here is a rule
 * this page does not print, and the page refuses to build rather than claiming
 * to list all of them.
 */
export const RULES: readonly Rule[] = ESCALATION_LADDER.map((code) => {
  const question = QUESTIONS.find((rule) => rule.code === code)

  if (question === undefined) {
    throw new Error(`loom: the rules ask about "${code}" and ${THE_RULES.path} does not`)
  }

  return question
})

/**
 * The three answers, in plain words, one per kind the runtime can return.
 *
 * Derived from the enum for the same reason as the list above: a fourth answer
 * would be the single largest change this site could be asked to describe, and
 * a page still promising three would be wrong in the most damaging way
 * available to it.
 */
const ANSWER: Readonly<Record<DispositionKind, { readonly title: string; readonly body: string }>> = {
  accepted: {
    title: "It happens",
    body: "Nothing about it gave your rules pause, so the page changes and the change is written down with the reason it was allowed.",
  },
  "requires-confirmation": {
    title: "It waits for you",
    body: "Your rules will not let this one through on its own. It is worked out in full and held, and somebody decides. Nothing has moved while it waits.",
  },
  rejected: {
    title: "It does not happen",
    body: "Your rules refuse it outright. There is no button that overrides this, because a floor you can talk your way past is not a floor.",
  },
}

/**
 * Who asked, in words a reader can place themselves in.
 *
 * The four phrases were written here on 28 August and moved to
 * `adapt/askers.ts` on 13 September, when `/who-can-ask` needed the same four
 * askers and two more shapes of each — a two-word column heading and a
 * sentence. Two pages naming the same four people two ways is how a site starts
 * telling a reader that *a job that runs on a timer* and *a scheduled job* are
 * different things.
 */

const plainly = <Value,>(map: Readonly<Record<string, Value>>, key: string, what: string): Value => {
  const found = map[key]

  if (found === undefined) {
    throw new Error(`loom: ${what} "${key}" has no plain words on ${THE_RULES.path}`)
  }

  return found
}

const hero = (ids: IdFactory, context: PageContext): LoomNode =>
  buildElement(ids, {
    type: "loom.hero",
    props: {
      backdrop: "grid",
      align: "start",
      stature: "standard",
      eyebrow: "The line you draw",
    },
    children: [
      buildSlot(ids, "heading", [
        heading(ids, 1, "You decide what may change, before anything asks to", { balance: true }),
      ]),
      prose(
        ids,
        "A rule is a few lines you write once. It says what may never be taken off your page, how big a change may get before a person has to look, and how sure the AI has to be. Every request is weighed against it before anything moves.",
        { size: "lead", measured: true }
      ),
      buildSlot(ids, "actions", [
        action(ids, "Watch a rule stop something", askHref(context.origin, {
          theme: context.theme,
          ask: "drop-pitch",
        }), { variant: "primary", scale: "large" }),
        action(ids, "Read the docs", surfaceHref(context.origin, DOCS), {
          variant: "secondary",
          scale: "large",
        }),
      ]),
    ],
  })

/**
 * Three answers, and the reason the band exists is the third one.
 *
 * A reader who has been told a page rearranges itself assumes the answer is
 * yes-or-nothing. The middle answer is the one worth arriving early: *held* is
 * where almost everything consequential ends up, and it is the answer that
 * makes the other two believable.
 */
const answers = (ids: IdFactory): LoomNode =>
  section(
    ids,
    { width: "wide", eyebrow: "What a rule can say" },
    "There are three answers, and there is no fourth",
    [
      buildElement(ids, {
        type: "loom.feature-grid",
        props: { columns: "three", density: "tight" },
        children: dispositionKindSchema.options.map((kind) => {
          const answer = plainly(ANSWER, kind, "answer")

          return buildElement(ids, {
            type: "loom.feature",
            props: { title: answer.title, body: answer.body },
          })
        }),
      }),
    ]
  )

/**
 * The eight questions, printed in the words the site will use on the day one of
 * them fires.
 *
 * A `loom.milestone-list` rather than a grid because the order is the content:
 * these are asked one after another and the first refusal ends it, which is a
 * sequence and reads as one.
 */
const questions = (ids: IdFactory): LoomNode =>
  section(
    ids,
    { tone: "surface", width: "wide", eyebrow: "Every single time" },
    "The questions asked of every change, before any of it happens",
    [
      prose(
        ids,
        `${spellCapitalised(RULES.length)} questions, asked in this order, of every request from anyone. The first one that says no is the answer — and the sentence beside each of them is the sentence this site will show you on the day it happens, word for word.`,
        { size: "lead", measured: true }
      ),
      buildElement(ids, {
        type: "loom.milestone-list",
        props: { rail: "line", density: "loose" },
        children: RULES.map((rule, index) =>
          buildElement(ids, {
            type: "loom.milestone",
            props: {
              marker: String(index + 1),
              title: rule.asks,
              body: plainly(BECAUSE, rule.code, "reason"),
              state: "done",
            },
          })
        ),
      }),
    ]
  )

/** A percentage a reader can hold in their head, off a number between nought and one. */
const outOfHundred = (confidence: number): string => `${Math.round(confidence * 100)} out of 100`

/**
 * The rules this site is published under, read off the rules this site is
 * published under.
 *
 * Not one figure in this band is typed. It is the same discipline the front
 * door's own numbers were put under on 27 August, applied to the one place
 * where a stale figure would be worse than embarrassing: a page claiming this
 * site holds a line, printing a line this site does not hold.
 */
const published = (ids: IdFactory): LoomNode =>
  section(
    ids,
    { width: "wide", eyebrow: "Ours, as an example" },
    "The rules this page is published under",
    [
      prose(
        ids,
        "This site runs on Loom, so it has a set of rules of its own. Here it is — read off the file the site is actually served with, rather than written out beside it.",
        { size: "lead", measured: true }
      ),
      buildElement(ids, {
        type: "loom.table",
        props: {
          tone: "panel",
          rules: "rows",
          caption: "What we decided, and what we set it to",
        },
        children: [
          columns(ids, ["The decision", "Our answer"]),
          row(ids, [
            cell(ids, "What may never be taken off this page", { role: "row" }),
            cell(ids, `${protectedInPlainWords().join(", and ")} — a change that destroys either is refused, and saying yes does not help`),
          ]),
          row(ids, [
            cell(ids, "How sure it has to be before anything is applied", { role: "row" }),
            cell(ids, `${outOfHundred(FRONT_DOOR_POLICY.minimumConfidence)}. Below that a person is asked first`),
          ]),
          row(ids, [
            cell(ids, "How unsure is too unsure to even offer", { role: "row" }),
            cell(ids, `${outOfHundred(FRONT_DOOR_POLICY.confidenceFloor)}. Below that you are not troubled with it at all`),
          ]),
          row(ids, [
            cell(ids, "How much may come off the page before it counts as a lot", { role: "row" }),
            cell(ids, `${FRONT_DOOR_POLICY.removalThresholds.medium} pieces, and ${FRONT_DOOR_POLICY.removalThresholds.high} is a great deal`),
          ]),
          row(ids, [
            cell(ids, "How far a change may reach before it counts as broad", { role: "row" }),
            cell(ids, `${FRONT_DOOR_POLICY.breadthThreshold} pieces of the page at once`),
          ]),
          row(ids, [
            cell(ids, "The weight at which nothing is allowed, however it is asked for", { role: "row" }),
            cell(ids, `Anything ${plainly(WEIGHT, FRONT_DOOR_POLICY.refusalFloor, "weight")}`),
          ]),
        ],
      }),
      prose(
        ids,
        "Two of those are worth saying out loud. Nothing on this page is protected because it is ours — it is protected because a business that lets a machine delete the statement of what it does for people has the wrong rule. And the last line is a floor rather than a warning: it is the one answer no amount of agreeing with can move.",
        { measured: true }
      ),
    ]
  )

/**
 * Who may do what without asking, which is the half of a policy that is about
 * people rather than about size.
 *
 * It is the band that lands hardest with the reader this site is for. A change
 * a developer may ship on their own is not the same change when a timer asks
 * for it at four in the morning, and a set of rules that could not tell those
 * apart would be a set of rules nobody could sign off.
 *
 * **It states, and a page of its own now shows.** The table below is four lines
 * of prose about a threshold; `/who-can-ask` puts four real requests to all four
 * of them and prints what each was told. This band keeps the summary because a
 * reader of the rules needs it here, and hands over the moment they want to see
 * it — which is the division the rest of the site already runs on.
 */
const whoMay = (ids: IdFactory, context: PageContext): LoomNode =>
  section(
    ids,
    { tone: "surface", width: "wide", eyebrow: "And who asked" },
    "The same change, weighed differently depending on who wanted it",
    [
      buildElement(ids, {
        type: "loom.table",
        props: {
          tone: "panel",
          rules: "rows",
          caption: "How much each of them may do before you are asked",
        },
        children: [
          columns(ids, ["Who asked", "May go ahead up to"]),
          ...ASKERS.map((asker) =>
            row(ids, [
              cell(ids, asker.who, { role: "row" }),
              cell(ids, `Anything ${plainly(WEIGHT, ceilingOf(asker), "weight")}`),
            ])
          ),
        ],
      }),
      prose(
        ids,
        "Above their line, the change is not refused — it stops and asks. That is the difference between a rule that keeps working and a rule people route around.",
        { measured: true }
      ),
      stack(ids, { direction: "row", gap: "snug", wrap: true }, [
        action(
          ids,
          "See all four asked the same thing",
          internalHref(context.origin, WHO_CAN_ASK.path, context.theme),
          { variant: "secondary", scale: "medium" }
        ),
      ]),
    ]
  )

/**
 * The claim, offered rather than asserted.
 *
 * Both links go to the front door with a request already in them, and both of
 * them are real: the first is refused by the rule three bands up, and the
 * second is held for the visitor to answer. A page about rules that could not
 * show one holding would be exactly the kind of page this site exists to be an
 * argument against.
 */
const proof = (ids: IdFactory, context: PageContext): LoomNode =>
  section(
    ids,
    { width: "wide", eyebrow: "On this page, right now" },
    "Ask the front page to break one of them",
    [
      prose(
        ids,
        `Nothing above is a description of something that happens elsewhere. The front page of this site takes requests, and ${EXCEPTIONS_SPELLED} of them run into the rules in the table above.`,
        { size: "lead", measured: true }
      ),
      buildElement(ids, {
        type: "loom.feature-grid",
        props: { columns: "two", density: "tight" },
        children: [
          buildElement(ids, {
            type: "loom.feature",
            props: {
              title: "Ask it to cut the pitch",
              body: "That takes away the band saying what this site is for, which is the first thing in the table. It is refused, and the refusal says which rule refused it.",
            },
          }),
          buildElement(ids, {
            type: "loom.feature",
            props: {
              title: "Ask it to get to the point",
              body: "That moves the same band rather than destroying it. Not damage, and not a machine's call either — so it stops and asks you, and you decide.",
            },
          }),
        ],
      }),
      stack(ids, { direction: "row", gap: "snug", wrap: true }, [
        action(
          ids,
          "Watch it be refused",
          askHref(context.origin, { theme: context.theme, ask: "drop-pitch" }),
          { variant: "primary", scale: "large" }
        ),
        action(
          ids,
          "Watch it stop and ask",
          askHref(context.origin, { theme: context.theme, ask: "problem" }),
          { variant: "secondary", scale: "large" }
        ),
        link(
          ids,
          "Or read a run of them, written down",
          recordHref(context.origin, { theme: context.theme }),
          { scale: "medium" }
        ),
      ]),
    ]
  )

const asked = (ids: IdFactory): LoomNode =>
  section(ids, { width: "wide", eyebrow: "Questions" }, "The ones people ask about rules", [
    buildElement(ids, {
      type: "loom.faq-list",
      props: { columns: "one", width: "readable" },
      children: [
        buildElement(ids, {
          type: "loom.faq",
          props: {
            question: "Who writes them?",
            answer:
              "You do, once, when you set the site up. They are ordinary code in your own repository, so they go through review like everything else you ship and you can write tests against them. There is a sensible starting set, and it is a starting point rather than a requirement.",
            open: true,
          },
        }),
        buildElement(ids, {
          type: "loom.faq",
          props: {
            question: "Can the AI see the rules and argue with them?",
            answer:
              "No. It is asked what it would like to change and it answers; the weighing and the decision happen afterwards, in code it never touches. That separation is the reason a refusal means something — nothing that wants a change gets to be the thing that permits it.",
          },
        }),
        buildElement(ids, {
          type: "loom.faq",
          props: {
            question: "What happens if I change the rules later?",
            answer:
              "Old decisions keep saying what they said. Every one of them records the name of the rules that made it and a fingerprint of what those rules contained at the time, so a set that has since been edited cannot pretend a past decision was made under today's wording. You can see which decisions were made under a set you have since changed.",
          },
        }),
        buildElement(ids, {
          type: "loom.faq",
          props: {
            question: "Someone approved a change. Does that erase the fact it was stopped?",
            answer:
              "It does not. The rules are asked again, they hold it again, and it goes through because a person said so — and the record keeps both halves: your rules stopped this, and you overrode them. A record that showed only the outcome would be losing the more useful half.",
          },
        }),
        buildElement(ids, {
          type: "loom.faq",
          props: {
            question: "Is this the same as asking a model nicely?",
            answer:
              "No, and it is the whole difference. A prompt is a request you hope is honoured. These are conditions checked after the change has been worked out and before any of it reaches the page, by code that cannot be talked round.",
          },
        }),
      ],
    }),
  ])

const closing = (ids: IdFactory, context: PageContext): LoomNode =>
  section(
    ids,
    { tone: "accent", width: "full" },
    "Your rules, on your page, in an afternoon",
    [
      prose(
        ids,
        "The rules on this page are the ones this site chose. Yours will be different, and writing them is the part you do once.",
        { size: "lead", align: "center", measured: true }
      ),
      stack(ids, { direction: "row", gap: "snug", wrap: true, align: "center", justify: "center" }, [
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
    { align: "center" }
  )

export const theRulesPageTree = (context: PageContext): LoomTree => {
  const ids = sequentialIdFactory("rules")
  const chrome: ChromeContext = {
    origin: context.origin,
    theme: context.theme,
    current: THE_RULES,
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
        answers(ids),
        questions(ids),
        published(ids),
        whoMay(ids, context),
        proof(ids, context),
        asked(ids),
        closing(ids, context),
        siteFooter(ids, chrome),
      ],
    }),
    ids
  )
}
