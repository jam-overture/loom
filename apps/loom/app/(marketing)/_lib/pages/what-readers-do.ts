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
import { READER_SIGNAL_KINDS, type ReaderSignalKind } from "@loom/runtime/signals"

import { siteFooter, siteHeader, type ChromeContext } from "../chrome"
import { action, heading, prose, section, stack } from "../nodes"
import {
  bandSentence,
  frontDoorReadings,
  funnelSentence,
  FUNNEL_QUESTIONS,
  SCRIPTED_VISITS,
  type BandAnswer,
  type BandReading,
  type FrontDoorReadings,
  type FunnelQuestion,
} from "../readers/visits"
import {
  DOCS,
  HOME,
  internalHref,
  SITE_THEMES,
  surfaceHref,
  THE_RECORD,
  THE_RULES,
  WHAT_READERS_DO,
} from "../site"

import { homePageTree, type PageContext } from "./home"

/**
 * The page for the half of the argument this site had never made.
 *
 * Eight pages say what happens when somebody asks for a change: the rules that
 * decide, who may ask, what gets written down, how it comes back. Every one of
 * them starts with a request. **Nothing on the site said where a request might
 * come from**, and the project's own reason for existing is that a page should
 * be able to change from how people actually use it — which means somebody has
 * to be able to see how people actually use it.
 *
 * That is `docs/signals.md`, approved by the maintainer on 13 September, and
 * this page is the marketing half of its fifth step. It is written now rather
 * than earlier because the plan says so in as many words: the shape had to
 * settle first, and the counting, the storing and the arithmetic are all on
 * `main`.
 *
 * ## What it may claim, and the line it does not cross
 *
 * It was written the day before the address a browser delivers to existed, so
 * **no band on it promises a screen or an endpoint**, and that is still true:
 * what it claims is what the arithmetic in this repository does, demonstrated
 * by running it — what is counted, what is refused, and what the numbers look
 * like when they come out. A page that described a screen nobody can open would
 * be the one kind of marketing copy this site has never published.
 *
 * **What changed on 17 September is that this site is now one of the pages it
 * is describing.** `/api/reader-signals` landed on `main` (#312), so the layout
 * starts a broadcaster and these ten pages send batches whenever the deployment
 * serving them is collecting. Two sentences here are therefore a function of
 * `context.counting` rather than a claim about somebody else's deployment —
 * `readingsLead` and `barsAnswer`, both below, with the reasoning beside them.
 *
 * It also does not claim that a page changes itself from what readers did.
 * Deriving a request from a signal is explicitly out of scope in the approved
 * plan, and the honest version is better copy anyway: the numbers tell you
 * something, and asking for the change is still somebody's decision, weighed by
 * the same rules and written into the same record as every other request.
 *
 * ## Why the numbers are computed rather than written
 *
 * The middle band runs `rollUp` — the function the portal reads and the only
 * one that turns signals into counters — over twelve scripted visits to the
 * front door, and prints what comes back. The visits are invented and the page
 * says so beside them; the arithmetic is not. A page arguing *you can measure
 * this honestly* while typing out figures would be making its argument in
 * exactly the form it tells a reader not to trust, which is the reasoning
 * `/your-components` records for reading its specimen off the catalogue.
 */

/**
 * The four kinds, in the reader's words, keyed by the runtime's.
 *
 * Derived rather than listed, on the same terms as `DELTA_OPERATIONS`: the
 * count comes off `READER_SIGNAL_KINDS`, so the band is four tiles because the
 * vocabulary has four members and not because four is typed anywhere.
 *
 * **A fifth kind stops this page being built, deliberately.** One is approved
 * and coming — `completed`, for a form inside a band being submitted — and the
 * failure it will cause is the one worth having: a page whose whole subject is
 * what Loom counts should not be able to go out silently missing a thing Loom
 * counts. The throw names the kind, so whoever lands it gets a sentence rather
 * than a hunt.
 */
