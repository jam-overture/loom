import {
  err,
  ok,
  sequentialIdFactory,
  type LoomTree,
  type Result,
  type TreeId,
} from "@jam-overture/loom"
import { treesAt, type StoredRevision, type TreeStore } from "@jam-overture/loom/store"

import type { PublishedPage } from "@/app/_lib/pages/published"

import { currentCopyOf, type PageCopy } from "./copies"
import { acceptedOn, standsOn, type FollowError } from "./following"

/**
 * What the read door hands a site so that a reader keeps the pages they first
 * saw (0383 clause 5): the project's window, the floor, the current number and
 * each page's versions a pin can still be served.
 *
 * **The number is a time.** 0383 clause 3 numbers each state of a project's
 * live pages and has every change that goes live advance it. Loom keeps no
 * counter of those states, but it keeps when each one happened: an accepted
 * change's entry on its copy's record, a copy's start and a snapshot's
 * arrival. So a state's number is the millisecond it was made, which advances
 * with every change as clause 3 asks and is shared, as it asks, by every
 * reader who arrived between the same two changes. It needs no table, and it
 * cannot drift from the record it is read from.
 *
 * **The floor is the newest thing that withdraws held pages** (clause 4): the
 * newest snapshot the site sent, the newest copy Loom started again from one,
 * and the newest revert on any page. A pin below it reads the newest pages, so
 * nothing older than it is ever sent. A snapshot is the site's build, so every
 * deploy raises it, which is clause 4's own reason: an older tree is not
 * promised to draw under newer components.
 *
 * **A version is sent only while a pin can be served it**: one replaced after
 * both the floor and the window's start. A reader pinned before the window
 * started has a cookie that has run out, so nothing older is needed.
 *
 * **A page whose versions cannot all be rebuilt holds none.** A list with a
 * gap would serve a pin in the gap the next version, which is a page that was
 * never live at its number; serving the newest instead is the freshness
 * failure clause 5 allows. The same goes for a copy that no longer stands on
 * what its site published, since its record is folded from that version.
 */

/** One version of a page a pin can be served: to a pin below `until`, when the next one went live. */
export type HeldVersion = { readonly until: number; readonly tree: LoomTree }

/** A page's held versions, oldest first. */
export type HeldPage = { readonly treeId: TreeId; readonly versions: readonly HeldVersion[] }

/** The door's `window`: *Off*, or what a site needs to hold its readers. */
export type LiveWindow =
  | { readonly ms: 0 }
  | {
      readonly ms: number
      readonly floor: number
      readonly number: number
      readonly held: readonly HeldPage[]
    }

export const WINDOW_OFF: LiveWindow = { ms: 0 }

/** One published page and the record of the copy that is live for it. */
export type PageRecord = {
  readonly published: PublishedPage
  readonly copy: PageCopy
  /** The copy's record, oldest first; empty where Loom never made a copy. */
  readonly revisions: readonly StoredRevision[]
  /** Whether the copy stands on the published version, which is what its record is folded from. */
  readonly standing: boolean
}

/** Where a past version is rebuilt from, and the one thing that decides whether it can be. */
export type WindowReading = {
  readonly trees: Pick<TreeStore, "head" | "revisions">
  /** Every copy the application has started, as `PageCopyStore.list` answers. */
  readonly copies: readonly PageCopy[]
}

/** A revision the tree before it is wanted at, and the pins it is served to. */
export type Wanted = { readonly revision: number; readonly until: number }

const appliedAtOf = (revision: StoredRevision): number => Date.parse(revision.appliedAt)

const isUndo = (revision: StoredRevision): boolean => revision.provenance.undoes !== undefined

/** The newest snapshot, copy restart or revert across the project's pages. Pure. */
export const floorOf = (records: readonly PageRecord[]): number =>
  Math.max(
    0,
    ...records.flatMap((record) => [
      record.published.receivedAt,
      record.copy.startedAt,
      ...record.revisions.filter(isUndo).map(appliedAtOf),
    ])
  )

