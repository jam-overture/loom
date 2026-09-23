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

import { askedAgain, weighedDifferently, type RoundTrip } from "../adapt/round-trip"
import { siteFooter, siteHeader, siteReadingBand, type ChromeContext } from "../chrome"
import { spell, spellCapitalised } from "../journey"
import { action, cell, columns, heading, prose, row, section, stack } from "../nodes"
import {
  askHref,
  internalHref,
  PUTTING_IT_BACK,
  SITE_THEMES,
  THE_RECORD,
  THE_RULES,
  WHEN_IT_GOES_WRONG,
} from "../site"

import type { PageContext } from "./home"

/**
 * The page for the fourth quarter of the difference.
 *
 * *What changed, who asked, which rule allowed it, and how to put it back.*
 * Three of those four have had a page since August. The fourth had a sentence
 * inside a panel and an assertion inside a test file, which is the one audience
 * a claim does nothing for.
 *
 * So this page runs it. Every request the front door offers that changes
 * anything is applied and then put back while the page is being built, against
 * the page this site publishes at `/`, and what is printed is what came back.
 *
 * **Nothing on it is arranged.** The two bands a reader does not expect are the
 * two the sequence produced on its own: putting back a change the rules had
 * already stopped and asked about is stopped and asked about again, and putting
 * something back is weighed on what it does rather than handed the verdict of
 * the change it reverses. Both are read off the runs, and the second one exists
 * only because the front door happens to offer both an addition and a removal.
 */

/**
 * `PageContext` and the trips, as of 17 September — it spelled out its own
 * `origin` and `theme` until then, which is how it came to be the one page
 * context that could not be told whether the deployment counts its readers. The
 * two contexts beside it (`MechanismContext`, `RecordContext`) were already
 * written this way; this is them, not a new idea.
 */
export type BackContext = PageContext & {
  /**
   * The round trips, made where a page builder cannot: a builder is synchronous
   * and a request through the whole sequence is not. The same seam, and the same
   * reason, as the sixteen runs `/who-can-ask` prints and the refusal
   * `/when-it-goes-wrong` does.
   */
  readonly trips?: readonly RoundTrip[]
}

/**
 * Where the hero's first action lands.
 *
 * A slug rather than the band's own eyebrow, because the eyebrow counts the
 * round trips and an address that moved when a count moved would be a link
 * somebody had already sent to somebody else.
 */
export const ROUND_TRIP_ANCHOR = "the-round-trip"

/**
 * The opening band, and the one place on this page with no count in it.
 *
 * Every other band here is built from the round trips, and the round trips are
 * made after the builder has run. A headline that said *all four* would say
 * *all zero* in the one call that has none — which is the call every structural
 * test on this site makes — so the hero says the thing and the band below it
 * says the number.
 */
const hero = (ids: IdFactory, context: BackContext): LoomNode =>
  buildElement(ids, {
    type: "loom.hero",
    props: {
      backdrop: "grid",
      align: "start",
      stature: "standard",
      eyebrow: "Putting it back",
    },
    children: [
      buildSlot(ids, "heading", [
        heading(ids, 1, "The way back is written before you ask for it", { balance: true }),
      ]),
      prose(
        ids,
        "Every change that lands here comes with the change that reverses it. Press the button and the same pieces go back — not a fresh page that reads the same.",
        { size: "lead", measured: true }
      ),
      stack(ids, { direction: "row", gap: "snug", wrap: true }, [
        action(
          ids,
          "Watch them come back",
          internalHref(
            context.origin,
            `${PUTTING_IT_BACK.path}#${ROUND_TRIP_ANCHOR}`,
            context.theme
          ),
          { variant: "primary", scale: "large" }
        ),
        action(
          ids,
          "What gets written down",
          internalHref(context.origin, THE_RECORD.path, context.theme),
          { variant: "secondary", scale: "large" }
        ),
      ]),
    ],
  })

/**
 * The three facts the rest of the page then demonstrates.
 *
 * Each is a description of code, and each is the answer to a question a reader
 * asks in this order: *when is the undo written*, *is it checked like anything
 * else*, and *is it really the same page afterwards*.
 */