export const PLAINLY: Readonly<Record<ReaderSignalKind, { readonly title: string; readonly body: string }>> = {
  viewed: {
    title: "They got this far",
    body: "A band came into view. It is counted once per reader per visit, however far back up the page they scroll afterwards.",
  },
  dwelled: {
    title: "They stayed a while",
    body: "How long a band was on screen, added up. It is the difference between a band people scroll past and a band people read.",
  },
  activated: {
    title: "They used something in it",
    body: "A link followed, a button pressed, a field filled in. The link or the button is named; what somebody typed into it is not.",
  },
  disclosed: {
    title: "They opened something",
    body: "A question unfolded, a panel expanded. Worth its own count because opening something is a reader choosing to read more.",
  },
}

const plainly = (kind: ReaderSignalKind): { readonly title: string; readonly body: string } => {
  const found = PLAINLY[kind]

  if (found === undefined) {
    throw new Error(
      `loom: ${WHAT_READERS_DO.path} has no plain words for the "${kind}" signal, and it is a page about what is counted`
    )
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
      eyebrow: "What people do on your page",
    },
    children: [
      buildSlot(ids, "heading", [
        heading(ids, 1, "Which parts of your page do people ever reach?", { balance: true }),
      ]),
      prose(
        ids,
        "Loom can count what readers did, band by band. It counts the bands and never the people — there is no name, no account and nothing that follows anybody anywhere.",
        { size: "lead", measured: true }
      ),
      buildSlot(ids, "actions", [
        action(ids, "Read the docs", surfaceHref(context.origin, DOCS), {
          variant: "primary",
          scale: "large",
        }),
        action(
          ids,
          "See how a change gets weighed",
          internalHref(context.origin, THE_RULES.path, context.theme),
          { variant: "secondary", scale: "large" }
        ),
      ]),
    ],
  })

/**
 * The four things, as tiles, one per kind the vocabulary has.
 *
 * The sentence above them is the one that matters on this band: four kinds is a
 * closed list rather than a starting point, and a closed list is what makes the
 * rest of the page checkable. *It could also record …* is the sentence every
 * analytics product's feature list ends with, and the absence of it here is the
 * claim.
 */
const whatIsCounted = (ids: IdFactory): LoomNode =>
  section(
    ids,
    { width: "wide", eyebrow: "What is counted" },
    "Four things, and there is no fifth",
    [
      prose(
        ids,
        "This is the whole list. Not a starting point that grows once you enable something — four kinds of thing a reader can do to a band of your page, and nothing else is recorded.",
        { size: "lead", measured: true }
      ),
      buildElement(ids, {
        type: "loom.feature-grid",
        props: { columns: "four", density: "tight" },
        children: READER_SIGNAL_KINDS.map((kind) =>
          buildElement(ids, { type: "loom.feature", props: { ...plainly(kind) } })
        ),
      }),
    ]
  )

/**
 * What else happened in the band, when anything did.
 *
 * Time on screen is always worth saying; a band nobody used anything in says
 * nothing about using rather than saying zero. The reasoning is the one the
 * readings module records for leaving a silent band out of the list altogether:
 * a zero invites a reader to wonder which kind of nothing it is.
 *
 * **One number and not two.** Until this run it read *five used something in it,
 * three opened something*, and both figures were a fiction of the fixture: a
 * reader presses a button, not a band, so a band's own press and open counts are
 * zero on every deployment there will ever be. What a region can report is how
 * many readers did something under it, which is one count of readers and cannot
 * be split by what they did — so the page says one thing it means rather than
 * two things it does not.
 */
const captionFor = (reading: BandReading): string => {
  const parts = [
    `${reading.seconds} seconds on screen in total`,
    ...(reading.engaged > 0 ? [`${reading.engaged} used something in it`] : []),
  ]

  return `${parts.join(", ")}.`
}

/**
 * One band's bar: how many readers got to it, out of how many there were.
 *
 * `readout` is *nine of twelve* rather than *75%*, and that is a rule rather
 * than a preference — two of two and two hundred of two hundred are the same
 * rate and different news. The bar is drawn from the rate because a bar has to
 * be; the figure a reader takes away carries its denominator.
 */
