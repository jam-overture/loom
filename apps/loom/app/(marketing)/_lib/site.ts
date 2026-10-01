import type { JsonObject } from "@jam-overture/loom"

/**
 * What the site is, as data: its routes, its navigation, its palettes, and
 * where it is being served from.
 *
 * Every one of those is needed *while the tree is being built* rather than
 * while it is being rendered — a nav item is a `loom.action` node with an
 * `href` prop, not markup a layout wraps around the page — so this module is
 * the input to the page builders and never imports one.
 */

/** A page of the site. The path is the route on disk and the nav label is the tree's. */
export type SiteRoute = {
  readonly path: string
  readonly label: string
  readonly title: string
  readonly description: string
  /**
   * Whether the bar across the top carries it, as well as the footer's map.
   *
   * The same flag `Surface` has carried since 28 August, for the same reason and
   * with the same guarantee behind it. The maintainer asked on #166 whether
   * eight items in the bar was too many; it was, the surfaces answered it, and
   * the count crept back to eight as this route group grew a fourth page. A
   * ninth is the flagged problem made worse.
   *
   * So a page may be kept out of the bar — and `chrome.test.ts` holds *out of
   * the bar* to mean exactly that and never *off the site*: whatever is left out
   * is in the footer's map, and the footer marks it as the page the reader is on
   * so the site still says where they are.
   */
  readonly inMenu: boolean
}

/**
 * The front door, and **the one page the bar does not carry a link to.**
 *
 * That is a change of 12 September and it is navigation rather than attention,
 * which is what makes it a different judgment from the two below. The bar's
 * left-hand end is a `loom.logo` carrying `HOME.path`, on every page of the
 * site, in the place every site a visitor has ever used puts the way home — so
 * *Home* beside it was the same destination offered twice, and it was spending
 * one of the eight slots the maintainer asked about on #166 to do it.
 *
 * The guarantee `inMenu: false` has carried since 8 September holds here
 * unchanged and is what makes it safe: what the bar leaves out, the footer's
 * map carries, marked as the page the reader is on. The front door is also the
 * wordmark on every page, the destination of two closing bands, and the only
 * route the palette switcher preserves an ask across.
 *
 * The one thing genuinely lost is the underline on `/`: a menu item can say
 * *you are here* and a wordmark cannot. `chrome.test.ts` holds the footer's map
 * to marking it instead, which is where the other two off-bar pages are already
 * marked, and a visitor who cannot tell they are on the front door of a site
 * they are looking at is not a reader this site has.
 */
export const HOME: SiteRoute = {
  path: "/",
  label: "Home",
  title: "Loom — every change your AI makes, written down",
  description:
    "Ask for a change in your own words and the page rearranges itself. Nothing lands until it has been checked against your rules, and every change keeps a record of who asked, what moved, and how to put it back.",
  inMenu: false,
}

export const HOW_IT_WORKS: SiteRoute = {
  path: "/how-it-works",
  label: "How it works",
  title: "How it works — Loom",
  description:
    "Someone asks for a change. Before anything moves it is measured and checked against rules you wrote. Then it is written down — every time, whether it happened or not.",
  inMenu: true,
}

/**
 * The page for the question every other page hands the reader and none of them
 * takes back.
 *
 * The entry above puts *"whoever runs the site writes the list of who may sign
 * in"* on the front door. That is the answer a stranger arrives with, and it
 * hands them the next one in the same breath: **so what do I run?** Five pages
 * answered parts of it — the journey a change takes, what you decide in advance,
 * what you hand over, what you are left holding — and none of them said what the
 * thing on a reader's own machine would be. A reader who had understood all five
 * still could not tell whether this is a library they add to something, a
 * service they point something at, or a site somebody else hosts for them.
 *
 * It is a description of code rather than a position, so it did not wait on the
 * license line, and nothing on it says what Loom costs or who it is for.
 *
 * **The boundary with `Loom docs` was agreed in the finding rather than
 * discovered in review.** `/docs` owns *how to install it* — the commands, the
 * code and the API. This page owns *what the shape is*, which is the question
 * somebody asks before they are willing to read an installation guide at all,
 * and it ends by handing them over. It uses no vocabulary the documentation
 * teaches and prints no code.
 *
 * **It is `inMenu: false`, and that is now true of two pages.** The bar is the
 * eight items the maintainer asked about on #166; a sixth page is not worth a
 * ninth. `chrome.test.ts` holds *off the bar* to mean *in the footer's map and
 * nowhere unreachable*, and this page is offered from the front door's band of
 * ways in and from the two pages either side of it in the argument.
 */
