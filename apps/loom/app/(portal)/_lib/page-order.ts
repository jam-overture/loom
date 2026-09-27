import type { PageName } from "./page-name"

/**
 * What order a list of pages is in, said once for the whole portal.
 *
 * ## The defect this closes
 *
 * Four screens in this portal list the same set of pages, and until this module
 * each of them listed it differently and none of them said so:
 *
 * | Screen | What it did |
 * | --- | --- |
 * | `/portal/pages` | whatever the store returned |
 * | `/portal/history` — the chooser | whatever the store returned |
 * | `/portal/checkup` — the chooser | whatever the store returned |
 * | `/portal/checkup/everything` — the sweep | worst first, then whatever the store returned |
 *
 * "Whatever the store returned" is a **cursor order**. It exists so that a
 * listing can be resumed, and it is a property of the implementation rather than
 * a decision anybody made: the memory store walks its keys, a Postgres store
 * walks an index, and neither is an order a person asked for. So a reader who
 * opened two of these screens saw the same pages twice, in two arrangements,
 * with no way to tell whether the two screens agreed about anything.
 *
 * It was filed on 22 September, re-filed with a third screen on 25 September,
 * and the entry left the argument to the run that took it. This is that run, and
 * the answer is **not** one order for all four.
 *
 * ## Why four orders and not one
 *
 * Because the four lists are four different offers, and an order is how a list
 * answers *what do I do now*:
 *
 * - a list you **act on** should lead with the page that needs you
 * - a list you **pick from** should lead with the pages you can actually pick
 * - a list of **results** should lead with the bad news.
 *
 * Forcing one order on all four would mean three of them leading with something
 * irrelevant, which is a worse defect than the one being fixed — the sweep would
 * bury a page that failed underneath a page waiting on an answer, on the one
 * screen whose entire job is to report failures.
 *
 * So what is shared is not the order. It is these two things, and they are what
 * makes the four screens legibly the same portal:
 *
 * 1. **Every list says which order it is in**, in one sentence, above itself.
 *    `ORDER_LEAD` holds the four sentences; `SAME_AFTER_THAT` is the clause they
 *    all share. A reader who notices that two screens disagree can read why.
 * 2. **Every list has the same tiebreak**, so two screens agree about the pages
 *    they have nothing to say about — which on a healthy deployment is all of
 *    them. This is the half that actually removes the cursor order: today the
 *    bottom of all four lists is arbitrary and differs between deployments, and
 *    after this it is the page's own name on every screen.
 *
 * ## What this costs
 *
 * Nothing. Every rung of every rank below is a fact its screen had already read
 * before this module existed — the waiting counts on `/portal/pages`, the
 * revision on both choosers, the seed registry (a memoised pure function) on the
 * checkup chooser, and the standing the sweep has just computed. **No screen
 * gains a read**, and `page-order.test.ts` cannot assert that, so the reading
 * order guard on each screen does.
 *
 * ## Why a function rather than a `sort` at each call site
 *
 * The same reason `inQueueOrder` gives, and it is the reason this defect lived
 * for a month: a screen is an `async` Server Component that reads cookies and a
 * store, so a `sort` written inside one is a wiring no test runs. A list that
 * silently fell back to cursor order would look entirely correct in a screenshot
 * of a deployment where cursor order happens to be alphabetical.
 */

/**
 * The four orders, named after what leads the list rather than after the
 * comparison that produces it.
 *
 * `worst-first` is the sweep's, and it keeps the word the sweep already used.
 * The other three are new, and each is the shortest true description of its own
 * first rung.
 */
export type PageOrder =
  | "needs-you-first"
  | "ready-to-check-first"
  | "most-changed-first"
  | "most-wrong-first"
  | "worst-first"
  | "by-name"

/**
 * The sentence a list puts above itself.
 *
 * One clause, present tense, naming the top of the list — because the top is
 * the only part of an order a reader needs told. It is the plain half of the
 * pair this lane writes everywhere: the rule a screen is sorted by, in words,
 * with the module that implements it one click down.
 */
export const ORDER_LEAD: Readonly<Record<PageOrder, string>> = {
  "needs-you-first": "Pages waiting on you come first.",
  "ready-to-check-first": "Pages Loom can check come first.",
  "most-changed-first": "Pages with the most changes come first.",
  /**
   * `/portal/trust`, and the one order whose rung is about the AI rather than
   * about the page. *Wrong about* rather than *worst* — the sweep already owns
   * that word for a page that does not add up, and a page the AI misjudged is
   * not a page with anything wrong with it.
   */
  "most-wrong-first": "Pages the AI got most wrong come first.",
  "worst-first": "Anything that needs looking at comes first.",
  /**
   * The one order with no rank in front of it — `/portal/readers`, which had
   * been arranging pages by their identifier. There is no rung to lead with
   * there: a page's readers are not more or less urgent than another page's, and
   * the honest answer to *why is this one at the top* is that it is called
   * About. So the tiebreak is the whole order, and this is the sentence that
   * says so rather than leaving a reader to work out that the list is
   * alphabetical.
   */
  "by-name": "Pages are listed by name.",
}

/**
 * The clause the ranked orders share, and the one worth the second sentence.
 *
 * A reader who has just been told what leads one list has been told nothing
 * about whether the next list agrees with it. This says the part that is true of
 * every list in the portal, and it is the property rather than a promise: the
 * tail of every order here is `byName`, so two screens with nothing to
 * distinguish a page by arrange it identically.
 */
export const SAME_AFTER_THAT = "After that, every list here is in the same order: by name."

/**
 * Where a page sits before the tiebreak. Lower is nearer the top.
 *
 * A plain number rather than a comparator, because a comparator is a thing a
 * screen can get subtly wrong — an inconsistent one produces a different list
 * per engine and no test would catch it — and because a rank is readable in a
 * test failure where a `-1` is not.
 */
