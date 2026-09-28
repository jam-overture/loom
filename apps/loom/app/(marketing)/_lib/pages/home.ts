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

import type { AskId } from "../adapt/asks"
import type { ChangeRecord } from "../adapt/record"
import { BAND } from "../bands"
import {
  siteFooter,
  siteHeader,
  siteReadingBand,
  type ChromeContext,
} from "../chrome"
import { FACTS } from "../copy"
import { PLAIN_WORDS_GLOSSED, PLAIN_WORDS_LABEL } from "../journey"
import { siteQuestions } from "../questions"
import { action, heading, prose, section, stack } from "../nodes"
import { answerBand } from "./answer"
import { inYourOwnWordsBand } from "./in-your-own-words"
import { seeItHappenBand } from "./see-it-happen"
import {
  DECISIONS_URL,
  DEMO,
  DOCS,
  doorOf,
  HOME,
  HOW_IT_WORKS,
  internalHref,
  LESSONS,
  PORTAL,
  PRODUCT_SURFACES,
  REPOSITORY_URL,
  SITE_THEMES,
  surfaceHref,
  WHAT_YOU_RUN,
  type SiteThemeName,
} from "../site"

/**
 * The landing page, as a tree.
 *
 * There is no markup in this file, no styling on anything in it, and no color
 * named anywhere — which is the property the site exists to demonstrate rather
 * than to claim. What it says divides in two, deliberately: the mechanism is
 * described in plain fact because the repository is the source for all of it,
 * and everything that is a *positioning* decision is marked placeholder on the
 * page itself (see `copy.ts`).
 */

export type PageContext = {
  readonly origin: string
  readonly theme: SiteThemeName
  /**
   * What the visitor has asked the page for, off the address.
   *
   * Optional because two of the site's three pages have no such thing and
   * because the landing page has to be buildable *before* the ask is run —
   * the change is worked out against a page, so a page has to exist first.
   */
  readonly ask?: AskId
  /**
   * Whether the visitor has answered a change the rules held back.
   *
   * It changes nothing about how the page is *built* and everything about what
   * is run against it, which is why it sits here beside `ask` rather than in the
   * runner: both are what the address said, and the address is what a page of
   * this site is a function of.
   */
  readonly approve?: boolean
  /**
   * Whether the visitor has pressed *Put it back* on a change that landed, and
   * whether they have answered the rules holding the undo itself back.
   *
   * Two more things the address says, for the same reason as the two above: the
   * undo is a change of its own (0032) and it is judged by the same rules, so it
   * can be held for a person exactly as the change it reverses can.
   */
  readonly back?: boolean
  readonly backApprove?: boolean
  /** What happened, once it has. See `render.ts` for why this arrives in a second pass. */
  readonly record?: ChangeRecord
  /** And what happened when the visitor put it back, once they have. */
  readonly undone?: ChangeRecord
  /**
   * Whether this deployment is counting the person reading the page.
   *
   * The one thing in this context that is a fact about the *deployment* rather
   * than about the address, and it is here because a page that counts its
   * readers has to be able to say so. `render.ts` reads it once per request
   * (`readersCountedHere`) and the same boolean decides three things: the
   * markup carries the addresses a signal names, the layout starts a
   * broadcaster, and the footer and `/what-readers-do` tell a reader which of
   * the two pages they are looking at.
   *
   * Absent means off, which is what a builder called without it — every test
   * that predates this, and every page tree built as a fixture — should get.
   */
  readonly counting?: boolean
}

