import type { TreeId } from "@jam-overture/loom"

import { nameReading, type PageName } from "./page-name"
import { screenName } from "./screen-names"
import type { PlainLine } from "./vocabulary"

/**
 * The six things the portal can tell you about one page, and how to get to each
 * of them.
 *
 * It was five until 15 September, when the reader view landed and the strip grew
 * the one question on it that is not about Loom: *what did people do?* The
 * others are all answerable from the record of what was proposed and accepted,
 * which is why they existed first — and it is exactly why the missing one was
 * the valuable one, because a deployment that cannot see what its readers did
 * has no way to judge any of the changes the other five describe.
 *
 * The portal's rail is organised by screen, which is how the portal is built
 * rather than how anybody uses it. A person does not think "I will visit the
 * Trust route and add a tree parameter"; they think "this page — what has been
 * asked of it, what has changed on it, can I believe what the AI says about it,
 * does it still add up". Every one of those five answers already existed and
 * four of them could only be reached by editing a URL.
 *
 * `/portal/trust?tree=…` is the sharpest case: the screen has read a `tree`
 * parameter since it was written, scopes its whole fold to it, and **nothing in
 * the portal has ever linked to it.** A working view nobody can reach is
 * indistinguishable from one that does not exist, and it was the one view that
 * answers a question no other tool can — whether the AI's confidence has held up
 * *on this page*, rather than across everything this deployment has ever seen.
 *
 * So the views are named once, here, and every screen renders the same strip.
 * Before this, five screens carried five different vocabularies for the same
 * five destinations — "Everything ever asked of this page →", "See what changed
 * →", "Show every page →", "All pages →", and a bare monospace id — none of
 * which agreed about what the other screens were called.
 *
 * ### Why the labels are questions
 *
 * A strip scoped to one page is not a list of places, it is a list of things you
 * might want to know about the page you are already looking at — so each label
 * is the question its screen answers. A link that says what you will get is the
 * whole of why a person clicks it.
 *
 * Two of them are no longer written here at all. `What's been asked` and
 * `What's changed` were this file's invention, and they were right — right
 * enough that on 8 September the rail and both headings were changed to match
 * them, because `Activity` and `History` are synonyms in ordinary English and
 * these two are not. They are read from `_lib/screen-names.ts` now, so the
 * strip and the rail cannot drift back apart. The other three stay literals,
 * for the reason that module gives for holding only three screens: a name moves
 * on the run that rewrites its screen.
 */

export type PageViewKey = "page" | "asked" | "changed" | "trust" | "checkup" | "readers"

export type PageView = {
  readonly key: PageViewKey
  /** What a person reads on the strip. Never a route name, never a runtime word. */
  readonly label: string
  readonly href: string
  /** Whether this is the view the reader is already on. */
  readonly current: boolean
}

/**
 * The order is the order somebody meets them in, not the rail's.
 *
 * The page itself first, because that is the thing; then what people asked of
 * it, then what actually happened, which is the order those two occur in. Trust
 * and the checkup come last because both are judgements *about* the first three
 * and neither is answerable until they exist.
 *
 * `What did people do?` sits between the record and the judgements, and the
 * position is the argument: the first three are what Loom did to the page and
 * the last two are whether it did it well, while this one is what happened to
 * the page once it was out in the world. It is the only view here that is not
 * about Loom at all, and it is the only one whose answer could change without
 * anybody asking for anything.
 */
const VIEWS: readonly {
  readonly key: PageViewKey
  readonly label: string
  /** The route with no page in mind — the same view, across every page. */
  readonly path: string
}[] = [
  { key: "page", label: "The page", path: "/portal/pages" },
  { key: "asked", label: screenName("/portal/activity"), path: "/portal/activity" },
  { key: "changed", label: screenName("/portal/history"), path: "/portal/history" },
  { key: "readers", label: "What did people do?", path: "/portal/readers" },
  { key: "trust", label: "Can you trust it?", path: "/portal/trust" },
  { key: "checkup", label: "Does it add up?", path: "/portal/checkup" },
]

const viewFor = (key: PageViewKey) => VIEWS.find((view) => view.key === key)!

/**
 * A tree id is `t_` and up to 32 lower-case alphanumerics, so nothing here needs
 * escaping and `encodeURIComponent` is a no-op on every id that exists. It stays
 * because the schema is the runtime's to change and a link that silently stopped
 * being correct when it did would be found by a reader rather than by a test.
 *
 * The page itself is the one view that names its tree in the path rather than in
 * a query, because it is the only one that cannot be asked about every page at
 * once — `/portal/pages` is a list, not the same screen unscoped.
 */