export const WHAT_YOU_RUN: SiteRoute = {
  path: "/what-you-run",
  label: "What you run",
  /**
   * No *Loom* in it: `share.ts` drops only the half of a title that is exactly
   * the wordmark, so the name inside a clause prints twice on the card.
   *
   * Shortened on 26 September with the page. The old one — *a package in your
   * own application, not a service in front of it* — was a thirteen-word
   * subtitle doing the page's argument in the browser tab.
   */
  title: "What you run — in your own app, not in front of it",
  description:
    "You install a package into an application you already host. Your components stay in your repository, and the only thing that leaves is one request to a model you chose, when somebody asks for a change.",
  inMenu: false,
}

/**
 * Every route, in nav order. A route that is not here has no way to be reached.
 *
 * The order is the order a stranger needs them in, not the order they were
 * built: what this is, then how it works, then **what you control**, then what
 * you are left holding afterwards. The rules page sits before the record
 * because a record of decisions is only interesting to someone who knows the
 * decisions were theirs to set.
 *
 * **`/who-can-ask` sits directly after the rules**, because it is not a subject
 * of its own — it is the second half of one question. The rules page says what
 * may change; this one says that *who wanted it* is an input to the same
 * decision, and shows the four askers being told four different things. A
 * reader who has not yet been told a change is weighed at all has no use for
 * the news that it is weighed differently for a timer.
 *
 * **`/putting-it-back` sits directly after the record**, for the same reason and
 * in the same shape: it is the second half of one question rather than a subject
 * of its own. The record page says what you are left holding; this one says that
 * what you are holding includes the way back, and shows every request on the
 * front door being put through and returned. A reader who has not yet been told
 * that anything is written down has no use for the news that one of the things
 * written down is reversible.
 *
 * **`/what-readers-do` closes that group rather than opening the site**, and
 * the temptation was to put it first. It is the input half of the whole premise
 * — what would make anybody ask for a change — so it reads like a beginning.
 * It is not one: a reader who has not yet been told that a change is weighed,
 * recorded and reversible has no reason to care that the page can also count
 * who reached which band, and every sentence on it about *asking for something*
 * is a sentence the five pages above it have already earned. So it sits third
 * in *what you are left holding*, after the record and the way back: what you
 * end up with is a paper trail, an undo, and a page that can say what it did
 * for the people reading it.
 *
 * **Then the objection**, which arrives the moment a reader believes the six
 * above rather than before it: *and when it doesn't work?* It sits where it does
 * because a reader who has not yet understood that a change is weighed at all
 * has no use for the list of ways one can fail to happen.
 *
 * The last two are the questions that arrive after all five of those, from
 * somebody who has decided they might want this and is working out what it would
 * cost them to try: **what is the thing**, and then **what do I have to hand
 * it**. They are in that order because the second only makes sense once the
 * first is answered — nobody asks what to hand over to something they still
 * think might be a hosted service.
 *
 * The footer renders this list in order, and the end is where a reader meets
 * the two pages the bar does not carry. The front door is the third the bar
 * leaves out and it is first here, because the footer's map is a map of the
 * site and a map that omitted the front door would be the navigation failure
 * this list exists to prevent.
 */
export const SITE_ROUTES: readonly SiteRoute[] = [HOME, HOW_IT_WORKS, WHAT_YOU_RUN]

/**
 * The rest of the product, which is the rest of this same application.
 *
 * The four surfaces are one Next application and a route group contributes
 * nothing to a URL (0067), so `/docs` and `/portal` are paths on this origin
 * rather than other sites to link out to — and the marketing site holding `/`
 * is what makes it the front door rather than one of four things that link to
 * each other (0070). A visitor should be able to arrive here, read, follow the
 * documentation and open the portal without once feeling they have left.
 *
 * They are listed here and not in `SITE_ROUTES` because the two are different
 * kinds of thing and the tests depend on the difference: a site route is a page
 * this lane builds and must have a builder and a `page.tsx`, and a surface is a
 * destination this lane may only point at. Pointing at one is the whole
 * contract — the path is the other lane's front door, so it stays correct
 * across anything that lane does behind it.
 */
