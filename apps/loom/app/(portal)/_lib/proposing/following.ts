import {
  applyDelta,
  compareTrees,
  err,
  ok,
  type IdFactory,
  type LoomTree,
  type ProposalId,
  type Result,
  type TreeError,
  type TreeId,
} from "@jam-overture/loom"
import type { AppendRequest, StoreError, StoredRevision, TreeStore } from "@jam-overture/loom/store"
import type { HeldProposal, HoldStore } from "@jam-overture/loom/write"

import {
  copiesOfPage,
  currentCopyOf,
  pageOfCopy,
  type PageCopy,
  type PageCopyStore,
} from "./copies"

/**
 * Keeping a page's copy on the version its site publishes (0340, 0358).
 *
 * The copy is the live page (0358 clause 5): the site's version plus the
 * changes accepted on it. A snapshot that brings a newer version starts the
 * copy again from it, and the changes accepted since the last start are
 * applied to the new copy again, oldest first; one whose operations no longer
 * fit is dropped and stays only on the old copy's record (clause 6). Then
 * every change waiting on the old copy is checked against the new one: a
 * change whose operations still apply waits on, marked as proposed for an
 * older version; a change whose operations no longer apply stays on the old
 * copy, marked as conflicting, and can only be turned down (0340 clause 3).
 */

/** Where a page's copy stands against what its site publishes. */
export type Followed =
  /** The copy is the site's version, with whatever was accepted on it. */
  | { readonly kind: "serving"; readonly copy: LoomTree }
  /** The site sent a different page, and this deployment serves the copy instead (0259). */
  | { readonly kind: "apart"; readonly copy: LoomTree }
  /**
   * The copy started again from the site's version: accepted changes were
   * applied again or dropped, and waiting ones carried or left conflicting.
   */
  | {
      readonly kind: "followed"
      readonly copy: LoomTree
      readonly replayed: readonly ProposalId[]
      readonly dropped: readonly ProposalId[]
      readonly carried: number
      readonly conflicting: number
    }

export type FollowError = { readonly code: "store"; readonly detail: string }

export type Following = {
  readonly trees: Pick<TreeStore, "head" | "create" | "revisions" | "append">
  readonly holds: Pick<HoldStore, "forTree" | "hold" | "release">
  readonly copies: PageCopyStore
  readonly ids: Pick<IdFactory, "treeId" | "proposalId" | "deltaId">
  readonly now: () => number
  /** False for this deployment's own site, whose pages are served from the copy itself (0259). */
  readonly follows: boolean
}

/** Whether a change still waiting is for the version the site serves (0340 clause 3). */
export type HoldStanding = "current" | "stale" | "conflicts"

const storeFailure = (detail: string): FollowError => ({ code: "store", detail })

/**
 * A copy of a page under the given id, made from the published tree the first
 * time it is asked for (0329 clause 2).
 *
 * The published tree goes in as the site sent it, revision and all, so the
 * record starts at what the site said it serves. Two runs at once both create;
 * the store refuses the second, and the second reads what the first made.
 */
export const governedCopyOf = async (
  trees: Pick<TreeStore, "head" | "create">,
  published: LoomTree,
  copyId: TreeId
): Promise<Result<LoomTree, StoreError>> => {
  const held = await trees.head(copyId)

  if (held.ok || held.error.code !== "not-found") return held

  const made = await trees.create({ ...published, treeId: copyId })

  return made.ok || made.error.code !== "already-exists" ? made : trees.head(copyId)
}

/** Whether two trees are the same page, part for part; ids and revisions aside. Pure. */
export const samePage = (left: LoomTree, right: LoomTree): boolean =>
  compareTrees(left, right).length === 0

/**
 * A waiting change, carried onto another copy of its page, or why it cannot be.
 *
 * Its operations are kept exactly and only re-addressed, so the person who
 * answers it is answering what was proposed. The intent keeps its id and when
 * it was observed, which is how the change reads as proposed for an older
 * version. The Gate's verdict is kept for the queue to show and is not
 * trusted: accepting it runs the Gate again against the copy as it then stands.
 */
