import { afterEach, describe, expect, it, vi } from "vitest"

import { appStoreForWriting, siteStore } from "@/app/_lib/app/store"

import { pageTreeFor } from "./render"
import { storedIdFor } from "./stored"
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
 *
 * **The hang is injected under the handle rather than at it**, which is the
 * point as of 13 October. The budget used to be a `within` written at this one
 * call site; it is now a property of `appStore` itself, so this test replaces
 * the *unbounded* store the wrapper reads through and asserts that the wrapper
 * is what turns a hang into an answer. Spying on `appStore` instead would
 * replace the budget with the thing it exists to contain, and the test would
 * hang — which is how this change found its own regression.
 */

const never = <T,>(): Promise<T> => new Promise<T>(() => undefined)

afterEach(() => {
  vi.restoreAllMocks()
})

/** The same shape every other test in this lane builds. */
const CONTEXT = { origin: "https://loom.test", theme: "minimal" } as const

describe("a page whose store will not answer", () => {
  it("serves the page it was authored as, rather than waiting", async () => {
    vi.spyOn(appStoreForWriting, "head").mockImplementation(never)

    const started = Date.now()
    const tree = await pageTreeFor(HOME, CONTEXT)

    expect(tree.root).toBeDefined()
    expect(tree.treeId).toBeDefined()
    expect(Date.now() - started).toBeLessThan(10_000)
  }, 20_000)

  it("serves the authored page when the store throws, as it always did", async () => {
    vi.spyOn(appStoreForWriting, "head").mockRejectedValue(new Error("no database"))

    const tree = await pageTreeFor(HOME, CONTEXT)

    expect(tree.root).toBeDefined()
  }, 20_000)

  /**
   * The same hang, read through the handle directly, so that the sentence a
   * screen shows a person is the one this produces: *storage is unavailable:
   * the store did not answer within …ms*. Every screen in the portal has a
   * branch on that and none of them had anything to put in it.
   */
  it("answers unavailable rather than nothing, so a screen can say so", async () => {
    vi.spyOn(appStoreForWriting, "head").mockImplementation(never)

    const treeId = storedIdFor(HOME)
    if (treeId === undefined) throw new Error("loom: the home page is not stored under an id")

    const answer = await siteStore.head(treeId)

    expect(answer.ok).toBe(false)
    expect(answer.ok === false ? answer.error.code : undefined).toBe("unavailable")
  }, 20_000)
})