/**
 * What every surface says about itself, whatever is or is not behind its door.
 *
 * `Surface` is this and one of the two halves below, so **a guarded surface
 * cannot be written down without saying what a visitor finds at the door.** See
 * `GuardedSurface` for why that is the compiler's job rather than a test's.
 */
type SurfaceFacts = {
  readonly path: string
  /** What the link says. Plain words: a visitor has never heard of any of this. */
  readonly label: string
  /** One sentence for the front door's band, in the same plain words. */
  readonly blurb: string
  /**
   * What it asks of the visitor, in three or four words.
   *
   * The order `PRODUCT_SURFACES` is offered in has always been *ascending cost
   * to the visitor*, and that reasoning has lived in a comment below since the
   * list was written — visible to whoever edits this file and to nobody who
   * reads the site. It is the most useful thing the band can say. Someone
   * deciding where to click next is deciding how much of their afternoon to
   * spend, and a card that answers that before they click is worth more than a
   * card that makes them find out.
   *
   * Kept short and to one shape across the four, because they are pinned to the
   * bottom of four cards standing side by side and a long one would wrap alone.
   */
  readonly cost: string
  /**
   * Whether the bar across the top carries it, as well as the footer's map.
   *
   * **A separate question from `guarded`, as of 28 August, and this is why.**
   * The header used to be *every unguarded surface*, which is a rule about
   * permissions standing in for a decision about attention. It gave the bar
   * eight items — a mark, six links and the way in — and the maintainer asked
   * on #166 whether that was too many. It was, and this route group had a
   * fourth page to add.
   *
   * So the bar is now the shortest path for someone who has just arrived: this
   * site's own pages, the demonstration, and the documentation. Everything else
   * keeps all three of its other placements — the footer's map, the front
   * door's band of cards, and its own paragraph wherever the argument reaches
   * it — so nothing has been hidden, and one word here puts anything back.
   *
   * The course is the one that moved. Of the four it asks the most of a visitor
   * (`cost` says an afternoon) and it is the one a stranger is least likely to
   * want in the first ten seconds, which is the only span the top bar is for.
   */
  readonly inMenu: boolean
}

/** A surface a visitor can simply open. Most of them. */
type OpenSurface = SurfaceFacts & {
  /** Whether a visitor who is not signed in is sent to a sign-in page first. */
  readonly guarded: false
}

/**
 * A surface with a door, and the sentence a visitor meets it with.
 *
 * **`door` is required here, and that is the whole point of splitting the type.**
 *
 * The portal is the only one, and since 25 August this site has offered it four
 * ways — the bar's *Sign in*, the front door's band of cards, the footer's map
 * and the record page's last band — without any of them saying **whose portal
 * it is**. A stranger reads an account as something this site could give them.
 * It cannot: a portal belongs to the Loom site it is part of, and who may sign
 * in to it is a list whoever runs that site writes.
 *
 * The sentence saying so was on the site until 25 August, inside the portal's
 * blurb, and the run that gave every surface a `cost` moved it out to keep the
 * blurbs one length. That was a fair edit and it took the fact with it — the
 * band's own note still promises *each card is honest about what is behind it,
 * which is why the portal's says that signing in is required*, of a card that
 * had stopped saying so. Two defensible things nobody had read next to each
 * other, at the one place the maintainer's 18 August decision makes this
 * surface's whole job.
 *
 * So it is a field of its own rather than a longer blurb, and it is **required
 * by the type** rather than asserted by a test. A guarded surface added a year
 * from now is a compile error until somebody writes down what a visitor without
 * a way in actually finds, which is the failure that happened here and the one
 * a test written today would not have caught: the test would have been written
 * against the field, and the field did not exist.
 *
 * **This lane cannot check the door instead of describing it.** The note above
 * records the contract — a surface is a destination this lane *may only point
 * at* — so `(marketing)` does not import `(portal)`'s auth config and has no
 * way to know whether sign-in is configured on the deployment it is served
 * from. Which settles what the copy may claim: not that the door opens, only
 * what kind of door it is. On this deployment it does not open at all, and the
 * portal's own sign-in page says so plainly.
 */
