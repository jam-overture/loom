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
import { action, heading, prose, section, stack, TERTIARY_CONTROL } from "../nodes"
import {
  DECISIONS_URL,
  DEMO,
  DOCS,
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
        /**
         * **`align` is set here because the hero's own `align` does not reach
         * the words.** `loom.hero`'s `align: "center"` sets `alignItems` on the
         * column it lays out, which centres each child's *box*; the text inside
         * a box is still ranged left until the node holding it says otherwise.
         * `loom.prose` below has said so since the band was written and
         * `loom.heading` had not, so the largest words on the site were the one
         * thing on the first screen that was not centred: at 1280 a two-line
         * headline sat 140px left of the page's centre line under a centred
         * eyebrow, and at 390 it was five hard-left lines in a 254px column
         * between a centred eyebrow and a centred paragraph.
         *
         * Filed for `Loom primitives` as well, because a band prop named
         * `align` that aligns the boxes and not the text is a trap every
         * composition walks into once. This is the composition's half of it,
         * and it is correct whatever that prop grows into: a heading that says
         * where it stands does not change meaning when the band around it
         * learns to say the same thing.
         */
        heading(ids, 1, "The AI age needs a new way to build web apps.", {
          balance: true,
          align: "center",
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
/**
 * **The definition, and it is the maintainer's of 1 October.**
 *
 * His words: *"What is Loom? A governance framework for modern AI enabled web
 * development and adaptation."* It sits directly under the opening because it
 * is the answer to the first question a stranger has, and until now the page
 * answered it only by implication — a manifesto headline, then four words of
 * vocabulary, then a demonstration. Somebody could read three screens and still
 * not have been told what the thing *is*.
 *
 * ## Why it is a heading rather than a paragraph
 *
 * It is one sentence and it is the sentence the rest of the page elaborates, so
 * it is set at heading size and nothing else shares the band. A definition
 * folded into a paragraph is a definition a reader skims past.
 *
 * ## The gloss underneath is not decoration
 *
 * **"Governance framework" is a boardroom phrase**, and this lane is held to a
 * high schooler following what is going on. The phrase is right for the buyer
 * `docs/rollout.md` records — *"regulated teams, agencies answering to clients,
 * anyone with a compliance function"* — and it is a phrase a developer
 * evaluating on a lunch break can bounce off. So the line under it says the
 * same thing in words nobody needs a glossary for, and the two together are the
 * band: the term for the person who was looking for that term, and the plain
 * reading for everybody else.
 *
 * Nothing here says `TreeDelta`, `disposition` or `the Gate`.
 */
const whatIsIt = (ids: IdFactory): LoomNode =>
  section(
    ids,
    { width: "wide", eyebrow: BAND.whatIsIt },
    "A governance framework for modern AI-enabled web development and adaptation.",
    [
      prose(
        ids,
        "In other words: an AI model can change your live site, but only in the ways you approved first. You can see every change it made, and you can undo any of them.",
        { size: "lead", measured: true }
      ),
    ]
  )

/**
 * The four beats, as data, because the shape is checked rather than described.
 *
 * `state` is what separates the two halves visually: `done` is a thing you have
 * finished doing, `current` is a thing that is happening now and will be
 * happening on the next visit too. That is the primitive's own vocabulary used
 * for what it means, rather than a colour chosen to make two look different
 * from two.
 */
type UsingItStep = {
  readonly marker: string
  readonly title: string
  readonly body: string
  readonly state: "done" | "current"
}

const USING_IT: readonly UsingItStep[] = [
  {
    marker: "1",
    title: "Build your components",
    body: "Use whatever framework you already use. Loom does not write code into your page, and it does not ask you to rebuild anything.",
    state: "done",
  },
  {
    marker: "2",
    title: "Register them with Loom",
    body: "Tell Loom which of your components the AI is allowed to use. That is all the setup there is.",
    state: "done",
  },
  {
    marker: "3",
    title: "Hook up your preferred AI model",
    body: "Loom is AI model agnostic. Pick the model you already use, or bring your own. Loom sends it what your users are doing, and it suggests changes from there.",
    state: "done",
  },
  {
    marker: "4",
    title: "Adapt your page, on your rules",
    body: "Define your acceptance policy up front, so an AI model can only make changes you already approved. Anything else gets rejected, and Loom tells you why.",
    state: "current",
  },
]

/**
 * **How you would use this, said plainly, before anything is demonstrated.**
 *
 * Placed directly under the plain-words band, at the maintainer's direction of
 * 30 September: the four words say what a change *is*, and this says what
 * **you** do about it, so the two read as one answer to *what is this and how
 * would I use it* before the demonstration below asks anybody to watch
 * anything.
 *
 * The front door argued *why* for five weeks and never once said *what you
 * would do*. Every other band is a claim about the world, a list of what goes
 * wrong without this, a number, a question, or the product changing itself in
 * front of you — all of it true, none of it an answer to the first thing a
 * developer wants to know. A visitor could watch the demonstration work and
 * still not know whether using it means rewriting their components.
 *
 * ## The shape is the argument, and it is not four equal steps
 *
 * The four beats divide two and two, and the division is the sell. **One and
 * two are things you do once.** Three and four are what happens afterwards,
 * on every visit, without you. A row of four identical boxes would read as
 * four chores; the heading and the markers carry the split instead, so the
 * payoff — *the work stops at two* — is the thing a reader takes away.
 *
 * `loom.milestone-row` is the primitive for it and this page had never used
 * it. Its own docstring is exact about why it exists rather than the rail on
 * `/how-it-works`: *"a roadmap is read down because time runs that way, and
 * three steps are read across because they are meant to be taken in at once."*
 * This band is the second kind. The five-step `JOURNEY` on `/how-it-works` is
 * the first, and the two must not be confused — that one is what happens to
 * **one change**, in milliseconds, at runtime; this one is what **you** do, in
 * an afternoon, once.
 *
 * ## The fourth beat carries the record, and that is deliberate
 *
 * *"Your AI adapts your page"* is where the maintainer's sketch of this band
 * ended, and ending there would sell the half a competitor can also claim.
 * `docs/rollout.md` has the positioning on record: **the differentiator is not
 * adaptation, it is the record.** So the fourth beat is the change *and* what
 * is kept about it, which is also what turns the last step back toward the
 * reader instead of trailing off the edge of the band.
 *
 * ## The vocabulary, checked against the brief
 *
 * *Monitor* is not used, though it is the word in the sketch: to a stranger it
 * means uptime and dashboards. What actually happens is that the page reports
 * which of its parts a reader reached, how long they stayed and what they
 * pressed — and never who they are (0146), which is a property of the record
 * rather than a setting, and is worth the words here because *your AI watches
 * your users* is the sentence in this band most likely to alarm somebody.
 *
 * Nothing here says `TreeDelta`, `disposition` or `the Gate`.
 */
const usingIt = (ids: IdFactory): LoomNode =>
  section(
    ids,
    { width: "wide", eyebrow: BAND.usingIt },
    "Four steps. Your rules decide.",
    [
      prose(
        ids,
        "You keep your framework and your components. Loom needs two things from you: which components an AI model is allowed to use, and what it is allowed to do with them.",
        { size: "lead", measured: true }
      ),
      buildElement(ids, {
        type: "loom.milestone-row",
        props: { rail: "line", density: "loose" },
        children: USING_IT.map((step) =>
          buildElement(ids, {
            type: "loom.milestone",
            props: {
              marker: step.marker,
              title: step.title,
              body: step.body,
              state: step.state,
            },
          })
        ),
      }),
    ]
  )

const problems = (ids: IdFactory): LoomNode =>
  section(
    ids,
    { eyebrow: BAND.problems, width: "wide" },
    "The hard part is answering for what it changed",
    [
      prose(
        ids,
        "Getting a machine to change your page is easy now. Being able to say what it changed, and put it back, is not.",
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
              body: "When a tool writes components for you, somebody still has to read, review and own every line. Loom does not write code. It rearranges components you already built.",
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
              body: "Loom works out how to undo a change at the same time it makes it, and saves both. Putting the page back takes one press, and that gets recorded too.",
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
  section(ids, { width: "wide", eyebrow: BAND.facts }, "Built in the open", [
    /**
     * **Ranged left, as of this run, because it is the only alignment this band
     * can actually hold all the way through.**
     *
     * It was centred, under an eyebrow and a heading that are not — so a
     * stranger met *Built in the open* hard against the left edge with 700px of
     * nothing beside it and the sentence belonging to it floating in the middle
     * of the band. Caught by `alignment.test.ts`, which was written for the
     * headline above and found this on the same page.
     *
     * The other reading — centre the whole band, the way the hero and the
     * closing band are centred — is **not available to a composition**, and
     * that is a finding rather than a preference. `loom.section` has no `align`
     * of its own, and it renders its own eyebrow with no `textAlign`, so
     * `WHERE IT IS TODAY` stays left whatever the nodes inside the band say.
     * Centring the heading here would have swapped one disagreement for a
     * worse-looking one. Filed for `Loom primitives`; if `align` arrives on
     * `loom.section`, this band is the first place worth reconsidering.
     *
     * The three stats keep their own `align: "center"`, and that is not the
     * same claim: a stat centred inside its column is one of three marks laid
     * out across a row, not a line of the band's running text.
     */
    prose(
      ids,
      "Every number here is checked against the code it describes. None of them was typed from memory.",
      { tone: "muted", measured: true }
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
              "A starting point, not a limit. Components you already built join the same list.",
          },
        }),
        buildElement(ids, {
          type: "loom.stat",
          props: {
            value: FACTS.decisions,
            label: "decisions written down",
            caption: "What was chosen, what was rejected, and why. Written before the code and kept afterwards.",
          },
        }),
        buildElement(ids, {
          type: "loom.stat",
          props: {
            value: FACTS.operations,
            label: "kinds of change Loom allows",
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
        TERTIARY_CONTROL
      ),
      action(ids, "Read the decisions", DECISIONS_URL, {
        ...TERTIARY_CONTROL,
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
 * **What says it now is the cost line, and it is four words rather than a
 * paragraph.** *Costs you an invitation* is the honest word for a door somebody
 * else opens, it sits on the one line a reader compares the four destinations
 * along, and `site.test.ts` holds it there. `PORTAL.door` says the rest — who
 * writes the list — in the questions band two bands above, which is where a
 * reader who wants that answer goes looking for it.
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
 * different heights inside one row that stretches them all to the tallest.
 * `loom.card`'s `footer` is *pinned to the bottom and ruled off*, so the four
 * costs land on a single line across the row whatever the bodies above them do
 * — which is also the line a reader comparing four destinations reads along.
 *
 * **That fixed the footers and it did not fix the band**, which is the whole of
 * what this run changed and is worth writing down because the note here said
 * otherwise for five weeks. It said evening the sentences up would be treating
 * the symptom. Photographed on a production build at 1280, the symptom was the
 * band: the portal's card said forty-eight words where its three neighbours
 * said twenty-two, so every card was stretched to the tallest and three of the
 * four carried **166px of nothing** between the last line of the sentence and
 * the rule above the cost — taller than the sentence itself. A pinned footer
 * puts the four costs on one line; it cannot put anything above them.
 *
 * So the sentences are evened up after all, by taking one away rather than
 * writing three. What made the note's objection reasonable — that hand-tuning
 * four strings does not survive a fifth surface — is answered by
 * `balance.test.ts` rather than by leaving the band as it was: the ratio is
 * stated over every row of cards on every route, so a blurb written at twice
 * its neighbours' length is red on the run that writes it.
 *
 * Nothing was added to the library to do it. A card, a heading, a sentence, a
 * rule and four words, all registered before this run started.
 */
const waysIn = (ids: IdFactory, context: PageContext): LoomNode =>
  section(ids, { width: "wide", eyebrow: BAND.waysIn }, "Where to go from here", [
    buildElement(ids, {
      type: "loom.grid",
      props: { columns: "four", gap: "snug" },
      children: PRODUCT_SURFACES.map((surface) => {
        const way = WAYS_IN[surface.path]

        if (way === undefined) {
          throw new Error(`loom: ${surface.path} is offered nowhere on the front door`)
        }

        return buildElement(ids, {
          type: "loom.card",
          props: { href: surfaceHref(context.origin, surface) },
          children: [
            heading(ids, 3, way.title),
            prose(ids, surface.blurb, { tone: "muted" }),
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
      "The menu, the questions, this sentence: every one of them is a piece the AI could be asked to move. None of it is code you would have to read afterwards.",
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
        hero(ids, context),
        whatIsIt(ids),
        vocabulary(ids),
        usingIt(ids),
        /**
         * Third band, and deliberately before anything that argues for the
         * product. The hero has made the claim and the four words have named
         * the steps; the next thing a visitor meets should be the claim being
         * true, not four features explaining why it would be.
         */
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
