import { buildElement, buildSlot, buildText, type IdFactory, type LoomNode } from "@loom/runtime"

import { ASKS, type AskId } from "../adapt/asks"
import type { ChangeRecord } from "../adapt/record"
import { protectedInPlainWords } from "../adapt/run"
import { BAND } from "../bands"
import { heading, prose, stack } from "../nodes"
import { askHref, DEMO, surfaceHref, type SiteThemeName } from "../site"

/**
 * The band where the page stops describing itself and does it.
 *
 * The front door has spent five runs making a claim — *ask for a change in your
 * own words and the page rearranges itself, and every change keeps a record of
 * who asked, what moved, and how to put it back*. Everything else on the site
 * is an argument for that sentence. This band is the sentence happening, on the
 * page the visitor is reading, to the bands directly above and below it.
 *
 * The second half is the half that matters. Plenty of things change a page with
 * AI; what nobody else can put on a landing page is the panel beside it, saying
 * what was asked, what was worked out, how much moved, which rule allowed it and
 * what putting it back would restore. That is the differentiator, and this is
 * the first place on the site where a visitor sees it rather than reads about it.
 *
 * Every word of the panel is written in the register the front door is held to:
 * a stranger reads it without meeting one word they would have to look up.
 */

export type SeeItHappenContext = {
  readonly origin: string
  readonly theme: SiteThemeName
  /** Which choice the address is asking for, if any. */
  readonly ask?: AskId
  /** What happened, once it has. Absent before the visitor has asked for anything. */
  readonly record?: ChangeRecord
}

/**
 * The five steps, and they are the five the mechanism page names.
 *
 * Written in the second person here because this time it happened to the reader
 * rather than to a diagram. `pages.test.ts` holds the count against that page,
 * so a sixth step described there and not shown here is a failing test rather
 * than a quiet inconsistency between two pages of one site.
 */
const step = (
  ids: IdFactory,
  marker: string,
  title: string,
  body: string,
  state: "done" | "current" | "planned"
): LoomNode =>
  buildElement(ids, {
    type: "loom.milestone",
    props: { marker, title, body, state },
  })

const stepsOf = (ids: IdFactory, record: ChangeRecord): readonly LoomNode[] => [
  step(ids, "1", "You asked for something", `“${record.asked}”`, "done"),
  step(ids, "2", "The change was worked out", record.proposed, "done"),
  step(ids, "3", "The change was measured", `${record.measured} ${record.weighed}`, "done"),
  step(ids, "4", "Your rules decided", record.verdictLine, "done"),
  step(ids, "5", "Putting it back", record.undo, record.landed ? "current" : "planned"),
]

/**
 * What the panel says before the visitor has asked for anything.
 *
 * It lists what will appear rather than inviting a click twice. The band's own
 * heading has already asked; this is the promise the panel is about to keep, and
 * a visitor who reads it and clicks nothing has still learned what the product
 * does that others do not.
 */
const waiting = (ids: IdFactory): readonly LoomNode[] => [
  prose(ids, "Nothing has changed yet.", { size: "lead" }),
  prose(
    ids,
    "Pick one and this panel fills in: what you asked for, what the change turned out to be, how much of the page it moved, which of your rules allowed it, and what putting it back would restore.",
    { tone: "muted" }
  ),
]

/** The verdict as a badge, so the answer is legible before the reasoning is read. */
const verdictBadge = (ids: IdFactory, record: ChangeRecord): LoomNode =>
  buildElement(ids, {
    type: "loom.badge",
    props: { tone: record.landed ? "accent" : "outline" },
    children: [buildText(ids, record.verdictLabel)],
  })

/**
 * The way out, and — when the rules held the change back — the way through.
 *
 * A hold is not a failure and the panel must not read like one. Your rules
 * stopped a change and handed the decision to a person; the person is the
 * visitor, and the button is them saying yes. Approving re-runs the judgment
 * against the page as it stands rather than trusting the one made a moment ago,
 * so it is a real answer to a real question and not a bypass.
 */
const panelActions = (
  ids: IdFactory,
  context: SeeItHappenContext,
  record: ChangeRecord
): readonly LoomNode[] => {
  const home = askHref(context.origin, { theme: context.theme })

  return [
    stack(ids, { direction: "row", gap: "snug", wrap: true }, [
      ...(record.awaitingYou
        ? [
            buildElement(ids, {
              type: "loom.action",
              props: {
                href: askHref(context.origin, {
                  theme: context.theme,
                  ask: record.ask,
                  approve: true,
                }),
                variant: "primary",
              },
              children: [buildText(ids, "I say yes — go ahead")],
            }),
          ]
        : []),
      buildElement(ids, {
        type: "loom.action",
        props: { href: home, variant: record.landed ? "primary" : "secondary" },
        children: [buildText(ids, record.landed ? "Put it back" : "Start again")],
      }),
    ]),
  ]
}

const panel = (ids: IdFactory, context: SeeItHappenContext): LoomNode => {
  const { record } = context

  return buildElement(ids, {
    type: "loom.card",
    props: { tone: "surface", padding: "roomy" },
    children:
      record === undefined
        ? [...waiting(ids)]
        : [
            stack(ids, { direction: "row", gap: "snug", align: "center", wrap: true }, [
              verdictBadge(ids, record),
              prose(ids, "What the page wrote down", { size: "small", tone: "muted" }),
            ]),
            buildElement(ids, {
              type: "loom.milestone-list",
              props: { rail: "line", density: "loose" },
              children: [...stepsOf(ids, record)],
            }),
            /**
             * The disclosure, and it is a selling point rather than a caveat.
             * What worked this change out was the page itself, not a model — and
             * the rules cannot tell, because they judge the change and never its
             * author. That is the property that makes the whole sequence
             * testable, and hiding it would be the site being coy about the one
             * thing it is right about.
             */
            prose(
              ids,
              "This change was worked out from the page itself rather than asked of an AI, which is why it is so sure of itself. Your rules do not treat the two differently: they weigh the change, never who wrote it.",
              { size: "small", tone: "muted" }
            ),
            ...panelActions(ids, context, record),
          ],
  })
}