export const carriedOnto = (
  held: HeldProposal,
  copy: LoomTree,
  ids: Pick<IdFactory, "proposalId" | "deltaId">
): Result<HeldProposal, TreeError> => {
  const delta = {
    ...held.proposal.delta,
    deltaId: ids.deltaId(),
    treeId: copy.treeId,
    baseRevision: copy.revision,
  }
  const applies = applyDelta(copy, delta)

  if (!applies.ok) return applies

  const proposalId = ids.proposalId()

  return ok({
    ...held,
    proposalId,
    treeId: copy.treeId,
    baseRevision: copy.revision,
    intent: { ...held.intent, treeId: copy.treeId, baseRevision: copy.revision },
    proposal: { ...held.proposal, proposalId, delta },
  })
}

/**
 * Where a waiting change stands against the copy proposals are now made
 * against. Pure.
 *
 * A change on an older copy is one that could not be carried; a change on the
 * current copy observed before that copy started was proposed for an older
 * version and carried.
 */
export const holdStandingOf = (held: HeldProposal, copies: readonly PageCopy[]): HoldStanding => {
  const current = currentCopyOf(copies, pageOfCopy(copies, held.treeId))

  if (current.copyId !== held.treeId) return "conflicts"

  return Date.parse(held.intent.observedAt) < current.startedAt ? "stale" : "current"
}

/** Every change waiting on any copy of a page, oldest copy first. */
export const waitingOnPage = async (
  holds: Pick<HoldStore, "forTree">,
  copies: readonly PageCopy[],
  pageId: TreeId
): Promise<Result<readonly HeldProposal[], FollowError>> => {
  const listings = await Promise.all(
    copiesOfPage(copies, pageId).map((copy) => holds.forTree(copy.copyId))
  )
  const failed = listings.find((listing) => !listing.ok)

  if (failed !== undefined && !failed.ok) return err(storeFailure(failed.error.code))

  return ok(listings.flatMap((listing) => (listing.ok ? listing.value.held : [])))
}

/** Every change accepted on a copy, oldest first: its whole record, read forward a page at a time. */
export const acceptedOn = async (
  trees: Pick<TreeStore, "revisions">,
  copyId: TreeId,
  cursor?: string,
  read: readonly StoredRevision[] = []
): Promise<Result<readonly StoredRevision[], StoreError>> => {
  const page = await trees.revisions(copyId, cursor === undefined ? {} : { cursor })

  if (!page.ok) return page

  const all = [...read, ...page.value.revisions]

  return page.value.newer === null ? ok(all) : acceptedOn(trees, copyId, page.value.newer, all)
}

/** What applying a copy's accepted changes to another version of its page comes to. */
export type Replay = {
  /** The version with every change that fit applied. */
  readonly tree: LoomTree
  /** What to write to the new copy's record, in order: one entry per change that fit. */
  readonly entries: readonly AppendRequest[]
  readonly dropped: readonly ProposalId[]
}

type Replaying = Replay & {
  /** Where each change applied again landed, by the revision it had on the old copy. */
  readonly landed: ReadonlyMap<number, number>
}

/**
 * Apply accepted changes to a version of their page, oldest first, keeping the
 * ones that fit (0358 clause 6). Pure, apart from minting delta ids.
 *
 * Each change keeps its proposal id, provenance and who allowed it, so the new
 * copy's record says which accepted change each entry is; only its address
 * changes. An undo is applied again only if the change it undoes was, and then
 * names where that change landed; undoing a change that was dropped would undo
 * nothing that is there.
 */
export const replayOnto = (
  start: LoomTree,
  accepted: readonly StoredRevision[],
  ids: Pick<IdFactory, "deltaId">,
  appliedAt: string
): Replay => {
  const ended = accepted.reduce<Replaying>(
    (state, revision) => {
      const undoes = revision.provenance.undoes
      const undone = undoes === undefined ? undefined : state.landed.get(undoes)
      const drop = (): Replaying => ({
        ...state,
        dropped: [...state.dropped, revision.proposalId],
      })

      if (undoes !== undefined && undone === undefined) return drop()

      const delta = {
        ...revision.delta,
        deltaId: ids.deltaId(),
        treeId: state.tree.treeId,
        baseRevision: state.tree.revision,
      }
      const applied = applyDelta(state.tree, delta)

      if (!applied.ok) return drop()

      const entry: AppendRequest = {
        proposalId: revision.proposalId,
        delta,
        provenance:
          undone === undefined ? revision.provenance : { ...revision.provenance, undoes: undone },
        appliedAt,
        ...(revision.answeredBy === undefined ? {} : { answeredBy: revision.answeredBy }),
      }

      return {
        tree: applied.value,
        entries: [...state.entries, entry],
        dropped: state.dropped,
        landed: new Map([...state.landed, [revision.revision, applied.value.revision]]),
      }
    },
    { tree: start, entries: [], dropped: [], landed: new Map() }
  )

  return { tree: ended.tree, entries: ended.entries, dropped: ended.dropped }
}

