import { describe, expect, it, vi } from "vitest"

import { createTree, primitiveTypeSchema, sequentialIdFactory } from "@jam-overture/loom"
import {
  DEFAULT_PROJECT_ID,
  memoryApplicationStore,
  memoryProjectStore,
  memoryTreeStore,
} from "@jam-overture/loom/store"
import { memoryHoldStore } from "@jam-overture/loom/write"

import {
  absent,
  boundedApplicationStore,
  boundedHoldStore,
  boundedProjectStore,
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