export type GuardedSurface = SurfaceFacts & {
  readonly guarded: true
  /**
   * One sentence, in the same plain words as `blurb`, saying what the door is.
   *
   * Not what is behind it — `blurb` does that — and never a promise that it
   * opens.
   *
   * **The place with room for it is an answer rather than a card**, which is a
   * change of 30 September. It was in the body of the front door's *Open the
   * portal* card until then, where it was the one card in a row of four saying
   * twice what the other three said, and the row was photographed with 166px of
   * nothing in each of the other three. What a card has room for is the cost
   * word; what has room for the sentence is the question a reader asks when
   * they want it. So this is read by `questions.ts` and nowhere else, and the
   * card says the same fact in four words through `cost`.
   */
  readonly door: string
}

export type Surface = OpenSurface | GuardedSurface

/**
 * The one surface that answers the hero's promise rather than arguing for it.
 *
 * The front door's own band lets a visitor watch a change happen, but only
 * through five prepared choices — the hero says *ask for a change in your own
 * words* and the band cannot offer a place to type. That gap has been the
 * lane's standing open question since 20 August, and the recommendation each
 * time was to send people somewhere built for it rather than put a model call
 * on the most-loaded page the project has.
 *
 * It now exists. `Loom demo` moved the demonstration off `/portal/demo` — a
 * public page at the one path that reads as private — onto a public `/demo`,
 * and filed the finding that nothing under this route group linked to it from
 * anywhere. Three things from that finding are why it is safe to put on the
 * front door: it works with no model configured, a page view allocates nothing
 * on the instance, and the first click is one button.
 */
/**
 * *"A real page"* was true and it stopped being the best thing to say. `Loom
 * demo` rebuilt the demonstration around a small business's site — a
 * physiotherapy clinic that does not exist, and says so in its own bar the
 * moment a visitor lands — and filed that a visitor promised *a real page* has
 * to reconcile two sentences before pressing anything. The second one is the
 * one worth arriving with, so it is the one this says. Closes their finding of
 * 23 August; the wording is theirs.
 */
export const DEMO: Surface = {
  path: "/demo",
  label: "Demo",
  blurb:
    "Ask a small business's page to rearrange itself — in your own words — and watch the record fill in beside it.",
  cost: "Costs you a click",
  guarded: false,
  inMenu: true,
}

export const DOCS: Surface = {
  path: "/docs",
  label: "Docs",
  blurb:
    "How to install it, hand it the components you already have, and get your first change approved on a page of your own.",
  cost: "Costs you a read",
  guarded: false,
  inMenu: true,
}

export const LESSONS: Surface = {
  path: "/lessons",
  label: "Lessons",
  blurb:
    "A course on why Loom works the way it does. You answer before you read, and it tells you when to come back.",
  cost: "Costs you an afternoon",
  guarded: false,
  inMenu: false,
}

export const PORTAL: GuardedSurface = {
  path: "/portal",
  label: "Portal",
  blurb:
    "Where the changes are reviewed: what was asked for, what was allowed, and the button that puts any of it back.",
  /**
   * *"Costs you an account"* until this run, and it is the half of the mistake
   * a reader could act on.
   *
   * The four costs are read along one line by somebody choosing where to spend
   * their afternoon, and three of them name something the reader can spend. An
   * account is not: nobody reading this site can obtain one by deciding to.
   * Whoever runs a Loom site writes the list of who may sign in to its portal,
   * so the thing being asked for is somebody else's decision — which is what
   * *an invitation* says in the same four words and the same shape.
   */
  cost: "Costs you an invitation",
  guarded: true,
  /**
   * Deliberately about every Loom site and not only this one.
   *
   * The reader's question is *can I get in*, and the answer that helps them is
   * the general one: this is what a portal is, so it is also what yours would
   * be. Saying only *this one is not open to you* would answer the question in
   * front of them and leave them thinking the product has a door they failed
   * to get through.
   */
  door:
    "Every Loom site has a portal of its own, including this one, and whoever runs the site writes the list of who may sign in to it.",
  /**
   * False because it is the bar's *action* rather than one of its links, and
   * has been since the header was written. `inMenu` means "carried as a menu
   * item", so the one surface that is a button says no here and is offered
   * under the word a stranger recognises instead.
   */
  inMenu: false,
}