const hrefFor = (key: PageViewKey, treeId: TreeId): string =>
  key === "page"
    ? `/portal/pages/${encodeURIComponent(treeId)}`
    : `${viewFor(key).path}?tree=${encodeURIComponent(treeId)}`

/**
 * Every view of one page, with the reader's own marked.
 *
 * The current view is passed in by the screen rendering it rather than derived
 * from the path. A screen knows which one it is; working it out from a URL would
 * be a second source of truth about something that was never in doubt, and it is
 * the kind of derivation that quietly stops matching after a route moves.
 */
export const pageViewsFor = (treeId: TreeId, current: PageViewKey): readonly PageView[] =>
  VIEWS.map((view) => ({
    key: view.key,
    label: view.label,
    href: hrefFor(view.key, treeId),
    current: view.key === current,
  }))

/**
 * The way out of one page's scope — the same question, asked of every page.
 *
 * Every scoped screen already had one of these and no two agreed on how to say
 * it: "Show every page →", "All pages →", "← Pick a different page", "Check a
 * different page". Four wordings for one idea, each written by whoever last
 * touched that screen, and a reader crossing three of them has to work out from
 * scratch each time that they all mean the same thing.
 *
 * It resolves against the view being left rather than always to the page list,
 * which is what makes one wording true everywhere. A reader leaving one page's
 * history wants every page's history, and sending them to a list of pages
 * instead answers a question they did not ask — every one of these routes
 * already serves its own unscoped view.
 */
export const everyPageHref = (current: PageViewKey): string => viewFor(current).path

/**
 * What each screen says when it is showing one page rather than all of them.
 *
 * Four screens took a `tree` parameter, narrowed everything they showed to it,
 * and said so nowhere. `/portal/activity?tree=t_seed1` was headed `Activity`
 * over *"Everything anyone has asked Loom to change"* — a claim about the whole
 * deployment, printed over a filtered list. The only thing on screen that hinted
 * at the filter was a "Show every page →" link in the corner, which a reader can
 * only read as a clue after they have already been misled. **A list that hides
 * rows without saying so is worse than one that shows none.**
 *
 * The scoped sentence lives here rather than in each screen so that the strip
 * and the sentence cannot disagree about what a view is for: "What's been asked"
 * and "Everything anyone has asked…" are the same promise at two lengths, and
 * two files is how they drift apart.
 *
 * Each is a `PlainLine` rather than a string because the subject in the middle
 * is a name — it stays verbatim — so the sentence reaches a component in three
 * pieces. That is the exact shape that produced three defects on 24 August, all
 * of them a missing space where two independently held strings met, and
 * `readingOf` is what a test asserts instead of either half.
 *
 * ### The subject is the page, not the id
 *
 * It was the id until today. On 6 September a page acquired a name — read from
 * the heading the page itself leads with — and it reached the headings, the
 * pages list, the front door's cards and both choosers, and it did not reach
 * here. So the front door called a page **Autumn arrivals** and its history,
 * two clicks away, opened *"Every change that has actually been made to
 * `t_seed1`"*: the same page, named twice, and the machine identifier was the
 * one in the sentence a reader is meant to understand.
 *
 * Both halves, as everywhere else the portal names a page — the words so a
 * reader knows which page this is, the id so they can say which page this is to
 * a log or a URL. `nameReading` is the string the pair reads as, and
 * `<ScopedLead>` is what renders it, so the sentence a test asserts and the
 * sentence on the screen cannot come apart.
 */
export type ScopedView = Exclude<PageViewKey, "page">

const SCOPED_LEADS: Readonly<Record<ScopedView, { readonly before: string; readonly after: string }>> =
  {
    asked: {
      before: "Everything anyone has asked Loom to change on ",
      after:
        ", newest first — including the changes it wasn’t allowed to make and the requests it didn’t understand. Those leave no other trace anywhere.",
    },
    changed: {
      before: "Every change that has actually been made to ",
      after:
        ", newest first — and, for each one, exactly what undoing it would put back. The page as it stands keeps no record of what it replaced; this does.",
    },
    readers: {
      before: "How far people got down ",
      after:
        ", what they opened and what they clicked — part by part, and per version of the page, so a change can be read against the one before it. Visits are counted; nobody is identified.",
    },
    trust: {
      before: "Every time the AI proposes a change it says how sure it is. This is how those claims have held up on ",
      after: " alone, rather than across everything this deployment has ever done.",
    },
    checkup: {
      before: "Whether ",
      after: " is still exactly the page its own history says it should be.",
    },
  }

export const scopedLead = (view: ScopedView, page: PageName): PlainLine => ({
  before: SCOPED_LEADS[view].before,
  subject: nameReading(page),
  after: SCOPED_LEADS[view].after,
})
