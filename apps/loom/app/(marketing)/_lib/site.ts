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
   * the count crept back to eight as this route group grew a fourth page.
   *
   * So a page may be kept out of the bar — and `chrome.test.ts` holds *out of
   * the bar* to mean exactly that and never *off the site*: whatever is left out
   * is in the footer's map, and the footer marks it as the page the reader is on
   * so the site still says where they are.
   *
   * **The flag is a judgement and the ceiling is the rule.** Eight is the number
   * the maintainer called too many, so `BAR_CEILING` in `./chrome.ts` is eight
   * and `bar.test.ts` fails on a ninth. Below that the flag is each page's own
   * call about ten seconds of a stranger's attention, re-read when the site
   * changes shape rather than inherited: two of these three answered it against
   * a six-page site that was cut to three, and one of the two was wrong by
   * 12 October.
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
 * **It is `inMenu: true` as of 12 October, and the paragraph that used to be
 * here is why the flag needs re-reading rather than inheriting.** It said:
 * *"The bar is the eight items the maintainer asked about on #166; a sixth page
 * is not worth a ninth."* Both numbers were true when they were written and
 * neither is now. The site was cut from six pages to three on 26 September, and
 * the bar carries **four things** — one page, two surfaces and the action — so
 * the ninth item that argument was protecting the reader from does not exist.
 *
 * What the flag is actually weighing is ten seconds of a stranger's attention,
 * and on that question this page wins its place: it answers *what would I be
 * installing*, which is the question a developer asks before they will read an
 * installation guide, and it was reachable only from the footer's map and from
 * links inside two other pages. A visitor who wanted it had to already know it
 * was there.
 *
 * `chrome.test.ts` still holds *off the bar* to mean *in the footer's map and
 * nowhere unreachable*, which is what makes `inMenu: false` safe for the front
 * door. `bar.test.ts` holds the other end: the bar has a ceiling, it is stated
 * as a number, and a page or a surface that would be the ninth item fails
 * rather than arriving.
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
  inMenu: true,
}

/**
 * Every route, in nav order. A route that is not here has no way to be reached.
 *
 * The order is the order a stranger needs them in, not the order they were
 * built: **what this is, then how it works, then what you would be running.**
 * A reader who does not yet believe the thing is worth having has no use for
 * the news that it installs as a package.
 *
 * The footer renders this list in order, and the front door is first in it
 * although the bar leaves it out, because the footer's map is a map of the site
 * and a map that omitted the front door would be the navigation failure this
 * list exists to prevent.
 *
 * > **The fifty lines that used to be here argued the order of ten pages, and
 * > seven of them do not exist.** They were real pages, retired on 26
 * > September, and `RETIRED_ROUTES` below is the list of them — each had a
 * > paragraph here saying why it sat where it sat. The site was cut to three pages on 26 September
 * > and the reasoning stayed, so the one file that defines what this site *is*
 * > spent a fortnight explaining a site nobody can open. Filed by this lane on
 * > 7 October, and what is above is the rewrite it asked for: the order of the
 * > three that are left, in three sentences. The seven paragraphs went rather
 * > than being updated, because an argument for an adjacency between two pages
 * > that are both gone is not history worth keeping in the file the next run
 * > reads to find out what this site has. They are in `git log`.
 */
export const SITE_ROUTES: readonly SiteRoute[] = [HOME, HOW_IT_WORKS, WHAT_YOU_RUN]

/**
 * The paths of {@link SITE_ROUTES}, sorted — **what a sweep's coverage is held
 * against, declared in the module that declares the site.**
 *
 * Four test files had each written `[...SITE_ROUTES.map((route) => route.path)].sort()`
 * inline by 22 October, and `requested.ts` kept a `Set` of the same thing under
 * this same name. That is the shape `measure.ts` has a paragraph against: a
 * projection copied into five files is five chances to disagree about what
 * counts as a page of this site, and one of them was already a different type
 * wearing the same spelling.
 *
 * **It is here rather than beside `sweepCover` in `served.ts` on purpose.** The
 * thing a sweep guard has to avoid is an expected value taken from the code
 * under test — this lane's 27 September filing — and the code under test for a
 * sweep is `served.ts`. This module is the *declaration* of what the site is,
 * which is the thing a sweep is supposed to have found. The two being different
 * modules is what makes the comparison an assertion.
 */