/**
 * Everywhere else in the product, in the order the front door offers them.
 *
 * The demonstration, then the documentation, then the course, then the portal —
 * which is **ascending order of what it asks of the visitor**, and that is the
 * whole of the reasoning. Someone who has just arrived is offered the cheapest
 * thing first, and the one that needs a door is offered last so that everywhere
 * they *can* go has been named before they meet one.
 *
 * **That reasoning is on the page now**, as each surface's `cost`, rather than
 * being a rule this file follows silently. It is what moved the portal's *"who
 * may sign in is set by whoever runs the deployment"* out of its blurb: the
 * band's own promise is that every card is honest about what is behind it, and
 * *costs you an account* is that same honesty said in four words, in the place
 * a reader is already comparing the four. `cardCosts` in `pages.test.ts` holds
 * the order against the list so a surface cannot be slotted in out of turn.
 *
 * The demo was added on 22 August and went to the front of the list rather than
 * the end of it. It is the only one of the four that is the product working
 * rather than a description of it, and this site's own recorded position is
 * that the marketing site is the demonstration and not a brochure about it.
 */
export const PRODUCT_SURFACES: readonly Surface[] = [DEMO, DOCS, LESSONS, PORTAL]

/**
 * The palettes a visitor may see the site in.
 *
 * These are the registered theme triples, and switching between them is the
 * claim the site is making made checkable: the same tree, three different
 * registered ids on its root, and nothing below the root touched (0049). The
 * footer offers the others, so the visitor can do it rather than read about it.
 *
 * **`minimal` is the house theme and the one a visitor arrives on.** The other
 * two stay reachable because they are what makes the claim demonstrable — a
 * site that only ever renders one palette is asserting re-theming rather than
 * showing it — but they are the demonstration, not the front door.
 *
 * The label lives here beside the selection because the footer needs a word for
 * each, and a switcher that spelled its own names would drift from this list
 * the first time one was added.
 */
export type SiteThemeName = "minimal" | "editorial" | "bold"

export type SiteTheme = {
  readonly label: string
  /** The three registered ids, as the root node's reserved theme prop holds them. */
  readonly selection: JsonObject
}

export const SITE_THEMES: Readonly<Record<SiteThemeName, SiteTheme>> = {
  minimal: {
    label: "Minimal",
    selection: { palette: "minimal", fontPack: "minimal-sans", stylePreset: "precise" },
  },
  editorial: {
    label: "Editorial",
    selection: { palette: "editorial", fontPack: "editorial-serif", stylePreset: "comfortable" },
  },
  bold: {
    label: "Bold",
    selection: { palette: "bold", fontPack: "bold-sans", stylePreset: "airy-modern" },
  },
}

export const DEFAULT_THEME: SiteThemeName = "minimal"

/** Every palette, in the order the footer offers them. */
export const SITE_THEME_NAMES = Object.keys(SITE_THEMES) as readonly SiteThemeName[]

/**
 * The ones the visitor is not currently wearing.
 *
 * A list rather than the toggle this was while there were two of them: with a
 * third palette "the other one" stops being a function, and a switcher that
 * cycled would hide a palette behind two clicks for no reason.
 */
export const otherThemes = (theme: SiteThemeName): readonly SiteThemeName[] =>
  SITE_THEME_NAMES.filter((name) => name !== theme)

/**
 * A theme name out of a query string.
 *
 * Anything unrecognised is the default rather than an error: a marketing page
 * reached with a mangled URL should be a page, not a 400.
 */
export const readThemeName = (given: string | readonly string[] | undefined): SiteThemeName => {
  const first = typeof given === "string" ? given : given?.[0]

  return SITE_THEME_NAMES.find((name) => name === first) ?? DEFAULT_THEME
}