const hero = (ids: IdFactory, context: PageContext): LoomNode =>
  buildElement(ids, {
    type: "loom.hero",
    props: {
      backdrop: "grid",
      align: "center",
      stature: "tall",
      eyebrow: "For pages that AI is allowed to change",
    },
    children: [
      buildSlot(ids, "heading", [
        /**
         * **The frame, and it is the maintainer's of 27 September.**
         *
         * The headline this replaces was his line of 21 August, verbatim —
         * *"AI creates components, Loom creates experiences."* His verdict on
         * it was that it does not grab you: it is the *conclusion* of an
         * argument nobody has been given yet, so a stranger meets a contrast
         * between two words before they have any reason to care about either.
         *
         * His direction was to open on the reimagining — *we need to rethink
         * how we build web apps in the AI age* — and to make the components
         * line the **explanation underneath it** rather than the claim itself.
         * That is what this is. The 21 August line is not gone; it is the first
         * two sentences of the paragraph below, unpacked.
         *
         * It is a claim about the world rather than about this product, which
         * is the point of a manifesto opening and is also its risk: a visitor
         * who disagrees with the premise is gone. The paragraph under it has
         * one job — earn the premise in three sentences — and that is why it
         * leads with what AI already does rather than with what Loom is.
         *
         * **Positioning is the maintainer's**, so the alternatives were offered
         * on the pull request rather than chosen here. This wording is a draft
         * of his direction, not an invention of it.
         */
        heading(ids, 1, "The AI age needs a new way to build web apps.", {
          balance: true,
        }),
      ]),
      /**
       * The why, in the order a stranger needs it: what has already changed,
       * what that leaves, and only then what we are.
       *
       * The first sentence is five words and concedes the thing a reader
       * already believes — **AI writes the parts** — because an opening that
       * argues with what somebody knows spends its credit before it has any.
       * The second names what is left over, in their terms rather than ours.
       * The third is the only one that mentions Loom, and it carries the two
       * facts the rest of the page is about: the rules, and the record.
       *
       * **Two things the maintainer added on 27 September, and both are real
       * gaps rather than polish.**
       *
       * *What your page becomes* and *how it feels to use* are **not the same
       * claim**, and the line before this one only made the first. A page can
       * rearrange correctly and still be worse to use; the whole argument for
       * doing this at all is the second one, and it was missing from the
       * sentence that exists to state it.
       *
       * And the closing clause was two properties where the product has three.
       * *On your rules, with every change written down* is the record and the
       * rules; it leaves out the thing the page is named for — that the
       * arrangement **adapts to the person reading it**. The triad states all
       * three in the order they matter to a buyer: what it does for their
       * readers, what it will not do without permission, and that it is safe to
       * put near production.
       *
       * **One em-dash, and it is at the end rather than the middle.** An earlier
       * draft set the second sentence's subject off with a pair of them, which
       * reads fine ranged left and badly here: this band is `align: "center"`,
       * so both edges are ragged, and an interruption inside a centred sentence
       * costs a reader the thread exactly where the argument turns. The comma
       * pair that survives in the second sentence is six words long rather than
       * twelve, and was kept only after photographing it at 1280 and 390.
       *
       * No contraction, on the house style every other line of this site
       * follows; each sentence is inside the thirty-word ceiling
       * `voice.test.ts` holds the opening band to; and *your page* and *your
       * rules* are both here, which is the one habit from the maintainer's
       * reference that a test can check — the reader is in the sentence.
       */
      prose(
        ids,
        "AI already writes the components. What your page becomes, and how it feels to use, is still to be built. Loom is where you and the AI build it — adaptive to your users, answerable to your rules, and secure.",
        { size: "lead", measured: true, align: "center" }
      ),
      buildSlot(ids, "actions", [
        action(
          ids,
          "See how a change travels",
          internalHref(context.origin, HOW_IT_WORKS.path, context.theme),
          { variant: "primary", scale: "large" }
        ),
        /**
         * The second action is the demo rather than the repository, as of
         * 22 August.
         *
         * The sentence directly above it promises the reader they can ask for a
         * change *in their own words*, and until today the nearest thing this
         * site offered was a link to GitHub. Sending someone who has just read
         * that promise to a source tree is answering "can I try it?" with "here
         * is the code", which is the wrong answer to a question nobody asked.
         *
         * Nothing is lost by moving it: the repository is still the closing
         * band's second action, a card in the facts band, and a named group in
         * the footer. It is reachable three ways from this page and none of
         * them is the first screen.
         */
        action(ids, "Try it yourself", surfaceHref(context.origin, DEMO), {
          variant: "secondary",
          scale: "large",
        }),
      ]),
    ],
  })