const whatItIs = (ids: IdFactory): LoomNode =>
  section(
    ids,
    { tone: "surface", width: "wide", eyebrow: "Before you ask for it" },
    "The way back is written at the moment the change lands",
    [
      prose(
        ids,
        "Nothing is reconstructed later and nothing is guessed. The moment a change goes through, the change that reverses it is worked out and kept beside it, carrying whatever was taken off the page.",
        { size: "lead", measured: true }
      ),
      buildElement(ids, {
        type: "loom.feature-grid",
        props: { columns: "three", density: "loose" },
        children: [
          buildElement(ids, {
            type: "loom.feature",
            props: {
              title: "It is written first",
              body: "The way back is worked out when the change applies, not when you press the button. By the time anybody wants it, it already exists.",
            },
          }),
          buildElement(ids, {
            type: "loom.feature",
            props: {
              title: "It is checked like anything else",
              body: "Putting something back is a change of its own, so it goes to your rules like any other change — measured, weighed, allowed or stopped, and written down.",
            },
          }),
          buildElement(ids, {
            type: "loom.feature",
            props: {
              title: "It carries what it took",
              body: "Putting a removed band back does not write the words again. It puts the words back, which is why the page afterwards is the page you arrived on.",
            },
          }),
        ],
      }),
    ]
  )

/**
 * The band, and the whole argument of the page.
 *
 * One row per request the front door offers that changes anything. Every cell
 * is what the sequence returned while this page was being built: the change, the
 * change that reverses it, and the page that came back.
 */
const roundTrip = (ids: IdFactory, trips: readonly RoundTrip[]): LoomNode =>
  section(
    ids,
    {
      width: "wide",
      eyebrow: `${spellCapitalised(trips.length)} round trips`,
      anchor: ROUND_TRIP_ANCHOR,
    },
    "Every one of them went out and came back",
    [
      prose(
        ids,
        `Each of these is a button on the front page of this site. Each was pressed while this page was being built, and then put back. Not one figure below was typed out by hand.`,
        { size: "lead", measured: true }
      ),
      buildElement(ids, {
        type: "loom.table",
        props: {
          caption: "What each change did, and what putting it back did",
          tone: "panel",
          rules: "rows",
          density: "comfortable",
        },
        children: [
          columns(ids, ["The request", "The change", "Putting it back", "The page afterwards"]),
          ...trips.map((trip) =>
            row(ids, [
              cell(ids, trip.label, { role: "row" }),
              cell(ids, trip.change.measured),
              cell(ids, trip.back.measured),
              cell(ids, afterwards(trip)),
            ])
          ),
        ],
      }),
      prose(ids, readingOf(trips), { measured: true }),
    ]
  )

/**
 * What the page came back to, as the one cell a reader scans down.
 *
 * The count and the claim in one phrase, because the count alone would be the
 * weaker half: ten pieces coming back in the wrong order, under a different
 * heading, or with a setting changed on the way is still ten pieces, and *the
 * same ones* is the half that says it is the page rather than a page.
 *
 * Not marked as a numeric cell, though it opens with a figure. That sets the
 * column against the trailing edge, which is right for a column of numbers and
 * wrong for a sentence that wraps — the second line ends up ragged on the left,
 * where a reader's eye is not.
 */
export const afterwards = (trip: RoundTrip): string =>
  trip.identical
    ? `${trip.restored} pieces again — the same ones`
    : `${trip.restored} pieces, and not the same ones`

/**
 * The reading under the table, composed from the runs rather than written under
 * them.
 *
 * A table is only as good as the sentence telling a reader what they are looking
 * at, and that sentence is exactly the thing that goes stale — it survived eight
 * runs on the refusal band of `/when-it-goes-wrong` by being true about a run the
 * page was no longer printing. So it is built here out of what came back.
 */
export const readingOf = (trips: readonly RoundTrip[]): string => {
  const arrived = trips[0]?.arrived ?? 0
  const stopped = askedAgain(trips)

  const first = `All ${spell(trips.length)} came back to the same ${arrived} pieces the front page is built from, carrying the same names.`
  const second =
    stopped.length === 0
      ? "Your rules let every one of them back on its own."
      : `${spellCapitalised(stopped.length)} of them your rules stopped on the way back, and asked before putting anything anywhere.`

  return `${first} ${second}`
}

/**
 * The band a reader arrives at the page not expecting, and the one that makes
 * the rest of it worth reading.
 *
 * Everything above could be true of a product that simply keeps a copy of the
 * old page. What is different here is that the way back is a change, and a
 * change is judged — so the rules can stop it, and on this site's own front door
 * one of them does.
 *
 * The sentence is composed from the run rather than written about it, and the
 * band is left out entirely when no run produced one. A page that kept a
 * paragraph about a thing that had stopped happening is the failure this site
 * has recorded more than any other.
 */
