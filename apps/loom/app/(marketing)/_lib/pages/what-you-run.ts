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

import { COUNTED_ANCHOR } from "../bands"
import { siteFooter, siteHeader, siteReadingBand, type ChromeContext } from "../chrome"
import {
  action,
  heading,
  prose,
  section,
  splitSection,
  stack,
  TERTIARY_CONTROL,
  inlineLink,
  proseParts,
} from "../nodes"
import {
  DOCS,
  REPOSITORY_URL,
  SITE_THEMES,
  surfacePath,
  WHAT_YOU_RUN,
} from "../site"

import type { PageContext } from "./home"

/**
 * What you would actually be running, and the one page on this site that
 * answers a buying question rather than a mechanical one.
 *
 * **Rewritten on 26 September at the maintainer's direction**, which was that
 * the site is too detailed and too close to the documentation. This page was
 * 1,286 words of it — a measured table of every byte that leaves a server, a
 * four-column comparison against three other places a thing like this could
 * live, and a prompt weighed to the character.
 *
 * All of that is true and none of it belongs on a marketing site. What a
 * stranger needs from this page is three sentences: it runs inside your own
 * application, you bring your own components, and one request goes to a model
 * you chose when somebody asks for something. The documentation has the rest.
 *
 * It also absorbed two pages that were retired the same day: `/your-components`
 * (1,405 words) became *What you bring*, and `/what-readers-do` (1,591 words)
 * became *What this page counts*. The second is not optional — this deployment
 * collects reader signals, and the footer of every page links here to say what
 * they are.
 */

const hero = (ids: IdFactory): LoomNode =>
  buildElement(ids, {
    type: "loom.hero",
    props: {
      backdrop: "grid",
      align: "start",
      stature: "standard",
      eyebrow: "Before you install anything",
    },
    children: [
      buildSlot(ids, "heading", [heading(ids, 1, "It runs inside your app rather than in front of it", { balance: true })]),
      prose(
        ids,
        "There is no machine of ours between you and your visitor. You install a package, it runs on your own hardware at your own address, and nothing here has to be reachable for your site to stay up.",
        { size: "lead", measured: true }
      ),
    ],
  })

const whatYouBring = (ids: IdFactory): LoomNode =>
  splitSection(
    ids,
    /**
     * Plain, on `nodes.ts`'s reason and on this page's own: its three body
     * bands are three answers to one question, and two of the three were plated
     * while the middle one was not. On the house theme that is a left margin
     * that steps in, back out and in again down the length of the page.
     */
    { width: "wide", eyebrow: "What you bring" },
    "Loom never rewrites your components",
    [
      prose(
        ids,
        "You give Loom the components your site is already built from, and you say which settings each one accepts. After that the AI can rearrange those components and change those settings. That is all it can do. It cannot write new code into your page, because a change can only ever name a component and its settings."
      ),
      prose(
        ids,
        "If you would rather not build any, a starter set comes with it and this site is made out of that set.",
        { tone: "muted" }
      ),
    ]
  )

/**
 * The one thing that leaves, said plainly and without the measurement.
 *
 * This band used to print the exact size of the prompt, the exact number of
 * pieces described in it and a four-row table of what each one contained,
 * computed at build time against a real request. It was the most honest band on
 * the site and it was answering a question nobody has yet asked out loud.
 *
 * What is kept is the shape of the answer — *one request, to a model you chose,
 * only when somebody asks* — because that is the part a reader is deciding on.
 * The measurement is the documentation's, and the code that made it is still in
 * the repository for anyone who wants to run it.
 */
