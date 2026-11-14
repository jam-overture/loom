import { describe, expect, it } from "vitest"

import {
  err,
  ok,
  proposalIdSchema,
  sequentialIdFactory,
  treeIdSchema,
  type LoomTree,
  type TreeOperation,
} from "@jam-overture/loom"
import { memoryTreeStore, type TreeStore } from "@jam-overture/loom/store"

import { pageFixture } from "@/app/_lib/pages/fixtures"
import type { PublishedPage } from "@/app/_lib/pages/published"

import type { PageCopy } from "./copies"
import { elementIdsOf } from "./fixtures"
import { liveWindowOf, WINDOW_OFF, type HeldVersion, type WindowReading } from "./held"

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR
const NOW = Date.UTC(2026, 10, 13, 12)

const HOME = pageFixture("home", "Welcome", 3)
const PRICING = pageFixture("pricing", "Pricing", 1)
const [, HEADING] = elementIdsOf(HOME)

if (HEADING === undefined) throw new Error("the fixture has a heading")

const levelOf = (level: number): TreeOperation => ({
  op: "configure",
  nodeId: HEADING,
  set: { level },
  unset: [],
})

const publishedAt = (tree: LoomTree, receivedAt: number): PublishedPage => ({ tree, receivedAt })

/** Two hours before now: the site's last build, before any change below. */
const BUILT = NOW - 2 * HOUR

const SITE = [publishedAt(HOME, BUILT), publishedAt(PRICING, BUILT)]

type Change = { readonly level: number; readonly at: number; readonly undoes?: number }

/** A store holding `tree` as a copy with each change accepted on it at its time, and the copy after each. */
const copyWith = async (
  tree: LoomTree,
  changes: readonly Change[]
): Promise<{ readonly store: TreeStore; readonly after: readonly LoomTree[] }> => {
  const store = memoryTreeStore()
  const created = await store.create(tree)
  if (!created.ok) throw new Error("expected the copy to be made")

  const ids = sequentialIdFactory("held")
  const after = await changes.reduce<Promise<readonly LoomTree[]>>(async (prior, change, index) => {
    const made = await prior
    const base = made.at(-1) ?? created.value
    const appended = await store.append(tree.treeId, {
      proposalId: proposalIdSchema.parse(`p_${index}`),
      delta: {
        deltaId: ids.deltaId(),
        treeId: tree.treeId,
        baseRevision: base.revision,
        operations: [levelOf(change.level)],
      },
      provenance: {
        origin: "system-signal",
        interpreter: "test",
        authoredBy: "model",
        confidence: 0.9,
        interpretedAt: new Date(change.at).toISOString(),
        ...(change.undoes === undefined ? {} : { undoes: change.undoes }),
      },
      appliedAt: new Date(change.at).toISOString(),
      answeredBy: "owner:ana",
    })
    if (!appended.ok) throw new Error("expected the change to apply")

    return [...made, appended.value]
  }, Promise.resolve([]))

  return { store, after }
}

const readingOf = (trees: WindowReading["trees"], copies: readonly PageCopy[] = []) => ({
  trees,
  copies,
})

/** A version as the door sends it: under the page's own id. */
const versionOf = (tree: LoomTree | undefined, until: number): HeldVersion => {
  if (tree === undefined) throw new Error("expected the version")

  return { until, tree: { ...tree, treeId: HOME.treeId } }
}

const DOWN: WindowReading["trees"] = {
  head: () => Promise.resolve(err({ code: "unavailable", detail: "down" })),
  revisions: () => Promise.resolve(err({ code: "unavailable", detail: "down" })),
}