const stoppedOnTheWayBack = (
  ids: IdFactory,
  context: BackContext,
  trips: readonly RoundTrip[]
): readonly LoomNode[] => {
  const stopped = askedAgain(trips)
  const first = stopped[0]

  if (first === undefined) return []

  return [
    section(
      ids,
      { tone: "accent", width: "wide", eyebrow: "Asked twice" },
      "Saying yes once does not buy you saying yes again",
      [
        prose(
          ids,
          `“${first.asked}” is the one request on the front page that your rules stop and ask about. You say yes and it goes through. Then putting it back stops and asks you as well.`,
          { size: "lead", measured: true }
        ),
        prose(
          ids,
          `That is not a second opinion about the first decision. It is a first decision about a different change: the way back moves the same protected band the other way, and moving something you protected is what your rules said to ask about. ${first.back.verdictLine}`,
          { measured: true }
        ),
        prose(
          ids,
          "Which is the property worth having and the one that is easy to lose. A product that waved undo through would be a product where the way to get past your rules is to do the thing, say yes, and then undo something else.",
          { measured: true }
        ),
        stack(ids, { direction: "row", gap: "snug", wrap: true }, [
          action(
            ids,
            "The rules that decide",
            internalHref(context.origin, THE_RULES.path, context.theme),
            { variant: "secondary", scale: "medium" }
          ),
          action(
            ids,
            "What happens when one stops you",
            internalHref(context.origin, WHEN_IT_GOES_WRONG.path, context.theme),
            { variant: "secondary", scale: "medium" }
          ),
        ]),
      ]
    ),
  ]
}

/**
 * The second thing the runs produced that nobody would have thought to claim.
 *
 * Putting something back is not handed the verdict of the change it reverses. It
 * is weighed on what it does — so undoing an addition is a removal and carries a
 * removal's weight, and undoing a removal is an addition and stops carrying one.
 * A reader who assumed *undo is always the safe direction* is reading the
 * counter-case off this site's own front door.
 *
 * Left out when nothing on the front door produces the case, for the same reason
 * as the band above.
 */
const weighedOnItsOwn = (
  ids: IdFactory,
  trips: readonly RoundTrip[]
): readonly LoomNode[] => {
  const differing = weighedDifferently(trips)
  const first = differing[0]

  if (first === undefined) return []

  return [
    section(
      ids,
      { tone: "surface", width: "wide", eyebrow: "Weighed on its own" },
      "The way back is not given the verdict of the change it reverses",
      [
        prose(
          ids,
          `In ${spell(differing.length)} of the ${spell(
            trips.length
          )} above, putting it back was weighed differently from the change itself. Your rules weigh what is about to happen, and what is about to happen is not what happened.`,
          { size: "lead", measured: true }
        ),
        buildElement(ids, {
          type: "loom.table",
          props: {
            caption: "The same round trip, weighed twice",
            tone: "panel",
            rules: "rows",
            density: "comfortable",
          },
          children: [
            columns(ids, ["The request", "The change was weighed", "Putting it back was weighed"]),
            ...differing.map((trip) =>
              row(ids, [
                cell(ids, trip.label, { role: "row" }),
                cell(ids, trip.change.weighed),
                cell(ids, trip.back.weighed),
              ])
            ),
          ],
        }),
        prose(
          ids,
          "Undoing an addition takes something off the page, and taking a lot off a page at once is one of the things your rules are told to notice. So it is noticed — on the way back as readily as on the way out.",
          { measured: true }
        ),
      ]
    ),
  ]
}

const closing = (ids: IdFactory, context: BackContext): LoomNode =>
  section(
    ids,
    { tone: "accent", width: "full" },
    "Do it to this site and watch it come back",
    [
      prose(
        ids,
        "The front page will take the questions off itself if you ask, and put them back if you ask for that. Both are written down, and you can read what it wrote.",
        { size: "lead", align: "center", measured: true }
      ),
      stack(ids, { direction: "row", gap: "snug", wrap: true, align: "center", justify: "center" }, [
        action(
          ids,
          "Take them off, then put them back",
          askHref(context.origin, { theme: context.theme, ask: "shorter", back: true }),
          { variant: "primary", scale: "large" }
        ),
        action(
          ids,
          "What gets written down",
          internalHref(context.origin, THE_RECORD.path, context.theme),
          { variant: "secondary", scale: "large" }
        ),
      ]),
    ],
    { align: "center" }
  )

export const puttingItBackPageTree = (context: BackContext): LoomTree => {
  const ids = sequentialIdFactory("back")
  const chrome: ChromeContext = {
    origin: context.origin,
    theme: context.theme,
    current: PUTTING_IT_BACK,
    counting: context.counting === true,
  }
  const trips = context.trips ?? []

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
        whatItIs(ids),
        ...(trips.length === 0
          ? []
          : [
              roundTrip(ids, trips),
              ...stoppedOnTheWayBack(ids, context, trips),
              ...weighedOnItsOwn(ids, trips),
            ]),
        closing(ids, context),
        ...siteReadingBand(ids, chrome),
        siteFooter(ids, chrome),
      ],
    }),
    ids
  )
}
