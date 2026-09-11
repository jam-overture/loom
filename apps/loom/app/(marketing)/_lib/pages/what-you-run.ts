import {
  buildElement,
  buildSlot,
  buildText,
  createTree,
  measurePrompt,
  sequentialIdFactory,
  systemClock,
  type EditIntent,
  type IdFactory,
  type LoomNode,
  type LoomTree,
  type PromptMeasurement,
} from "@loom/runtime"
import { THEME_PROP_KEY } from "@loom/runtime/react"
import { catalogueOf } from "@loom/runtime/sdk"

import { askById } from "../adapt/asks"
import { siteFooter, siteHeader, type ChromeContext } from "../chrome"
import { FACTS } from "../copy"
import { action, cell, columns, heading, prose, row, section, stack } from "../nodes"
import { siteRegistry, siteThemes } from "../registry"
import {
  DEFAULT_THEME,
  DEMO,
  DOCS,
  internalHref,
  SITE_THEMES,
  surfaceHref,
  THE_RECORD,
  THE_RULES,
  WHAT_YOU_RUN,
  YOUR_COMPONENTS,
} from "../site"

import { homePageTree, type PageContext } from "./home"

/**
 * The page for the question every other page hands the reader and none of them
 * takes back.
 *
 * `/how-it-works` is the journey one change takes. `/the-rules` is what you
 * decide in advance. `/your-components` is what you hand over. `/the-record` is
 * what you are left holding. Each is about a *part* of this, and a reader who
 * has understood all four still cannot say what the thing on their machine
 * would be — a library they add to something, a service they point something
 * at, or a site somebody else hosts for them.
 *
 * The question arrived in as many words on 10 September. That run put *"whoever
 * runs the site writes the list of who may sign in"* on the front door, which is
 * true and is the answer to what a stranger asks about the portal. It also hands
 * them the next question in the same breath: **so what do I run?**
 *
 * Every claim on this page is a description of code in this repository rather
 * than a position, which is why it did not wait on the licence line. Nothing on
 * it says what Loom costs, who it is for, or what may be built on it — the three
 * things that are the maintainer's.
 *
 * **Two bands carry it and they are a pair.** The comparison says where each
 * thing a reader owns ends up; the band below it measures what actually leaves,
 * on this site's own front door, as the page is built. A page claiming *your
 * code never goes anywhere* and then typing out an example of what does go
 * would be making its case in the form it is asking nobody to trust — the same
 * argument the specimen band on `/your-components` is built on, applied to the
 * one question a reader is entitled to be suspicious about.
 */

/**
 * The request the measurement is taken on.
 *
 * Named rather than picked, for the reason the components page names its
 * specimen: "the first ask in the list" is a subject that moves whenever the
 * list is reordered, and a band whose subject moves is a band nobody can write
 * copy for. This one is the request the front door leads with, so the numbers
 * below are the numbers for the change a visitor is most likely to have just
 * watched happen.
 */
const MEASURED_ASK = "problem"

/**
 * What the model is sent, in the order it is sent, said in words a visitor has.
 *
 * The keys are `PromptMeasurement`'s and the sentences are this page's. The
 * pairing is checked rather than assumed: `partsOf` refuses to build the band if
 * the measurement grows a part nobody has written a sentence for, so a sixth
 * thing arriving in the request is a page that does not build rather than a page
 * that quietly goes on naming five.
 *
 * That is the lesson of 9 September in a second place. A fact the test suite
 * held and the page could not reach was a fact the page eventually contradicted;
 * this is the same fact — *what leaves* — held by the one function that knows,
 * with the page reading it rather than restating it.
 */
type LeavingPart = {
  readonly key: Exclude<keyof PromptMeasurement, "total">
  readonly what: string
  readonly detail: string
}

const LEAVING: readonly LeavingPart[] = [
  {
    key: "system",
    what: "The standing instructions",
    detail:
      "The same words on every request, on every site. They say what an edit is allowed to be. Nothing in them is about you.",
  },
  {
    key: "primitives",
    what: "What you said about your pieces",
    detail:
      "The name of each one, the line you wrote about what it is for, and which of its settings may be changed. Not one line of what any of them is made of.",
  },
  {
    key: "themes",
    what: "The palettes your site offers",
    detail:
      "The names of the looks a page may be asked to wear, so that asking for the quieter one reaches something that exists.",
  },
  {
    key: "tree",
    what: "The page as it currently stands",
    detail:
      "How the page is put together right now — and this is the honest part: the words a visitor can already read on it go too, because a request about the third paragraph cannot be answered by something that cannot see it.",
  },
  {
    key: "request",
    what: "What was asked for",
    detail: "The sentence somebody typed, exactly as they typed it.",
  },
]

