import {
  buildElement,
  buildSlot,
  buildText,
  createTree,
  sequentialIdFactory,
  type IdFactory,
  type LoomNode,
  type LoomTree,
} from "@jam-overture/loom"
import { THEME_PROP_KEY } from "@jam-overture/loom/react"

import { COUNTED_ANCHOR } from "../bands"
import { FACTS } from "../copy"
import { examplePage } from "../example"
import { LIBRARY_PARTS } from "../library"
import { siteFooter, siteHeader, siteReadingBand, type ChromeContext } from "../chrome"
import {
  action,
  heading,
  inlineLink,
  prose,
  proseParts,
  section,
  splitSection,
  stack,
  TERTIARY_CONTROL,
} from "../nodes"
import {
  DEMO,
  DOCS,
  HOW_IT_WORKS,
  SITE_THEMES,
  sitePath,
  surfacePath,
  WHAT_YOU_RUN,
  WHY_USE_IT,
} from "../site"

import type { PageContext } from "./home"

/**
 * The build case: what a page like this takes to write on your own, and which
 * of those jobs come with Loom.
 *
 * ## Why this page exists
 *
 * `docs/positioning.md` is the maintainer's answers of 24 October, and the
 * sentence this page is built on is his:
 *
 * > *"Don't worry about the controls. That is the stuff under the hood. The
 * > building part and why this build is better than traditional methods is
 * > preferred."*
 *
 * The front door now leads with his chain, which is the **building** half of
 * that instruction. Nothing on this site answered the second half. A visitor
 * who has read the chain and believes it knows what Loom makes; they have not
 * been told why they would reach for it rather than wiring the same thing up
 * themselves, which for the audience that file names — *"the casual web
 * developer… junior level"* — is the next question and very often the only one.
 *
 * So this page is a comparison, and it is the comparison the library already
 * has a primitive for: `loom.comparison-table`'s own description is *"the band
 * that answers how is this different from what I use now"*. It had never been
 * used on this site.
 *
 * ## What it may claim, and what it may not
 *
 * **The subject is work rather than a competitor.** Nothing here names another
 * product, measures one, or says Loom is better than one. The maintainer's word
 * was *traditional methods*, and the honest reading of that for a junior
 * developer is *the code you would otherwise write yourself* — which this
 * repository can speak to, because every row is a thing in it.
 *
 * It also makes **no outcome claim.** `positioning.md` allows exactly one on
 * this site, *greater user engagement and conversion*, and it is his phrasing on
 * the front door's last rung. A second page promising a result would be this
 * lane inventing positioning, so the only thing this one promises is that the
 * code exists.
 *
 * ## The two rows that say *yours either way*
 *
 * The last two rows of the table answer *your components* and *which model* with
 * the same word in both columns, and they are the reason the table is worth
 * reading. A comparison whose second column wins every row is an advertisement,
 * and a reader who has seen one knows to stop reading it. These two are the
 * places where Loom gives you nothing you did not have, and saying so is what
 * makes the five rows above it credible.
 *
 * `why-use-it.test.ts` holds that property rather than the wording: the table
 * has at least one row the two columns answer the same way.
 */

/** One job, and what it takes on each side. */
type Job = {
  /** The job, as the row's criterion. */
  readonly heading: string
  /** The qualifier the criterion should not carry. */
  readonly note: string
  /** What it takes on your own. A phrase, because it is a cell and not a sentence. */
  readonly onYourOwn: string
  /**
   * What it takes with Loom.
   *
   * `undefined` means the cell is the mark alone, which is the five jobs Loom
   * has already written. A string is a cell the mark would be wrong for, and
   * today that is the two rows answered the same way in both columns.
   */
  readonly withLoom?: string
}

/**
 * The jobs, in the order a page like this would be built in.
 *
 * It is deliberately **not** the chain's order and not a count of anything.
 * `chain.ts` has the whole argument for why no sentence on this site says how
 * many of something there are: the front door says *four steps*, `/how-it-works`
 * says five, and a third number would undo the one thing `journey.ts` was
 * written to fix. A table does not have to say how many rows it has.
 */