/**
 * What happens to every change, in four words.
 *
 * This band used to read *Proposals · The Gate · Revisions · Inverses* under the
 * heading "The four things underneath" — our four nouns, taught to a stranger in
 * the first screen and a half, before the page had said what any of them were
 * for. It is the exact thing the brief forbids, and the maintainer named it on
 * 20 August reading the page against `nextjs.org`.
 *
 * The four words below are the same four things. Nobody has to be taught them.
 *
 * **They are not four steps, and the label said they were.** Until this run it
 * read *Every change takes the same four steps* — one screen above a button
 * that leads to a page headed *Five steps, every time, in the same order*. Both
 * sentences were defensible on their own, which is why sixteen runs and every
 * test on this site passed over them: the four words are the four nouns and the
 * five steps are the pipeline, and *Undo* was never a step in it. A stranger
 * does not know that. They read four, click the button under it, and read five.
 *
 * On a site whose entire argument is that it can tell you exactly what
 * happened, being unable to count its own steps on the first screen is the
 * cheapest possible way to lose somebody. The words were right; the noun was
 * not. `journey.ts` owns both lists now and `journey.test.ts` holds this band
 * to naming neither a step nor a number of its own.
 *
 * **And each word says something, as of 20 September.** The words survived that
 * run and their rendering did not: four muted nouns in a `loom.logo-cloud`, the
 * primitive for *the companies who use us*, photographing as an empty strip
 * between the tallest band on the site and the one it exists to introduce. The
 * reasoning is in `PLAIN_WORDS_GLOSSED`, including why the line under each word
 * may not restate the paragraph two hundred pixels above it.
 *
 * `density: "tight"` and `surface: "plain"` are the two props that keep this a
 * band rather than a wall: the mosaic of four cards further down is the page's
 * one card grid, and a second one directly under the hero would make the first
 * screen and a half read as a specification sheet.
 */
const vocabulary = (ids: IdFactory): LoomNode =>
  buildElement(ids, {
    type: "loom.section",
    /**
     * A band with an eyebrow and no heading, which is what this one is.
     *
     * The label was a centered `label` prop while the band was a
     * `loom.logo-cloud`, and a stacked paragraph for about an hour after that.
     * Both were wrong for the same reason and the suite said so twice: a band
     * of this page is a `loom.section`, and everything that reads this page as
     * a page — `outline.ts` naming the bands a visitor meets, `BAND_TYPES`
     * deciding what a reader signal counts, `asks.ts` finding the band a
     * request is about — finds a band by its eyebrow or its label and finds
     * nothing on a bare stack. The row of words had been the one band of the
     * site's most-read page that was none of those things.
     *
     * So it is a section now, with no heading slot: the words *are* the
     * headings. `loom.section` renders that case on purpose (its `heading ===
     * undefined` branch), and the eyebrow is the same counted string it always
     * was rather than a second copy in `bands.ts`.
     */
    props: { width: "wide", eyebrow: PLAIN_WORDS_LABEL },
    children: [
      buildElement(ids, {
        type: "loom.feature-grid",
        props: { columns: "four", density: "tight" },
        children: PLAIN_WORDS_GLOSSED.map(({ word, line }) =>
          buildElement(ids, {
            type: "loom.feature",
            props: { title: word, body: line, surface: "plain" },
          })
        ),
      }),
    ],
  })

/**
 * What this is for: the problem, and what Loom does about it.
 *
 * The band that stood here listed four capabilities under "Change, with a paper
 * trail" — four true sentences about what the product has, which is the shape
 * every framework's landing page takes and the shape that persuades nobody. On
 * 21 August the maintainer said the core of this site is **the problems we are
 * solving and how Loom solves them**, so the band is rewritten as pairs: the
 * headline is the thing that is wrong today, and the sentence under it is the
 * answer.
 *
 * Every problem here is one this repository can actually speak to, and none of
 * them is a claim about who has it. Whether the people who care most are
 * regulated teams, agencies or hobbyists is positioning and is the maintainer's;
 * *that un-reviewable AI output is a problem* is not a market claim, it is the
 * reason the Gate exists.
 *
 * `loom.mosaic` rather than the feature grid it used to be, which closes the
 * finding this lane filed on 20 August: eight identical rectangles read as a
 * table of specifications, and the band that says what a product is for should
 * not look like a kit list. The primitives lane shipped exactly that on #121.
 *
 * **The copy is written to the rhythm, and that is the thing worth knowing
 * about this primitive.** `alternating` is wide, narrow, narrow, wide — the
 * spans are the container's and the children are untouched, which is the whole
 * of 0062's argument and is right. What follows from it is a job the tree has
 * to do: a wide cell is twice the column width of a narrow one, so four bodies
 * of roughly equal length come out as two full cells and two cells running
 * better than a third empty. That is what this band looked like until today,
 * and it read as unfinished rather than as composed.
 *
 * So the two wide cells carry the two long arguments and the narrow cells carry
 * the short ones, at roughly twice the characters. `pages.test.ts` holds the
 * ratio rather than the wording, because the wording will be edited by someone
 * who is not thinking about spans and the ratio is the part that breaks
 * silently.
 *
 * The glyphs went with it — `◇ ◈ ◆ ◊`, four diamonds distinguishable only by
 * fill, which is decoration that survived four rewrites without ever meaning
 * anything. See the note on `WAYS_IN` for the general version.
 */