const NUMBER = new Intl.NumberFormat("en-US")

/**
 * The measurement, taken against this site's own front door.
 *
 * `measurePrompt` is the function a host calls to find out what registering more
 * of something costs, and it builds the request without sending it — so this is
 * not an estimate of what would be sent, it is the thing that would be sent,
 * counted. It runs at build time against the page published at `/`, with the
 * same library and the same palettes this site renders with.
 *
 * It throws rather than falling back, on the same terms as the specimen band: a
 * band whose entire claim is *these are the real numbers* has nothing to say if
 * it cannot take the measurement, and printing it half-filled would be worse
 * than not building.
 *
 * **It measures the front door in the palette it is published in, not the one
 * the reader is wearing**, and that is a correction rather than a convenience.
 * The first version passed `context.theme` through, which is the obvious thing
 * to write and is wrong twice over. The root of a page carries what it is
 * wearing, so the request describing that page is a few characters longer in one
 * palette than another — and a number below the root that changes when the
 * palette changes is precisely what 0049 says cannot happen. `pages.test.ts`
 * caught it on all three pairs before this page had ever been looked at, which
 * is the existing suite doing the job this lane keeps having to do by reading.
 *
 * The honest reading is the better one anyway: `/` is published in the house
 * palette and that is the page a visitor arrives on, so the measurement is of
 * the site as it is served rather than of a private re-theme of it.
 */
const measured = (context: PageContext): PromptMeasurement => {
  const ask = askById(MEASURED_ASK)

  if (ask === undefined) {
    throw new Error(`loom: ${MEASURED_ASK} is not an ask ${WHAT_YOU_RUN.path} can measure`)
  }

  const page = homePageTree({ origin: context.origin, theme: DEFAULT_THEME })

  const intent: EditIntent = {
    /**
     * A real id from a real factory, because `IntentId` is branded and a string
     * literal is not one. Sequential rather than random so that two builds of
     * this page measure the same request — the id is in the part of the message
     * that carries the request, so a random one would make the last number in
     * the table wobble by a character or two between deployments for no reason a
     * reader could act on.
     */
    intentId: sequentialIdFactory("measured").intentId(),
    treeId: page.treeId,
    baseRevision: page.revision,
    origin: "user-instruction",
    actor: "a visitor",
    utterance: ask.utterance,
    observedAt: systemClock.now(),
  }

  return measurePrompt(intent, page, catalogueOf(siteRegistry), siteThemes.catalogue())
}

/**
 * The five parts, each with its number, and a refusal if the two lists differ.
 *
 * The check is in both directions on purpose. A part the measurement reports and
 * this page has no sentence for is something leaving a reader's server that the
 * page does not mention; a sentence for a part the measurement no longer reports
 * is the page describing something that has stopped happening. Both are the same
 * failure this lane has now found seven runs running, and this is the first time
 * it can be a compile-time-shaped error rather than a sentence somebody has to
 * notice.
 */
export const partsOf = (
  measurement: PromptMeasurement
): readonly (LeavingPart & { readonly characters: number })[] => {
  const reported = Object.keys(measurement).filter((key) => key !== "total")
  const described = LEAVING.map((part) => String(part.key))

  const missing = reported.filter((key) => !described.includes(key))
  const stale = described.filter((key) => !reported.includes(key))

  if (missing.length > 0 || stale.length > 0) {
    throw new Error(
      `loom: ${WHAT_YOU_RUN.path} says what leaves and the measurement disagrees — unnamed: ${missing.join(", ") || "none"}; named but not sent: ${stale.join(", ") || "none"}`
    )
  }

  return LEAVING.map((part) => ({ ...part, characters: measurement[part.key] }))
}

