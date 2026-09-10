import type { JsonObject } from "@loom/runtime"

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

export const HOME: SiteRoute = {
  path: "/",
  label: "Home",
  title: "Loom — every change your AI makes, written down",
  description:
    "Ask for a change in your own words and the page rearranges itself. Nothing lands until it has been checked against your rules, and every change keeps a record of who asked, what moved, and how to put it back.",
  inMenu: true,
}

export const HOW_IT_WORKS: SiteRoute = {
  path: "/how-it-works",
  label: "How it works",
  title: "How it works — Loom",
  description:
    "Every change to a Loom page takes the same five steps: someone asks for it, the AI writes down exactly what it wants to change, the change is measured, your rules decide, and what happened is recorded.",
  inMenu: true,
}

/**
 * The page the front door's central promise sends a reader looking for.
 *
 * Everything else on this site says *nothing lands until it has been checked
 * against your rules*, and until 28 August the obvious next question — **what
 * is a rule, and who writes it?** — was answered in one band of the mechanism
 * page and one line of a questions list. That is the half of the pitch the
 * recorded positioning says is the differentiator: not that a page adapts, but
 * that somebody decided in advance what it may do and can prove which decision
 * applied.
 *
 * It is a description of code rather than a position, like the mechanism page
 * and unlike anything about audience or price, which is why it could be written
 * without waiting for an answer.
 */
export const THE_RULES: SiteRoute = {
  path: "/the-rules",
  label: "The rules",
  title: "The rules — what your AI may change, and what it may not",
  description:
    "You write down what may change on your page and what may never change. Every request is weighed against it before anything moves, and the answer names the rule that gave it.",
  inMenu: true,
}

export const THE_RECORD: SiteRoute = {
  path: "/the-record",
  label: "The record",
  title: "The record — what changed, who asked, and how to put it back",
  description:
    "Ask the front page for one change after another and watch the list fill in: what each request turned out to be, how much of the page it moved, which of your rules allowed it, and what putting it back would restore.",
  inMenu: true,
}

/**
 * The page for the question this site had four pages and no answer to.
 *
 * Read across its own links, the front door says two different things about
 * where the pieces of a page come from. The numbers band offers *"N ready-made
 * pieces to build with"*; the questions band directly below it answers *"can the
 * AI write code into my page?"* with *"it can only use the pieces **you handed
 * it**"*; the band above says it *"only rearranges pieces **you built and
 * already trust**"*. Both halves are true — a starter library exists, and a host
 * describes its own components — and nowhere on the site are the two said in the
 * same breath.
 *
 * A developer reading that has to guess at the one question that decides whether
 * they can use this at all: **do I have to rebuild my page in somebody else's
 * components?** The answer is no, it has always been no, and the site's own copy
 * left it open. This is the sixth run running to find two individually
 * defensible sentences that had never been read next to each other, and the
 * first where the fix is a page rather than a word.
 *
 * It is a description of code rather than a position — what a host hands over,
 * what the machinery does with it, and what it refuses — so it could be written
 * without waiting on the positioning answers the licence line is still waiting
 * on.
 *
 * **It is `inMenu: false`,** and that is the one judgement call in it. See the
 * flag's note above: the bar is back to the eight items the maintainer asked
 * about on #166, and a page that resolves a contradiction is not worth a ninth.
 */
export const YOUR_COMPONENTS: SiteRoute = {
  path: "/your-components",
  label: "Your components",
  /**
   * The name is deliberately not in it. `share.ts` splits a title on its
   * separator and drops the part that is exactly the wordmark, because the card
   * already carries the name at its top left — so a title with *Loom* inside a
   * clause prints it twice to the one reader who sees the card and not the page.
   * Two of the four existing titles solve that by not saying it at all, and this
   * is the third.
   */
  title: "Your components — the ones you already built, rearranged and never rewritten",
  description:
    "Loom never asks you to rebuild your page in somebody else's components. You describe the ones you already have — the name, what each is for, and which settings may be changed — and that description is the whole of what the AI is ever allowed to touch.",
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
 * The components page is last because it is the question that arrives after all
 * four of those: somebody who has decided they might want this asks what it
 * would cost them to try. It is also the one page the bar does not carry, and
 * the footer renders this list in order, so last is where a reader meets it.
 */
export const SITE_ROUTES: readonly SiteRoute[] = [
  HOME,
  HOW_IT_WORKS,
  THE_RULES,
  THE_RECORD,
  YOUR_COMPONENTS,
]

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
   * opens. It is rendered wherever this surface is offered with room for a
   * sentence, off this one string, so the front door and the record page cannot
   * come to describe the same door two ways.
   */
  readonly door: string
}

export type Surface = OpenSurface | GuardedSurface

/**
 * The door's sentence, for a caller that has a surface and does not know which
 * kind it is.
 *
 * Every band that offers a surface offers all of them — the front door's is
 * exactly `PRODUCT_SURFACES` and holds a test to it — so the narrowing happens
 * once, here, rather than at each call site.
 */
export const doorOf = (surface: Surface): string | undefined =>
  surface.guarded ? surface.door : undefined

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
  askedHref(origin, HOME.path, options)

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
 * The record page, with the run of changes it is reporting on in the address.
 *
 * Same argument as `askHref` and the same property: the page keeps nothing, so
 * a history is not a session — it is a list of requests written into the URL,
 * replayed from the front door as it is published every time the page is
 * loaded. Two people can read the same history a week apart and get the same
 * answer, and neither of them can move it under the other.
 *
 * The sequence arrives here already written out. Composing it is
 * `adapt/history.ts`'s job and that module imports this one, so a `changes`
 * string rather than a list of asks is what keeps the two from importing each
 * other.
 */
export const recordHref = (
  origin: string,
  options: { readonly theme?: SiteThemeName; readonly changes?: string } = {}
): string => {
  const url = new URL(THE_RECORD.path, `${origin}/`)

  if (options.theme !== undefined) url.searchParams.set("theme", options.theme)
  if (options.changes !== undefined && options.changes.length > 0) {
    url.searchParams.set("changes", options.changes)
  }

  return url.toString()
}

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
export const DECISIONS_URL = "https://github.com/jam-overture/loom/tree/main/decisions"