describe("liveWindowOf", () => {
  it("is Off and reads nothing where the project holds nobody", async () => {
    expect(await liveWindowOf(readingOf(DOWN), SITE, 0, NOW)).toEqual(ok(WINDOW_OFF))
  })

  it("stands at the site's last build, holding nothing, where Loom changed nothing since", async () => {
    expect(await liveWindowOf(readingOf(memoryTreeStore()), SITE, DAY, NOW)).toEqual(
      ok({ ms: DAY, floor: BUILT, number: BUILT, held: [] })
    )
  })

  it("holds the page before each change made since the build, each until the change went live", async () => {
    const first = NOW - HOUR
    const second = NOW - 10 * 60 * 1000
    const { store, after } = await copyWith(HOME, [
      { level: 2, at: first },
      { level: 3, at: second },
    ])

    expect(await liveWindowOf(readingOf(store), SITE, DAY, NOW)).toEqual(
      ok({
        ms: DAY,
        floor: BUILT,
        number: second,
        held: [
          {
            treeId: HOME.treeId,
            versions: [versionOf(HOME, first), versionOf(after[0], second)],
          },
        ],
      })
    )
  })

  it("leaves out a version replaced before the window began, since no cookie that old is still kept", async () => {
    const first = NOW - 90 * 60 * 1000
    const second = NOW - 10 * 60 * 1000
    const { store, after } = await copyWith(HOME, [
      { level: 2, at: first },
      { level: 3, at: second },
    ])

    const window = await liveWindowOf(readingOf(store), SITE, HOUR, NOW)

    expect(window.ok && "held" in window.value && window.value.held).toEqual([
      { treeId: HOME.treeId, versions: [versionOf(after[0], second)] },
    ])
  })

  it("holds nothing from before the site's newest build, whose code an older page may not draw under", async () => {
    const { store } = await copyWith(HOME, [{ level: 2, at: BUILT - HOUR }])
    const rebuilt = [publishedAt(HOME, BUILT), publishedAt(PRICING, NOW - HOUR)]

    expect(await liveWindowOf(readingOf(store), rebuilt, DAY, NOW)).toEqual(
      ok({ ms: DAY, floor: NOW - HOUR, number: NOW - HOUR, held: [] })
    )
  })

  it("raises the floor to a revert on any page, so what was withdrawn reaches every reader now", async () => {
    const reverted = NOW - 10 * 60 * 1000
    const { store } = await copyWith(HOME, [
      { level: 2, at: NOW - HOUR },
      { level: 0, at: reverted, undoes: HOME.revision + 1 },
    ])

    expect(await liveWindowOf(readingOf(store), SITE, DAY, NOW)).toEqual(
      ok({ ms: DAY, floor: reverted, number: reverted, held: [] })
    )
  })

  it("raises the floor to a copy started again, so the changes replayed onto it are not held", async () => {
    const copy: PageCopy = {
      pageId: HOME.treeId,
      copyId: treeIdSchema.parse("t_again"),
      startedAt: NOW - 30 * 60 * 1000,
    }
    const { store } = await copyWith({ ...HOME, treeId: copy.copyId }, [
      { level: 2, at: copy.startedAt - 1 },
    ])

    expect(await liveWindowOf(readingOf(store, [copy]), SITE, DAY, NOW)).toEqual(
      ok({ ms: DAY, floor: copy.startedAt, number: copy.startedAt, held: [] })
    )
  })

  it("holds nothing of a page whose site moved on before Loom followed it, since its start is gone", async () => {
    const changed = NOW - HOUR
    const { store } = await copyWith(HOME, [{ level: 2, at: changed }])
    const newer = { ...pageFixture("home", "Welcome back", 5), treeId: HOME.treeId }

    expect(
      await liveWindowOf(
        readingOf(store),
        [publishedAt(newer, BUILT), publishedAt(PRICING, BUILT)],
        DAY,
        NOW
      )
    ).toEqual(ok({ ms: DAY, floor: BUILT, number: changed, held: [] }))
  })

  it("says so when a record cannot be read, rather than answering a window with a page missing", async () => {
    expect(await liveWindowOf(readingOf(DOWN), SITE, DAY, NOW)).toEqual(
      err({ code: "store", detail: "unavailable" })
    )
  })
})