/**
 * Where this deployment is answering from.
 *
 * It exists because **every `href` in a Loom tree has to be an absolute URL** —
 * `linkUrlSchema` allowlists schemes and rejects anything `new URL()` cannot
 * parse on its own (0053), so `/how-it-works` is not a link a node can hold and
 * a site cannot currently point at its own next page. Filed as a finding on
 * 19 August; until it is answered, the origin is resolved per request and the
 * tree is a function of route, theme and origin rather than of route and theme.
 *
 * `LOOM_SITE_ORIGIN` wins so a production domain can be pinned; `VERCEL_URL` is
 * what makes preview deployments link to themselves rather than to production.
 */
export type Environment = Readonly<Record<string, string | undefined>>

export const siteOrigin = (env: Environment = process.env): string => {
  const pinned = env["LOOM_SITE_ORIGIN"]

  if (pinned !== undefined && pinned.length > 0) {
    return pinned.replace(/\/$/, "")
  }

  const vercel = env["VERCEL_URL"]

  return vercel !== undefined && vercel.length > 0
    ? `https://${vercel}`
    : "http://localhost:3000"
}

/**
 * The origin the **browser is actually on**, which is not the same question
 * `siteOrigin` answers and was assumed to be for a month.
 *
 * `VERCEL_URL` is the *deployment-unique* hostname —
 * `loom-9kd3jf-…vercel.app`. A visitor reading a preview is on the *branch
 * alias*, `loom-git-<branch>-…vercel.app`, and on production they are on the
 * production domain. Those are different hosts, so a tree built from
 * `siteOrigin()` and served to a browser on any of the other two carries
 * absolute addresses pointing **somewhere else**.
 *
 * For an `href` that costs a host change nobody notices. For the front door's
 * framed demonstration it is fatal and visible: a preview deployment sits
 * behind Vercel's deployment protection, so a frame pointing at the
 * deployment-unique host is an unauthenticated request, is answered with a
 * sign-in page that refuses to be framed, and the visitor gets the browser's
 * broken-document glyph where the one band that proves this product works
 * should be. **The maintainer reported seeing exactly that**, on 27 September,
 * after this lane had written the symptom off as a screenshot artifact.
 *
 * It is not. The screenshot artifact — `pnpm shoot --serve` on an ephemeral
 * port — is the *same fault* with a different host in the second position, and
 * treating it as a harness quirk is what kept it out of the site's own code for
 * a week.
 *
 * So the rule this splits out is: **the tree's addresses follow the browser,
 * and the document's declared identity stays pinned.** A canonical link, a
 * sitemap entry, an Open Graph image and the structured-data graph all say
 * *this is where this page lives*, and must keep answering `siteOrigin()` —
 * a preview announcing itself under whichever host a reader happened to type
 * would be worse than one announcing the deployment. Everything the browser is
 * going to *re-fetch* answers this instead.
 *
 * `undefined` rather than a fallback, because the caller knows what to fall
 * back to and there is exactly one thing to fall back to.
 */
export const originFromHost = (
  host: string | null | undefined,
  proto?: string | null | undefined
): string | undefined => {
  /**
   * Both headers are comma-separated lists when more than one proxy has
   * appended to them, and the **first** entry is the client-facing one.
   */
  const authority = host?.split(",")[0]?.trim()

  if (authority === undefined || authority.length === 0) {
    return undefined
  }

  const scheme = proto?.split(",")[0]?.trim()

  /**
   * A `Host` header is attacker-controlled on a deployment that does not pin
   * one, and what it reaches here is an address the visitor's own page tells
   * their browser to load. So it is **parsed rather than interpolated**, and
   * anything that does not come back as a bare authority — a path, credentials,
   * a second scheme, a space — is refused and the caller falls back to the
   * environment. On Vercel this never fires: the platform sets
   * `x-forwarded-host` itself and does not pass a client's through.
   */
  const guess = scheme !== undefined && scheme.length > 0 ? scheme : localScheme(authority)

  try {
    const url = new URL(`${guess}://${authority}`)

    return url.host === authority && url.username === "" && url.pathname === "/"
      ? url.origin
      : undefined
  } catch {
    return undefined
  }
}