const hero = (ids: IdFactory, context: PageContext): LoomNode =>
  buildElement(ids, {
    type: "loom.hero",
    props: {
      backdrop: "grid",
      align: "start",
      stature: "standard",
      eyebrow: "What you would actually be running",
    },
    children: [
      buildSlot(ids, "heading", [
        heading(ids, 1, "It is your own site, with this added to it", { balance: true }),
      ]),
      prose(
        ids,
        "You install it into an application you already have and already host. Your addresses, your sign-in, your data and your deploy stay exactly as they are. There is no site of ours in front of yours.",
        { size: "lead", measured: true }
      ),
      buildSlot(ids, "actions", [
        action(ids, "How to install it", surfaceHref(context.origin, DOCS), {
          variant: "primary",
          scale: "large",
        }),
        action(ids, "Try one that is already running", surfaceHref(context.origin, DEMO), {
          variant: "secondary",
          scale: "large",
        }),
      ]),
    ],
  })

/**
 * The four things, and the fourth one is the one people expect to be compulsory.
 *
 * A reader who has been told their interface will rearrange itself assumes there
 * is a service behind it that they are about to depend on. There is not. The
 * only outside thing in the list is a model, it is one they choose and already
 * pay for, and the page works with nothing in that slot at all — which is the
 * fact worth putting on a marketing page, because it is the one nobody expects.
 */
const whatYouBring = (ids: IdFactory, context: PageContext): LoomNode =>
  section(
    ids,
    { width: "wide", eyebrow: "What you bring" },
    "Four things, and you already have three of them",
    [
      prose(
        ids,
        "Nothing here replaces the application you have. It is a package you add to it, the way you would add anything else.",
        { size: "lead", measured: true }
      ),
      buildElement(ids, {
        type: "loom.feature-grid",
        props: { columns: "four", density: "tight" },
        children: [
          buildElement(ids, {
            type: "loom.feature",
            props: {
              title: "The application itself",
              body: "Your addresses, your sign-in, your data, your hosting. None of it is asked about, and none of it is taken over.",
            },
          }),
          buildElement(ids, {
            type: "loom.feature",
            props: {
              title: "The pieces you already built",
              body: "Described rather than rewritten — a few lines beside each one, saying what it is for and what may be changed about it.",
            },
          }),
          buildElement(ids, {
            type: "loom.feature",
            props: {
              title: "What you will allow",
              body: "Written once, in your own code, and read every single time somebody asks for something. You review a change to it the way you review anything else.",
            },
          }),
          buildElement(ids, {
            type: "loom.feature",
            props: {
              title: "A model, when you want one",
              body: "You point it at one you already pay for, and it is the only outside thing in this list. Leave the slot empty and everything else still works — there is simply nothing to turn a sentence into a change.",
            },
          }),
        ],
      }),
      stack(ids, { direction: "row", gap: "snug", wrap: true }, [
        action(
          ids,
          "What describing a piece looks like",
          internalHref(context.origin, YOUR_COMPONENTS.path, context.theme),
          { variant: "secondary", scale: "medium" }
        ),
        action(
          ids,
          "What you are allowed to say",
          internalHref(context.origin, THE_RULES.path, context.theme),
          { variant: "quiet", scale: "medium" }
        ),
      ]),
    ]
  )

/**
 * The three places a thing can be, which are the comparison's columns.
 *
 * Said as the reader owns them — *your* code, *your* application — because the
 * whole answer of the band is whose each column is, and a column headed
 * "Storage" would be answering a different question from the one being asked.
 */
export const PLACES: readonly string[] = [
  "Stays in your code",
  "Kept by your application",
  "Sent to the model",
]

const subject = (ids: IdFactory, name: string): LoomNode =>
  buildElement(ids, {
    type: "loom.comparison",
    props: { role: "subject" },
    children: [buildText(ids, name)],
  })

/** One cell of the comparison, which is a mark and nothing else. */
const mark = (ids: IdFactory, verdict: "yes" | "no"): LoomNode =>
  buildElement(ids, { type: "loom.comparison", props: { mark: verdict } })

const criterion = (
  ids: IdFactory,
  label: string,
  marks: readonly ("yes" | "no")[],
  note?: string
): LoomNode =>
  buildElement(ids, {
    type: "loom.comparison-row",
    props: { heading: label, ...(note === undefined ? {} : { note }) },
    children: marks.map((verdict) => mark(ids, verdict)),
  })