const problems = (ids: IdFactory): LoomNode =>
  section(
    ids,
    { eyebrow: BAND.problems, width: "wide" },
    "Letting AI near your interface is the easy part",
    [
      prose(
        ids,
        "Getting a machine to produce a page has stopped being hard. Being able to answer for what it produced has not.",
        { size: "lead", measured: true }
      ),
      buildElement(ids, {
        type: "loom.mosaic",
        props: { rhythm: "alternating" },
        children: [
          buildElement(ids, {
            type: "loom.feature",
            props: {
              title: "It writes code, and somebody has to read all of it",
              body: "A tool that writes components hands you work rather than taking it away — every line of it has to be read, reviewed and owned by somebody. Loom never writes code into your page. It rearranges pieces you already built and trust.",
            },
          }),
          buildElement(ids, {
            type: "loom.feature",
            props: {
              title: "Nobody can say what changed, or why",
              body: "Ask most tools what changed last Tuesday and the best answer is a diff.",
            },
          }),
          buildElement(ids, {
            type: "loom.feature",
            props: {
              title: "It is live before anyone has looked at it",
              body: "Changes land because a model was confident. That is not the same as being right.",
            },
          }),
          buildElement(ids, {
            type: "loom.feature",
            props: {
              title: "Undoing it means finding the commit and hoping",
              body: "Every change arrives with the change that reverses it, worked out at the same moment and kept beside it. Putting the page back is one press, and it is recorded like anything else.",
            },
          }),
        ],
      }),
    ]
  )

/**
 * Numbers counted from the thing they are about, rather than typed from memory.
 *
 * The line under the heading is a claim about this band, so it is worded to be
 * true of all three figures rather than of the two the page works out for
 * itself: every one of them is held against the code by a test, and the record
 * count is held as a floor it can never exceed. See `FACTS` in `copy.ts`.
 */
