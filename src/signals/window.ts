import { everyMemberOf } from "../closed-set.js"
import type { TreeId } from "../ids.js"
import { ok, type Result } from "../result.js"
import type { LoomTree } from "../tree/tree.js"

import { audiencesIn, type MaybeAudienceScoped } from "./audiences.js"
import type { ReaderSignalStoreError } from "./journal.js"
import type { StoredPageViews } from "./page-views.js"
import { pageReadingOf, type PageReading, type PartDeclarations } from "./parts.js"
import type { ReaderRegionStore, StoredRegionCount } from "./region.js"
import type {
  ReaderTallyStore,
  StoredFunnel,
  StoredTally,
  TallyReadRequest,
} from "./tally.js"

/**
 * The step between a store and a question: read a window of counters, and join
 * it to the trees and the registry the counters were filed against.
 *
 * Thirty-eight readings sit on the other side of this and every one of them is
 * a pure function of a {@link PageReading} — or of a list of them, or of two
 * held against each other. Nothing in this subsystem turned a store into one.
 * A caller that wanted *which parts of this page get read* had to know that the
 * counters come from `tallies`, the denominator from `pageViews`, the funnel
 * answers from `funnels` and the map from a second store; that a tree and a
 * registry have to be found for each revision the rows name; and that the rows
 * must be sliced before the join rather than after, because `pageReadingOf`
 * counts what it was handed wrongly rather than refusing it (`foreign`).
 *
 * So the aggregates were askable in principle and unaskable in practice, and
 * that is the gap this closes. After this, the deployment-wide order over pages
 * is two lines:
 *
 * ```ts
 * const window = await readReaderWindow({ tallies: store })
 * if (!window.ok) return window
 * const { pages } = windowReadingsOf(window.value, treesIn(trees), registry)
 * const order = deploymentReadingOf(pages.map(readingProgressOf), window.value.pageViews)
 * ```
 *
 * ## It composes published rules and adds no figure of its own
 *
 * Nothing here counts, divides, sums or withholds. The audience census is
 * `audiencesIn`, what makes two readings one page is `readingKeyOf` (0290), the
 * three-way answer about a population is `audienceScopeOf` inside the join
 * (0300), and the join itself is `pageReadingOf` unchanged. This module decides
 * one thing — **which readings a window holds** — and hands each of them the
 * rows it is a reading of.
 *
 * That is deliberately the whole of it. A rung that also added up what it
 * joined would be a thirty-ninth reading nobody asked for, and the
 * double-count every reading above it already guards would have a second
 * place to go wrong.
 *
 * ## Why the trees are the caller's to resolve
 *
 * This lane holds counters, not pages. A tree lives in the tree store, which is
 * another lane's, and reaching into it from here would make the reading path
 * depend on the write path for the sake of a lookup the caller can do better:
 * it knows whether it holds the revisions already, whether it wants them in one
 * query or forty, and what to do when one is gone.
 *
 * So {@link revisionsIn} says which revisions the rows name and
 * {@link RevisionTrees} is how the answers come back — the same bargain
 * {@link PartDeclarations} struck with the registry (0114, 0122): a shape a
 * real store satisfies and a two-line double in a test satisfies as well.
 *
 * Pure apart from {@link readReaderWindow}, which is the one function here that
 * touches a store. No clock, no DOM, no import that reaches a package.
 */

/** The stores a window is read from. */
export type ReaderWindowSources = {
  /** The counters, the funnel answers and the door rows. */
  readonly tallies: Pick<ReaderTallyStore, "tallies" | "funnels" | "pageViews">
  /**
   * Where readers were, which is a second store and an optional one.
   *
   * A deployment that never configured one is not a deployment whose readers
   * were nowhere, so an absent store and an empty map are kept apart all the
   * way to {@link ReaderWindow.regions}.
   */
  readonly regions?: Pick<ReaderRegionStore, "regions">
}

/**
 * One window of counters, as the stores answered.
 *
 * Rows as they came back: nothing is summed, deduplicated, reordered or
 * dropped. The distinct counts in them cannot be added (0147) and the readings
 * downstream each know which of their figures may be, so a rung that tidied
 * them would be making that decision for all of them at once and in the one
 * place that knows least about it.
 */
export type ReaderWindow = {
  readonly tallies: readonly StoredTally[]
  readonly funnels: readonly StoredFunnel[]
  readonly pageViews: readonly StoredPageViews[]
  /**
   * The region buckets, or `undefined` where no region store was offered.
   *
   * `undefined` is *nothing here can say* and `[]` is *the store holds none*,
   * which is the distinction this subsystem draws everywhere else it has two
   * such states (0240). A surface that reads them alike reports *we do not
   * know where your readers are* as *you have no readers abroad*.
   */
  readonly regions: readonly StoredRegionCount[] | undefined
}