/**
 * Where each thing a reader owns ends up, in one glance.
 *
 * A matrix rather than three lists, because the question is not *what is in my
 * code* — it is *and is that the same thing that goes to the model*, which is a
 * question about two columns at once. `loom.comparison-table` is a real table
 * with real row and column headers, so the answer in the third column of the
 * fourth row can be found by somebody arriving from either edge, including
 * somebody using a screen reader.
 *
 * **The fourth row is why the band is worth the space.** Every other row is
 * reassuring and this one is not entirely: the page itself goes, and the words
 * on the page are part of the page. Leaving that out would make the other five
 * rows worth nothing, since a reader who discovered it later would be right to
 * assume the rest was shaded too.
 */
const whereItLives = (ids: IdFactory): LoomNode =>
  section(
    ids,
    { tone: "surface", width: "wide", eyebrow: "Where everything ends up" },
    "What stays with you, and the one thing that goes out",
    [
      prose(
        ids,
        "Three places a thing can be. Read along a row to find out where yours is, and down the last column to see the whole of what ever leaves.",
        { size: "lead", measured: true }
      ),
      buildElement(ids, {
        type: "loom.comparison-table",
        props: {
          density: "tight",
          caption:
            "Where each part of a site ends up, and which of them are ever sent out of it.",
        },
        children: [
          buildSlot(ids, "columns", [
            buildElement(ids, {
              type: "loom.comparison-row",
              props: {},
              children: PLACES.map((place) => subject(ids, place)),
            }),
          ]),
          criterion(ids, "The code your pieces are made of", ["yes", "no", "no"]),
          criterion(ids, "What you said each piece is for", ["yes", "no", "yes"]),
          criterion(ids, "What you will and will not allow", ["yes", "no", "no"], "Weighed after the answer comes back, never sent with the question."),
          criterion(ids, "The pages themselves, and the words on them", ["no", "yes", "yes"]),
          criterion(ids, "What changed, who asked, and which rule allowed it", ["no", "yes", "no"]),
          criterion(ids, "What a visitor typed into the box", ["no", "yes", "yes"]),
        ],
      }),
    ]
  )

/**
 * The last column of the band above, measured rather than asserted.
 *
 * This is the proof the page is built on. The numbers are taken by the function
 * a host calls to price a request — on the page this site publishes at `/`, with
 * the library and the palettes it really renders with, for the request the front
 * door leads with. So a reader who does not believe the column can read the size
 * of every part of it, and see for themselves that there is no part called
 * *your code*.
 */
const whatLeaves = (ids: IdFactory, context: PageContext): LoomNode => {
  const measurement = measured(context)
  const parts = partsOf(measurement)

  return section(
    ids,
    { width: "wide", eyebrow: "The last column, in full" },
    "Everything that leaves, measured on this page",
    [
      prose(
        ids,
        "When somebody asks this site's own front door for a change, this is the whole of what is sent and how big each part of it is. It was measured as this page was built, not written down beside it.",
        { size: "lead", measured: true }
      ),
      buildElement(ids, {
        type: "loom.table",
        props: {
          tone: "panel",
          rules: "rows",
          density: "comfortable",
          caption:
            "One request about this site's front door, part by part, counted in characters.",
        },
        children: [
          columns(ids, ["What goes", "What it is", "Characters"]),
          ...parts.map((part) =>
            row(ids, [
              cell(ids, part.what),
              cell(ids, part.detail),
              cell(ids, NUMBER.format(part.characters)),
            ])
          ),
          row(ids, [
            cell(ids, "All of it"),
            cell(ids, "The whole request, which is the whole of what ever goes out."),
            cell(ids, NUMBER.format(measurement.total)),
          ]),
        ],
      }),
      prose(
        ids,
        "There is no row for the code your pieces are made of, no row for your database, and no row for anybody who uses your site. Not because they are left out of this table — because they are never in the request.",
        { measured: true, tone: "muted" }
      ),
    ]
  )
}

/**
 * The sentence the page exists to let a reader believe, said once, plainly.
 *
 * Deliberately about **what the software is** and not about what this project
 * may or may not sell one day. That second question was raised for the
 * maintainer on 10 September and is still open, so this band says only the thing
 * that is true of the code in the repository and would stay true whatever the
 * answer turns out to be.
 */
