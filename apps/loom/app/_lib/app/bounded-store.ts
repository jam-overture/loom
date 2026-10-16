import { err, type Result } from "@jam-overture/loom"
import type { ApplicationStore, ProjectStore, TreeStore } from "@jam-overture/loom/store"
import type { ReaderSignalJournal, ReaderTallyStore } from "@jam-overture/loom/signals"
import type { TelemetryJournal } from "@jam-overture/loom/telemetry"
import type { HoldStore } from "@jam-overture/loom/write"

import { PORTAL_READ_BUDGET_MS, within } from "./bounded"

/**
 * A handle whose **reads** answer within a budget, whatever the database does.
 *
 * ## What this is for
 *
 * [0262](../../../../../decisions/0262-the-control-plane-is-hosted-and-the-render-path-stays-in-the-customers-app.md)
 * promises that an unreachable control plane degrades to something a person can
 * read. Every screen in this app already keeps that promise for a store that
 * **refuses** — each one has a branch on `!result.ok` that says so in words and
 * explains that nothing has been lost, because listing only reads.
 *
 * None of them kept it for a store that simply **does not answer**. A refusal
 * is a `Result`; a hang is nothing at all, so the branch never ran and the
 * screen never arrived. That is what 12 October looked like from outside: a
 * 504, five minutes after the click, with the right behaviour sitting in the
 * file unreachable.
 *
 * `within` in `./bounded.ts` fixed that at three call sites — the marketing
 * read, the seeding wait and `/portal`. **Nineteen screens in this portal read
 * something, and eighteen of them still awaited it with no budget**: the page
 * list, the history, both checkups, every page inspector, the application
 * screen, the activity log, both rules screens, trust, readers, pieces,
 * sign-ins and two tree choosers. The whole portal except its front page.
 *
 * A call site is the wrong place for a rule that has to hold everywhere, for
 * the reason `postgres.ts` gives about the application scope — *every read
 * starts here, so a query cannot forget it by omission.* The first pass of this
 * file proved the point on itself: it covered the tree store and the holds,
 * called the portal done, and left six screens reading a telemetry journal that
 * could still hang. The handles here were found by listing every
 * `await <handle>.<method>(` in the route groups instead.
 *
 * So the budget moves to the handle. A screen does not opt in, and a screen
 * written tomorrow cannot opt out by not knowing.
 *
 * ## A timeout is reported as `unavailable`, not as nothing
 *
 * `within` hands back `undefined`, which every caller then has to learn to
 * read. These hand back `err({ code: "unavailable" })` — a member of the
 * taxonomy all seven of these contracts already have, which
 * `describeStoreError` and its siblings already turn into a sentence. That is
 * why eighteen screens are fixed by this file without one of them changing: the
 * state was always drawable, and what was missing was anything that put them in
 * it.
 *
 * The detail says the budget rather than naming a cause, because at render time
 * a slow store and a broken one are the same thing and this code cannot tell
 * them apart. The one place the difference matters is the portal, where
 * somebody is asking — and *the store did not answer within 1500ms* is the
 * honest form of that answer.
 *
 * ## Writes are deliberately not bounded
 *
 * A read that gives up has cost nothing: the row is still the row. **A write
 * that gives up has an unknown outcome** — the statement may well land a
 * moment later — and a caller told `unavailable` would be entitled to retry
 * something that already happened. So every write — `create`, `append`,
 * `hold`, `release`, `rename`, `record`, `receive`, `opened`, `apply`,
 * `forget`, `penalise`, `forgive` — passes straight through, and the write path
 * takes its handles unbounded (`appStoreForWriting`, `holdsForWriting`,
 * `telemetryForWriting`, `readerSignalsForWriting`, `readerTalliesForWriting`)
 * so that a read made *inside* a write is not cut off either: refusing an apply
 * because a hold lookup was slow would turn a slow database into a lost answer.
 *
 * Seeding is the one write that is bounded, and it is bounded a level up by
 * `waitForSeeding` rather than here, because there the budget is safe: the work
 * is idempotent, it is not cancelled, and *still going* is a state the caller
 * handles by rendering the page anyway.
 */

