import { describe, expect, it, vi } from "vitest"

import {
  createTree,
  nodeIdSchema,
  primitiveTypeSchema,
  sequentialIdFactory,
  treeIdSchema,
} from "@jam-overture/loom"
import {
  audienceIdSchema,
  DEFAULT_PROJECT_ID,
  memoryApplicationStore,
  memoryProjectStore,
  memoryTreeStore,
} from "@jam-overture/loom/store"
import { memoryHoldStore } from "@jam-overture/loom/write"

import { memoryReaderTallyStore } from "@jam-overture/loom/signals"

import {
  absent,
  boundedApplicationStore,
  boundedHoldStore,
  boundedProjectStore,
  boundedReaderTallyStore,
  boundedTreeStore,
} from "./bounded-store"

/**
 * What a screen is handed when the database stops answering.
 *
 * `store-hangs.test.ts` next door asks this of the marketing site end to end.
 * This asks it of the handle, because the handle is now where the answer comes
 * from: ten portal screens read through it and not one of them says `within`
 * anywhere, which is the whole point of moving the budget here.
 */

/** A promise that is never settled — the shape of a database that is up and silent. */
const never = <T,>(): Promise<T> => new Promise<T>(() => undefined)

const after = <T,>(ms: number, value: T): Promise<T> =>
  new Promise<T>((resolve) => setTimeout(() => resolve(value), ms))

/**
 * Short, so the suite is quick, and passed explicitly so that no test here
 * depends on what the deployment's budget happens to be.
 */
const BUDGET = 40

const AT = "2026-10-26T00:00:00.000Z"
const SKIERS = audienceIdSchema.parse("aud_skiers")
const READER_TREE = treeIdSchema.parse("t_bounded")
const READER_NODE = nodeIdSchema.parse("n_hero")

const ids = sequentialIdFactory("bounded")

const aPage = createTree(
  {
    kind: "element",
    id: ids.nodeId(),
    type: primitiveTypeSchema.parse("loom.page"),
    props: {},
    children: [],
  },
  ids
)

const unavailableIn = (result: { readonly ok: boolean } & Record<string, unknown>): string => {
  if (result.ok) throw new Error("loom: the read answered when the test needed it not to")

  const error = result["error"]
  if (typeof error !== "object" || error === null) throw new Error("loom: no error on the refusal")

  const code = (error as { readonly code?: unknown }).code
  const detail = (error as { readonly detail?: unknown }).detail

  return `${String(code)}: ${String(detail)}`
}

describe("a tree store whose reads do not answer", () => {
  it("refuses each read as unavailable, naming the budget", async () => {
    const silent = memoryTreeStore()
    vi.spyOn(silent, "head").mockImplementation(never)
    vi.spyOn(silent, "list").mockImplementation(never)
    vi.spyOn(silent, "revisions").mockImplementation(never)

    const store = boundedTreeStore(silent, BUDGET)
    const treeId = ids.treeId()

    expect([
      unavailableIn(await store.head(treeId)),
      unavailableIn(await store.list({})),
      unavailableIn(await store.revisions(treeId)),
    ]).toEqual([
      `unavailable: the store did not answer within ${BUDGET}ms`,
      `unavailable: the store did not answer within ${BUDGET}ms`,
      `unavailable: the store did not answer within ${BUDGET}ms`,
    ])
  })

  it("does the same for a read that throws, and says what threw", async () => {
    const throwing = memoryTreeStore()
    vi.spyOn(throwing, "head").mockRejectedValue(new Error("no database"))

    const refusal = await boundedTreeStore(throwing, BUDGET).head(ids.treeId())

    expect(unavailableIn(refusal)).toBe("unavailable: no database")
  })

  it("leaves a read that answers in time exactly as it was", async () => {
    const store = boundedTreeStore(memoryTreeStore(), BUDGET)

    const created = await store.create(aPage)
    const read = await store.head(aPage.treeId)

    expect({ created: created.ok, revision: read.ok ? read.value.revision : -1 }).toEqual({
      created: true,
      revision: 0,
    })
  })

  /**
   * The half that is easy to get wrong, and the reason this file exists rather
   * than a `within` at each call site.
   *
   * A read that gives up has cost nothing. **A write that gives up has an
   * unknown outcome** — the statement may land a moment later — and a caller
   * told `unavailable` would be entitled to retry something that has already
   * happened. So a slow write is still a write, and it waits.
   */
  it("does not put a budget on a write", async () => {
    const slow = memoryTreeStore()
    vi.spyOn(slow, "create").mockImplementation(() => after(BUDGET * 4, { ok: true as const, value: aPage }))

    const written = await boundedTreeStore(slow, BUDGET).create(aPage)

    expect(written.ok === true ? written.value.treeId : undefined).toBe(aPage.treeId)
  })
})

