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

import { BAND, WHY_USE_IT_ANCHOR } from "../bands"
import {
  siteFooter,
  siteHeader,
  siteReadingBand,
  type ChromeContext,
} from "../chrome"
import { CHAIN, shownAt } from "../chain"
import { FACTS, HEADLINE, INSTALL_COMMAND, RUNTIME_PACKAGE, STARTER_PACKAGE } from "../copy"
import { costs } from "../costs"
import { DECISION_RECORDS, INSTALLATION } from "../docs-pages"
import { PLAIN_WORDS_GLOSSED, PLAIN_WORDS_LABEL } from "../journey"
import { siteQuestions } from "../questions"
import {
  action,
  code,
  codeSpan,
  heading,
  prose,
  proseParts,
  section,
  stack,
  TERTIARY_CONTROL,
  inlineLink,
} from "../nodes"
import {
  DOCS,
  HOME,
  LESSONS,
  NPM_PACKAGE_URL,
  PORTAL,
  PRODUCT_SURFACES,
  REPOSITORY_URL,
  SITE_THEMES,
  sitePath,
  type SiteThemeName,
  surfacePath,
  WHAT_YOU_RUN,
  WHY_USE_IT,
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

/**
 * Everything a page of this site is a function of, and **every field of it is
 * something the address said.**
 *
 * That is a property as of 21 October rather than a coincidence. The context
 * carried a `counting` boolean — whether this deployment counts the person
 * reading the page — which was the one fact about the *deployment* in here,
 * and it was put here when a page could say so in words. The footer's line
 * came off the site on 12 October and `/what-you-run`'s sentence with it, so
 * from then on the field was threaded through three types and read by nobody.
 *
 * Whether readers are counted is a render option now
 * (`SiteRenderOptions.addressed`): it decides what the markup carries and
 * nothing about what the page says. The site's pages are **stored** rows
 * (0259), and the clean way to put that is that a stored page cannot be a
 * function of a setting a later deployment may have changed — so the fields
 * here are the ones a row can honestly be rebuilt from.
 *
 * **The origin went the same way today, and it is the same shape of mistake
 * one layer down.** It was the other fact about the deployment in here: which
 * host this page is being served from. A stored row is served from every host
 * this deployment answers on, so a page that is a function of one of them is a
 * row that is wrong everywhere else — which is why every link in a tree on this
 * site became a path on 12 October. After that there was one caller left, a
 * control on `/how-it-works` that linked to the address it was drawn on, and
 * the field outlived it by three weeks.
 *
 * The origin still decides one thing, and it is a render concern: which origin
 * this page may frame. So it is a render option beside `addressed`, and a page
 * builder is handed neither. `pages/see-it-happen.ts` has the control, and
 * `render.ts` has the seam.
 */
export type PageContext = {
  readonly theme: SiteThemeName
}

const hero = (ids: IdFactory): LoomNode =>
  buildElement(ids, {
    type: "loom.hero",
    props: {
      backdrop: "grid",
      align: "center",
      stature: "tall",
      /**
       * **The eyebrow says whose stack this is, as of 25 October.**
       *
       * It read *For pages that AI is allowed to change* from 20 August, which
       * is the governance story in six words at the very top of the page.
       * `docs/positioning.md` settled on 24 October that the governance is
       * under the hood and the build case is the pitch, and that the reader is
       * *"a junior level developer"* who builds web pages. The first words such
       * a reader meets should tell them it is for their stack, which is also
       * the first link of the chain in the band below.
       */
      eyebrow: "A framework for React and TypeScript",
    },
    children: [
      buildSlot(ids, "heading", [
        /**
         * **The headline is the maintainer's, and no run changes it.** The
         * literal is `HEADLINE` in `copy.ts`, which has its history: written
         * by him on 27 September, swapped out on 24 October on a misreading,
         * restored at his instruction on 7 November. `headline.test.ts` pins
         * it word for word.
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
        heading(ids, 1, HEADLINE, {
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
        "AI already writes the components, but would you trust AI to dynamically change your web page? What your page evolves to is yet to be built. Loom and AI are how your page evolves together.",
        { size: "lead", measured: true, align: "center" }
      ),
      buildSlot(ids, "actions", [
        /**
         * **It landed at the top of `/why-use-it` until today**, and the press
         * is the argument.
         *
         * The label is this lane's own, written on 1 November when
         * [0328](../../../../../decisions/0328-the-marketing-site-has-no-demonstration-and-no-mechanism-page.md)
         * took the demonstration away and the hero's two controls both pointed
         * at pages that no longer existed. The destination was not chosen with
         * it: it is the page, bare, so a reader pressing *See what you can
         * build* arrives on a headline reading *You could build all of this
         * yourself* — the work argument, which is the right first screen for
         * that page and an answer to a different question from the one the
         * button asked. On a phone the band that does answer it is four
         * screens further down.
         *
         * `theSet` is that band, and the three after it read as one run from
         * there: every part that comes with the install, the sections that come
         * already assembled out of them, what adding one of your own costs,
         * and a page built from the set. `anchors.test.ts` holds the fragment
         * against the band on the page it is served from.
         *
         * **It is a destination and not a rewrite of the page.** What the
         * reader skipped is reachable by scrolling up, by the menu, and by the
         * chain's first rung one band below this one, which points at
         * `staysYours` on the same page.
         */
        action(
          ids,
          "See what you can build",
          `${sitePath(WHY_USE_IT.path)}#${WHY_USE_IT_ANCHOR.theSet}`,
          { variant: "primary", scale: "large" }
        ),
        /**
         * **The second action was the demonstration until 31 October**
         * ([0328](../../../../../decisions/0328-the-marketing-site-has-no-demonstration-and-no-mechanism-page.md)),
         * and it is the documentation now. It is the only other surface a
         * stranger can open without an account, and it is where a reader who
         * has decided they want this goes next.
         */
        action(ids, "Read the docs", surfacePath(DOCS), {
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
/**
 * **The chain, which is the first thing under the hero as of 25 October.**
 *
 * `docs/positioning.md` records the maintainer's answers of 24 October, and two
 * of them are what this band is:
 *
 * > React/TypeScript components > Loom framework / Primitives > Loom designed
 * > web page > Signals broadcasting to your AI model > AI reacting to signals
 * > and redesigning page > Greater user engagement and conversion
 *
 * and *"A page that explains those six in order, in words a junior developer
 * reads once, is the site."* The six links are in `chain.ts` with his wording
 * beside each rendering, and `chain.test.ts` holds this band to his order.
 *
 * ## Why it goes above everything that argues for the product
 *
 * His other answer that day was *"Don't worry about the controls. That is the
 * stuff under the hood. The building part and why this build is better than
 * traditional methods is preferred."* So the band a visitor meets after the
 * headline is **what you can build**, and the rules, the record, the refusals
 * and the undo are what they meet after that.
 *
 * That reverses the order this page has had since August and it is the point of
 * the change. *What is Loom?* used to be the second band and opened *"A
 * governance framework for modern AI-enabled adaptive web pages"*, which is a
 * true sentence answering a question nobody has asked yet. It moved below this
 * band on 25 October, and came off the page on 11 November at the maintainer's
 * word, along with *Using it* and *What this is for*.
 *
 * ## The marker column names the actor, and that is the argument
 *
 * `loom.milestone`'s `marker` is free text, so it carries *who does this one*
 * rather than a number. Two reasons, and the second is the load-bearing one.
 *
 * It makes the shape of the chain readable at a glance: **You, You, Loom, Your
 * page, Your AI model, Your readers.** The work stops at the second rung, which
 * is the sell.
 *
 * And **a number here would break the one thing `journey.ts` exists to hold.**
 * The page one press away says *five steps* about what happens to one change,
 * and a visitor who reads a second count on the first screen has been shown that this site cannot count the
 * thing it offers to count for them. So nothing here is numbered and no
 * sentence on this site says how long the chain is.
 *
 * ## The lead, and the one claim
 *
 * The lead says the two-and-four split in words, because the marker column says
 * it to somebody who is reading and not to somebody who is scanning.
 *
 * The last rung is his phrasing, verbatim, and it is the only outcome this site
 * promises. `docs/positioning.md`: *"Greater user engagement and conversion is
 * the maintainer's own phrasing and is the payoff the site is allowed to
 * promise."* Writing a better-sounding version of it is exactly the thing this
 * lane may not do, so it is quoted and sits in `MAINTAINERS_OWN`.
 *
 * Nothing here says `TreeDelta`, `disposition` or `the Gate`.
 *
 * ## Each rung is the way to the band that shows it, as of 30 October
 *
 * The chain was six claims and six dead ends. Five of the six are demonstrated
 * somewhere on this site already, and a visitor reading the first band under
 * the headline had no way to find out — the paths existed, nothing pointed
 * along them. `shownAt` says where each one goes and `chain.test.ts` holds
 * every destination to being served and to still declaring the anchor.
 *
 * It costs no copy, which is the reason it is this rather than a band arguing
 * the same thing. The press is the argument.
 *
 * The sixth is unlinked and `chain.ts` says why at length: it happens on the
 * reader's page rather than on ours, so the shape of the band is *the work
 * stops at the second rung, the showing stops at the fifth, and the last one
 * is what the other five are for.*
 */
const chain = (ids: IdFactory): LoomNode =>
  section(
    ids,
    { width: "wide", eyebrow: BAND.chain },
    "What happens between your components and your readers",
    [
      prose(
        ids,
        "You do the first two. Loom and your AI model do the rest, every time somebody opens your page.",
        { size: "lead", measured: true }
      ),
      /**
       * **The hint, and it is here because the library cannot draw the
       * affordance it stands in for.**
       *
       * A `loom.milestone` carrying an `href` renders `.loom-underline`, whose
       * rest state is `background-size: 0% 2px` — so a rung that is a link is
       * pixel-identical to a rung that is not until a pointer touches it. On a
       * phone nothing ever does ([0236](../../../../../decisions/0236-a-viewport-names-a-device-and-the-pointer-is-part-of-it.md)
       * made the harness honest about `hover: none`, and the phone shot of this
       * band shows five links a reader cannot find). `loom.card` already
       * answers this for itself by defaulting `elevation` to `raised` when it
       * is linked; the rail primitives have no equivalent, and that is filed
       * for `Loom primitives` rather than worked around in `src/`.
       *
       * So the composition says in words what the library cannot say in paint.
       * **When that finding is met this line comes off** — it is scaffolding,
       * and it is marked as such here so the run that removes the gap knows to
       * remove the sentence with it.
       *
       * *A step* rather than *any step* or *every step*: the last rung has
       * nowhere to go and never will, and a universal would be a promise this
       * band breaks once. It also says no number, which is the one thing this
       * band may not do — see the note above on why nothing here is counted.
       */
      prose(ids, "Press a step to see that part of it working on this site.", {
        size: "small",
        tone: "muted",
      }),
      buildElement(ids, {
        type: "loom.milestone-list",
        props: { rail: "line", density: "loose" },
        children: CHAIN.map((rung) => {
          const shown = shownAt(rung)

          return buildElement(ids, {
            type: "loom.milestone",
            props: {
              marker: rung.actor,
              title: rung.title,
              body: rung.body,
              ...(shown === undefined ? {} : { href: shown }),
            },
          })
        }),
      }),
    ]
  )

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
 * Numbers counted from the thing they are about, rather than typed from memory.
 *
 * The line under the heading is a claim about this band, so it is worded to be
 * true of all three figures rather than of the two the page works out for
 * itself: every one of them is held against the code by a test, and the record
 * count is held as a floor it can never exceed. See `FACTS` in `copy.ts`.
 */
const facts = (ids: IdFactory): LoomNode =>
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
         * the site says; the retired `/your-components` said it in full, and
         * *What you bring* on `/what-you-run` does now.
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
        sitePath(WHAT_YOU_RUN.path),
        TERTIARY_CONTROL
      ),
      /**
       * **A page of this site, as of 19 October, and it used to leave it.**
       *
       * It pointed at `decisions/` on GitHub, which is a directory listing:
       * 277 filenames in a column, no titles, no standing, and the reader out
       * of the product one press after being told the project writes down what
       * it rejected. `(docs)` builds the readable version of the same index —
       * every record by title, in force or replaced, and the total stated
       * exactly — so that is where the number's own control goes now.
       *
       * The repository is still a press away: every title on that page opens
       * the file, and the footer offers `decisions/` under *The project*
       * beside *Source*, which is the frame a reader looking for the folder is
       * already in.
       */
      action(ids, "Read the decisions", DECISION_RECORDS.path, TERTIARY_CONTROL),
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
 * The ask, and the first time the front door has carried one.
 *
 * Every control on this page before 11 October sent a reader somewhere else to
 * read more: the demonstration, `/how-it-works`, the repository, the four cards
 * below. A visitor persuaded by all of it had nothing to press that would
 * *start* them — **the two package names were nowhere on this site**, in any
 * band, on any route, which a search of this directory said plainly on the day
 * the conversion objective was written.
 *
 * That is the band's whole justification and it is worth stating as the
 * measurement problem it was. `docs/adaptation.md` names *readers who reach the
 * install ask* as the thing the loop optimises. A funnel whose last step is not
 * on the surface being measured cannot be measured: a model pointed at this
 * page would have been asked to raise a number the page had no way of
 * producing, and every proposal it made would have been scored against noise.
 *
 * **One band, directly under the chain, as of 11 November.** It sat after the
 * questions until the maintainer moved it above the four plain words and
 * headed it *Just want to get started?*: a reader who already knows what they
 * want should not have to scroll past the argument to reach the command. One
 * band in one place, addressed as a node of its own, is still the arrangement
 * a proposal can move and the Gate can decide on.
 *
 * **The panel is the one deliberate `wrap: false` on this site**, and the note
 * on `code` in `nodes.ts` is the reason: the default wraps because a pretty
 * printed tree has no line structure to protect, and a shell line broken across
 * two visual rows reads as two commands. This is the exception that note said
 * it was keeping the prop for — the only line on the front door somebody is
 * meant to type.
 *
 * **It is paid for at the small end, and this paragraph had the price wrong in
 * both of the ways it could be.** It said the panel shows 348 of the line's
 * 530px *"with a track under it saying so."* Re-measured on a production build
 * at 390 on 18 October: the panel is **361** and the line is **504**, so 143px
 * are off the end — and there is no track. `loom.code` sets `overflow-x: auto`,
 * which on a touch viewport is an overlay scrollbar that appears while a finger
 * is moving and is absent at rest. So the picture a phone reader actually gets
 * is `npm install @jam-overture/loom @jam-overtu` and nothing to say the line
 * continues.
 *
 * The *Copy* button is still the answer to **having** the line — it is beside
 * the panel, it is on screen, and what it hands over is the whole command for
 * every reader. It was never the answer to **reading** it, and this paragraph
 * had been treating the two as one thing since 11 October.
 *
 * What this lane can do about the reading is below, in the paragraph: the two
 * package names are now in the prose, where they wrap. The missing affordance
 * is `loom.code`'s and is filed.
 *
 * Nothing was added to the page to count the press that matters. `loom.code`
 * draws its own copy control, so the type joining `CONTROL_TYPES` in
 * `readers/asked.ts` is the whole of the instrumentation.
 */
const install = (ids: IdFactory): LoomNode =>
  section(
    ids,
    { width: "readable", eyebrow: BAND.install },
    "Just want to get started?",
    [
      /**
       * The two names, in the sentence rather than only in the command.
       *
       * This read *one package is Loom itself, the other is the set of N
       * components this page is drawn from* — a description of a line, which
       * works only for a reader who can see the line. On a phone the panel
       * below cuts the command at `@jam-overtu`, so *the other* named nothing
       * and the front door asked a stranger to install a package whose name it
       * never showed them.
       *
       * `loom.code-span` wraps and keeps its tint across the break, so a name
       * too wide for a 390 viewport breaks at its own slash instead of going
       * off the end the way the panel's does.
       */
      /**
       * **`There is nothing to sign up for.` came off on 29 October**, and the
       * band below is why. It was this site's only word about what Loom costs
       * and it was a half of one: it told a reader they would not be asked for
       * an account and left them to guess at everything else. The band
       * directly under this one now says both halves plainly, so the sentence
       * here was the same claim made worse one screen earlier.
       */
      proseParts(
        ids,
        [
          codeSpan(ids, RUNTIME_PACKAGE),
          " is Loom itself. ",
          codeSpan(ids, STARTER_PACKAGE),
          ` is the set of ${FACTS.primitives} components this page is drawn from.`,
        ],
        { tone: "muted", align: "center", measured: true }
      ),
      code(ids, INSTALL_COMMAND, {
        language: "bash",
        tone: "terminal",
        density: "compact",
        wrap: false,
      }),
      stack(ids, { direction: "row", gap: "snug", justify: "center", wrap: true }, [
        /**
         * The install guide, and until this run it was not where this went.
         *
         * `surfacePath(DOCS)` is `/docs`, which is a redirect to the first page
         * of the documentation in reading order — *Introduction*. So a reader
         * who had just been shown `pnpm add` and pressed the button offering
         * the longer version of it landed three pages above the command, on a
         * page about what Loom is. Nothing was broken and nothing was red: the
         * link worked, the page it opened was good, and it was not the page the
         * button named.
         *
         * `INSTALLATION` is that page, and `docs-pages.test.ts` holds it to
         * carrying the command this band prints. The front of the documentation
         * is still offered twice on this page — the card in the band of four and
         * the footer's map — so nothing was taken away from a reader who wants
         * to start at the beginning.
         */
        action(ids, "Follow the install guide", INSTALLATION.path, {
          variant: "primary",
          scale: "large",
        }),
        /**
         * The package page, and it is here because *is this real* is a
         * different question from *how do I use it*.
         *
         * A stranger who has read this far has been told what Loom does by the
         * site that wants them to install it, and the line above asks them to
         * run something. The npm page is the only control on this site that
         * answers from outside: a version, a publish date, a readme and a
         * dependency count, none of it written here. Offered second because it
         * is the smaller want — the guide is the path to using it, this is the
         * path to believing it — and which of the two should be filled is
         * exactly a `configure` the loop can argue about later.
         */
        action(ids, "See it on npm", NPM_PACKAGE_URL, {
          variant: "secondary",
          scale: "large",
          external: true,
        }),
      ]),
    ],
    { align: "center" }
  )

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
 * **What says it now is the cost line, and it is three words rather than a
 * paragraph.** It sits on the one line a reader compares the four destinations
 * along, and `site.test.ts` holds it there. `PORTAL.door` says who writes the
 * list, in the questions band two bands above, which is where a reader who
 * wants that answer goes looking for it.
 *
 * **The three words are *Still being built* and not *Needs an invitation*, as
 * of 15 October, and that is the same guarantee failing a third way.** The
 * invitation was the honest word for a door somebody else opens, and it
 * answered a question this reader does not get to ask yet: the portal is
 * unfinished, its own lane has said so on the far side of this link since
 * 28 September, and the card went on offering it beside three finished
 * surfaces. Each card is honest about what is behind it — so the one whose
 * answer is *not much, yet* says that. `PORTAL.notYet` carries the longer
 * sentence into the questions band, and `unfinished.test.ts` ties both to the
 * banner in `(portal)`, so the day that comes down this prose goes red with
 * the copy rather than quietly outliving it for the fourth time.
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
const waysIn = (ids: IdFactory): LoomNode =>
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
          props: { href: surfacePath(surface) },
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
const closing = (ids: IdFactory): LoomNode =>
  section(ids, { tone: "accent", width: "full" }, "This page was built the way yours would be.", [
    /**
     * The one sentence on the front door that carries its own link, and the
     * reason it is this sentence.
     *
     * The band it points at is the only thing on this site that is the product
     * working rather than an argument for it, and until this run **the front
     * door did not offer it at all.** `/what-you-run` has named it since
     * 6 October; the page a stranger actually arrives on had no way to it. The
     * two controls under this paragraph go to the top of `/how-it-works` and to
     * the repository, and the top of that page is its first band — so a visitor
     * who pressed the obvious thing landed 3,622px above the demonstration on a
     * phone and found the journey instead.
     *
     * The words are unchanged and no copy moved into the link: the phrase this
     * sentence already ended on is the phrase a reader would press. That is the
     * property that made this worth doing rather than a fifth band — the claim
     * *this sentence is a piece the AI could be asked to move* now reaches the
     * place where a visitor can ask it to, which is the site making its own
     * argument on itself.
     *
     * It carries the band's anchor rather than the page's address, following
     * the sentence on `/what-you-run`, so the paragraph goes red the day the
     * band moves again rather than going quietly wrong (`naming.ts`).
     */
    /**
     * **It was a sentence with a link in it until 31 October**, and the link
     * went to the demonstration: *every one of them is a piece the AI could be
     * asked to move*, where *asked to move* opened the band that let a visitor
     * do it. [0328](../../../../../decisions/0328-the-marketing-site-has-no-demonstration-and-no-mechanism-page.md)
     * removed the band, and a sentence that invites a reader to go and watch
     * it happen with nowhere to send them is worse than the plain claim.
     *
     * So the claim stays and the invitation goes. It is still the one place on
     * this site that says the page a reader is standing on is the thing being
     * described, which is why it was not deleted with the link.
     */
    proseParts(
      ids,
      [
        "The menu, the questions, this sentence: every one of them is a piece the AI could be ",
        inlineLink(
          ids,
          "asked to move",
          `${sitePath(WHY_USE_IT.path)}#${WHY_USE_IT_ANCHOR.forAReader}`
        ),
        ". None of it is code you would have to read afterwards.",
      ],
      { tone: "muted", align: "center", measured: true }
    ),
    stack(ids, { direction: "row", gap: "snug", justify: "center", wrap: true }, [
      /** The same control as the hero's, so it lands where that one lands. */
      action(
        ids,
        "See what you can build",
        `${sitePath(WHY_USE_IT.path)}#${WHY_USE_IT_ANCHOR.theSet}`,
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
    theme: context.theme,
    current: HOME,
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
        hero(ids),
        chain(ids),
        /**
         * **The ask, straight after the chain, as of 11 November.**
         *
         * The maintainer's instruction that day: take *What is Loom?*, *Using
         * it* and *What this is for* off the front door, and put the install
         * band above the four plain words under the heading *Just want to get
         * started?* So a reader who has been told what Loom builds is offered
         * the command next, before anything argues for the governance story.
         */
        install(ids),
        /**
         * **The four plain words**, the governance story — *Ask · Check ·
         * Record · Undo* — read after the chain has said what Loom builds and
         * after the ask. Nothing points at the band, so no address broke when
         * it moved.
         */
        vocabulary(ids),
        /**
         * A rule rather than the diamond this band wants: `loom.divider`'s
         * `diamond` and `dots` ornaments collapse to a mark at the start of the
         * line instead of spanning it, filed as a finding on 19 August. The
         * page uses what renders correctly today.
         */
        buildElement(ids, { type: "loom.divider", props: { ornament: "rule" } }),
        facts(ids),
        questions(ids),
        /**
         * What it costs, new on 29 October and the first thing this site has
         * ever said about money. It stayed here when the install band moved up
         * on 11 November, because only the install band was asked to move; it
         * still reads below the command it refers to. `costs.ts` carries where
         * the permission to say it comes from.
         */
        costs(ids),
        waysIn(ids),
        closing(ids),
        ...siteReadingBand(ids, chrome),
        siteFooter(ids, chrome),
      ],
    }),
    ids
  )
}