/**
 * Read one window from the stores, with one scope rather than four.
 *
 * The four reads are independent and are made together. The first failure is
 * the answer: a window half of whose rows arrived is not a narrower window, it
 * is a reading whose every rate has a denominator from one read and a numerator
 * from another, and the figures would look plausible.
 *
 * The request is the stores' own {@link TallyReadRequest}, passed through
 * unchanged to each of them, so scoping a screen to one page, one revision or
 * one audience is the one argument it already was.
 */
export const readReaderWindow = async (
  sources: ReaderWindowSources,
  request?: TallyReadRequest
): Promise<Result<ReaderWindow, ReaderSignalStoreError>> => {
  const [tallies, funnels, pageViews, regions] = await Promise.all([
    sources.tallies.tallies(request),
    sources.tallies.funnels(request),
    sources.tallies.pageViews(request),
    sources.regions?.regions(request),
  ])

  if (!tallies.ok) return tallies
  if (!funnels.ok) return funnels
  if (!pageViews.ok) return pageViews
  if (regions !== undefined && !regions.ok) return regions

  return ok({
    tallies: tallies.value,
    funnels: funnels.value,
    pageViews: pageViews.value,
    regions: regions?.value,
  })
}

/** One revision of one page, which is what a tree has to be found for. */
export type WindowRevision = {
  readonly treeId: TreeId
  readonly revision: number
}

const revisionKeyOf = (where: WindowRevision): string => `${where.treeId}\u0000${where.revision}`

const inRevisionOrder = (one: WindowRevision, other: WindowRevision): number =>
  one.treeId.localeCompare(other.treeId) || one.revision - other.revision

/**
 * Rows filed under each revision, in one pass over them.
 *
 * A pass per revision would be a walk of the whole window per page a deployment
 * has, which is the quadratic shape rule 4 holds this subsystem to — the ledger
 * was that once and a 6,000-node page took 314 ms. A window is the nodes of
 * every revision a deployment keeps counters for, so the factor here is the
 * number of pages and the input is already the largest thing in the subsystem.
 */
const byRevision = <Row extends WindowRevision>(
  rows: readonly Row[]
): ReadonlyMap<string, readonly Row[]> => {
  const filed = new Map<string, Row[]>()

  for (const row of rows) {
    const key = revisionKeyOf(row)
    const held = filed.get(key)

    if (held === undefined) filed.set(key, [row])
    else held.push(row)
  }

  return filed
}

/**
 * Every revision the window's rows name, deduplicated and in a stable order.
 *
 * **Taken over all four row sets and not only the counters.** A revision whose
 * door opened and whose window no rollup has folded yet has page view rows and
 * no tallies, and it is a page a deployment most wants to see rather than one
 * to leave out: it is the difference between *nobody read this* and *nothing
 * has counted this yet*, which the reach reading publishes as `uncounted` and
 * can only publish about a revision it was handed.
 *
 * The audience is deliberately not part of this. A tree is one tree at one
 * revision however many forms of it are served — two forms are the deltas an
 * audience earns over one base (0263) — so asking for a tree per form would be
 * asking the caller for the same tree twice.
 */
export const revisionsIn = (window: ReaderWindow): readonly WindowRevision[] => {
  const found = new Map<string, WindowRevision>()

  const note = (rows: readonly WindowRevision[]): void => {
    for (const row of rows) {
      const where = { treeId: row.treeId, revision: row.revision }
      const key = revisionKeyOf(where)

      if (!found.has(key)) found.set(key, where)
    }
  }

  note(window.tallies)
  note(window.funnels)
  note(window.pageViews)
  note(window.regions ?? [])

  return [...found.values()].sort(inRevisionOrder)
}

/**
 * Where the trees come from, as the join needs to see it.
 *
 * A function rather than a list, for the reason the registry declarations are
 * one: a deployment holding its revisions in a store, a cache, or a map it
 * built for this call all satisfy it, and so does a one-line double.
 */
export type RevisionTrees = {
  /** The tree at that revision, or `undefined` where this source has none. */
  readonly treeFor: (where: WindowRevision) => LoomTree | undefined
}

/**
 * The trees a caller already holds, as a source.
 *
 * Keyed by tree **and** revision, because two revisions of one page are two
 * trees to this join and keying by the page would answer one of them for both.
 * The first of two trees at one revision wins and the second is ignored: they
 * disagree about what a revision is, nothing here can say which is right, and
 * a silent last-wins would make the answer depend on the order a store
 * returned.
 */
export const treesIn = (trees: Iterable<LoomTree>): RevisionTrees => {
  const held = new Map<string, LoomTree>()

  for (const tree of trees) {
    const key = revisionKeyOf(tree)
    if (!held.has(key)) held.set(key, tree)
  }

  return { treeFor: (where) => held.get(revisionKeyOf(where)) }
}