/**
 * The scheme to assume when nothing in front of us said.
 *
 * `next start` on a laptop sets no `x-forwarded-proto`, and guessing `https`
 * there would point the frame at a port serving plain HTTP. Every other case is
 * behind a proxy that does set it.
 */
const localScheme = (authority: string): string =>
  /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(authority) ? "http" : "https"

/**
 * Whether this deployment is the one the public is meant to find.
 *
 * Approved on 27 September, answering a finding this lane filed the same day:
 * every preview deployment served a sitemap, a `robots.txt` saying *crawl
 * everything*, per-page canonicals, and — since #406 — a full `schema.org`
 * graph and an `/llms.txt`. There is one preview per pull request and each of
 * them states, in the format a machine reads as fact, that it is this product.
 *
 * **The rule is deliberately narrow: not production means Vercel said so.**
 * A deployment with no `VERCEL_ENV` at all is left exactly as it was, and that
 * is the important half. This file ships in the repository, so the obvious
 * spelling — *index only when we are sure this is production* — would silently
 * de-index the site of anybody running their own Loom deployment outside
 * Vercel, which is the failure that cannot be noticed from here and is far
 * worse than a preview being crawled.
 *
 * So: on Vercel and not production → keep it out of the index. Anywhere else,
 * including a local `next start` and a self-hosted site, nothing changes.
 */
export const isPublicDeployment = (env: Environment = process.env): boolean => {
  const vercel = env["VERCEL_ENV"]

  return vercel === undefined || vercel.length === 0 || vercel === "production"
}

/** An internal link, as the tree has to hold it: absolute, and origin-qualified. */
export const internalHref = (origin: string, path: string, theme?: SiteThemeName): string => {
  const url = new URL(path, `${origin}/`)

  if (theme !== undefined) {
    url.searchParams.set("theme", theme)
  }

  return url.toString()
}

/**
 * The front door, with what the visitor has asked of it written into the address.
 *
 * The band that lets a visitor rearrange this page keeps nothing: no session, no
 * cookie, nothing on the server between one request and the next. What the page
 * looks like is a function of its address, which is why `/?ask=costs` can be
 * copied, shared, bookmarked and reloaded a week later and still be the page it
 * was — and why two people looking at the site cannot rearrange it under each
 * other.
 */
export type AskedFor = {
  readonly theme?: SiteThemeName
  readonly ask?: string
  readonly approve?: boolean
  /** Whether the visitor has pressed *Put it back* on the change above. */
  readonly back?: boolean
  /** And whether they have answered the rules holding *that* back. */
  readonly backApprove?: boolean
}

/**
 * A page of this site with a request written into its address.
 *
 * Two pages read those parameters and they have to read the same ones the same
 * way, because one links to the other carrying them. Written twice they would
 * be two spellings of one convention, and this lane's recorded failure three
 * runs running is a pair of individually correct things that had never been read
 * next to each other. So there is one spelling and the path is the argument.
 */
const askedHref = (origin: string, path: string, options: AskedFor): string => {
  const url = new URL(path, `${origin}/`)

  if (options.theme !== undefined) url.searchParams.set("theme", options.theme)
  if (options.ask !== undefined) url.searchParams.set("ask", options.ask)
  if (options.approve === true) url.searchParams.set("approve", "1")
  /**
   * Two parameters rather than one with three values, because they answer two
   * questions a visitor asks at two different moments — *put it back*, and then
   * *yes, I mean it* — and an address that said `back=yes` would be spelling the
   * second in a word that reads like the first.
   *
   * `-yes` is the suffix the record page's sequence already uses for exactly
   * this, so the two pages name approval the same way.
   */
  if (options.back === true) url.searchParams.set("back", "1")
  if (options.backApprove === true) url.searchParams.set("back-yes", "1")

  return url.toString()
}

export const askHref = (origin: string, options: AskedFor = {}): string =>
  askedHref(origin, HOW_IT_WORKS.path, options)