const bandBar = (ids: IdFactory, reading: BandReading): LoomNode =>
  buildElement(ids, {
    type: "loom.meter",
    props: {
      value: (reading.reached / reading.views) * 100,
      label: reading.band,
      readout: `${reading.reached} of ${reading.views}`,
      caption: captionFor(reading),
      shape: "bar",
      tone: "accent",
    },
  })

/**
 * Where the numbers in the band below came from, and whether the reader of it
 * is one of them.
 *
 * Both halves are true on either deployment and the order is what changes: the
 * bars are a fixture in both cases, and *are you being counted right now* has
 * two answers. It was one sentence with one answer until 17 September, and it
 * could afford to be — this surface broadcast nothing, so *this site counts
 * nobody* was true of it by doing nothing at all. It now sends batches when its
 * deployment is collecting, so the sentence had to become a function of the
 * deployment rather than a claim about it.
 *
 * **Which is the whole of what this site sells, applied to itself.** A page
 * that can say what changed on it, who asked and which rule allowed it should
 * certainly be able to say whether it is counting the person reading it, and
 * *the copy went stale when the wiring changed* is the failure this page's own
 * questions band promises Loom does not have.
 *
 * Two sentences rather than one with a clause swapped, because the useful order
 * is different: a deployment that counts nobody should lead with the fixture,
 * and one that is counting should lead with the reader.
 */
const readingsLead = (counting: boolean): string =>
  counting
    ? `Counting is on here, so this page is counting what you do with it as you read: which of its bands you reach, how long you stay, what you press — and nothing whatever about you. The ${SCRIPTED_VISITS.length} visits in the bars below are still made up, and the arithmetic still is not: they go through the same working your own pages would use, while this page is being built.`
    : `The visits are made up and nobody reading this page has been counted: counting is off unless you turn it on, and on this deployment it is off. The arithmetic is not made up — ${SCRIPTED_VISITS.length} scripted visits go through the same working the rest of it would use, while this page is being built.`

/**
 * The band the page exists for: the front door, read by twelve people.
 *
 * It is about **this site's own front door** rather than an imagined page,
 * because every other band of every other page on this site is about something
 * the reader can go and look at, and a measurement band about a page nobody can
 * open would be the weakest thing here. The bars are in the front door's own
 * order, so a visitor can open it in another tab and count down.
 */
const theReadings = (ids: IdFactory, readings: FrontDoorReadings, context: PageContext): LoomNode =>
  section(
    ids,
    { tone: "surface", width: "wide", eyebrow: "Counted, not claimed" },
    "How far down this site's front page people got",
    [
      prose(ids, readingsLead(context.counting === true), { size: "lead", measured: true }),
      stack(ids, { direction: "column", gap: "normal" }, [
        ...readings.bands.map((reading) => bandBar(ids, reading)),
      ]),
      prose(
        ids,
        "Every bar is one band of the front page, in the order you meet them. Where a bar says somebody used something in a band, it does not say what: a reader presses a button, and the button is the only thing that knows which button it was. The band knows how many readers did something under it, and that is the number here.",
        { measured: true }
      ),
      prose(
        ids,
        "Nothing above says who any of the twelve were, which pages they had been on, or what they typed — none of that was collected, so none of it can be reported.",
        { measured: true, tone: "muted" }
      ),
      stack(ids, { direction: "row", gap: "snug", wrap: true, align: "center" }, [
        action(
          ids,
          "Open the page these numbers are about",
          internalHref(context.origin, HOME.path, context.theme),
          { variant: "secondary", scale: "medium" }
        ),
      ]),
    ]
  )

/**
 * A question's own heading, kept to the eighty characters `loom.stat` allows.
 *
 * It names the band a reader had to reach and what they then did, which is the
 * whole of what the question is — and never a rate, because the figure above it
 * is *five of ten* and a label reading *50%* beside it would be two numbers for
 * one fact with the flattering one in larger type.
 */