const facts = (ids: IdFactory, context: PageContext): LoomNode =>
  section(ids, { tone: "surface", width: "wide", eyebrow: BAND.facts }, "Built in the open", [
    prose(
      ids,
      "Not one of these numbers was typed from memory. Each is checked against the code it describes.",
      { align: "center", tone: "muted", measured: true }
    ),
    buildElement(ids, {
      type: "loom.stat-grid",
      props: { columns: "three", align: "center" },
      children: [
        /**
         * The caption changed on 8 September, and it is the smallest available
         * repair to a contradiction this page has carried since it had numbers.
         *
         * *"Ready-made pieces to build with"* is one screen above a questions
         * band answering *"can the AI write code into my page?"* with *"it can
         * only use the pieces **you handed it**"*, and one screen below a card
         * saying it *"only rearranges pieces **you built and already trust**"*.
         * All three are true and no test could see anything wrong, because
         * nothing is: the library exists and a host describes its own components
         * too. A stranger reading top to bottom is given two answers to *where do
         * the pieces come from* and no way to tell they are halves of one.
         *
         * The old caption said that a piece takes its colors from the theme —
         * true, and the site demonstrates it in the footer with a switcher rather
         * than needing to claim it here. This one says the thing nothing else on
         * the site says, and `/your-components` is the page that says it in full.
         */
        buildElement(ids, {
          type: "loom.stat",
          props: {
            value: FACTS.primitives,
            label: "ready-made pieces to build with",
            caption:
              "A starting point, not the deal: components you already built join the same list.",
          },
        }),
        buildElement(ids, {
          type: "loom.stat",
          props: {
            value: FACTS.decisions,
            label: "decisions written down",
            caption: "What was chosen, what was rejected, and why — written before the code, kept after it.",
          },
        }),
        buildElement(ids, {
          type: "loom.stat",
          props: {
            value: FACTS.operations,
            label: "kinds of change there are",
            caption: "Add something, remove something, move something, change a setting. That is the whole list.",
          },
        }),
      ],
    }),
    /**
     * Three now, and the new one leads. It sits here rather than in the band of
     * ways in, which is exactly the four surfaces and must stay that way, and
     * rather than in the questions band, whose answers are props and cannot
     * carry a link.
     *
     * **There is a second reason for not putting it in the questions band, and
     * it cost ten tests to learn.** The first version of this link went there,
     * under the two answers that make its claim — *nothing you have to host with
     * us*, and *Loom runs inside your own application*. That is where a reader
     * meets the question, and it is still the wrong place: *Take the questions
     * off the page* is one of the five requests this site offers, the rules
     * weigh how much a request removes, and one more row in that band pushed the
     * removal from **landed** to **held**. The front door's own demonstration —
     * three land, one is refused, one stops and asks — is the argument of the
     * band above it and was declared in code two days ago. A navigation link is
     * not worth quietly re-answering it.
     *
     * That is the site's rules working exactly as the site says they do, on the
     * site itself, and it is worth knowing that adding anything to a band a
     * request can remove is a change to what that request costs.
     */
    stack(ids, { direction: "row", gap: "snug", justify: "center", wrap: true }, [
      action(
        ids,
        "What you would be running",
        internalHref(context.origin, WHAT_YOU_RUN.path, context.theme),
        { variant: "quiet", scale: "small" }
      ),
      action(ids, "Read the decisions", DECISIONS_URL, {
        variant: "quiet",
        scale: "small",
        external: true,
      }),
    ]),
  ])

/**
 * The questions band, rendered from `questions.ts`.
 *
 * The five were written inline here until 27 September, when the structured
 * data this site hands a search engine grew a `FAQPage` built from the same
 * answers. Two readers, one list: an answer reworded on the page and not in the
 * schema would be the site telling a person one thing and an assistant another,
 * and nothing on any screen would say so.
 *
 * Nothing a visitor sees changed. The `open` on the first is the band's
 * business rather than the schema's, so it rides along on the data and the
 * schema ignores it.
 */
const questions = (ids: IdFactory): LoomNode =>
  section(ids, { width: "wide", eyebrow: BAND.questions }, "The ones worth asking first", [
    buildElement(ids, {
      type: "loom.faq-list",
      props: { columns: "two" },
      children: siteQuestions().map((entry) =>
        buildElement(ids, {
          type: "loom.faq",
          props: {
            question: entry.question,
            answer: entry.answer,
            ...(entry.open === true ? { open: true } : {}),
          },
        })
      ),
    }),
  ])

/**
 * How a surface is offered here: the verb, and the mark above it.
 *
 * The sentence is **not** here — it is `Surface.blurb`, so the words a visitor
 * reads on this card and the words under the same link in the footer cannot
 * drift apart. What lives here is the part that is this band's rather than the
 * surface's: a card invites, so it says *Read the docs* where a menu item says
 * *Docs*.
 *
 * **The glyph is gone**, and it is the one thing this record lost. Four cards
 * carried `▶ ▤ ◍ ◉` — a triangle, a page, a disc and a dot, chosen one at a
 * time and reading as four unrelated marks rather than a set. An icon set is a
 * registry of its own and this lane does not have one, which `loom.feature`'s
 * own note says plainly; picking single glyphs out of Unicode until they look
 * about right is that note being ignored. The cards are stronger with a verb
 * and a cost than with a decoration nobody can read.
 *
 * Keyed by path and held total by a test. The band enumerated its three cards by
 * hand until 21 August, and the merge that added the lessons course to
 * `PRODUCT_SURFACES` proved why that was wrong: the course appeared in the
 * header and in the footer and silently not here, in a band whose own comment
 * promised it could not.
 */
const WAYS_IN: Readonly<Record<string, { readonly title: string }>> = {
  [DEMO.path]: { title: "Try it yourself" },
  [DOCS.path]: { title: "Read the docs" },
  [LESSONS.path]: { title: "Take the course" },
  [PORTAL.path]: { title: "Open the portal" },
}