const noMiddle = (ids: IdFactory): LoomNode =>
  section(ids, { width: "wide", eyebrow: "What is in the middle" }, "Nothing is in the middle", [
    buildElement(ids, {
      type: "loom.callout",
      props: { tone: "accent", title: "There is no machine of ours between you and your visitor" },
      children: [
        prose(
          ids,
          "What you install is code that runs inside your own application, on your own hardware, at your own address. A visitor asking your page for a change is talking to your server and nothing else, and the one thing that goes anywhere is the request above — to the model you chose, from your server, only when somebody asks for something. There is nothing here that has to be reachable for your site to stay up.",
        ),
      ],
    }),
    prose(
      ids,
      "The site you are reading is one of them. It is an ordinary application with this installed, built out of the same ready-made pieces anybody gets, and everything you have watched it do on these pages it did on the machine it is served from.",
      { measured: true, tone: "muted" }
    ),
  ])

const asked = (ids: IdFactory, context: PageContext): LoomNode =>
  section(ids, { tone: "surface", width: "wide", eyebrow: "Questions" }, "The ones people ask before they install anything", [
    buildElement(ids, {
      type: "loom.faq-list",
      props: { columns: "one", width: "readable" },
      children: [
        buildElement(ids, {
          type: "loom.faq",
          props: {
            question: "Is this something I point my site at?",
            answer:
              "No. It is a package you install into an application you already run, the way you would install anything else. There is nothing to point at and nothing in front of your site.",
            open: true,
          },
        }),
        buildElement(ids, {
          type: "loom.faq",
          props: {
            question: "Do my pages have to move somewhere?",
            answer:
              "The pages that are allowed to rearrange themselves are kept as data rather than as files, and they are kept by your application, in your own storage, beside everything else it keeps. Every other page of your site carries on being whatever it already is.",
          },
        }),
        buildElement(ids, {
          type: "loom.faq",
          props: {
            question: "What happens if I unplug the model?",
            answer:
              "Your pages carry on being served exactly as they are. The only thing that stops is turning a sentence into a change, because that is the one step with a guess in it — everything after it is your rules and your record, and neither of those needs anything outside your application.",
          },
        }),
        buildElement(ids, {
          type: "loom.faq",
          props: {
            question: "How much of my application does this touch?",
            answer:
              "Only the pages you decide to make adaptable. There is no step where anything is scanned, imported or converted, and a page nobody has asked to be adaptable is a page none of this reaches.",
          },
        }),
        buildElement(ids, {
          type: "loom.faq",
          props: {
            question: "Who can see what changed?",
            answer:
              "Whoever you let in. The record is kept by your application, and the place it is reviewed comes with the package and runs at your address — so the list of who may open it is a list you write.",
          },
        }),
      ],
    }),
    stack(ids, { direction: "row", gap: "snug", wrap: true }, [
      action(
        ids,
        "What the record holds",
        internalHref(context.origin, THE_RECORD.path, context.theme),
        { variant: "secondary", scale: "medium" }
      ),
    ]),
  ])

const closing = (ids: IdFactory, context: PageContext): LoomNode =>
  section(
    ids,
    { tone: "accent", width: "full" },
    "It is a package, and the next step is installing it",
    [
      prose(
        ids,
        `Everything on this site is built out of the ${FACTS.primitives} pieces that come with it, on an application no different from the one you already have. The documentation starts where this page stops.`,
        { size: "lead", align: "center", measured: true }
      ),
      stack(ids, { direction: "row", gap: "snug", wrap: true, align: "center", justify: "center" }, [
        action(ids, "How to install it", surfaceHref(context.origin, DOCS), {
          variant: "primary",
          scale: "large",
        }),
        action(ids, "Watch one that is running", surfaceHref(context.origin, DEMO), {
          variant: "secondary",
          scale: "large",
        }),
      ]),
    ],
    { align: "center" }
  )

export const whatYouRunPageTree = (context: PageContext): LoomTree => {
  const ids = sequentialIdFactory("run")
  const chrome: ChromeContext = {
    origin: context.origin,
    theme: context.theme,
    current: WHAT_YOU_RUN,
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
        whatYouBring(ids, context),
        whereItLives(ids),
        whatLeaves(ids, context),
        noMiddle(ids),
        asked(ids, context),
        closing(ids, context),
        siteFooter(ids, chrome),
      ],
    }),
    ids
  )
}

/** The measurement the band prints, for the tests that hold it to the runtime. */
export const WHAT_LEAVES = {
  ask: MEASURED_ASK,
  measure: (context: PageContext): PromptMeasurement => measured(context),
  parts: (context: PageContext) => partsOf(measured(context)),
} as const
