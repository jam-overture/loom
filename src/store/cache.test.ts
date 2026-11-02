import { describe, expect, it, vi } from "vitest"

import { sequentialIdFactory } from "../ids.js"
import { err, ok, type Result } from "../result.js"
import type { Provenance } from "../runtime/proposal.js"
import { FIXED_INSTANT } from "../testing/doubles.js"
import { sampleTree } from "../testing/fixtures.js"
import { buildText } from "../tree/builders.js"
import type { LoomTree } from "../tree/tree.js"

import {
  cachingTreeStore,
  invalidatingTreeStore,
  treeCacheTag,
  type TreeCache,
} from "./cache.js"
import type { StoreError } from "./errors.js"
import { memoryTreeStore } from "./memory.js"
import type { TreeStore } from "./store.js"

const spare = sequentialIdFactory("cache")

const provenance: Provenance = {
  origin: "user-instruction",
  interpreter: "test",
  authoredBy: "model",
  confidence: 0.9,
  interpretedAt: FIXED_INSTANT,
}

type Entry = { readonly tags: readonly string[]; readonly body: string }

type Recording = {
  readonly cache: TreeCache
  readonly invalidate: (tag: string) => void
  readonly keys: () => readonly string[]
  readonly tagsOf: (key: string) => readonly string[]
  readonly poison: (key: string, body: string) => void
}

/**
 * A cache that honours the two things the port asks of one: it answers from a
 * previous call with the same key, and it does not remember a rejection. Values
 * go through JSON on the way in and on the way out, because every real one does
 * and that is what the revival below is for.
 */
const recordingCache = (): Recording => {
  const entries = new Map<string, Entry>()

  return {
    cache: {
      readThrough: async (key, tags, load) => {
        const id = key.join("/")
        const held = entries.get(id)

        if (held !== undefined) return JSON.parse(held.body) as unknown

        const body = JSON.stringify(await load())
        entries.set(id, { tags, body })

        return JSON.parse(body) as unknown
      },
    },
    invalidate: (tag) => {
      for (const [id, entry] of entries) if (entry.tags.includes(tag)) entries.delete(id)
    },
    keys: () => [...entries.keys()],
    tagsOf: (key) => entries.get(key)?.tags ?? [],
    poison: (key, body) => entries.set(key, { tags: [], body }),
  }
}

const refusing = (error: StoreError): TreeCache => ({
  readThrough: () => Promise.reject(new Error(error.code)),
})

const appendTo = async (
  store: TreeStore,
  tree: LoomTree,
  baseRevision = 0
): Promise<Result<LoomTree, StoreError>> =>
  store.append(tree.treeId, {
    proposalId: spare.proposalId(),
    delta: {
      deltaId: spare.deltaId(),
      treeId: tree.treeId,
      baseRevision,
      operations: [
        { op: "insert", parentId: tree.root.id, index: 0, node: buildText(spare, "appended") },
      ],
    },
    provenance,
    appliedAt: FIXED_INSTANT,
  })

describe("the tag a cached tree carries", () => {
  it("names the tree, so a reader and a writer derive the same one", () => {
    const { tree } = sampleTree()

    expect(treeCacheTag(tree.treeId)).toContain(tree.treeId)
  })

  it("is a different tag for a different tree", () => {
    const first = sampleTree().tree
    const second = sampleTree().tree

    expect(treeCacheTag(first.treeId)).toBe(treeCacheTag(first.treeId))
    expect(treeCacheTag(first.treeId)).not.toBe(treeCacheTag(spare.treeId()))
    expect(second.treeId).toBe(first.treeId)
  })
})