/** Why a revision the rows name has no reading. */
export type UnjoinedCause =
  /**
   * The source has no tree at that revision.
   *
   * Ordinary rather than broken: counters outlive the revision they were filed
   * against, so a deployment that has pruned old trees, or scoped its lookup to
   * the revisions it draws, has rows here it cannot read. It is published
   * rather than dropped because the rows are a page's readers, and a screen
   * that silently left them out would under-report a deployment by however many
   * revisions it could not find.
   */
  | "no-tree"
  /**
   * The source answered with a different page or a different revision from the
   * one asked for.
   *
   * A source's own fault, and the one worth refusing loudly: reading one
   * revision's counters against another revision's tree answers every question
   * on the page with confident nonsense, because the node ids line up often
   * enough to look right. This is the mistake `foreign` was put on a reading to
   * catch, caught one rung earlier where it can still be refused.
   */
  | "mismatched"

/** The closed set, for a surface accounting for every revision it cannot draw. */
export const UNJOINED_CAUSES: readonly UnjoinedCause[] = everyMemberOf<UnjoinedCause>()([
  "no-tree",
  "mismatched",
])

/** One line per cause, for a surface saying why a page is not on the screen. */
export const describeUnjoinedCause = (cause: UnjoinedCause): string => {
  switch (cause) {
    case "no-tree":
      return "there are counters for this revision and no tree to read them against"
    case "mismatched":
      return "the tree offered for this revision was of another one, so the counters were not read"
  }
}

/** A revision whose rows could not be joined, and why. */
export type UnjoinedRevision = WindowRevision & {
  readonly cause: UnjoinedCause
  /** Counter rows left unread, so the cost of not drawing it is a number. */
  readonly tallies: number
}

/** What a window came to once its rows were joined to the pages they are about. */
export type WindowReadings = {
  /**
   * One reading per page, per revision, per form — which is what one reading is
   * (0290) — in a stable order.
   *
   * Never two of one: the key every reading above this refuses to count twice
   * on is the key the window was split by, so a caller may sum across this list
   * on any figure the reading it derives says may be summed.
   */
  readonly pages: readonly PageReading[]
  /** Revisions the rows name that have no reading, in the same order. */
  readonly unjoined: readonly UnjoinedRevision[]
}

/**
 * Join a window of counters to the pages it is about.
 *
 * **One reading per form, rather than one per revision read as neither.** A
 * window holding two audiences at one revision is ambiguous to the join
 * underneath — it reads neither, names both, and `health.ts` reports the fault
 * (0290, 0300) — and that refusal is right for a caller that was handed a
 * window and asked nothing. Here the question is *what does this window hold*,
 * and the answer is both forms: the ambiguity was never in the rows, which say
 * which form each belongs to, it was in asking one question of two
 * populations. So the split is made rather than refused, and each form's
 * reading is of its own readers.
 *
 * **Each reading is handed its revision's rows and told which form to read.**
 * Not the window — a reading handed the whole of one would count every other
 * page's rows as `foreign`, which is exactly what that field exists to report —
 * and not one form's rows either, because then a reading could not say that the
 * page has another form at all. `foreign` is therefore nought on every reading
 * this produces, `audiences` is what the revision really holds, and
 * `otherAudience` is the other form's rows, counted apart and not read.
 */
export const windowReadingsOf = (
  window: ReaderWindow,
  trees: RevisionTrees,
  declarations: PartDeclarations
): WindowReadings => {
  const pages: PageReading[] = []
  const unjoined: UnjoinedRevision[] = []

  const counters = byRevision(window.tallies)
  const funnels = byRevision(window.funnels)
  const doors = byRevision(window.pageViews)
  const regions = byRevision(window.regions ?? [])

  for (const where of revisionsIn(window)) {
    const key = revisionKeyOf(where)
    const here = counters.get(key) ?? []
    const tree = trees.treeFor(where)

    if (tree === undefined) {
      unjoined.push({ ...where, cause: "no-tree", tallies: here.length })
      continue
    }

    if (revisionKeyOf(tree) !== key) {
      unjoined.push({ ...where, cause: "mismatched", tallies: here.length })
      continue
    }

    /**
     * The forms this revision was served in, taken over every row set rather
     * than over the counters alone. A form whose readers arrived and whose
     * window has not been folded is named by a door row and by nothing else,
     * and leaving it out would publish one form's readers as the page's, which
     * is the mistake the region map had one rung further up (0290).
     */
    const named: readonly MaybeAudienceScoped[] = [
      ...here,
      ...(funnels.get(key) ?? []),
      ...(doors.get(key) ?? []),
      ...(regions.get(key) ?? []),
    ]

    const forms = audiencesIn(named)

    /**
     * No row named a form, so the window is one population by construction and
     * is read whole — which is every window written before the column existed
     * (0284) and every one a test builds by hand. Asking for `aud_everyone`
     * here would assert what no row said.
     */
    if (forms.length === 0) {
      pages.push(pageReadingOf(tree, here, declarations))
      continue
    }

    for (const form of forms) pages.push(pageReadingOf(tree, here, declarations, form))
  }

  return { pages, unjoined }
}