/**
 * The ways further in, on the page rather than only in the chrome.
 *
 * The front door's job is not finished when a visitor has read it. Every other
 * surface is a path on this same origin (0067, 0070), so the band that sends
 * someone to them is part of this page and not a footer afterthought — and each
 * card is honest about what is behind it, which is why the portal's says that
 * signing in is required rather than pretending the whole product is one click
 * away.
 *
 * **That last clause was false from 25 August until 10 September, and it is the
 * clearest example this lane has of a guarantee outliving the code that kept
 * it.** The portal's blurb did say signing in was required; the run that gave
 * every surface a `cost` moved that out to keep four blurbs one length, wrote
 * *Costs you an account* in its place, and left this note promising a property
 * the band no longer had. An account is not a cost a reader can pay — nobody
 * reading this site can obtain one by deciding to — so the card had not merely
 * gone quiet about the door, it had started describing it wrongly.
 *
 * `doorOf` puts it back, in the body rather than the blurb, and the type makes
 * it structural: a guarded surface without a `door` no longer compiles. The
 * note is checked rather than promised now — `pages.test.ts` renders this band
 * and holds the sentence to it.
 *
 * **It is the four surfaces and nothing else**, as of 22 August. A fifth card
 * pointed at the repository, which was fine while there were three of them and
 * wrong once the demo made it four: five cards in a grid that wraps at four
 * leaves one card alone on a second row, and the odd one out would have been the
 * only card in the band that is not a page of this product. The repository is
 * still offered twice on this page — the facts band and the closing band — and a
 * third time in the footer's map, so nothing was taken away from a reader.
 *
 * The band is now exactly `PRODUCT_SURFACES`, which is what makes the throw
 * below the whole of its contract rather than half of it.
 *
 * **It is `loom.card` rather than `loom.feature` as of 25 August, and the
 * reason is the bottom of the cards.** `loom.feature`'s interior is its props —
 * a glyph, a title, a sentence — stacked from the top, so four cards holding
 * four sentences of four different lengths are four cards that stop at four
 * different heights inside one row that stretches them all to the tallest. Two
 * of the four were running better than a third empty, and the band that exists
 * to send a visitor onward was the worst-composed thing on the page.
 *
 * Evening the sentences up would have been treating the symptom, and it does
 * not survive the next surface anyway. `loom.card`'s `footer` is *pinned to the
 * bottom and ruled off* — the region exists for exactly this, and its own note
 * says so: a row of cards of unequal length still has its footers on one line.
 * So the sentence may be whatever length it honestly needs to be, and the four
 * costs land on a single line across the row, which is also the line a reader
 * comparing four destinations is actually reading along.
 *
 * Nothing was added to the library to do it. A card, a heading, a sentence, a
 * rule and four words, all registered before this run started.
 */
const waysIn = (ids: IdFactory, context: PageContext): LoomNode =>
  section(ids, { tone: "surface", width: "wide", eyebrow: BAND.waysIn }, "Where to go from here", [
    buildElement(ids, {
      type: "loom.grid",
      props: { columns: "four", gap: "snug" },
      children: PRODUCT_SURFACES.map((surface) => {
        const way = WAYS_IN[surface.path]

        if (way === undefined) {
          throw new Error(`loom: ${surface.path} is offered nowhere on the front door`)
        }

        const door = doorOf(surface)

        return buildElement(ids, {
          type: "loom.card",
          props: { href: surfaceHref(context.origin, surface) },
          children: [
            heading(ids, 3, way.title),
            prose(ids, surface.blurb, { tone: "muted" }),
            /**
             * The one card with a door says so here, in the body, and not in
             * the footer where the cost is. The costs are read along one line
             * across the row — that is the whole reason they are pinned — and a
             * sentence dropped into that line would be read as a fourth cost
             * and would break the line for the other three.
             */
            ...(door === undefined ? [] : [prose(ids, door, { size: "small", tone: "muted" })]),
            buildSlot(ids, "footer", [prose(ids, surface.cost, { size: "small", tone: "muted" })]),
          ],
        })
      }),
    }),
  ])