/**
 * Whether the store **said** there is nothing under this id.
 *
 * The question a create-if-absent seed has to ask, and it is not `!result.ok`.
 * Three answers come back from `head` and `get`, and only one of them is a
 * reason to write:
 *
 * - `not-found` — nothing is stored. Write it.
 * - `ok` — something is. Leave it alone; that is 0259's whole trade.
 * - `unavailable` — **the store did not say.** Writing here is the 12 October
 *   bug with one more step in front of it: the question was asked, it was not
 *   answered, and inserting anyway puts the blind `INSERT` back in the request
 *   path on exactly the slow database that made it fatal.
 *
 * So the third case declines to write and the next request asks again. The
 * cost of being wrong that way is a deployment that stays unseeded a moment
 * longer, which every screen already draws.
 */
export const absent = <TValue, TError extends { readonly code: string }>(
  result: Result<TValue, TError>
): boolean => !result.ok && result.error.code === "not-found"

/**
 * Run a read against the budget, and report running out as a refusal.
 *
 * `within` does the racing — one timer implementation, in the module that
 * already had it — and this adds the two things a `Result` lets us say that
 * `undefined` could not: *the budget ran out*, and *it threw*.
 *
 * Exported because two of the contracts this rule applies to are declared
 * outside this module — the portal's own `AttemptLog` is one — and a handle
 * composed next to its type is better than this file importing a lane's
 * internals to wrap it.
 *
 * A throw is caught for the same reason the budget exists: the postgres store
 * turns a driver error into `unavailable` itself, so anything still throwing
 * past it is something no screen has a branch for, and a screen that cannot
 * draw it renders nothing at all. The promise handed to `within` therefore
 * never rejects, which is what makes `undefined` from it mean *timed out* and
 * nothing else.
 */
export const readWithin = async <TValue, TError>(
  read: () => Promise<Result<TValue, TError>>,
  unavailable: (detail: string) => TError,
  budgetMs: number = PORTAL_READ_BUDGET_MS
): Promise<Result<TValue, TError>> => {
  const attempt = (async (): Promise<Result<TValue, TError>> => {
    try {
      return await read()
    } catch (cause) {
      return err(unavailable(cause instanceof Error ? cause.message : String(cause)))
    }
  })()

  return (
    (await within(attempt, budgetMs)) ??
    err(unavailable(`the store did not answer within ${budgetMs}ms`))
  )
}

/**
 * The shape every one of these taxonomies has in common.
 *
 * All seven of them say `unavailable` and nothing else could be meant by a
 * budget running out, which is what makes this one rule rather than seven.
 */
export const unavailable = (detail: string) => ({ code: "unavailable", detail }) as const

/**
 * Each method is re-wrapped rather than handed over by reference, so that a
 * store implemented with methods rather than with the arrow-function properties
 * these two happen to use cannot lose its `this` on the way through.
 */
export const boundedTreeStore = (
  store: TreeStore,
  budgetMs: number = PORTAL_READ_BUDGET_MS
): TreeStore => ({
  create: (tree) => store.create(tree),
  append: (treeId, request) => store.append(treeId, request),
  head: (treeId) => readWithin(() => store.head(treeId), unavailable, budgetMs),
  revisions: (treeId, request) =>
    readWithin(() => store.revisions(treeId, request), unavailable, budgetMs),
  list: (request) => readWithin(() => store.list(request), unavailable, budgetMs),
})

export const boundedHoldStore = (
  store: HoldStore,
  budgetMs: number = PORTAL_READ_BUDGET_MS
): HoldStore => ({
  hold: (held) => store.hold(held),
  release: (proposalId) => store.release(proposalId),
  get: (proposalId) => readWithin(() => store.get(proposalId), unavailable, budgetMs),
  forTree: (treeId) => readWithin(() => store.forTree(treeId), unavailable, budgetMs),
  waiting: (request) => readWithin(() => store.waiting(request), unavailable, budgetMs),
})

