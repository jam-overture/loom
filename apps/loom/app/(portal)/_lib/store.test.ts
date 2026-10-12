import { beforeEach, describe, expect, it, vi } from "vitest"

import { sitePagesStored } from "@/app/(marketing)/_lib/stored"

import { seedTree } from "./seed"
import { ensureSeeded, portalStore } from "./store"

/**
 * What is on the shelf when somebody signs in, which is not what any other
 * test in this lane asks.
 *
 * Every portal screen awaits `ensureSeeded`, and until 12 October that put one
 * page in the store: this lane's demonstration tree. The site's three pages
 * were seeded by `(marketing)`, on the first request to one of them — correct,
 * and not enough. A maintainer who deploys, signs in and opens *Your pages*
 * before anybody has visited the public site saw the demonstration page alone,
 * which reads as *the site is not hooked up*.
 *
 * **That is a bug no type and no unit test could have had an opinion about**,
 * because it is about the order a person does things in. It was found by
 * photographing the screen. This is the test that would have found it, written
 * afterwards and in the same shape as the photograph: sign in first, look at
 * the shelf, and the site is on it.
 */

const reset = (): void => {
  delete (globalThis as Record<symbol, unknown>)[Symbol.for("loom.portal.seeding")]
  delete (globalThis as Record<symbol, unknown>)[Symbol.for("loom.site.seeding")]
}

beforeEach(reset)

describe("what the portal finds in the store", () => {
  it("has the site's pages before anybody has visited the site", async () => {
    await ensureSeeded()

    const listed = await portalStore.list({})

    if (!listed.ok) throw new Error("loom: the store would not list")

    const held = new Set(listed.value.trees.map((tree) => tree.treeId))

    expect(sitePagesStored().filter((page) => !held.has(page.treeId))).toEqual([])
  })

  it("still has this lane's demonstration page", async () => {
    await ensureSeeded()

    const head = await portalStore.head(seedTree().treeId)

    expect(head.ok).toBe(true)
  })

  /**
   * Seeding twice is what a second portal screen in the same process does, and
   * both halves are create-if-absent — so the second run is two refused writes
   * and no change to anything.
   */
  it("writes over nothing on a second run", async () => {
    await ensureSeeded()

    const before = await portalStore.list({})

    reset()
    await ensureSeeded()

    const after = await portalStore.list({})

    expect(after.ok === true ? after.value.trees.length : -1).toBe(
      before.ok === true ? before.value.trees.length : -2
    )
  })
})

/**
 * The property that took production down when it was not held.
 *
 * Until 12 October the seed inserted blindly and let the primary key answer
 * *already there*. On one machine that is a tidy idiom. On a serverless host it
 * is six failing INSERTs per cold start, each holding a lock on the key it
 * collided with until its transaction ends — so instances queue behind each
 * other, and with `max: 1` on the pool everything else that instance wanted
 * queues too. `/portal` and `/` returned 504 after five minutes, with
 * `duplicate key value violates unique constraint` six times in one second in
 * the database log.
 *
 * What a memory store cannot reproduce is the lock. What it can hold is the
 * thing that removes it: **the steady state does not write.**
 */
describe("seeding a store that is already seeded", () => {
  it("writes nothing the second time", async () => {
    await ensureSeeded()

    reset()
    const wrote = vi.spyOn(portalStore, "create")
    await ensureSeeded()

    expect(wrote).not.toHaveBeenCalled()
    wrote.mockRestore()
  })

  it("still puts everything on the shelf the first time", async () => {
    await ensureSeeded()

    const listed = await portalStore.list({})
    if (!listed.ok) throw new Error("loom: the store would not list")

    expect(listed.value.trees.length).toBeGreaterThanOrEqual(sitePagesStored().length + 1)
  })
})