export const SITE_PATHS: readonly string[] = [...SITE_ROUTES.map((route) => route.path)].sort()

/**
 * The fewest pages this site may have for a sweep over it to be worth reading,
 * hand-written.
 *
 * **It is the only number in the sweep guards that nothing computes**, and that
 * is its whole job. `SERVED_STATE_COUNT` is `SITE_ROUTES.length * ASK_STATES.length`,
 * so on a site with no pages the sweep comes back with nothing, the constant is
 * zero, and *the sweep found what it expected to* is true. Measured on
 * 23 October with `SITE_ROUTES` emptied: **six rules of the form “nothing on
 * this site is X” were green, and so were two of the six tests written to stop
 * exactly that** — the two that had no floor of this kind.
 *
 * Three is right to write by hand because it moves when a page is added to this
 * site or retired from it — a deliberate act somebody is already thinking about
 * — and never when the sweep is crossed with one dimension more or less, which
 * is the 21 October failure `sweepShare` records.
 *
 * It is a floor and not an equality for the same reason: a fourth page should
 * not turn this red.
 */
export const PAGES_AT_LEAST = 3

/**
 * The pages this site used to have, and where each one went.
 *
 * **It is here because the prose of this route group kept naming them.** On
 * 26 September the maintainer cut a ten-page site to three; the seven below
 * went, and their *words* mostly did not — they were absorbed into bands of the
 * two pages that survived. So every module that had a reason to mention one
 * went on mentioning it, and nothing could tell. Swept on 14 October, the route
 * group named these seven **forty times**, and **eleven** of those mentions put
 * a retired page in the present tense — not as history, but as something doing
 * a job now. `readers/counting.ts` credited the retired `/what-readers-do` with a
 * live promise about whether this deployment counts anybody; `chrome.ts`
 * argued that the mechanism page is reachable from the retired `/the-rules`'
 * own card; `adapt/run.ts` attributed two of this site's three floors to the
 * retired `/your-components`.
 *
 * **Nothing a reader sees was ever wrong**, which is why it lasted: the sitemap,
 * `llms.txt`, the bar and the footer are all built from `SITE_ROUTES`, so a
 * retired page could not leak into a link, a crawl or a map. It leaked into the
 * explanations instead, where the only reader is the next run — and a wrong
 * explanation reads exactly like a right one.
 *
 * `named.test.ts` is what holds it now, and the rule it holds is in that file.
 * The list is data rather than a sentence so the test has something to check
 * against; `absorbedBy` is what a run should follow when it finds the mention,
 * because in every one of the seven cases the argument being made is still true
 * of the band that took the words.
 */
export type RetiredRoute = {
  /** The path it was served at, spelled the way the prose spells it. */
  readonly path: string
  /** The band that took its words, named by the page and the eyebrow. */
  readonly absorbedBy: string
}

/** The seven, in the order the retired site read them. */
export const RETIRED_ROUTES: readonly RetiredRoute[] = [
  { path: "/the-rules", absorbedBy: "/how-it-works, 'Your rules'" },
  { path: "/the-record", absorbedBy: "/how-it-works, 'The record'" },
  { path: "/when-it-goes-wrong", absorbedBy: "/how-it-works, 'When the answer is no'" },
  { path: "/putting-it-back", absorbedBy: "/how-it-works, 'Putting it back'" },
  { path: "/who-can-ask", absorbedBy: "/how-it-works, 'Who is asking'" },
  { path: "/your-components", absorbedBy: "/what-you-run, 'What you bring'" },
  { path: "/what-readers-do", absorbedBy: "/what-you-run, 'What this page counts'" },
]