/** The number of the project's live pages as they stand: their newest change, never below the floor. Pure. */
export const numberOf = (records: readonly PageRecord[], floor: number): number =>
  Math.max(floor, ...records.flatMap((record) => record.revisions.map(appliedAtOf)))

/**
 * The versions of one page a pin can still be served: the page before each
 * change made after `horizon`, served until that change. Pure.
 */
export const wantedOf = (record: PageRecord, horizon: number): readonly Wanted[] =>
  record.standing
    ? record.revisions
        .filter((revision) => appliedAtOf(revision) > horizon)
        .map((revision) => ({ revision: revision.revision - 1, until: appliedAtOf(revision) }))
    : []

const storeFailure = (detail: string): FollowError => ({ code: "store", detail })

/** One page's record, read from its current copy. */
const recordOf = async (
  given: WindowReading,
  published: PublishedPage
): Promise<Result<PageRecord, FollowError>> => {
  const copy = currentCopyOf(given.copies, published.tree.treeId)
  const revisions = await acceptedOn(given.trees, copy.copyId)

  if (!revisions.ok) {
    return revisions.error.code === "not-found"
      ? ok({ published, copy, revisions: [], standing: false })
      : err(storeFailure(revisions.error.code))
  }

  const head = await given.trees.head(copy.copyId)

  if (!head.ok) return err(storeFailure(head.error.code))

  /** Delta ids minted to check a replay are thrown away with it, so any factory will do. */
  const standing = standsOn(
    head.value,
    revisions.value,
    published.tree,
    sequentialIdFactory("held")
  )

  return ok({ published, copy, revisions: revisions.value, standing })
}

/** The versions wanted of one page, each named as the page, or none where any could not be rebuilt. */
const versionsOf = async (
  trees: WindowReading["trees"],
  record: PageRecord,
  wanted: readonly Wanted[]
): Promise<Result<readonly HeldVersion[], FollowError>> => {
  const page = record.published.tree
  const rebuilt = await treesAt(trees, {
    treeId: record.copy.copyId,
    revisions: wanted.map((one) => one.revision),
    seed: { ...page, treeId: record.copy.copyId },
  })

  if (!rebuilt.ok) return err(storeFailure(rebuilt.error.code))

  const versions = wanted.flatMap((one): readonly HeldVersion[] => {
    const at = rebuilt.value.get(one.revision)

    return at?.outcome === "replayed"
      ? [{ until: one.until, tree: { ...at.replayed.tree, treeId: page.treeId } }]
      : []
  })

  return ok(versions.length === wanted.length ? versions : [])
}

/** The door's `window` for a project whose readers are held for `ms`, at `now`. */
export const liveWindowOf = async (
  given: WindowReading,
  published: readonly PublishedPage[],
  ms: number,
  now: number
): Promise<Result<LiveWindow, FollowError>> => {
  if (ms === 0) return ok(WINDOW_OFF)

  const read = await Promise.all(published.map((page) => recordOf(given, page)))
  const unread = read.find((record) => !record.ok)

  if (unread !== undefined && !unread.ok) return unread

  const records = read.flatMap((record) => (record.ok ? [record.value] : []))
  const floor = floorOf(records)
  const horizon = Math.max(floor, now - ms)

  const pages = await Promise.all(
    records.map(async (record): Promise<Result<HeldPage, FollowError>> => {
      const wanted = wantedOf(record, horizon)
      const versions = wanted.length === 0 ? ok([]) : await versionsOf(given.trees, record, wanted)

      return versions.ok
        ? ok({ treeId: record.published.tree.treeId, versions: versions.value })
        : versions
    })
  )
  const failed = pages.find((page) => !page.ok)

  if (failed !== undefined && !failed.ok) return failed

  const held = pages
    .flatMap((page) => (page.ok && page.value.versions.length > 0 ? [page.value] : []))
    .sort((left, right) => left.treeId.localeCompare(right.treeId))

  return ok({ ms, floor, number: numberOf(records, floor), held })
}