describe("a handle whose head is answered from a cache", () => {
  it("reads the store once for a tree however many readers ask", async () => {
    const { tree } = sampleTree()
    const inner = memoryTreeStore()
    await inner.create(tree)
    const head = vi.spyOn(inner, "head")

    const cached = cachingTreeStore(inner, recordingCache().cache)

    const first = await cached.head(tree.treeId)
    const second = await cached.head(tree.treeId)

    expect(first).toEqual(ok(tree))
    expect(second).toEqual(ok(tree))
    expect(head).toHaveBeenCalledTimes(1)
  })

  it("files the entry under the tree's own tag", async () => {
    const { tree } = sampleTree()
    const inner = memoryTreeStore()
    await inner.create(tree)
    const recording = recordingCache()

    await cachingTreeStore(inner, recording.cache).head(tree.treeId)

    expect(recording.keys()).toEqual([tree.treeId])
    expect(recording.tagsOf(tree.treeId)).toEqual([treeCacheTag(tree.treeId)])
  })

  it("keeps two trees apart", async () => {
    const first = sampleTree().tree
    const second = { ...first, treeId: spare.treeId() }
    const inner = memoryTreeStore()
    await inner.create(first)
    await inner.create(second)

    const cached = cachingTreeStore(inner, recordingCache().cache)

    expect(await cached.head(first.treeId)).toEqual(ok(first))
    expect(await cached.head(second.treeId)).toEqual(ok(second))
  })

  /**
   * The property the whole arrangement rests on. A refusal that were remembered
   * would be a page serving its fallback until something appended to a row that
   * does not exist yet, which is never.
   */
  it("does not remember a tree the store said was not there", async () => {
    const { tree } = sampleTree()
    const inner = memoryTreeStore()
    const cached = cachingTreeStore(inner, recordingCache().cache)

    const before = await cached.head(tree.treeId)

    expect(before).toEqual(err({ code: "not-found", treeId: tree.treeId }))

    await inner.create(tree)

    expect(await cached.head(tree.treeId)).toEqual(ok(tree))
  })

  it("refuses a cached value that is not a tree, naming the tree", async () => {
    const { tree } = sampleTree()
    const inner = memoryTreeStore()
    await inner.create(tree)
    const recording = recordingCache()
    recording.poison(tree.treeId, JSON.stringify({ not: "a tree" }))

    const read = await cachingTreeStore(inner, recording.cache).head(tree.treeId)

    expect(read.ok).toBe(false)
    expect(read.ok ? undefined : read.error.code).toBe("unavailable")
    expect(read.ok ? "" : JSON.stringify(read.error)).toContain(tree.treeId)
  })

  /**
   * A cache is not allowed to be load-bearing on a read either. Whatever it
   * throws for reasons of its own comes back as the refusal every screen in this
   * repository already draws, rather than as an exception nobody catches.
   */
  it("reports a cache that throws as a refusal rather than raising it", async () => {
    const { tree } = sampleTree()
    const inner = memoryTreeStore()
    await inner.create(tree)

    const read = await cachingTreeStore(inner, refusing({ code: "unavailable", detail: "x" })).head(
      tree.treeId
    )

    expect(read.ok ? undefined : read.error.code).toBe("unavailable")
  })

  it("leaves the history, the listing and both writes to the store", async () => {
    const { tree } = sampleTree()
    const inner = memoryTreeStore()
    const recording = recordingCache()
    const cached = cachingTreeStore(inner, recording.cache)

    expect((await cached.create(tree)).ok).toBe(true)
    expect((await appendTo(cached, tree)).ok).toBe(true)
    expect((await cached.revisions(tree.treeId)).ok).toBe(true)
    expect((await cached.list()).ok).toBe(true)
    expect(recording.keys()).toEqual([])
  })
})

describe("a handle that tells a cache the log grew", () => {
  it("invalidates the tree's tag once the append is history", async () => {
    const { tree } = sampleTree()
    const inner = memoryTreeStore()
    await inner.create(tree)
    const invalidate = vi.fn()

    await appendTo(invalidatingTreeStore(inner, invalidate), tree)

    expect(invalidate).toHaveBeenCalledExactlyOnceWith(treeCacheTag(tree.treeId))
  })

  it("invalidates nothing when the append was refused", async () => {
    const { tree } = sampleTree()
    const inner = memoryTreeStore()
    const invalidate = vi.fn()

    const refused = await appendTo(invalidatingTreeStore(inner, invalidate), tree)

    expect(refused.ok).toBe(false)
    expect(invalidate).not.toHaveBeenCalled()
  })

  /**
   * The containment, asserted rather than assumed: a host whose cache cannot be
   * reached from the place it appends — a script, a migration — still writes.
   */
  it("keeps a write that a cache could not be told about", async () => {
    const { tree } = sampleTree()
    const inner = memoryTreeStore()
    await inner.create(tree)

    const appended = await appendTo(
      invalidatingTreeStore(inner, () => {
        throw new Error("no request to revalidate from")
      }),
      tree
    )

    expect(appended.ok).toBe(true)
    expect((await inner.head(tree.treeId)).ok).toBe(true)
  })

  it("does not invalidate for a tree that has just been created", async () => {
    const { tree } = sampleTree()
    const invalidate = vi.fn()

    await invalidatingTreeStore(memoryTreeStore(), invalidate).create(tree)

    expect(invalidate).not.toHaveBeenCalled()
  })
})

/**
 * What the two wrappers are for, stated as the thing a reader experiences: the
 * row is read once, somebody changes the page, and the next reader is served the
 * change rather than the copy.
 */
describe("a reader after a writer", () => {
  it("is served the revision the append produced", async () => {
    const { tree } = sampleTree()
    const recording = recordingCache()
    const raw = memoryTreeStore()
    await raw.create(tree)

    const writing = invalidatingTreeStore(raw, recording.invalidate)
    const reading = cachingTreeStore(raw, recording.cache)

    const before = await reading.head(tree.treeId)

    expect(before.ok ? before.value.revision : undefined).toBe(0)

    const appended = await appendTo(writing, tree)

    expect(appended.ok).toBe(true)

    const after = await reading.head(tree.treeId)

    expect(after.ok ? after.value.revision : undefined).toBe(1)
  })

  it("is served the copy for as long as nobody appends", async () => {
    const { tree } = sampleTree()
    const recording = recordingCache()
    const raw = memoryTreeStore()
    await raw.create(tree)
    const head = vi.spyOn(raw, "head")
    const reading = cachingTreeStore(raw, recording.cache)

    await reading.head(tree.treeId)
    await reading.head(tree.treeId)
    await reading.head(tree.treeId)

    expect(head).toHaveBeenCalledTimes(1)
  })
})
