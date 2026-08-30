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
}

export const HOME: SiteRoute = {
  path: "/",
  label: "Home",
  title: "Loom — every change your AI makes, written down",
  description:
    "Ask for a change in your own words and the page rearranges itself. Nothing lands until it has been checked against your rules, and every change keeps a record of who asked, what moved, and how to put it back.",
}

export const HOW_IT_WORKS: SiteRoute = {
  path: "/how-it-works",
  label: "How it works",
  title: "How it works — Loom",
  description:
    "Every change to a Loom page takes the same five steps: someone asks for it, the AI writes down exactly what it wants to change, the change is measured, your rules decide, and what happened is recorded.",
}

export const THE_RECORD: SiteRoute = {
  path: "/the-record",
  label: "The record",
  title: "The record — what changed, who asked, and how to put it back",
  description:
    "Ask the front page for one change after another and watch the list fill in: what each request turned out to be, how much of the page it moved, which of your rules allowed it, and what putting it back would restore.",
}

/** Every route, in nav order. A route that is not here has no way to be reached. */
export const SITE_ROUTES: readonly SiteRoute[] = [HOME, HOW_IT_WORKS, THE_RECORD]

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
export type Surface = {
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
  /** Whether a visitor who is not signed in is sent to a sign-in page first. */
  readonly guarded: boolean
}

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
}

export const DOCS: Surface = {
  path: "/docs",
  label: "Docs",
  blurb:
    "How to install it, hand it the components you already have, and get your first change approved on a page of your own.",
  cost: "Costs you a read",
  guarded: false,
}

export const LESSONS: Surface = {
  path: "/lessons",
  label: "Lessons",
  blurb:
    "A course on why Loom works the way it does. You answer before you read, and it tells you when to come back.",
  cost: "Costs you an afternoon",
  guarded: false,
}

export const PORTAL: Surface = {
  path: "/portal",
  label: "Portal",
  blurb:
    "Where the changes are reviewed: what was asked for, what was allowed, and the button that puts any of it back.",
  cost: "Costs you an account",
  guarded: true,
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
export const askHref = (
  origin: string,
  options: {
    readonly theme?: SiteThemeName
    readonly ask?: string
    readonly approve?: boolean
  } = {}
): string => {
  const url = new URL(HOME.path, `${origin}/`)

  if (options.theme !== undefined) url.searchParams.set("theme", options.theme)
  if (options.ask !== undefined) url.searchParams.set("ask", options.ask)
  if (options.approve === true) url.searchParams.set("approve", "1")

  return url.toString()
}

/**
 * The mechanism page, with the request whose record it should print.
 *
 * Same property as `askHref` and for the same reason: the page keeps nothing,
 * so what it prints is a function of its address. `/how-it-works` on its own is
 * the page it has always been — the record of the quietest of the five choices,
 * chosen because it is the one whose lines fit on a screen. With an ask in the
 * address it prints the record of *that* request instead, run against the same
 * published front door, which is what lets the front door hand a visitor the
 * raw record of the change they just watched rather than of a different one.
 *
 * `approve` travels with it for the same reason it travels on the front door: a
 * change the rules held and the visitor then allowed has a sixth line, and a
 * page that dropped the approval would print five and contradict the panel the
 * visitor followed the link from.
 */
export const mechanismHref = (
  origin: string,
  options: {
    readonly theme?: SiteThemeName
    readonly ask?: string
    readonly approve?: boolean
  } = {}
): string => {
  const url = new URL(HOW_IT_WORKS.path, `${origin}/`)

  if (options.theme !== undefined) url.searchParams.set("theme", options.theme)
  if (options.ask !== undefined) url.searchParams.set("ask", options.ask)
  if (options.approve === true) url.searchParams.set("approve", "1")

  return url.toString()
}

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