const labelFor = (question: FunnelQuestion): string =>
  `Got as far as “${question.from}”, then read on`

const bandLabelFor = (answer: BandAnswer): string => `Got as far as “${answer.band}”, then used it`

/**
 * The question totals cannot answer, and the reason it needs its own band.
 *
 * *Nine reached it and five pressed something* is not the same fact as *five of
 * the nine who reached it pressed something*, and only the second one tells you
 * whether the band works. That gap is the whole reason a page view carries a
 * key at all, and the key is the most privacy-sensitive thing in the design —
 * so the band that shows what it buys is also the band that says what it is.
 *
 * **The two figures are two different shapes and the band now says so.** The
 * first comes off one band's own row and could be asked of any band of any page,
 * about readers who came and went last month. The second joins two bands, and
 * joining two bands is something a deployment has to have said it wanted
 * *before* the readers arrived. That distinction was invisible while both were
 * drawn as funnels, and it is the one a reader deciding what to measure needs
 * most: one of these is free and retrospective, and the other is neither.
 */
const theFunnel = (ids: IdFactory, readings: FrontDoorReadings): LoomNode =>
  section(
    ids,
    { width: "wide", eyebrow: "The question totals cannot answer" },
    "Of the people who got there, how many did something?",
    [
      prose(
        ids,
        "A count of how many reached a band, beside a count of how many pressed something, does not tell you whether the ones who reached it are the ones who pressed. Only a question about both at once does, and it has to be asked about the page rather than about anybody.",
        { size: "lead", measured: true }
      ),
      buildElement(ids, {
        type: "loom.stat-grid",
        props: { columns: "two", align: "start" },
        children: [
          buildElement(ids, {
            type: "loom.stat",
            props: {
              value: `${readings.inOneBand.engaged} of ${readings.inOneBand.reached}`,
              label: bandLabelFor(readings.inOneBand),
              caption: bandSentence(readings.inOneBand),
            },
          }),
          ...readings.funnels.map((answer, index) => {
            const question = FUNNEL_QUESTIONS[index]

            if (question === undefined) {
              throw new Error("loom: the readings answered a question this page did not ask")
            }

            return buildElement(ids, {
              type: "loom.stat",
              props: {
                value: `${answer.converted} of ${answer.reached}`,
                label: labelFor(question),
                caption: funnelSentence(question, answer),
              },
            })
          }),
        ],
      }),
      buildElement(ids, {
        type: "loom.callout",
        props: { tone: "accent", title: "One of those two had to be asked for in advance" },
        children: [
          prose(
            ids,
            "The first figure is a column of that band's own line in the table above, so it can be asked of any part of any page, at any time, including about readers who came and went months ago. The second joins two different bands, and joining two bands is something your deployment has to have been told to watch for before anybody arrived. Nothing here can go back and join them afterwards, because what would have made that possible was thrown away.",
            { measured: true }
          ),
          prose(
            ids,
            "What gets thrown away is this: the batches of one visit are tagged with the same random number, so the parts of one reading can be added up. It is made up in the reader's browser, it is not a cookie, it is not stored there, it does not survive a reload, and it is discarded once the counts are worked out. It is never derived from anything about the reader or their device, so there is nothing in it to trace back.",
            { measured: true }
          ),
          prose(
            ids,
            "Both figures are counts rather than percentages, and that is a rule rather than a preference. Two of two and two hundred of two hundred are the same rate and different news, and a page arguing for honest measurement is the last place to print the flattering half of one.",
            { measured: true, tone: "muted" }
          ),
        ],
      }),
    ]
  )

/**
 * What it refuses to know, which is the band the audience this site is written
 * for reads first.
 *
 * Every line is a refusal recorded in a decision rather than a default that
 * could be turned off, and the difference is the claim: a setting is a promise
 * about how something is configured today, and a list of things the design has
 * no field for is a promise about what it can ever do.
 */