export type PageRank = {
  readonly rank: number
  /** What the page is called, and its id. Both are the tiebreak; see `byName`. */
  readonly page: PageName
}

/**
 * The tiebreak every order in this portal ends with.
 *
 * **Case-folded codepoint order, then the id.** Two decisions in one line and
 * both are about the same thing:
 *
 * - **Not `localeCompare`.** It is the obvious choice and it is the wrong one
 *   here. Its answer depends on the locale and on which ICU data the runtime was
 *   built with, so two deployments of the same portal could order the same two
 *   pages differently — which is the defect this module exists to remove, moved
 *   one layer down and made much harder to see.
 * - **Then the id, always.** Two pages can genuinely share a name: a name is
 *   derived from the page's own leading heading, and nothing stops two pages
 *   having the same one. Ending on the id makes the order **total**, so a list
 *   photographed twice is the same list twice. Ending on the name would leave
 *   those two rows in cursor order, which is the bug in miniature.
 */
export const byName = (left: PageName, right: PageName): number => {
  const a = left.name.toLowerCase()
  const b = right.name.toLowerCase()

  if (a !== b) return a < b ? -1 : 1

  return left.treeId < right.treeId ? -1 : left.treeId > right.treeId ? 1 : 0
}

/**
 * A list of pages, in one of this portal's orders.
 *
 * Takes an accessor rather than requiring a shape, so the sweep's `PageCheck`
 * and the store's `TreeListing` both go through it without either growing a
 * field for the benefit of a sort. The accessor returns the rank and the name
 * together because a call site that had to supply them separately could supply
 * one page's rank beside another page's name, and nothing would say so.
 *
 * Never mutates its argument — every caller is holding a `readonly` array that
 * came out of a store read, and a screen that sorted one in place would be
 * reordering something another part of the same render is counting.
 */
export const inPageOrder = <Row>(
  rows: readonly Row[],
  of: (row: Row) => PageRank
): readonly Row[] =>
  [...rows]
    .map((row) => ({ row, at: of(row) }))
    .sort((left, right) =>
      left.at.rank !== right.at.rank
        ? left.at.rank - right.at.rank
        : byName(left.at.page, right.at.page)
    )
    .map((entry) => entry.row)

/**
 * `/portal/pages`, and the only rank with four rungs.
 *
 * | | |
 * | --- | --- |
 * | 0 | changes are waiting for this page's answer |
 * | 1 | something is waiting here and nobody can answer it |
 * | 2 | we could not find out whether anything is waiting |
 * | 3 | nothing is waiting |
 *
 * **Rung 2 is above rung 3 on purpose.** A page whose waiting count would not
 * read is not a page with nothing waiting, and those two had been drawn
 * identically — a row with no mark on it — until 24 September put a mark on the
 * second. An unknown sorted below a known-empty would put it back where nobody
 * looks.
 *
 * **Tiers, not counts.** A page with twelve waiting changes does not sort above
 * one with a single change from July, because a count is not an urgency and this
 * lane has said so where it matters most: `inQueueOrder` sorts the changes
 * themselves by *how long they have sat*, which is the question an order can
 * honestly answer. Ranking pages by volume would contradict the queue inside
 * them, and the per-page oldest is not a fact either chooser has read.
 */
export const needsYouRank = (page: {
  readonly waiting: number | null
  readonly unreadable: number
}): number => {
  if (page.waiting !== null && page.waiting > 0) return 0
  if (page.unreadable > 0) return 1

  return page.waiting === null ? 2 : 3
}

/**
 * `/portal/checkup`'s chooser, and the visible consequence the finding named.
 *
 * *"The chooser lists the one page you can check below three you cannot"* — on a
 * screen whose only action is to pick a page and check it, with the pressable
 * row fourth. A page that cannot be checked is still listed, loudly, because
 * hiding it would make this screen look like it had checked everything there was
 * to check. Listed and last is the whole of the change.
 */
export const readyToCheckRank = (page: { readonly canBeChecked: boolean }): number =>
  page.canBeChecked ? 0 : 1

/**
 * `/portal/history`'s chooser.
 *
 * The most changed page first, and the sentence above the list says *most
 * changes* rather than *most recent* because that is what this number is. A
 * listing carries an id and a count and no time at all — §1 kept time out of the
 * document, so a store cannot honestly report when a page last moved — and a
 * chooser that promised recency from a count would be the portal inventing a
 * fact the runtime refused to invent.
 *
 * The count is the right rung anyway: this is a chooser in front of a log
 * reader, and a page with nothing in its history has nothing to open.
 */
export const mostChangedRank = (page: { readonly revision: number }): number => -page.revision

/**
 * `/portal/trust`'s list of the pages the AI misjudged.
 *
 * The count, negated, exactly as `mostChangedRank` does it — and for the same
 * reason rather than by imitation. This is a list somebody **picks from**, and a
 * page holding one wrong claim has less to look at than a page holding six. A
 * page with nothing wrong on it is not in the list at all, so unlike the four
 * ranks above this one there is no rung for *nothing here*.
 *
 * **The count only, with the name breaking ties.** The alternative was to fall
 * back to the worst claim on the page, and it is rejected on the rule this module
 * is written under: every order here ends on the shared tiebreak, so that two
 * screens agree about the pages they have nothing to say about. Two pages holding
 * three wrong claims each *are* two pages this screen has nothing to separate,
 * and slipping a second numeric key in front of the name would make this the one
 * list in the portal whose tail nobody else can reproduce. The worst claim is on
 * the row either way, which is where a reader comparing two equal counts is
 * actually looking.
 */
export const mostWrongRank = (page: { readonly claims: readonly unknown[] }): number =>
  -page.claims.length
