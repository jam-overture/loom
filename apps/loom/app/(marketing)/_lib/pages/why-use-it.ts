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

import {
  EDIT_COLUMNS,
  EDITS,
  EDITS_CAPTION,
  THE_CLAIM,
  THE_WAY_BACK,
  WHAT_ALLOWED_IT,
  WHEN_IT_ASKS,
} from "../allowed"
import { ALLOWED_ANCHOR, COUNTED_ANCHOR, WHY_USE_IT_ANCHOR } from "../bands"
import { CONNECTED_LANGUAGE, REFUSAL_CODES, YOUR_MODEL } from "../connected"
import { FACTS } from "../copy"
import { examplePage, rearrangedExample } from "../example"
import { LIBRARY_PARTS } from "../library"
import {
  REPORT_CAPTION,
  REPORT_LANGUAGE,
  THE_REPORT,
} from "../reported"
import {
  REGISTERED_TYPE,
  THE_REGISTRATION,
  WRITTEN_LANGUAGE,
  YOUR_COMPONENT,
} from "../written"
import { siteFooter, siteHeader, siteReadingBand, type ChromeContext } from "../chrome"
import { readyMadeBand } from "../ready"
import {
  action,
  code,
  codeSpan,
  heading,
  inlineLink,
  prose,
  proseParts,
  section,
  splitSection,
  stack,
} from "../nodes"
import {
  DOCS,
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
    { width: "wide", eyebrow: "What stays yours", anchor: WHY_USE_IT_ANCHOR.staysYours },
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
    { width: "wide", eyebrow: "What you build with", anchor: WHY_USE_IT_ANCHOR.theSet },
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
 * What a reader writes, which is the question this site asked four times and
 * never showed.
 *
 * ## The claim it evidences is already on the site, in four places
 *
 * The maintainer's second step on the front door reads *"Register them with
 * Loom. Tell Loom which of your components the AI is allowed to use. That is
 * all the setup there is."* The second link of his chain says the same thing,
 * and so do `staysYours` and `theParts` above. All four are claims about **how
 * much code this takes**, and the only honest way to back a claim about
 * quantity is to show the quantity.
 *
 * `docs/positioning.md` is what makes this the band worth building rather than
 * a nice addition: the pitch is *"the building part and why this build is
 * better than traditional methods"*, the reader is *"the casual web developer…
 * junior level"*, and the first link of the chain is *React/TypeScript
 * components*. A developer who arrived by accident, got interested, and wanted
 * to know what they would actually type had to leave this site for the
 * documentation. The one thing a developer audience trusts is code, and the
 * site had none of it outside an `npm install` line.
 *
 * ## It is here, and the chain now points at it
 *
 * `theParts` above answers *what comes with it* with a row of badges, and that
 * is what the chain's second link pointed at until today — a reader following
 * *you tell Loom which ones it can use* landed on a list of the ones that come
 * with the install, which is a different question answered well. The link
 * points here now and `chain.test.ts` holds it.
 *
 * Placed after `theParts` and before `onAPage` because the three read as one
 * argument in that order: here is what comes with it, here is what it costs to
 * add your own, here is what they look like on a page.
 *
 * ## Both panels say `wrap: false`, which is the exception `nodes.ts` names
 *
 * Every other panel on this site wraps, because every other panel prints
 * pretty-printed JSON whose long lines are single string values with no
 * structure below the printer's. These two print **source**, where a line is a
 * statement: a wrapped line of TypeScript reads as two of them, and an
 * indented continuation reads as a block. `nodes.ts` wrote `wrap` first for
 * exactly this case, so the panels say so out loud rather than inheriting it.
 *
 * ## Where the code comes from
 *
 * `written.ts`, which publishes the text, and `written/` beside it, which holds
 * the same two files as real modules that the gate compiles and
 * `written.test.ts` puts through the starter set. Nothing here is a snippet
 * somebody typed. That file carries the whole argument, including why the page
 * does not read them off disk the way the documentation's quickstart does.
 *
 * ## The heading was the banned shape on the first draft
 *
 * It read *"Two files, and your page can use your component"*, which is a
 * headline ending in a comma and then a clause that adds no fact — the exact
 * shape `docs/positioning.md` records the maintainer banning, and
 * `voice.test.ts` caught it on this branch. **The fix was a rewrite and not the
 * comma**, which that file and `docs/routines.md` both say in as many words: the
 * heading now states what the band shows, and dropping the punctuation would
 * have left the same sentence doing the same thing.
 */
const whatYouWrite = (ids: IdFactory): LoomNode =>
  section(
    ids,
    { width: "wide", eyebrow: "What you write", anchor: WHY_USE_IT_ANCHOR.whatYouWrite },
    "Adding a component of your own takes two files",
    [
      prose(
        ids,
        "The first file is ordinary React. You have written components like it before, and Loom never edits it. The second is everything you tell Loom about it.",
        { tone: "muted", align: "center", measured: true }
      ),
      code(ids, YOUR_COMPONENT.source, {
        language: WRITTEN_LANGUAGE,
        caption: YOUR_COMPONENT.caption,
        wrap: false,
      }),
      code(ids, THE_REGISTRATION.source, {
        language: WRITTEN_LANGUAGE,
        caption: THE_REGISTRATION.caption,
        wrap: false,
      }),
      proseParts(
        ids,
        [
          "That is the setup. Your page can ask for ",
          codeSpan(ids, REGISTERED_TYPE),
          " from here on, and so can your AI model, within the rules you set.",
        ],
        { tone: "muted", align: "center", measured: true }
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
    { width: "wide", eyebrow: "On a page", anchor: WHY_USE_IT_ANCHOR.onAPage },
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

/**
 * What that page tells its author, which is the fourth link of the chain.
 *
 * ## The hole this fills, and it is in the middle of the argument
 *
 * The bands of this page are the maintainer's six links in his order: *What
 * stays yours* is the first, *What you write* the second, *On a page* the
 * third, and *The same page arranged for someone else* the fifth. Between the
 * third and the fifth a reader was asked to make a jump nothing on the site
 * helped them with — here is a page, and now here is that page arranged for
 * somebody else — with no answer to the obvious question in between, which is
 * **how did it know**.
 *
 * His fourth link is the answer: *Signals broadcasting to your AI model*. It
 * had a rung on the front door and nowhere on this site to land, so the chain
 * sent a reader to the band on `/what-you-run` that says what this deployment
 * counts about the person reading. `reported.ts` has the whole of why that is
 * the wrong destination for this reader and the right one for a visitor
 * wondering what is collected about them.
 *
 * ## It prints data rather than arguing about data
 *
 * One panel, four observations, and the claim a reader can check for
 * themselves: every line of it names a part of the page they were looking at
 * one band ago, and there is no line about a person. The privacy claim this
 * site has made in prose on three pages is, in this band, the shape of the
 * object.
 *
 * `reported.ts` says what the panel is checked against, which is the same
 * schema a real delivery is validated with.
 *
 * ## `wrap` is true here and false two bands up
 *
 * *What you write* prints TypeScript and says `wrap: false`, because a wrapped
 * line of source reads as two statements. This is pretty-printed JSON, where a
 * wrapped line loses nothing a reader needed — `nodes.ts` wrote the prop for
 * exactly this distinction and the panel takes the default it set.
 */
const whatItReports = (ids: IdFactory): LoomNode =>
  section(
    ids,
    { width: "wide", eyebrow: "What your page reports", anchor: WHY_USE_IT_ANCHOR.whatItReports },
    "What one report looks like",
    [
      prose(
        ids,
        "Every few seconds the page above posts what it saw to your own server. This is one of those posts.",
        { tone: "muted", align: "center", measured: true }
      ),
      code(ids, THE_REPORT, {
        language: REPORT_LANGUAGE,
        caption: REPORT_CAPTION,
      }),
      prose(
        ids,
        "Every line names a part of the page and how long it was on screen. Nothing in it says who was reading, because there is no field for a person.",
        { tone: "muted", align: "center", measured: true }
      ),
      prose(
        ids,
        "The one random key ties a few seconds of a single visit together. Your page throws it away afterwards. A press is reported the same way, against the control somebody pressed.",
        { tone: "muted", align: "center", measured: true }
      ),
    ],
    { align: "center" }
  )

/**
 * The third of the maintainer's four steps, which is the one the site had never
 * shown.
 *
 * ## Where it sits, and why it is here rather than on the front door
 *
 * The band above prints one report the page sends. The band below shows the
 * page rearranged for a reader it was not built for. **Between those two
 * something has to receive the report and answer it**, and until today this
 * site said whose job that was in one sentence on the front door and never
 * once said what it costs.
 *
 * That sentence is the third step: *"Loom is AI model agnostic. Pick the model
 * you already use, or bring your own."* The first half is the maintainer's own
 * line of 1 October. It is a claim about **what it takes**, and the three other
 * steps each land on a band where a reader can see the quantity for themselves.
 * This one landed nowhere, so the front door's step three pointed at nothing
 * and now points here.
 *
 * ## One panel, and the reason it is not two
 *
 * `whatYouWrite` prints two files because adding a component really is two
 * files. Connecting a model is one function with one method in it, and a second
 * panel would have to be invented to fill the space. `connected.ts` says what
 * the panel is checked against, which is more than compilation: the test starts
 * a server, points this function at it, and hands the answer to the
 * interpreter.
 *
 * ## The copy names the two refusals because Loom acts on them differently
 *
 * `REFUSAL_CODES` is read rather than typed, so the sentence under the panel
 * cannot drift from the code in it. The distinction is the one thing in this
 * panel a reader would be tempted to collapse, and `client.ts` records that
 * the framework itself collapsed it until day 37 and reported a dead key as
 * *ask again later*.
 *
 * ## `wrap: false`, like the two panels under *What you write*
 *
 * This is source and not data, so a wrapped line reads as two statements.
 * `nodes.ts` wrote the prop for the distinction and `connected.test.ts` bounds
 * how far the longest line runs, which is what makes saying `false` honest on
 * a phone.
 */
const connected = (ids: IdFactory): LoomNode =>
  section(
    ids,
    {
      width: "wide",
      eyebrow: "Hook up your model",
      anchor: WHY_USE_IT_ANCHOR.connected,
    },
    "Connecting your own model is one function",
    [
      prose(
        ids,
        "Loom has no AI model of its own. You point it at the one you already use, and this is all you write to do it.",
        { tone: "muted", align: "center", measured: true }
      ),
      code(ids, YOUR_MODEL.source, {
        language: CONNECTED_LANGUAGE,
        caption: YOUR_MODEL.caption,
        wrap: false,
      }),
      prose(
        ids,
        "Each line pairs something Loom hands you with the name your provider expects for it. That translation is the only part that changes when you switch providers.",
        { tone: "muted", align: "center", measured: true }
      ),
      proseParts(
        ids,
        [
          "A key that will never work comes back as ",
          codeSpan(ids, REFUSAL_CODES[0] ?? ""),
          " and a service that is briefly down comes back as ",
          codeSpan(ids, REFUSAL_CODES[1] ?? ""),
          ". Loom waits for the second one and tells you about the first.",
        ],
        { tone: "muted", align: "center", measured: true }
      ),
    ],
    { align: "center" }
  )

/**
 * The headline of this site, happening to a page the reader has just met.
 *
 * `onAPage` above answers *what do the parts look like together* and leaves
 * the question this whole site is named for untouched: the page it shows is
 * fixed. A reader who has just been told that a page rearranges itself around
 * the people using it has been given a still photograph of one.
 *
 * So this band hands them the same page and a different reader. It is
 * deliberately the **same fictional product** as the band above rather than a
 * new one: a second invented company would read as a second example, and the
 * claim being made is about one page having two arrangements.
 *
 * `rearrangedExample` carries the whole argument for the shape.
 */
const forAReader = (ids: IdFactory): LoomNode =>
  section(
    ids,
    { width: "wide", eyebrow: "Who is reading it", anchor: WHY_USE_IT_ANCHOR.forAReader },
    "The same page arranged for someone else",
    [
      /**
       * Two sentences, and the first one points back at the band above rather
       * than describing the picture.
       *
       * A reader who has just been shown a page and is now shown two needs to
       * be told that one of them is the page they were shown, or the band is
       * two examples instead of one example twice. The captions over the
       * frames say who each is for; this says which is which.
       *
       * It read *"Drag the handle to see what the page gives them"* while the
       * band was a wipe, and the wipe is gone. A sentence describing a control
       * that is not there is the worst line this site could carry, on a page
       * arguing that Loom can say what a thing actually is.
       *
       * **It named the two sides until 6 November** — *"The page on the left is
       * the one above. On the right is…"* — and `loom.split` wraps to one
       * column when there is no room, so at 390 there was no left and no right.
       * It now names the order, which is true at every width and is what the
       * band under it already did. `positions.test.ts` holds the general
       * version over every page of this site.
       */
      prose(
        ids,
        "The first of these is the page above. The second is what a visitor who came looking for a gift gets.",
        { tone: "muted", align: "center", measured: true }
      ),
      rearrangedExample(ids),
    ],
    { align: "center" }
  )

/**
 * What stood between the two frames, which is the second sentence of the
 * chain's fifth link and the one nothing on this site has ever shown.
 *
 * `allowed.ts` carries the whole argument for the band and for where it sits.
 * The short version: the rung says *"Loom checks that against your rules
 * before anything moves"*, the band above shows the moving, and a reader had
 * nothing at all for the checking. Every number and every verdict below comes
 * back from the framework judging this exact change.
 *
 * **It is the last band before the closing one on purpose.**
 * `docs/positioning.md` keeps the governance under the hood and off the pitch,
 * and keeps it *"worth saying on a page somebody reads after they want the
 * product."* This is the furthest point on the second page of a three-page
 * site, one screen under a page the reader has watched rearrange itself. A
 * stranger who reaches it has asked the question it answers.
 */
const whatAllowedIt = (ids: IdFactory): LoomNode =>
  section(
    ids,
    /**
     * `readable` rather than the `wide` every other band on this page takes,
     * and it is the table that asks for it.
     *
     * At the page's full width the two columns sit 1,078px apart with four
     * words in each, so a reader tracking *A Feature was added* across to
     * *Send it as a gift* crosses most of a screen of nothing. A table reads
     * as a table when its columns are near enough to be one line; past that it
     * reads as two lists that happen to share a rule. The prose in the band is
     * `measured` already, so this brings the one element that was not into the
     * same measure as the rest.
     */
    { width: "readable", eyebrow: "What allowed it", anchor: ALLOWED_ANCHOR },
    "What changed and what let it through",
    [
      prose(ids, THE_CLAIM, { tone: "muted", align: "center", measured: true }),
      /**
       * A table rather than a list, and the two columns are why.
       *
       * Each edit is a verb and a piece of the fictional product's copy, and
       * the copy is the half a reader recognises: they have just read *Send it
       * as a gift* on the frame above. In one column those two run together
       * into three sentences a reader has to parse; in two they read as three
       * of one kind of thing, which is what they are.
       *
       * `prose: false` by omission, because these cells are a few words each
       * rather than sentences. `loom.table`'s own note has the measurement
       * behind that prop and the case it is for, which is a cell holding a
       * paragraph.
       */
      buildElement(ids, {
        type: "loom.table",
        props: { caption: EDITS_CAPTION, tone: "panel", rules: "rows", density: "comfortable" },
        children: [
          buildSlot(ids, "columns", [
            buildElement(ids, {
              type: "loom.table-row",
              props: {},
              children: EDIT_COLUMNS.map((name) =>
                buildElement(ids, {
                  type: "loom.table-cell",
                  props: { role: "column" },
                  children: [buildText(ids, name)],
                })
              ),
            }),
          ]),
          ...EDITS.map((edit) =>
            buildElement(ids, {
              type: "loom.table-row",
              props: {},
              children: [
                buildElement(ids, {
                  type: "loom.table-cell",
                  props: { role: "row" },
                  children: [buildText(ids, edit.did)],
                }),
                buildElement(ids, {
                  type: "loom.table-cell",
                  props: {},
                  children: [buildText(ids, edit.words)],
                }),
              ],
            })
          ),
        ],
      }),
      prose(ids, WHAT_ALLOWED_IT, { tone: "muted", align: "center", measured: true }),
      prose(ids, THE_WAY_BACK, { tone: "muted", align: "center", measured: true }),
      /**
       * The refusal, as two sentences rather than one.
       *
       * One sentence carrying both halves came to 32 words, and the site holds
       * every sentence a reader meets to 30. Splitting it is the better
       * writing anyway: the first line is the surprise and the second is the
       * reason, and a reader who stops after the first has still got the point.
       */
      ...WHEN_IT_ASKS.map((sentence) =>
        prose(ids, sentence, { tone: "muted", align: "center", measured: true })
      ),
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
    proseParts(
      ids,
      [
        "This site is a Loom application too, built out of the same set. Putting it in a project you already have is what ",
        inlineLink(ids, "the docs", surfacePath(DOCS)),
        " are for.",
      ],
      { measured: true }
    ),
    stack(ids, { direction: "row", gap: "snug", align: "center", wrap: true }, [
      action(ids, "Read the docs", surfacePath(DOCS), { variant: "primary" }),
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
        readyMadeBand(ids),
        whatYouWrite(ids),
        onAPage(ids),
        whatItReports(ids),
        connected(ids),
        forAReader(ids),
        whatAllowedIt(ids),
        closing(ids),
        ...siteReadingBand(ids, chrome),
        siteFooter(ids, chrome),
      ],
    }),
    ids
  )
}