const neverKnows = (ids: IdFactory): LoomNode =>
  section(
    ids,
    { tone: "surface", width: "wide", eyebrow: "What it never knows" },
    "Nothing here is about a person",
    [
      prose(
        ids,
        "None of these is a setting you switch off. There is nowhere in what gets recorded to put any of them, which is a different and better promise.",
        { size: "lead", measured: true }
      ),
      buildElement(ids, {
        type: "loom.list",
        props: { marker: "bullet", density: "comfortable", measured: true },
        children: [
          "No name, no account and no visitor number of any kind.",
          "Nothing about the device, and nothing assembled from it that would come to stand for one.",
          "Nothing that joins what somebody did here to what they did on another page, or on another day.",
          "No recording of the visit — no replay, no scroll path, nowhere the mouse went.",
          "Nothing anybody typed, and no address they came from or went to.",
        ].map((text) =>
          buildElement(ids, {
            type: "loom.list-item",
            props: {},
            children: [prose(ids, text)],
          })
        ),
      }),
      prose(
        ids,
        "A page nobody has asked to count anything is unchanged by all of this: the same words, the same markup, nothing running in the reader's browser.",
        { measured: true, tone: "muted" }
      ),
    ]
  )

/**
 * The band that keeps the page honest, and it is the one a competitor would
 * leave out.
 *
 * Nothing in this system turns a number into a request. That is deliberate and
 * still open in the approved plan, and saying so plainly is worth more than the
 * claim it withholds: the interesting property of this product is that a change
 * is asked for, weighed and written down, and a page that quietly rearranged
 * itself because a bar was short would be the thing every one of the other eight
 * pages says cannot happen.
 */
const thenWhat = (ids: IdFactory, context: PageContext): LoomNode =>
  section(
    ids,
    { width: "wide", eyebrow: "And then what" },
    "The numbers do not change your page. You do.",
    [
      prose(
        ids,
        "Nothing here turns a low bar into a change. Somebody reads the numbers and asks for something — move that band up, shorten the one people skip — and that request is weighed by your rules and written into the record like every other request.",
        { size: "lead", measured: true }
      ),
      buildElement(ids, {
        type: "loom.feature-grid",
        props: { columns: "three", density: "loose" },
        children: [
          buildElement(ids, {
            type: "loom.feature",
            props: {
              title: "You see what readers did",
              body: "Band by band, with the number of readers it is out of, and with nothing in it about any of them.",
            },
          }),
          buildElement(ids, {
            type: "loom.feature",
            props: {
              title: "Somebody asks for a change",
              body: "In their own words, about one page. Your rules decide whether it happens on its own, waits for a person, or is refused.",
            },
          }),
          buildElement(ids, {
            type: "loom.feature",
            props: {
              title: "It is written down either way",
              body: "What was asked for, what was allowed, which rule said so, and the change that puts it back.",
            },
          }),
        ],
      }),
      stack(ids, { direction: "row", gap: "snug", wrap: true, align: "center" }, [
        action(ids, "The rules that decide", internalHref(context.origin, THE_RULES.path, context.theme), {
          variant: "secondary",
          scale: "medium",
        }),
        action(ids, "What gets written down", internalHref(context.origin, THE_RECORD.path, context.theme), {
          variant: "secondary",
          scale: "medium",
        }),
      ]),
    ]
  )

/**
 * *Do the bars come from real visitors?* — no on either deployment, and the
 * second sentence is the one that changes.
 *
 * A reader on a deployment that is counting them deserves the awkward half of
 * the answer in the same breath as the reassuring half: the bars are a fixture,
 * **and** you are being counted, and those two facts are not in tension because
 * what is kept about you is a band and a number of seconds. Leaving the second
 * out would be technically answering the question asked and dishonestly
 * answering the one meant.
 */