const JOBS: readonly Job[] = [
  {
    heading: "Somewhere to keep the shape of the page",
    note: "so that moving a section is not a code change",
    onYourOwn: "You build it",
  },
  {
    heading: "Counting what readers do",
    note: "which parts they reach, how long they stay, what they press",
    onYourOwn: "You wire it up",
  },
  {
    heading: "Asking a model for a change",
    note: "the request, and a shape for the answer that comes back",
    onYourOwn: "You write it",
  },
  {
    heading: "Checking a change against your own rules",
    note: "before anybody reading the page sees it",
    onYourOwn: "You write it",
  },
  {
    heading: "Putting a change back",
    note: "without working out by hand what it replaced",
    onYourOwn: "You write it",
  },
  {
    heading: "Your components",
    note: "the React you have already written",
    onYourOwn: "Yours",
    withLoom: "Yours",
  },
  {
    heading: "Which AI model it uses",
    note: "Loom is AI model agnostic",
    onYourOwn: "Yours",
    withLoom: "Yours",
  },
]

/** The column headings, which are the two subjects of the whole page. */
const COLUMNS: readonly string[] = ["On your own", "With Loom"]

const hero = (ids: IdFactory): LoomNode =>
  buildElement(ids, {
    type: "loom.hero",
    props: {
      backdrop: "grid",
      align: "start",
      stature: "standard",
      /**
       * **Not the page's own label**, which it was for an hour and which
       * `naming.test.ts` was right to refuse. That file holds *a band that
       * names a page offers the way there*, and a hero carrying *Why use it*
       * names this page with no link in the band — correctly, because the
       * reader is already on it, and the rule has no way to say so. Rather
       * than widen a rule that is right about every other case, the eyebrow
       * says what the band is for.
       */
      eyebrow: "The case for it",
    },
    children: [
      buildSlot(ids, "heading", [
        heading(ids, 1, "You could build all of this yourself", { balance: true }),
      ]),
      /**
       * One paragraph, which is the shape every hero on this site has.
       *
       * It was two until the first photograph. A `tone: "muted"` paragraph
       * under a `size: "lead"` one renders a step smaller and a step lighter,
       * with the hero's own gap between them, so the second read as a caption
       * on the first rather than as a sentence — at 1280 and worse at 390,
       * where it was four lines of small grey type under the only thing on the
       * screen. What it said is what the band under it says with a heading and
       * a caption, so it is gone rather than restyled.
       */
      prose(
        ids,
        "Making a page that rearranges itself around its readers takes several separate jobs. You could write every one of them yourself, and it would work.",
        { size: "lead", measured: true }
      ),
    ],
  })

/**
 * The cell for one side of one job.
 *
 * The mark and the words are deliberately not both set on the Loom side. A
 * glyph beside *Comes with it* says the same thing twice, and the column reads
 * as a column of ticks at a glance — which is what the reader is doing with it.
 * The primitive's own note says the mark is for the cell whose answer is a
 * verdict and the text is for the cell whose answer is a phrase, so each cell
 * here is one or the other.
 */
const answer = (ids: IdFactory, text: string | undefined): LoomNode =>
  buildElement(ids, {
    type: "loom.comparison",
    props: text === undefined ? { mark: "yes" } : {},
    children: text === undefined ? [] : [buildText(ids, text)],
  })

const jobRow = (ids: IdFactory, job: Job): LoomNode =>
  buildElement(ids, {
    type: "loom.comparison-row",
    props: { heading: job.heading, note: job.note },
    children: [answer(ids, job.onYourOwn), answer(ids, job.withLoom)],
  })

/**
 * The table, and the one prop on it that is a position rather than a value.
 *
 * `feature: "second"` names the column this page is steering towards, counted
 * from the first subject. 0084 is why it sits on the container and not on five
 * cells: a column has no node of its own, so anything scoped to a whole column
 * is a rule keyed on position.
 */
