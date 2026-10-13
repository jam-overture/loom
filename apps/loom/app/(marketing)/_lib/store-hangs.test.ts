import { afterEach, describe, expect, it, vi } from "vitest"

import { appStore } from "@/app/_lib/app/store"

import { pageTreeFor } from "./render"
import { HOME } from "./site"

/**
 * What a reader gets when the store does not answer.
 *
 * `pageTreeFor` has always said it falls back: *"a store that has not been
 * written yet, or one that cannot be read, serves the authored page rather than
 * nothing — a site that refuses to load because a database is down would be a
 * worse product"*. That was true of a store that **refused** and false of one
 * that **hung**, because a refusal is a `Result` and a hang is nothing at all,
 * so the fallback never ran.
 *
 * On 12 October Supabase was unhealthy, and `loomjs.org` served nothing for
 * hours with the authored pages sitting right there. This is the test that
 * would have caught it, written afterwards: make the store hang, and ask for a
 * page.
 */

const never = <T,>(): Promise<T> => new Promise<T>(() => undefined)

afterEach(() => {
  vi.restoreAllMocks()
})

/** The same shape every other test in this lane builds. */
const CONTEXT = { origin: "https://loom.test", theme: "minimal" } as const

describe("a page whose store will not answer", () => {
  it("serves the page it was authored as, rather than waiting", async () => {
    vi.spyOn(appStore, "head").mockImplementation(never)

    const started = Date.now()
    const tree = await pageTreeFor(HOME, CONTEXT)

    expect(tree.root).toBeDefined()
    expect(tree.treeId).toBeDefined()
    expect(Date.now() - started).toBeLessThan(10_000)
  }, 20_000)

  it("serves the authored page when the store throws, as it always did", async () => {
    vi.spyOn(appStore, "head").mockRejectedValue(new Error("no database"))

    const tree = await pageTreeFor(HOME, CONTEXT)

    expect(tree.root).toBeDefined()
  }, 20_000)
})