const barsAnswer = (counting: boolean): string =>
  counting
    ? "No. The twelve visits are written down in the code that builds this page, and the working that turns them into those bars is the same working your deployment would run. Your own visit is being counted — counting is on here — but it goes into this deployment's own figures rather than into those bars, and what it adds up to is bands and seconds rather than anything about you."
    : "No, and they say so where they are. This deployment counts nobody: counting is off unless you turn it on. Twelve visits are written down in the code that builds this page, and the working that turns them into those bars is the same working your deployment would run."

const asked = (ids: IdFactory, counting: boolean): LoomNode =>
  section(ids, { width: "wide", eyebrow: "Questions" }, "The ones people ask about this", [
    buildElement(ids, {
      type: "loom.faq-list",
      props: { columns: "one", width: "readable" },
      children: [
        buildElement(ids, {
          type: "loom.faq",
          props: {
            question: "Is any of this on by default?",
            answer:
              "No. A page counts nothing unless the application it is part of asks it to, and asking is a line of your own code rather than a setting a request could reach. Nothing a page asks for can switch counting on.",
            open: true,
          },
        }),
        buildElement(ids, {
          type: "loom.faq",
          props: {
            question: "What does it cost the reader's browser?",
            answer:
              "The part that does the counting reaches no other code at all — not one library — and a test here fails the day it reaches any. That is the whole of the promise, and it is a better one than a size, because a size is true of a version and this is true of every version.",
          },
        }),
        buildElement(ids, {
          type: "loom.faq",
          props: {
            question: "Where do the numbers end up?",
            answer:
              "In your own application, in the store you point it at. They leave the reader's browser for your deployment and nowhere else — there is no service of ours in the middle, because there is no service of ours at all.",
          },
        }),
        buildElement(ids, {
          type: "loom.faq",
          props: {
            question: "Can I see what a change did to the numbers?",
            answer:
              "That is what the counts are kept by version for. Readings from before a change and readings from after it are never added together, because a band that has moved is not the band it was — so a comparison across a change is the one measurement this can honestly make and most things cannot.",
          },
        }),
        buildElement(ids, {
          type: "loom.faq",
          props: {
            question: "Do the bars on this page come from real visitors?",
            answer: barsAnswer(counting),
          },
        }),
      ],
    }),
  ])

const closing = (ids: IdFactory, context: PageContext): LoomNode =>
  section(
    ids,
    { tone: "accent", width: "full" },
    "A page that can tell you what it is doing for the people reading it",
    [
      prose(
        ids,
        "Which parts they reach, how long they stay, what they use — and not one thing about who they are. The documentation has the few lines that turn it on.",
        { size: "lead", align: "center", measured: true }
      ),
      stack(ids, { direction: "row", gap: "snug", wrap: true, align: "center", justify: "center" }, [
        action(ids, "Read the docs", surfaceHref(context.origin, DOCS), {
          variant: "primary",
          scale: "large",
        }),
        action(ids, "See a change get weighed", internalHref(context.origin, THE_RULES.path, context.theme), {
          variant: "secondary",
          scale: "large",
        }),
      ]),
    ],
    { align: "center" }
  )

export const whatReadersDoPageTree = (context: PageContext): LoomTree => {
  const ids = sequentialIdFactory("readers")
  const chrome: ChromeContext = {
    origin: context.origin,
    theme: context.theme,
    current: WHAT_READERS_DO,
    counting: context.counting === true,
  }

  /**
   * The front door as it is written, which is what the scripted visits are
   * about. Built at the default palette rather than the visitor's, because the
   * bands a reader met are a fact about the page and not about what it was
   * wearing — and a reading that changed when somebody switched palette would
   * be saying the palette moved the bands.
   */
  const readings = frontDoorReadings(homePageTree({ origin: context.origin, theme: context.theme }))

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
        whatIsCounted(ids),
        theReadings(ids, readings, context),
        theFunnel(ids, readings),
        neverKnows(ids),
        thenWhat(ids, context),
        asked(ids, context.counting === true),
        closing(ids, context),
        siteFooter(ids, chrome),
      ],
    }),
    ids
  )
}