const whatLeaves = (ids: IdFactory): LoomNode =>
  splitSection(
    ids,
    { width: "wide", eyebrow: "What leaves your server" },
    "Your server calls the model only when somebody asks",
    [
      prose(
        ids,
        "When a person asks for a change in their own words, your server sends the model you chose an outline of the page. It also sends the list of pieces that model may use. It does not send your code, your data, or anything about who is reading."
      ),
      /**
       * A sentence that names another page of this site and carries its own
       * link, which is the shape `loom.inline-link` was asked for.
       *
       * It said something else until 31 October: *"the ready-made changes on
       * the How it works page do not send anything at all"*, pointing at the
       * demonstration, which
       * [0328](../../../../../decisions/0328-the-marketing-site-has-no-demonstration-and-no-mechanism-page.md)
       * removed. The claim it was making — that a page can rearrange with
       * nothing leaving your server — is still true and is still this band's
       * subject, so the sentence is rewritten rather than deleted and points
       * at the band that now shows it.
       *
       * The link carries that band's own anchor rather than the page's
       * address, so the paragraph goes red the day the band moves instead of
       * going quietly wrong (`naming.ts`).
       */
      proseParts(
        ids,
        [
          "A page that rearranges itself is worked out on your own server, and nothing leaves it to be drawn. What your deployment sends, and to whom, is set out in ",
          inlineLink(ids, "the docs", surfacePath(DOCS)),
          ".",
        ],
        { tone: "muted" }
      ),
    ]
  )

/**
 * What this deployment counts, which is a disclosure rather than a pitch.
 *
 * It was a page of its own until 26 September and the footer of every page
 * linked to it. The page is gone; the collection is not, so the disclosure
 * moved here rather than going with it, and the footer now points at this
 * band's anchor. A site that quietly stopped saying what it counts while
 * carrying on counting would be failing at the one thing it sells.
 */
const whatIsCounted = (ids: IdFactory): LoomNode =>
  splitSection(
    ids,
    { width: "wide", eyebrow: "What this page counts", anchor: COUNTED_ANCHOR },
    "It counts which parts you reach and never who you are",
    [
      prose(
        ids,
        "This site counts which parts of a page people reach, how long they stay, and what they press. It does not know who you are, set a cookie, or send any of it anywhere but the server you are already talking to."
      ),
      /**
       * Whether it is on *here*, which is the half a reader cannot check.
       *
       * The retired `/what-readers-do` said this and it is the reason the
       * disclosure is worth anything: a site that describes what it might
       * collect, on a deployment collecting nothing, is describing somebody
       * else. It is read off the same switch that decides whether the
       * broadcaster is mounted at all, so the sentence and the behavior cannot
       * disagree.
       */
      /*
       * **No claim about whether it is switched on here**, which this sentence
       * used to make in two versions chosen by a `counting` field on the page
       * context — a field that no longer exists (21 October).
       *
       * The page is stored and served from the store as of 12 October (0259),
       * so a sentence about the deployment's current setting freezes at the
       * moment it was written and becomes false the first time somebody
       * changes it — and *nobody reading this page has been counted* is the
       * worst of the two to be wrong about. The maintainer's instruction on
       * 12 October was to take the tracking-status message off the site
       * whether it is counting or not, and this is the second place it was
       * being made.
       *
       * What stays is the part that is true of a Loom page whatever any
       * deployment has switched on, which is what this section is for.
       */
      prose(
        ids,
        "Everything above is what a page is able to count. Whether it is switched on is a setting of whoever is serving it.",
        { tone: "muted" }
      ),
      prose(
        ids,
        "It is there because a page that adapts should be able to tell whether the change helped. That is a question about parts of a page, not about people.",
        { tone: "muted" }
      ),
    ]
  )

const closing = (ids: IdFactory): LoomNode =>
  section(ids, { width: "wide", eyebrow: "Next" }, "Have a look at the rest", [
    prose(
      ids,
      "The site you are reading is a Loom application itself. It is an ordinary app with the package installed, built from the starter components anybody gets, and everything you have watched it do happened on the machine serving it.",
      { measured: true }
    ),
    stack(ids, { direction: "row", gap: "snug", align: "center", wrap: true }, [
      action(ids, "Read the docs", surfacePath(DOCS), { variant: "primary" }),
      action(ids, "Read the source", REPOSITORY_URL, { ...TERTIARY_CONTROL, external: true }),
    ]),
  ])

export const whatYouRunPageTree = (context: PageContext): LoomTree => {
  const ids = sequentialIdFactory("run")
  const chrome: ChromeContext = { ...context, current: WHAT_YOU_RUN }

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
        whatYouBring(ids),
        whatLeaves(ids),
        whatIsCounted(ids),
        closing(ids),
        ...siteReadingBand(ids, chrome),
        siteFooter(ids, chrome),
      ],
    }),
    ids
  )
}