const theWork = (ids: IdFactory): LoomNode =>
  section(ids, { width: "wide", eyebrow: "The work" }, "Who writes each part", [
    buildElement(ids, {
      type: "loom.comparison-table",
      props: {
        caption: "What each job takes on your own, and what comes with Loom",
        feature: "second",
        density: "loose",
      },
      children: [
        buildSlot(ids, "columns", [
          buildElement(ids, {
            type: "loom.comparison-row",
            props: {},
            children: COLUMNS.map((name) =>
              buildElement(ids, {
                type: "loom.comparison",
                props: { role: "subject" },
                children: [buildText(ids, name)],
              })
            ),
          }),
        ]),
        ...JOBS.map((job) => jobRow(ids, job)),
      ],
    }),
  ])

/**
 * What Loom does not give you, which is the band that keeps the table honest.
 *
 * Every sentence in it is a thing this site already says somewhere, said here
 * because this is the page where a reader is deciding. The model sentence is
 * built on the maintainer's own line of 1 October — *"Loom is AI model
 * agnostic. Choose your preferred model or one of your own."* — and is not
 * quoted as his, for the reason `copy.ts` gives at the foot of
 * `MAINTAINERS_OWN`: a sentence of ours built on one of his is held to every
 * rule the rest of the site is held to.
 */
const staysYours = (ids: IdFactory): LoomNode =>
  section(
    ids,
    { width: "wide", eyebrow: "What stays yours" },
    "You still write your components and choose your model",
    [
      buildElement(ids, {
        type: "loom.feature-grid",
        props: { columns: "three", density: "tight" },
        children: [
          buildElement(ids, {
            type: "loom.feature",
            props: {
              title: "Your components",
              body: "Loom does not write code into your components and it does not replace them. You say which ones it is allowed to use.",
              surface: "plain",
            },
          }),
          buildElement(ids, {
            type: "loom.feature",
            props: {
              title: "Your model",
              body: "Loom is AI model agnostic. Point it at the model you already use, or at one of your own.",
              surface: "plain",
            },
          }),
          buildElement(ids, {
            type: "loom.feature",
            props: {
              title: "Your rules",
              body: "You write what an AI model is allowed to change on your page. Anything outside that is rejected, and Loom tells you why.",
              surface: "plain",
            },
          }),
        ],
      }),
    ]
  )

/**
 * The five rows of the table, as the sentences that say what they mean.
 *
 * A table is a scan and a scan is not an explanation: *Comes with it* against
 * *You write it* tells a reader the shape of the answer and none of the
 * substance. This band is the substance, and it is `splitSection` for the
 * measurement `nodes.ts` records — two short paragraphs in a wide band leave
 * half of it empty at 1280.
 */
const alreadyWritten = (ids: IdFactory): LoomNode =>
  splitSection(
    ids,
    { width: "wide", eyebrow: "What comes with it" },
    "The rest of it is already written",
    [
      prose(
        ids,
        "Your page is kept as data rather than as code, so changing it is a write rather than a deploy. Your components do not change at all."
      ),
      /**
       * The one phrase on this page that carries its own link, and it carries
       * the band's anchor on `/what-you-run` rather than that page's address.
       * `whatLeaves` on that page explains the choice: a link to a band goes
       * red the day the band moves, and a link to a page does not.
       */
      proseParts(ids, [
        "Your page reports ",
        inlineLink(
          ids,
          "what readers do with it",
          `${sitePath(WHAT_YOU_RUN.path)}#${COUNTED_ANCHOR}`
        ),
        ", in a form your model can read. You do not have to pick an analytics product and then translate its charts into something a model can act on.",
      ]),
      prose(
        ids,
        "Every change is checked against your rules before anybody reading the page sees it, and it is stored with the way back. Putting one back is a single press.",
        { tone: "muted" }
      ),
    ]
  )

/**
 * The set itself, which is the one thing this page's argument asks for and had
 * no answer to.
 *
 * The table two bands up says *Somewhere to keep the shape of the page — you
 * build it* against a mark in the Loom column, five times over. A reader who
 * believes it still has a concrete question underneath: **what is actually in
 * there.** The front door has answered that with a figure since the facts band
 * was written, `/what-you-run` answers it with *"a starter set comes with it"*,
 * and until today nothing on this site showed a reader one of them.
 *
 * It is the maintainer's direction of 24 October taken literally — *"the
 * building part… is preferred"* — and the cheapest honest version of it: the
 * names, read off the library this page is rendered with, in the order
 * somebody scanning for a table would want them.
 *
 * **The names are not written down here**, and `library.ts` has the argument.
 * A hundred of them typed into this lane would be wrong within a week rather
 * than merely stale.
 *
 * ## Why the pieces are in it as well as the bands
 *
 * *Table cell* and *Perk list item* are in this list beside *Hero* and
 * *Pricing tier*, and a first reading says they are clutter. They are the
 * granularity the rest of the site is claiming: a change names a part, so a
 * part a change should be able to name has to be in the set, and a reader who
 * notices that half the list is small is reading it right. The caption says so
 * rather than leaving them to look like an oversight.
 */