/**
 * Whether a snapshot is the version a copy already stands on: the copy's
 * accepted changes, applied to it, give the copy. Pure, apart from minting
 * delta ids.
 *
 * This is how a site sending its unchanged pages again is told apart from a
 * newer version, since the store keeps a copy's head and its changes but not
 * the tree it began as.
 */
export const standsOn = (
  copy: LoomTree,
  accepted: readonly StoredRevision[],
  published: LoomTree,
  ids: Pick<IdFactory, "deltaId">
): boolean => {
  const replay = replayOnto({ ...published, treeId: copy.treeId }, accepted, ids, "")

  return replay.dropped.length === 0 && samePage(replay.tree, copy)
}

/** Write each entry to a copy's record in turn, stopping at the first the store refuses. */
const appendAll = (
  trees: Pick<TreeStore, "append">,
  copy: LoomTree,
  entries: readonly AppendRequest[]
): Promise<Result<LoomTree, StoreError>> =>
  entries.reduce<Promise<Result<LoomTree, StoreError>>>(
    async (prior, entry) => {
      const tree = await prior

      return tree.ok ? trees.append(copy.treeId, entry) : tree
    },
    Promise.resolve(ok(copy))
  )

/**
 * Start a new copy from the site's version, apply the accepted changes to it
 * again, and carry the old copy's waiting changes onto it.
 *
 * The new copy is recorded as the page's current one only once every accepted
 * change that fits is on it, so a run cut off half way leaves a tree nothing
 * names and the next look starts again. Each carried change is held on the new
 * copy before it is released from the old one, so a run cut off between the
 * two leaves the change twice rather than not at all; the old one then reads
 * as conflicting and is turned down.
 */
const startAgain = async (
  given: Following,
  published: LoomTree,
  from: PageCopy,
  accepted: readonly StoredRevision[]
): Promise<Result<Followed, FollowError>> => {
  const copyId = given.ids.treeId()
  const made = await governedCopyOf(given.trees, published, copyId)

  if (!made.ok) return err(storeFailure(made.error.code))

  const replay = replayOnto(made.value, accepted, given.ids, new Date(given.now()).toISOString())
  const copy = await appendAll(given.trees, made.value, replay.entries)

  if (!copy.ok) return err(storeFailure(copy.error.code))

  const started = await given.copies.start({
    pageId: published.treeId,
    copyId,
    startedAt: given.now(),
  })

  if (!started.ok) return err(storeFailure(started.error.detail))

  const waiting = await given.holds.forTree(from.copyId)

  if (!waiting.ok) return err(storeFailure(waiting.error.code))

  const outcomes = await Promise.all(
    waiting.value.held.map(async (held) => {
      const carried = carriedOnto(held, copy.value, given.ids)

      if (!carried.ok) return false

      const kept = await given.holds.hold(carried.value)

      if (kept.ok) await given.holds.release(held.proposalId)

      return kept.ok
    })
  )
  const carried = outcomes.filter(Boolean).length

  return ok({
    kind: "followed",
    copy: copy.value,
    replayed: replay.entries.map((entry) => entry.proposalId),
    dropped: replay.dropped,
    carried,
    conflicting: outcomes.length - carried,
  })
}

/** Bring a page's copy to the version its site publishes (0340, 0358). */
export const followPublished = async (
  given: Following,
  published: LoomTree
): Promise<Result<Followed, FollowError>> => {
  const copies = await given.copies.list()

  if (!copies.ok) return err(storeFailure(copies.error.detail))

  const current = currentCopyOf(copies.value, published.treeId)
  const copy = await governedCopyOf(given.trees, published, current.copyId)

  if (!copy.ok) return err(storeFailure(copy.error.code))

  const same = samePage(copy.value, published)

  if (!given.follows) return ok({ kind: same ? "serving" : "apart", copy: copy.value })

  /** The site now publishes the page the copy reached, accepted changes and all. */
  if (same) return ok({ kind: "serving", copy: copy.value })

  const accepted = await acceptedOn(given.trees, current.copyId)

  if (!accepted.ok) return err(storeFailure(accepted.error.code))

  return standsOn(copy.value, accepted.value, published, given.ids)
    ? ok({ kind: "serving", copy: copy.value })
    : startAgain(given, published, current, accepted.value)
}