/**
 * How many, in words. Small enough a table beats a library, and the sentence
 * reads badly with a digit in it.
 */
const COUNT_IN_WORDS: readonly string[] = ["nothing", "one thing", "two things", "three things"]

/**
 * What this site protects, said before the reader meets a refusal.
 *
 * Every part of it is read off the rules: the phrases, and the count. A run that
 * protects a fourth thing and forgets this sentence gets a page that says
 * "three things" and lists four, which is the kind of near-miss nobody notices
 * in review — so it cannot happen.
 */
const protectionNotice = (): string => {
  const protectedThings = protectedInPlainWords()
  const listed =
    protectedThings.length === 1
      ? protectedThings[0]
      : `${protectedThings.slice(0, -1).join(", ")} and ${protectedThings[protectedThings.length - 1]}`

  return `This site protects ${
    COUNT_IN_WORDS[protectedThings.length] ?? `${protectedThings.length} things`
  } from being taken away: ${listed}. Everything else a request may rearrange on its own — and one of the five above will be refused, which is the part worth watching.`
}

/**
 * The band's own limit, said out loud, with the way past it attached.
 *
 * Five prepared choices are the only affordable shape for this surface — a text
 * box on the most-loaded page the project has is a model call for every visitor
 * and a dead button for every deployment without a key — and that leaves a real
 * gap: the hero two bands above promises *ask for a change in your own words*,
 * and this band offers five buttons.
 *
 * The gap has been the standing open question on this lane since 20 August, and
 * the recommendation each time was the same: send people somewhere built for
 * typing rather than put the model here. As of 22 August there is somewhere —
 * `/demo`, public, no account, no key required for the prepared part of it.
 *
 * So the line is honest about *why* these are buttons rather than quietly
 * hoping nobody notices. A visitor who has just watched the sequence run is the
 * likeliest person on the site to want a turn at it, and this is the one moment
 * on the front door where that is true.
 */
const typeYourOwn = (ids: IdFactory, context: SeeItHappenContext): readonly LoomNode[] => [
  stack(ids, { direction: "row", gap: "snug", align: "center", wrap: true }, [
    /**
     * Measured, so the sentence and the way out sit on one line rather than the
     * link dropping beneath a full-width paragraph and reading as a stray band
     * of its own. The band is `wide`, and an unmeasured small line crosses all
     * of it.
     */
    prose(
      ids,
      "These five are prepared, so the whole sequence runs here without an AI in the way. To ask for something in your own words, there is a page for that.",
      { tone: "muted", size: "small", measured: true }
    ),
    buildElement(ids, {
      type: "loom.action",
      props: { href: surfaceHref(context.origin, DEMO), variant: "quiet" },
      children: [buildText(ids, "Ask it for something else")],
    }),
  ]),
]

const choices = (ids: IdFactory, context: SeeItHappenContext): LoomNode =>
  stack(ids, { direction: "column", gap: "snug", align: "start" }, [
    prose(ids, "What did you come here for?", { size: "lead" }),
    stack(
      ids,
      { direction: "row", gap: "snug", wrap: true },
      ASKS.map((ask) =>
        buildElement(ids, {
          type: "loom.action",
          props: {
            href: askHref(context.origin, { theme: context.theme, ask: ask.id }),
            variant: context.ask === ask.id ? "primary" : "secondary",
          },
          children: [buildText(ids, ask.label)],
        })
      )
    ),
    prose(
      ids,
      "Each one is a real request. The page works out what it would take, measures it, and puts it to the rules this site is published under — the same way it would on a page of yours.",
      { tone: "muted", size: "small" }
    ),
    /**
     * The rules, stated before a visitor meets one.
     *
     * A refusal is only impressive if the reader knew the rule was there
     * beforehand; found out afterwards it reads as the page breaking. So the
     * band says what this site protects, in one sentence, above the button that
     * will be refused for exactly that reason.
     */
    prose(ids, protectionNotice(), { tone: "muted", size: "small" }),
  ])

export const seeItHappenBand = (ids: IdFactory, context: SeeItHappenContext): LoomNode =>
  buildElement(ids, {
    type: "loom.section",
    props: { tone: "surface", width: "wide", eyebrow: BAND.seeItHappen },
    children: [
      buildSlot(ids, "heading", [
        heading(ids, 2, "Ask this page to rearrange itself", { balance: true }),
      ]),
      prose(
        ids,
        "Everything above and below this band is a piece the page can be asked to move. Pick one, watch what happens, and read what the page wrote down about it.",
        { size: "lead", measured: true }
      ),
      /**
       * The choices above and the record below, rather than side by side.
       *
       * Side by side was the first arrangement and it was wrong for a reason
       * worth recording: the panel is five steps of prose and the choices are
       * five buttons, so a column each left half the band empty and squeezed
       * the record into a gutter forty characters wide. Full width makes each
       * step one or two lines, which is the difference between a record a
       * visitor reads and one they scroll past.
       */
      choices(ids, context),
      panel(ids, context),
      ...typeYourOwn(ids, context),
    ],
  })