export const boundedProjectStore = (
  store: ProjectStore,
  budgetMs: number = PORTAL_READ_BUDGET_MS
): ProjectStore => ({
  create: (project) => store.create(project),
  rename: (projectId, to) => store.rename(projectId, to),
  /**
   * Writes pass straight through, closing among them (0289): a close that gave
   * up on a budget would leave the cascade half done, which is the one state
   * `closeProject` reports rather than produces.
   */
  close: (projectId, at) => store.close(projectId, at),
  reopen: (projectId) => store.reopen(projectId),
  get: (projectId) => readWithin(() => store.get(projectId), unavailable, budgetMs),
  list: (listing) => readWithin(() => store.list(listing), unavailable, budgetMs),
})

export const boundedApplicationStore = (
  store: ApplicationStore,
  budgetMs: number = PORTAL_READ_BUDGET_MS
): ApplicationStore => ({
  create: (application) => store.create(application),
  rename: (applicationId, to) => store.rename(applicationId, to),
  /** Writes pass straight through — see `boundedProjectStore`. */
  close: (applicationId, at) => store.close(applicationId, at),
  reopen: (applicationId) => store.reopen(applicationId),
  get: (applicationId) => readWithin(() => store.get(applicationId), unavailable, budgetMs),
  list: (listing) => readWithin(() => store.list(listing), unavailable, budgetMs),
})

/**
 * The journal the activity, rules, trust and application screens read.
 *
 * `TelemetryError` has exactly one member and it is `unavailable`, so there is
 * nothing here to confuse a timeout with: `describeTelemetryError` turns it
 * into *telemetry is unavailable: …* and six screens already print that.
 *
 * `record` is the runtime narrating itself inside a write and `forget` is
 * retention; both pass through. `assessments` is read by `undo-check.ts` on a
 * screen, so it takes the budget with the rest of the reads.
 */
export const boundedTelemetryJournal = (
  journal: TelemetryJournal,
  budgetMs: number = PORTAL_READ_BUDGET_MS
): TelemetryJournal => ({
  record: (records) => journal.record(records),
  forget: (request) => journal.forget(request),
  read: (request) => readWithin(() => journal.read(request), unavailable, budgetMs),
  assessments: (request) => readWithin(() => journal.assessments(request), unavailable, budgetMs),
})

/**
 * The reader-signal buffer the readers screen reads one row of to say whether
 * anything is waiting to be collected.
 *
 * `receive` is the intake endpoint writing what a reader's browser sent, and
 * `forget` is the collector pruning what it has folded in. Neither is a screen
 * waiting for a page.
 */
export const boundedReaderSignalJournal = (
  journal: ReaderSignalJournal,
  budgetMs: number = PORTAL_READ_BUDGET_MS
): ReaderSignalJournal => ({
  receive: (batches) => journal.receive(batches),
  forget: (request) => journal.forget(request),
  read: (request) => readWithin(() => journal.read(request), unavailable, budgetMs),
})

/**
 * The rollups the readers and pieces screens draw every rate from.
 *
 * `opened` and `apply` are the collector folding a window in; the three
 * listings are what a screen prints.
 */
export const boundedReaderTallyStore = (
  store: ReaderTallyStore,
  budgetMs: number = PORTAL_READ_BUDGET_MS
): ReaderTallyStore => ({
  opened: (openings, at) => store.opened(openings, at),
  apply: (rollup, at) => store.apply(rollup, at),
  tallies: (request) => readWithin(() => store.tallies(request), unavailable, budgetMs),
  funnels: (request) => readWithin(() => store.funnels(request), unavailable, budgetMs),
  pageViews: (request) => readWithin(() => store.pageViews(request), unavailable, budgetMs),
})