/**
 * The one page of this site a visitor can ask for a change to.
 *
 * It is `/how-it-works` and it used to be the front door. The maintainer moved
 * the band on 1 October — *"Remove the see it happen section from the main
 * landing page and only let it exist in the How it works section"* — and this
 * constant exists because that move has now been found half-applied twice:
 *
 * | found | what was still pointed at the front door |
 * | --- | --- |
 * | 9 October | the reading of the address, so *Put it back* did nothing for eight days |
 * | 11 October | the card a shared link unfurls as, and the picture behind it |
 *
 * Neither was a hard thing to get right. Both were the same easy thing to get
 * wrong: *which page runs a request* was written as `route.path === HOME.path`
 * in one file and `HOW_IT_WORKS` in another, so moving the band meant finding
 * every place that had quietly decided it already. A comparison spelled out at
 * the point of use is a decision nobody can grep for.
 *
 * So it is one name, and the four things that need the answer read it: the
 * renderer that runs the request, the writer of an address, the words a shared
 * link unfurls with, and the picture it unfurls as. A fifth page taking the
 * band is one line here.
 *
 * **It is deliberately not a field on `SiteRoute`.** `inMenu` is a choice each
 * route makes and three routes answer differently; this is a fact about the
 * site of which there is exactly one, and a boolean on every route would invite
 * a second page to set it — which is a state this site has no meaning for,
 * because the band is the demonstration and there is one of those.
 */
export const ASKED_ROUTE: SiteRoute = HOW_IT_WORKS

/**
 * Whether this is that page.
 *
 * A predicate rather than letting each caller write the comparison, because the
 * comparison is the thing that was written four times and went stale in three
 * of them. Compared by path and not by identity: a card is drawn from a route
 * looked up out of a query string, and `SITE_ROUTES.find` hands back the same
 * object only for as long as nobody passes a copy.
 */
export const isAskedRoute = (route: SiteRoute): boolean => route.path === ASKED_ROUTE.path

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
  /**
   * What is not built yet behind this link, for a visitor deciding to press it.
   *
   * **A fact about the product, not about this deployment**, and the difference
   * is what makes it sayable at all. `GuardedSurface`'s note settles that this
   * lane cannot claim a door opens: whether sign-in is configured is the
   * deployment's business and nothing here can see it. *Whether a surface has
   * been finished* is a different question with a different answer — it is true
   * of this version of Loom wherever it is served, the lane that owns the
   * surface has already written it down, and `unfinished.test.ts` reads it off
   * the repository rather than guessing.
   *
   * Set only while that is true, and the test holds it in both directions: a
   * surface still carrying its own under-construction banner must say so here,
   * and one that has stopped carrying it must stop saying so. So this is a
   * record of a surface being unfinished rather than a caveat that outlives it.
   *
   * It is one sentence because it is read in two places that have room for one:
   * the questions band's answer about the door, and this file's own `cost`.
   */
  readonly notYet?: string
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
    "Ask a small business's page to rearrange itself in your own words, and watch the record fill in beside it.",
  cost: "Takes one click",
  guarded: false,
  inMenu: true,
}

export const DOCS: Surface = {
  path: "/docs",
  label: "Docs",
  blurb:
    "How to install it, hand it the components you already have, and get your first change approved on a page of your own.",
  cost: "Takes a few minutes",
  guarded: false,
  inMenu: true,
}

export const LESSONS: Surface = {
  path: "/lessons",
  label: "Lessons",
  blurb:
    "A course on why Loom works the way it does. You answer before you read, and it tells you when to come back.",
  cost: "Takes an afternoon",
  guarded: false,
  inMenu: false,
}