const theParts = (ids: IdFactory): LoomNode =>
  section(
    ids,
    { width: "wide", eyebrow: "What you build with" },
    "Every one of these comes with it",
    [
      prose(
        ids,
        `All ${FACTS.primitives} come with the install. Some are a whole section of a page and some are one piece inside it.`,
        { tone: "muted", align: "center", measured: true }
      ),
      stack(
        ids,
        { direction: "row", gap: "snug", justify: "center", wrap: true },
        LIBRARY_PARTS.map((part) =>
          buildElement(ids, {
            type: "loom.badge",
            props: { tone: "neutral" },
            children: [buildText(ids, part)],
          })
        )
      ),
    ],
    { align: "center" }
  )

/**
 * The set at work, which is the question the band above it leaves open.
 *
 * `theParts` answers *what is in there* and cannot answer *what do they look
 * like on a page*, because the only page on this site built out of the
 * starter set is this site and a visitor is standing on it. So the site shows
 * them a different one. `example.ts` is the page, the frame and the two marks,
 * and it carries the whole argument for why it is rendered rather than
 * photographed.
 *
 * It sits here rather than above the chips for one reason: the band after it
 * is *Try it on a page of your own*, and a reader who has just watched a page
 * be made out of the list is the likeliest reader this site has to press
 * something.
 */
const onAPage = (ids: IdFactory): LoomNode =>
  section(
    ids,
    { width: "wide", eyebrow: "On a page" },
    "What they look like together",
    [
      prose(ids, "Every piece of this is a part from the list above.", {
        tone: "muted",
        align: "center",
        measured: true,
      }),
      examplePage(ids),
    ],
    { align: "center" }
  )

const closing = (ids: IdFactory): LoomNode =>
  section(ids, { width: "wide", eyebrow: "Next" }, "Try it on a page of your own", [
    /**
     * **Thirteen words shorter since the band above it landed**, and the band
     * is why. This sentence used to carry the whole claim on its own — *"Every
     * page of it is put together from the starter components anybody gets when
     * they install it"* — to a reader who had been shown nothing. A reader who
     * has just watched a page be assembled out of the list does not need the
     * claim spelled out a second time, and the site's word ceiling is a real
     * constraint that a band has to be paid for rather than argued past.
     */
    prose(ids, "This site is a Loom application too, built out of the same set.", {
      measured: true,
    }),
    stack(ids, { direction: "row", gap: "snug", align: "center", wrap: true }, [
      action(ids, "Read the docs", surfacePath(DOCS), { variant: "primary" }),
      action(ids, "Try it yourself", surfacePath(DEMO), { variant: "secondary" }),
      action(ids, "How it works", sitePath(HOW_IT_WORKS.path), TERTIARY_CONTROL),
    ]),
  ])

export const whyUseItPageTree = (context: PageContext): LoomTree => {
  const ids = sequentialIdFactory("why")
  const chrome: ChromeContext = { ...context, current: WHY_USE_IT }

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
        /**
         * The scan, then what it means, then what it does not claim.
         *
         * The table is first because it is the page's whole argument in one
         * screen, and a reader who stops after it has had the answer. The two
         * bands under it are the reasons, in the order a sceptic asks for them:
         * *what do I still have to do* before *what is actually written*.
         */
        theWork(ids),
        staysYours(ids),
        alreadyWritten(ids),
        theParts(ids),
        onAPage(ids),
        closing(ids),
        ...siteReadingBand(ids, chrome),
        siteFooter(ids, chrome),
      ],
    }),
    ids
  )
}