describe("the other three stores", () => {
  it("refuses a silent hold listing, and still waits for a release", async () => {
    const holds = memoryHoldStore()
    vi.spyOn(holds, "forTree").mockImplementation(never)
    vi.spyOn(holds, "release").mockImplementation(() => after(BUDGET * 4, { ok: false as const, error: { code: "not-held" as const, proposalId: ids.proposalId() } }))

    const store = boundedHoldStore(holds, BUDGET)
    const listing = await store.forTree(ids.treeId())
    const released = await store.release(ids.proposalId())

    expect({
      listing: unavailableIn(listing),
      released: released.ok === false ? released.error.code : "ok",
    }).toEqual({
      listing: `unavailable: the store did not answer within ${BUDGET}ms`,
      released: "not-held",
    })
  })

  it("refuses a silent project read and leaves the write alone", async () => {
    const projects = memoryProjectStore()
    vi.spyOn(projects, "list").mockImplementation(never)

    const store = boundedProjectStore(projects, BUDGET)
    const created = await store.create({
      projectId: DEFAULT_PROJECT_ID,
      name: "Your projects",
      createdAt: new Date(0).toISOString(),
    })

    expect({ listed: unavailableIn(await store.list()), created: created.ok }).toEqual({
      listed: `unavailable: the store did not answer within ${BUDGET}ms`,
      created: true,
    })
  })

  it("refuses a silent application read", async () => {
    const applications = memoryApplicationStore()
    vi.spyOn(applications, "list").mockImplementation(never)

    expect(unavailableIn(await boundedApplicationStore(applications, BUDGET).list())).toBe(
      `unavailable: the store did not answer within ${BUDGET}ms`
    )
  })

  /**
   * A bounded store puts a budget on the reads and forwards the writes
   * untouched, and *untouched* has to include the audience: a write filed under
   * `aud_everyone` whatever audience it named is two populations in one counter
   * (0284), and it would look in a diff exactly like forwarding.
   *
   * Nothing writes through this handle today — the door and the collector hold
   * the unbounded one — so this is the assertion that keeps the day one does
   * from being the day the counters merge.
   */
  it("forwards the audience through each of the three writes it does not bound", async () => {
    const tallies = memoryReaderTallyStore()
    const store = boundedReaderTallyStore(tallies, BUDGET)
    const revision = { treeId: READER_TREE, revision: 1 }
    const tally = {
      ...revision,
      nodeId: READER_NODE,
      type: primitiveTypeSchema.parse("loom.section"),
      views: 1,
      reached: 1,
      engaged: 0,
      dwellMs: 90,
      activations: 0,
      opens: 0,
      closes: 0,
      completions: 0,
    }

    await store.opened([{ ...revision, views: 4 }], AT, SKIERS)
    await store.apply({ tallies: [tally], funnels: [] }, AT, SKIERS)
    await store.applyWindow([{ audience: SKIERS, tallies: [tally], funnels: [] }], AT)

    const rows = await tallies.tallies()
    const views = await tallies.pageViews()

    expect(rows.ok && rows.value.map((row) => row.audienceId)).toEqual([SKIERS])
    expect(views.ok && views.value.map((row) => row.audienceId)).toEqual([SKIERS])
  })
})

/**
 * The guard that keeps #615 fixed now that a read can refuse for a third
 * reason.
 *
 * Before the budget there were two answers to *is this stored* and the seed
 * branched on `result.ok`. There are three now, and the new one is the
 * dangerous one: a store that **did not say** must not be written to, or every
 * slow request is inserting blindly again — which is exactly the shape that
 * took production down on 12 October.
 */
describe("asking whether a page is absent", () => {
  it("is true only when the store said there is nothing there", async () => {
    const store = memoryTreeStore()
    const missing = await store.head(ids.treeId())

    await store.create(aPage)
    const present = await store.head(aPage.treeId)

    const silent = memoryTreeStore()
    vi.spyOn(silent, "head").mockImplementation(never)
    const unsaid = await boundedTreeStore(silent, BUDGET).head(ids.treeId())

    expect({
      missing: absent(missing),
      present: absent(present),
      unsaid: absent(unsaid),
    }).toEqual({ missing: true, present: false, unsaid: false })
  })
})
