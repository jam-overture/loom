import { buildElement, buildSlot, buildText, type IdFactory, type LoomNode } from "@jam-overture/loom"

import { whatTheChoicesDo, worthWatching } from "../adapt/answers"
import { ASKS, type AskId } from "../adapt/asks"
import type { ChangeRecord } from "../adapt/record"
import { protectedInPlainWords } from "../adapt/run"
import { ANCHOR, BAND } from "../bands"
import { heading, prose, stack } from "../nodes"
import { askHref, DEMO, mechanismHref, surfaceHref, type SiteThemeName } from "../site"

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
  /**
   * Whether the address also said the visitor allowed a change the rules held.
   *
   * Taken from the address rather than read back off the record, because the
   * record cannot tell the two apart: once a held change has been allowed it has
   * landed and is waiting for nobody, which is exactly what a change that never
   * needed allowing looks like. Only the address knows which happened.
   *
   * It is also why the band builds its own links rather than reading them off
   * the record: every control here has to keep the whole of what the visitor has
   * done so far, because the address *is* the state (0081). A *Put it back* that
   * forgot the approval one press earlier would send the reader to a page where
   * the change they are putting back never happened.
   */
  readonly approve?: boolean
  /** What happened, once it has. Absent before the visitor has asked for anything. */
  readonly record?: ChangeRecord
  /**
   * And what happened when they put it back, once they have.
   *
   * A second record rather than a flag, because that is what it is: an undo is a
   * change of its own (0032), interpreted, measured and put to the same rules,
   * and the panel reports it exactly as it reports the first one.
   */
  readonly undone?: ChangeRecord
}

/**
 * The five steps, and they are the five the mechanism page names.
 *
 * Written in the second person here because this time it happened to the reader
 * rather than to a diagram. `pages.test.ts` holds the count against that page,
 * so a sixth step described there and not shown here is a failing test rather
 * than a quiet inconsistency between two pages of one site.
 *
 * **The titles live here and nowhere else**, which is what this table is for.
 * Until now the five were written out twice: once as the rungs below, and once
 * as a sentence in the waiting panel promising *what you asked for, what the
 * change turned out to be, how much of the page it moved, which of your rules
 * allowed it, and what putting it back would restore.* Two hand-written copies
 * of one list, in one file, either of which could be re-worded on its own — and
 * the one that drifted would have been the sentence, because it is the one a
 * visitor reads before there is anything to check it against.
 *
 * So each row carries its title and the way it reads its own line off the
 * record. A step is added or re-worded in one place, and both states of the
 * panel move together.
 */
type PanelStep = {
  readonly marker: string
  readonly title: string
  /** What this line says once there is something for it to say. */
  readonly body: (record: ChangeRecord) => string
  /** Whether this line is still ahead of the reader. Absent means it happened. */
  readonly stateFor?: (record: ChangeRecord) => "done" | "current" | "planned"
}

export const PANEL_STEPS: readonly PanelStep[] = [
  { marker: "1", title: "You asked for something", body: (record) => `“${record.asked}”` },
  { marker: "2", title: "The change was worked out", body: (record) => record.proposed },
  {
    marker: "3",
    title: "The change was measured",
    body: (record) => `${record.measured} ${record.weighed}`,
  },
  { marker: "4", title: "Your rules decided", body: (record) => record.verdictLine },
  {
    marker: "5",
    title: "Putting it back",
    body: (record) => record.undo,
    stateFor: (record) => (record.landed ? "current" : "planned"),
  },
]

const step = (
  ids: IdFactory,
  marker: string,
  title: string,
  state: "done" | "current" | "planned",
  body?: string
): LoomNode =>
  buildElement(ids, {
    type: "loom.milestone",
    props: { marker, title, state, ...(body === undefined ? {} : { body }) },
  })

const rail = (
  ids: IdFactory,
  density: "tight" | "loose",
  steps: readonly LoomNode[]
): LoomNode =>
  buildElement(ids, {
    type: "loom.milestone-list",
    props: { rail: "line", density },
    children: [...steps],
  })

const stepsOf = (ids: IdFactory, record: ChangeRecord): readonly LoomNode[] =>
  PANEL_STEPS.map((entry) =>
    step(ids, entry.marker, entry.title, entry.stateFor?.(record) ?? "done", entry.body(record))
  )