export const PORTAL: GuardedSurface = {
  path: "/portal",
  label: "Portal",
  blurb:
    "Where the changes are reviewed: what was asked for, what was allowed, and the button that puts any of it back.",
  /**
   * *"Costs you an account"* until 10 September, and it is the half of the
   * mistake a reader could act on.
   *
   * The four costs are read along one line by somebody choosing where to spend
   * their afternoon, and three of them name something the reader can spend. An
   * account is not: nobody reading this site can obtain one by deciding to.
   * Whoever runs a Loom site writes the list of who may sign in to its portal,
   * so the thing being asked for is somebody else's decision — which is what
   * *an invitation* says in the same four words and the same shape.
   *
   * **It is not what this card should say today, and that is this run's
   * change.** An invitation is what the finished portal will ask for and the
   * reasoning above still holds for the day it is finished. What a visitor
   * pressing this card in October actually meets is a surface that says, in its
   * own words, that it is still being built — so *an invitation* answered a
   * question the reader does not get to ask yet, in the one place on the page
   * where four destinations are compared. The invitation survives in `door`,
   * which is where somebody asking *can I get in* reads it.
   */
  cost: "Still being built",
  guarded: true,
  /**
   * The portal is the only unfinished surface this site offers, and until this
   * run the only place that said so was on the far side of the link.
   *
   * `(portal)/_components/under-construction.tsx` has carried a banner since
   * 28 September, at the maintainer's instruction, and its own note gives the
   * reason: *"a stranger who follows Portal from the front door arrives at a
   * working screen and has no way to know that most of what it will be is not
   * built yet."* That fixed the far half. This is the near half — the front
   * door sends the stranger, so the front door is where the sentence is worth
   * something, and a visitor who reads it here does not spend a click finding
   * out.
   *
   * Worded as what is missing rather than as an apology. A reader deciding
   * where to go next wants to know what they will find, and *coming soon* is
   * the one phrasing that tells them nothing.
   */
  notYet: "Most of it is still being built, so there is not much behind the door yet.",
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
    url.searchParams.set(ADDRESS_PARAMS.theme, theme)
  }

  return url.toString()
}

/**
 * The five words an address of this site is made of.
 *
 * `askedHref` writes them and `askedFor` reads them, and both take the spelling
 * from here, because a page that writes `back` and reads `back-yes` is a control
 * that does nothing and a build that is green. Four of the five are ours to
 * choose; `back-yes` is the spelling the record page's own sequence already
 * uses, so the two pages name approval the same way.
 *
 * The names are written out literally in `addressed.test.ts` rather than
 * compared against this record, which is the 8 October entry of this lane's own
 * findings applied to itself: a test that interpolates the constant it is
 * meant to pin is green on any misspelling.
 */
export const ADDRESS_PARAMS = {
  theme: "theme",
  ask: "ask",
  approve: "approve",
  back: "back",
  backApprove: "back-yes",
} as const

/**
 * What a yes looks like in an address, read the way every other parameter of
 * this site is read.
 *
 * `1` rather than `yes` or `true`, and the first value rather than the last,
 * which is `readThemeName`'s rule and `readAskId`'s. A query string may carry a
 * parameter twice — a link built from a link built from a link — and the three
 * answers disagreeing about which one counts is the kind of difference nobody
 * finds by reading.
 */
export const readYes = (given: string | readonly string[] | undefined): boolean =>
  (typeof given === "string" ? given : given?.[0]) === "1"

/**
 * `ASKED_ROUTE`, with what the visitor has asked of it written into the address.
 *
 * The band that lets a visitor rearrange that page keeps nothing: no session,
 * no cookie, nothing on the server between one request and the next. What the
 * page looks like is a function of its address, which is why
 * `/how-it-works?ask=costs` can be copied, shared, bookmarked and reloaded a
 * week later and still be the page it was, and why two people looking at the
 * site cannot rearrange it under each other.
 *
 * It said *the front door* and gave `/?ask=costs` as the example until
 * 11 October, which was true until the band moved on 1 October.
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
/**
 * The base a path is parsed against when there is no origin to parse it
 * against.
 *
 * Never read and never in the output: `origin` is empty exactly when the
 * caller wants a path, and a path is not a URL, so one has to be borrowed to
 * get at `searchParams` at all. `.invalid` is reserved by RFC 2606 and resolves
 * nowhere, so a leak would be loud rather than quietly pointing at a real host.
 */
const NO_ORIGIN = "https://site.invalid"