/**
 * The mechanism page, with the request whose record it should print.
 *
 * Same property as `askHref` and for the same reason: the page keeps nothing,
 * so what it prints is a function of its address. `/how-it-works` on its own is
 * the page it has always been — the record of the quietest of the five choices,
 * chosen because it is the one whose lines fit on a screen. With an ask in the
 * address it prints the record of *that* request instead, run against the same
 * published front door, which is what lets the front door hand a visitor the raw
 * record of the change they just watched rather than of a different one.
 *
 * `approve` travels with it because the record does. A change the rules held and
 * the visitor then allowed has a line the held one does not, and a link that
 * dropped the approval would open a page whose record is one line shorter than
 * the panel the visitor followed it from.
 */
export const mechanismHref = (origin: string, options: AskedFor = {}): string =>
  askedHref(origin, HOW_IT_WORKS.path, options)

/**
 * A link into another surface of the product.
 *
 * The palette is deliberately **not** carried across. It is this site's
 * demonstration — the same tree wearing three registered triples — and the
 * documentation and the portal each dress themselves; a `?theme=bold` arriving
 * at a surface that does not read it is a parameter that means nothing and
 * looks like it means something.
 */
export const surfaceHref = (origin: string, surface: Surface): string =>
  internalHref(origin, surface.path)

/** Where the site points when it points at the project itself. */
export const REPOSITORY_URL = "https://github.com/jam-overture/loom"
/** The licence itself, which the footer links to beside the sentence naming it. */
export const LICENSE_URL = "https://github.com/jam-overture/loom/blob/main/LICENSE"
export const DECISIONS_URL = "https://github.com/jam-overture/loom/tree/main/decisions"

/**
 * The page before this one and the page after it, in the order the site's own
 * argument is written in.
 *
 * `SITE_ROUTES` has been a **reading order** since the third page was written,
 * and the comment above it is the longest in this file: which page earns which,
 * why the objection arrives seventh rather than second, why the page about
 * counting readers closes a group instead of opening the site. Every one of
 * those sentences is a decision about what a stranger should read next.
 *
 * Until now the only thing that read the order was the footer's map, which
 * renders it as ten links in a column — where being third and being ninth look
 * exactly alike. So the order was an argument the site made to itself.
 *
 * It costs more than tidiness. Measured across the ten page builders on
 * `main`, the onward links each page hand-picks leave **`/putting-it-back` and
 * `/what-readers-do` linked from no other page's body at all**; both are also
 * off the bar, so the only way to either is to notice it in the footer. And the
 * page the front door's own closing band sends every visitor to —
 * `/how-it-works` — ends without pointing anywhere. A reader who follows the
 * front door's main call to action lands on a page with no way forward in it.
 *
 * Neighbours are derived rather than written down, so a route inserted into
 * `SITE_ROUTES` is a route the pages before and after it start pointing at on
 * the same commit. There is no second list to keep in step.
 */
export type ReadingNeighbours = {
  /** The page before, absent on the first. */
  readonly before?: SiteRoute
  /** The page after, absent on the last. */
  readonly after?: SiteRoute
  /**
   * Where the reading hands off once this site has nothing left to say.
   *
   * The last page asks *what do I have to hand it*, and the honest answer to
   * *what now* at the foot of it is not another page of argument — it is the
   * documentation, whose own blurb is `How to install it, hand it the
   * components you already have`. The four surfaces are one application (0067)
   * with this one at its root (0070), so that is a step along the same origin
   * rather than a way off the site.
   *
   * It is the way out and it is therefore on exactly one page. A pager whose
   * `next` was *Docs* on all ten would be a menu item pretending to be a
   * sequence.
   */
  readonly onward?: Surface
}

/**
 * Where a route sits in the reading order, and what is on either side of it.
 *
 * A route that is not in `SITE_ROUTES` has no neighbors rather than throwing:
 * the only callers are the ten page builders, every one of which is looked up
 * out of that same list by `render.ts`, so an unknown route here is not a state
 * this site can reach. Returning an empty pair keeps the one function total.
 */
export const readingNeighbors = (route: SiteRoute): ReadingNeighbours => {
  const at = SITE_ROUTES.findIndex((other) => other.path === route.path)

  if (at < 0) return {}

  const before = SITE_ROUTES[at - 1]
  const after = SITE_ROUTES[at + 1]

  return {
    ...(before === undefined ? {} : { before }),
    ...(after === undefined ? { onward: DOCS } : { after }),
  }
}