/**
 * What the panel says before the visitor has asked for anything — which is the
 * state every visitor, every crawler and every share preview meets first.
 *
 * It used to be a heading and a sentence inside a card built for five steps of
 * prose, so the most important band on the site opened as a bordered rectangle
 * with two lines in it and three hundred pixels of nothing under them. The band
 * promises *watch what happens and read what the page wrote down*, and the
 * thing directly under that promise was an empty box.
 *
 * Now it is the record's own shape, unlit: the same five rungs in the same
 * order, each one hollow and holding its title and nothing else. A visitor who
 * clicks nothing has still been shown the five things this product writes down,
 * which is the one thing on the site a competitor cannot copy.
 *
 * **It costs 121px of band**, measured at 1440 — 828 to 949 — and that is the
 * honest price rather than the free win the first draft of this comment claimed.
 * It buys the emptiest three hundred pixels on the site turning into the
 * sequence the band exists to demonstrate.
 *
 * What it must not do is look like it has already happened. Every rung is
 * `planned`, which renders hollow and is announced as *Planned* rather than
 * silently; the badge says so in a word; and no rung carries a body, because a
 * body is a fact about a change and there has not been one.
 *
 * **The weakest thing here is the phone, and the lane has no lever on it.**
 * `loom.milestone` reserves `5.5rem` for its marker column at every viewport
 * and whether or not a marker is set, so at 390px each rung gives its title
 * 101px of the 390 and *You asked for something* wraps to three lines. Dropping
 * the numbers reclaims none of it — the column is unconditional — and the same
 * gutter already shapes the filled panel and the mechanism page. Filed for
 * `Loom primitives` with the measurements; not worked around, because the
 * workaround is a local component and this lane does not get one.
 */