/**
 * The last word, and it used to end on a sentence that was not true.
 *
 * *"None of it was written by hand"* stood here from 19 August until this run.
 * What it meant is that no band of this page is written out as a web page,
 * which is true and is now a band of its own further up. What it **said**, to
 * somebody who has never heard of any of this, is that nobody wrote the words —
 * and every word on this site was written by a person. It was also false in the
 * one way a reader could catch: the button directly beside it says *Read the
 * source*, and the source is a file with that sentence typed into it.
 *
 * The clause that replaces it is the same reassurance said accurately, and it
 * is the answer to the first problem the page named an hour of reading ago: a
 * tool that generates components hands you work rather than taking it away.
 */
const closing = (ids: IdFactory, context: PageContext): LoomNode =>
  section(ids, { tone: "accent", width: "full" }, "This page was built the way yours would be.", [
    prose(
      ids,
      "The menu, the questions, this sentence — every one of them is a piece the AI could be asked to move, and none of it is code you would have to read afterwards.",
      { tone: "muted", align: "center", measured: true }
    ),
    stack(ids, { direction: "row", gap: "snug", justify: "center", wrap: true }, [
      action(
        ids,
        "See how a change travels",
        internalHref(context.origin, HOW_IT_WORKS.path, context.theme),
        { variant: "primary", scale: "large" }
      ),
      action(ids, "Read the source", REPOSITORY_URL, {
        variant: "secondary",
        scale: "large",
        external: true,
      }),
    ]),
  ], { align: "center" })

export const homePageTree = (context: PageContext): LoomTree => {
  const ids = sequentialIdFactory("home")
  /**
   * The most recent thing that happened to this page, which the notice at the
   * top reports: the undo once the visitor has put a change back, and the change
   * itself until then.
   */
  const latest = context.undone ?? context.record
  const chrome: ChromeContext = {
    origin: context.origin,
    theme: context.theme,
    current: HOME,
    counting: context.counting === true,
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
         * The answer, before the pitch, and only for a visitor who asked.
         *
         * It sits above the opening band rather than inside it because the
         * opening band is one of the things a request may configure — *Turn it
         * down* changes its backdrop and how tall it stands — and a band whose
         * props are a demonstration must not also be a status display. Above it
         * the notice is the first thing under the menu in every state, which is
         * where a browser leaves a reader who has just followed a link.
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
                ...(context.approve === undefined ? {} : { approve: context.approve }),
                ...(context.back === undefined ? {} : { back: context.back }),
                ...(context.backApprove === undefined ? {} : { backApprove: context.backApprove }),
              }),
            ]),
        hero(ids, context),
        vocabulary(ids),
        /**
         * Third band, and deliberately before anything that argues for the
         * product. The hero has made the claim and the four words have named
         * the steps; the next thing a visitor meets should be the claim being
         * true, not four features explaining why it would be.
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
        /**
         * The same claim with the training wheels off, directly under the band
         * that has been apologising for them since 22 August.
         *
         * The band above runs five requests written in advance, because a text
         * box on the most-loaded page the project has is a model call for every
         * visitor. This one is the demonstration itself, framed — §4d's
         * *embeds the demonstration rather than describing it*, which is the
         * reason the demonstration is public at all (0056). It was built and
         * withdrawn on 4 September over a sandbox that had no `allow-forms`;
         * 0135 settled that on 12 September and this is the rebuild.
         *
         * Here rather than lower down because the likeliest person on this site
         * to want a turn is the one who has just watched the sequence run, and
         * because the frame loads lazily — a visitor who never scrolls this far
         * never fetches it.
         */
        inYourOwnWordsBand(ids, { origin: context.origin, theme: context.theme }),
        problems(ids),
        /**
         * A rule rather than the diamond this band wants: `loom.divider`'s
         * `diamond` and `dots` ornaments collapse to a mark at the start of the
         * line instead of spanning it, filed as a finding on 19 August. The
         * page uses what renders correctly today.
         */
        buildElement(ids, { type: "loom.divider", props: { ornament: "rule" } }),
        facts(ids, context),
        questions(ids),
        waysIn(ids, context),
        closing(ids, context),
        ...siteReadingBand(ids, chrome),
        siteFooter(ids, chrome),
      ],
    }),
    ids
  )
}
