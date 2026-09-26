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

import { COUNTED_ANCHOR } from "../bands"
import { siteFooter, siteHeader, siteReadingBand, type ChromeContext } from "../chrome"
import { action, heading, prose, section, stack } from "../nodes"
import {
  DEMO,
  DOCS,
  HOW_IT_WORKS,
  REPOSITORY_URL,
  SITE_THEMES,
  WHAT_YOU_RUN,
  internalHref,
  surfaceHref,
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
      buildSlot(ids, "heading", [heading(ids, 1, "It runs in your app, not in front of it", { balance: true })]),
      prose(
        ids,
        "There is no machine of ours between you and your visitor. You install a package, it runs on your own hardware at your own address, and nothing here has to be reachable for your site to stay up.",
        { size: "lead", measured: true }
      ),
    ],
  })

const whatYouBring = (ids: IdFactory): LoomNode =>
  section(
    ids,
    { tone: "surface", width: "wide", eyebrow: "What you bring" },
    "Your own components, never rewritten",
    [
      prose(
        ids,
        "You hand over the pieces your site is already built from and say what each one can be told. From then on the AI can arrange those pieces and set those options — and nothing else. It cannot write new code into your page, because code is not a thing a change is allowed to carry.",
        { measured: true }
      ),
      prose(
        ids,
        "If you would rather not build any, a starter set comes with it and this site is made out of that set.",
        { tone: "muted", measured: true }
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
  section(
    ids,
    { width: "wide", eyebrow: "What leaves your server" },
    "One request, and only when somebody asks",
    [
      prose(
        ids,
        "When a person asks for a change in their own words, your server sends the model you chose an outline of the page and the list of pieces it may use. It does not send your code, your data, or anything about who is reading.",
        { measured: true }
      ),
      prose(
        ids,
        "The ready-made changes on the front door do not send anything at all: they are worked out on your own server, which is why they still work on a deployment with no model configured.",
        { tone: "muted", measured: true }
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
const whatIsCounted = (ids: IdFactory, context: PageContext): LoomNode =>
  section(
    ids,
    { tone: "surface", width: "wide", eyebrow: "What this page counts", anchor: COUNTED_ANCHOR },
    "Which parts you reach, and never who you are",
    [
      prose(
        ids,
        "This site counts which parts of a page people reach, how long they stay, and what they press. It does not know who you are, set a cookie, or send any of it anywhere but the server you are already talking to.",
        { measured: true }
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
      prose(
        ids,
        context.counting === true
          ? "Everything above is happening on the page you are reading — counting is on here."
          : "It is switched off on this deployment, so nobody reading this page has been counted.",
        { tone: "muted", measured: true }
      ),
      prose(
        ids,
        "It is there because a page that adapts should be able to tell whether the change helped, and that is a question about parts of a page rather than about people.",
        { tone: "muted", measured: true }
      ),
    ]
  )

const closing = (ids: IdFactory, context: PageContext): LoomNode =>
  section(ids, { width: "wide", eyebrow: "Next" }, "Have a look at the rest", [
    prose(
      ids,
      "The site you are reading is one of these. It is an ordinary application with the package installed, built from the starter pieces anybody gets, and everything you have watched it do it did on the machine it is served from.",
      { measured: true }
    ),
    stack(ids, { direction: "row", gap: "snug", align: "center", wrap: true }, [
      action(
        ids,
        "How a change travels",
        internalHref(context.origin, HOW_IT_WORKS.path, context.theme),
        { variant: "primary" }
      ),
      action(ids, "Read the docs", surfaceHref(context.origin, DOCS), { variant: "secondary" }),
      action(ids, "Try it yourself", surfaceHref(context.origin, DEMO), { variant: "quiet" }),
      action(ids, "Read the source", REPOSITORY_URL, { variant: "quiet", external: true }),
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
        whatIsCounted(ids, context),
        closing(ids, context),
        ...siteReadingBand(ids, chrome),
        siteFooter(ids, chrome),
      ],
    }),
    ids
  )
}