const waiting = (ids: IdFactory): readonly LoomNode[] => [
  stack(ids, { direction: "row", gap: "snug", align: "center", wrap: true }, [
    buildElement(ids, {
      type: "loom.badge",
      props: { tone: "outline" },
      children: [buildText(ids, "Nothing yet")],
    }),
    prose(ids, "What the page will write down", { size: "small", tone: "muted" }),
  ]),
  rail(ids, "tight", PANEL_STEPS.map((entry) => step(ids, entry.marker, entry.title, "planned"))),
  prose(ids, "Pick one above and every line fills in with what actually happened.", {
    size: "small",
    tone: "muted",
  }),
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
/**
 * The way down a level, offered only to somebody who has just been up here.
 *
 * The five steps above are the record said in words a stranger can read, and
 * that is the right thing to put on a front door. It is not the whole of what
 * this product has: underneath each of those steps is a line the machinery
 * actually wrote, and the mechanism page prints them in full.
 *
 * Until now it printed the same request every time — the quietest of the five,
 * chosen when that page was written — so a visitor who had just watched *Prove
 * it* add a band, and clicked through to read the record of it, was shown the
 * record of *Turn it down* instead. The two claims a stranger has to believe are
 * that the record is real and that it is of the thing that just happened to
 * them, and the second was quietly false at the one moment it could be checked.
 *
 * The approval travels because the record does, and `context` rather than
 * `record` is where it comes from: see `approve` above for why the record cannot
 * be asked.
 */
const readTheRecord = (
  ids: IdFactory,
  context: SeeItHappenContext,
  record: ChangeRecord
): LoomNode =>
  buildElement(ids, {
    type: "loom.action",
    props: {
      href: mechanismHref(context.origin, {
        theme: context.theme,
        ask: record.ask,
        approve: context.approve === true,
      }),
      variant: "quiet",
    },
    children: [buildText(ids, "See every line the machinery wrote")],
  })

const panelActions = (
  ids: IdFactory,
  context: SeeItHappenContext,
  record: ChangeRecord
): readonly LoomNode[] => {
  const home = askHref(context.origin, { theme: context.theme })
  /** Everything the visitor has done so far, which every link from here must keep. */
  const sofar = {
    theme: context.theme,
    ask: record.ask,
    ...(context.approve === true ? { approve: true } : {}),
  }
  /** There is something to put back only on a change that landed and is still on the page. */
  const reversible = record.landed && !record.putBack && context.undone === undefined

  return [
    stack(ids, { direction: "row", gap: "snug", wrap: true }, [
      ...(record.awaitingYou
        ? [
            buildElement(ids, {
              type: "loom.action",
              props: {
                href: askHref(
                  context.origin,
                  record.putBack
                    ? { ...sofar, back: true, backApprove: true }
                    : { ...sofar, approve: true }
                ),
                variant: "primary",
              },
              children: [buildText(ids, "I say yes — go ahead")],
            }),
          ]
        : []),
      /**
       * *Put it back* is offered once, and only while there is something to put
       * back: on a change that landed, on its own card, and before the visitor
       * has already asked.
       *
       * Not on the undo's own card, which is the one place the recursion would
       * be free and worthless — a visitor putting back the putting-back is
       * asking for the change again, and the five buttons above already say that
       * in words. And not on the change's card once the undo has run, where the
       * button would still be lit under a panel reporting that it had already
       * been pressed. Both cards offer the way out instead.
       */
      buildElement(ids, {
        type: "loom.action",
        props: {
          href: reversible ? askHref(context.origin, { ...sofar, back: true }) : home,
          variant: reversible ? "primary" : "secondary",
        },
        children: [buildText(ids, reversible ? "Put it back" : "Start again")],
      }),
      readTheRecord(ids, context, record),
    ]),
  ]
}

/**
 * The undo did what the rung above it said it would, and this is the sentence
 * that says so.
 *
 * It is the whole point of the band and it is worth being exact about. Putting a
 * change back is not the page being rebuilt from its source: the inverse carries
 * the pieces the change took away, and they come back with the ids they left
 * with (0044), so the page under this panel is the page the visitor arrived on
 * rather than a fresh one that resembles it. `undo.test.ts` holds the restored
 * tree against the published one, node for node, so this sentence is a test
 * result rather than a promise.
 */
const RESTORED =
  "Nothing here was rebuilt. The pieces came back carried by the undo itself, each with the name it left with — so this is the page you arrived on, not a fresh copy that reads the same."

/**
 * And what the same slot says when the rules stopped the undo, which they do.
 *
 * The sentence above is the payoff and it is only true once something has been
 * put back. Printing it under a held undo would be this band claiming a
 * restoration that has not happened, on the run where the rules holding an undo
 * is the most interesting thing on the page — the exact shape of defect this
 * change exists to remove, reintroduced one card lower.
 */
const STILL_THERE =
  "Nothing has moved. The change is still on the page below and stays there until you answer, which is what your rules asked for."

/** What the badge row says above each rail, so two records cannot be read as one. */
const panelIntro = (record: ChangeRecord): string =>
  record.putBack ? "And what it wrote down when you put it back" : "What the page wrote down"

const panelCard = (
  ids: IdFactory,
  context: SeeItHappenContext,
  record: ChangeRecord
): LoomNode =>
  buildElement(ids, {
    type: "loom.card",
    props: { tone: "surface", padding: "roomy" },
    children: [
      stack(ids, { direction: "row", gap: "snug", align: "center", wrap: true }, [
        verdictBadge(ids, record),
        prose(ids, panelIntro(record), { size: "small", tone: "muted" }),
      ]),
      rail(ids, "loose", stepsOf(ids, record)),
      /**
       * The disclosure, and it is a selling point rather than a caveat.
       * What worked this change out was the page itself, not a model — and
       * the rules cannot tell, because they judge the change and never its
       * author. That is the property that makes the whole sequence
       * testable, and hiding it would be the site being coy about the one
       * thing it is right about.
       *
       * The undo's card says the other half instead. Repeating this under a
       * second rail would spend the reader's attention on a sentence they read
       * ninety seconds ago, and the thing they have just watched happen is more
       * interesting than the thing they already know.
       */
      prose(
        ids,
        record.putBack
          ? record.landed
            ? RESTORED
            : STILL_THERE
          : "This change was worked out from the page itself rather than asked of an AI, which is why it is so sure of itself. Your rules do not treat the two differently: they weigh the change, never who wrote it.",
        { size: "small", tone: "muted" }
      ),
      /**
       * The controls sit on the last card and nowhere else.
       *
       * Both cards offered them for one commit, and a record with two entries
       * ended in two identical *Start again* buttons a hand's width apart —
       * which reads as a page that has lost track of what it is offering. The
       * change's card has nothing left to ask once its undo has run: the
       * question moved down with the story.
       */
      ...(record.putBack || context.undone === undefined
        ? panelActions(ids, context, record)
        : []),
    ],
  })

/**
 * The record, which is one card until the visitor puts a change back and two
 * afterwards.
 *
 * Stacked rather than side by side, for the reason the band as a whole is
 * stacked: each rail is five steps of prose, and a column each would squeeze
 * both into a gutter forty characters wide. Stacked they read as what they are —
 * two entries in one record, in the order they happened.
 */
const panels = (ids: IdFactory, context: SeeItHappenContext): readonly LoomNode[] => {
  const { record, undone } = context

  if (record === undefined) {
    return [
      buildElement(ids, {
        type: "loom.card",
        props: { tone: "surface", padding: "roomy" },
        children: [...waiting(ids)],
      }),
    ]
  }

  return [
    panelCard(ids, context, record),
    ...(undone === undefined ? [] : [panelCard(ids, context, undone)]),
  ]
}

/**
 * How many, in words. Small enough a table beats a library, and the sentence
 * reads badly with a digit in it.
 */
const COUNT_IN_WORDS: readonly string[] = ["nothing", "one thing", "two things", "three things"]

/**
 * What this site protects, said before the reader meets a refusal — and then
 * what the five buttons above it actually do.
 *
 * Every part of it is read off something: the protected phrases and their count
 * off the rules, and what happens to each request off the requests. A run that
 * protects a fourth thing and forgets this sentence gets a page that says
 * "three things" and lists four; a run that adds a sixth choice used to get a
 * page still calling the exception singular. Neither can happen now.
 *
 * The second half was **"Everything else a request may rearrange on its own —
 * and one of the five above will be refused"** until today, and it was the one
 * sentence on the site that denied the middle answer exists. `answers.ts` has
 * the whole account.
 */
const protectionNotice = (): string => {
  const protectedThings = protectedInPlainWords()
  const listed =
    protectedThings.length === 1
      ? protectedThings[0]
      : `${protectedThings.slice(0, -1).join(", ")} and ${protectedThings[protectedThings.length - 1]}`

  return `This site protects ${
    COUNT_IN_WORDS[protectedThings.length] ?? `${protectedThings.length} things`
  } from being taken away: ${listed}. ${whatTheChoicesDo()} ${worthWatching()}`
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
 *
 * **Which is why, as of 18 September, it no longer sends them away.** That page
 * is now the band directly below this one, framed — §4d's *embeds the
 * demonstration rather than describing it*, buildable at last because 0135
 * grants a same-origin frame the `allow-forms` its controls need. The sentence
 * is unchanged in what it admits and changed in where it points: down the page
 * rather than off it, keeping whatever the visitor has already asked for, which
 * a link that rebuilt the address from scratch would throw away at the worst
 * possible moment.
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
      "These five are prepared, so the whole sequence runs here without an AI in the way. To ask for something in your own words, the demonstration is a page you can type into.",
      { tone: "muted", size: "small", measured: true }
    ),
    buildElement(ids, {
      type: "loom.action",
      props: {
        /**
         * The demonstration, as a surface rather than as a band of this page.
         *
         * It was a fragment link to a framed copy of `/demo` directly below —
         * removed on 1 October at the maintainer's direction: *"get rid of the
         * demo injected into the main landing page. If people want to get to
         * the demo, they can click the demo link."* So this is that link, and
         * it is the same address the bar and the footer use.
         *
         * `surfaceHref` rather than `internalHref`, so the palette is not
         * carried across: a surface that does not read `?theme=` would be
         * handed a parameter that means nothing and looks like it means
         * something.
         */
        href: surfaceHref(context.origin, DEMO),
        variant: "quiet",
      },
      children: [buildText(ids, "Take a turn")],
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
    /**
     * The claim, without the sequence.
     *
     * This sentence used to walk the reader through *works out what it would
     * take, measures it, and puts it to the rules* — a third written copy of the
     * five steps, two inches above a panel that now shows them. What it is here
     * to say is the part the panel cannot: that these are real requests and that
     * the rules judging them are the site's own, not a demonstration mode.
     */
    prose(
      ids,
      "Each one is a real request, put to the rules this site is published under — the same way it would be on a page of yours.",
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
    /**
     * The anchor is what the notice at the top of the page links to.
     *
     * A visitor who presses one of the choices below is navigated, so the
     * browser leaves them at the top of the document — three screens above the
     * band they were reading. The notice up there tells them what happened;
     * this is how they get back to where it happened, without scrolling and
     * guessing. See `ANCHOR`, and `answer.ts` for the control itself.
     */
    /**
     * No `tone`, on the reason in `nodes.ts`. This band is the one that lost
     * most by it — it is a stage rather than a paragraph, and a stage wants an
     * edge — and it is also the band the loss is least visible on, because the
     * card holding the record draws its own outline in the middle of it.
     */
    props: { width: "wide", eyebrow: BAND.seeItHappen, anchor: ANCHOR.seeItHappen },
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
      ...panels(ids, context),
      ...typeYourOwn(ids, context),
    ],
  })