const askedHref = (origin: string, path: string, options: AskedFor): string => {
  const url = new URL(path, `${origin === "" ? NO_ORIGIN : origin}/`)

  if (options.theme !== undefined) url.searchParams.set(ADDRESS_PARAMS.theme, options.theme)
  if (options.ask !== undefined) url.searchParams.set(ADDRESS_PARAMS.ask, options.ask)
  if (options.approve === true) url.searchParams.set(ADDRESS_PARAMS.approve, "1")
  /**
   * Two parameters rather than one with three values, because they answer two
   * questions a visitor asks at two different moments — *put it back*, and then
   * *yes, I mean it* — and an address that said `back=yes` would be spelling the
   * second in a word that reads like the first.
   *
   * `-yes` is the suffix the record page's sequence already uses for exactly
   * this, so the two pages name approval the same way.
   */
  if (options.back === true) url.searchParams.set(ADDRESS_PARAMS.back, "1")
  if (options.backApprove === true) url.searchParams.set(ADDRESS_PARAMS.backApprove, "1")

  /*
   * **A path when the caller gave no origin**, which is how the three site
   * pages are seeded (`./stored.ts`): one stored row is served from every host
   * this deployment answers on, so an absolute href in it would freeze
   * whichever host wrote it. Metadata still passes an origin and still gets an
   * absolute URL, which is what a canonical link and a share card are obliged
   * to give.
   */
  return origin === "" ? `${url.pathname}${url.search}${url.hash}` : url.toString()
}

/**
 * The page a request is run against, with the request in the address.
 *
 * The page keeps nothing, so what it shows is a function of its address.
 * `/how-it-works` on its own is the page it has always been. With an ask in the
 * address it rearranges for that request and prints its record, which is what
 * lets one visitor hand another the record of the change they just watched
 * rather than of a different one.
 *
 * `approve` travels with it because the record does. A change the rules held
 * and the visitor then allowed has a line the held one does not, and a link
 * that dropped the approval would open a page whose record is one line shorter
 * than the panel the visitor followed it from.
 *
 * **There were two of these until 12 October**, and the second was
 * `mechanismHref`. They were different functions in September, when `askHref`
 * wrote an address of the front door and `mechanismHref` wrote one of
 * `/how-it-works`; the maintainer moved the band on 1 October and the two
 * destinations became the same page, after which 19 call sites across 8 files
 * were choosing between two names for one body. `ASKED_ROUTE` is now the single
 * answer to *which page*, so the name that says what the address **carries** is
 * the one that survived. Filed on 11 October, collapsed here, and the deletion
 * is the point: a second name is a decision every later call site has to make
 * again.
 */
export const askHref = (origin: string, options: AskedFor = {}): string =>
  askedHref(origin, ASKED_ROUTE.path, options)

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

/**
 * The same destination, as a path this site can **store**.
 *
 * ## Why a second pair of these exists
 *
 * `internalHref` and `surfaceHref` build an absolute URL, because the things
 * that needed one were the canonical link, the share card, the structured data
 * and the sitemap — all of them metadata, and all of them obliged to say which
 * host they mean. The page's own links were built the same way for no reason
 * beyond their being to hand.
 *
 * That stopped being free on 12 October, when the three site pages became
 * **stored trees** ([0259](../../../../../decisions/0259-a-surface-the-portal-governs-renders-from-the-store-and-a-page-built-at-render-time-is-not-one.md)
 * condition 1). A stored tree is written once and served from every host this
 * deployment answers on, so an absolute href freezes whichever origin seeded
 * it — and every preview deployment has its own. A stored `?theme=` freezes
 * the look the seeder happened to be wearing.
 *
 * So the page's links are now paths: no origin, no theme. `linkUrlSchema`
 * accepts *"a path beginning with / on this site"* and always has, so nothing
 * about the primitive had to change.
 *
 * **The theme is put back at render**, from the address, by
 * `_lib/stored.ts`' request pass — which is the line 0259 asked somebody to
 * draw between what the page is and what the request is. A link's destination
 * is the page's; the livery it is wearing is the request's.
 *
 * The absolute pair above is untouched and is still what metadata uses.
 */
/**
 * The asked route, as a path this site can store.
 *
 * `askHref` keeps taking an origin because metadata still needs an absolute
 * URL. A link **in a tree** never does: the invariant this change establishes
 * is that no href in a stored page carries a host, so that one row serves
 * every deployment of this site.
 */
export const askPath = (options: AskedFor = {}): string => askedHref("", ASKED_ROUTE.path, options)

export const sitePath = (path: string): string => path

/**
 * A route wearing a named palette — the one href whose theme is **its own
 * meaning** rather than the request's.
 *
 * Every other link on the site is stored theme-free and has the reader's
 * palette put on it at render. A re-theme link is the exception by definition:
 * *this* link means bold, whoever is looking at it, so the palette belongs in
 * the stored href and the request pass leaves it alone.
 */
export const paletteHref = (path: string, palette: SiteThemeName): string =>
  `${path}?${ADDRESS_PARAMS.theme}=${palette}`

/** A surface of this deployment — the demo, the docs, the portal — as a path. */
export const surfacePath = (surface: Surface): string => surface.path

/** Where the site points when it points at the project itself. */
export const REPOSITORY_URL = "https://github.com/jam-overture/loom"
/**
 * The package on npm, which is the one off-site link that is part of the ask.
 *
 * The install band prints a command and sends a reader to the documentation;
 * this is the third thing somebody about to run that command wants, and it is
 * a different want from either — **not how to use it, but whether it is real.**
 * A published page with a version, a date and a readme answers that in a way a
 * marketing site cannot answer about itself.
 *
 * It names the runtime rather than the starter library because the two package
 * pages carry the same readme-shaped reassurance and a reader following one
 * link does not want a choice. The command above it asks for both; this says
 * what the first of them is.
 *
 * **Checked by a person, like every off-site link here** (`routes.test.ts`
 * says why it cannot be checked by a test): loaded 11 October, `0.1.0`,
 * public. `facts.test.ts` holds the package *name* in it against the manifest
 * this repository publishes from, which is the half of the address that can go
 * wrong silently.
 */
export const NPM_PACKAGE_URL = "https://www.npmjs.com/package/@jam-overture/loom"
/** The licence itself, which the footer links to beside the sentence naming it. */
export const LICENSE_URL = "https://github.com/jam-overture/loom/blob/main/LICENSE"
export const DECISIONS_URL = "https://github.com/jam-overture/loom/tree/main/decisions"

/**
 * The page before this one and the page after it, in the order the site's own
 * argument is written in.
 *
 * `SITE_ROUTES` is a **reading order**, and this derives the pager from it: the
 * front door, then how it works, then what you would be running.
 *
 * Neighbours are derived rather than written down, so a route inserted into
 * `SITE_ROUTES` is a route the pages before and after it start pointing at on
 * the same commit. There is no second list to keep in step.
 *
 * > **Twenty-five lines of this comment argued a ten-page site**, the same cut
 * > of 26 September that `RETIRED_ROUTES` records, and they survived the 7
 * > October rewrite 750 lines above because that finding was filed against the
 * > comment on `SITE_ROUTES` and this one is a different comment in the same
 * > file. Every claim in it was false by then and none of it read that way: it
 * > measured *"the ten page builders on `main`"* when there were three, called
 * > the footer's map *"ten links in a column"* when it was three, and named
 * > two retired pages as the ones no page's body links to. Its best line was
 * > the one that was hardest to doubt — *"the page the front door's own
 * > closing band sends every visitor to — `/how-it-works` — ends without
 * > pointing anywhere"* — which stopped being true the moment the site was cut
 * > to three, because `/how-it-works` became the middle of three and the pager
 * > below has pointed it onward ever since.
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
   * `next` was *Docs* on every page would be a menu item pretending to be a
   * sequence.
   */
  readonly onward?: Surface
}

/**
 * Where a route sits in the reading order, and what is on either side of it.
 *
 * A route that is not in `SITE_ROUTES` has no neighbors rather than throwing:
 * the only callers are the page builders, every one of which is looked up out
 * of that same list by `render.ts`, so an unknown route here is not a state
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
