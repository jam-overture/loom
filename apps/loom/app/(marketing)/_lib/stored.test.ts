import { readdirSync, readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import {
  err,
  walkTree,
  type DeltaId,
  type ElementNode,
  type JsonObject,
  type LoomTree,
  type NodeId,
  type ProposalId,
  type Provenance,
  type TreeDelta,
} from "@jam-overture/loom"
import { beforeAll, describe, expect, it, vi } from "vitest"

import { appStore, appStoreForWriting, siteStore } from "@/app/_lib/app/store"

import { treeFor } from "./builders"
import { pageTreeFor } from "./render"
import { HOME, SITE_ROUTES, WHAT_YOU_RUN, WHY_USE_IT } from "./site"
import { seedSitePages, sitePagesStored, storedIdFor, storedPageFor } from "./stored"

/**
 * The claim 0259 condition 1 is made of: **what this site serves comes out of
 * the store.**
 *
 * Everything else in this route group's 1,300 tests asserts that the page is
 * still the page — they passed before this change and they pass after it, which
 * is the point of them and the reason not one of them would notice if the store
 * read were deleted tomorrow and the builder served directly again. These are
 * the tests that would.
 *
 * The decisive one is `a change in the store is a change on the page`. Until 12
 * October there was no way to write that test, because there was nothing to
 * write to: the page was a function call. A portal edit, an accepted proposal
 * and an adaptation the Gate allowed all arrive as an append to a stored tree,
 * so one append standing in for all three is the whole mechanism.
 */

const CONTEXT = { origin: "", theme: "minimal" } as const

const PROVENANCE: Provenance = {
  origin: "user-instruction",
  actor: "the maintainer",
  interpreter: "scripted",
  authoredBy: "runtime",
  confidence: 1,
  interpretedAt: "2026-10-12T00:00:00.000Z",
}

/**
 * The seed, run once for this file.
 *
 * It used to run itself, on the first request to any page, memoised on
 * `globalThis` — so these tests reset that symbol to ask what a fresh process
 * does. The seed is `db:push`'s work as of 13 October and the memo is gone with
 * it, so a test that wants a seeded store says so.
 */
beforeAll(async () => {
  await seedSitePages()
})

const headingIn = (tree: LoomTree): ElementNode => {
  const heading = [...walkTree(tree.root)].find(
    (node): node is ElementNode => node.kind === "element" && node.type === "loom.heading"
  )

  if (heading === undefined) throw new Error("loom: the page has no heading")

  return heading
}

/** A module of this route group, as the text that actually runs. */
const read = (relative: string): string =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "")

const configure = (tree: LoomTree, nodeId: NodeId, set: JsonObject): TreeDelta => ({
  deltaId: `d_${tree.revision + 1}` as DeltaId,
  treeId: tree.treeId,
  baseRevision: tree.revision,
  operations: [{ op: "configure", nodeId, set, unset: [] }],
})

describe("the rows this site is", () => {
  it("is every route it serves, and only those", () => {
    expect(sitePagesStored().map((page) => page.route.path)).toEqual(
      SITE_ROUTES.map((route) => route.path)
    )
  })

  /**
   * Three pages under one id would be two pages nobody could reach and a
   * silent overwrite at seeding — and the ids come from the builders' own id
   * factories, so this is a property of their prefixes rather than of anything
   * written down here.
   */
  it("gives each page an id of its own", () => {
    const ids = sitePagesStored().map((page) => page.treeId)

    expect([...new Set(ids)]).toHaveLength(ids.length)
  })

  it("reads the id a builder would produce", () => {
    expect(storedIdFor(HOME)).toBe(treeFor(HOME, CONTEXT).treeId)
  })

  /**
   * **What a page is stored as cannot be a function of a deployment setting**,
   * and as of 21 October that is the type rather than a comparison.
   *
   * The history is worth the lines, because this rule replaces a measurement.
   * `stored.ts` read whether the deployment counts its readers until
   * 20 October, for a reason that stopped being true on 12 October: the footer
   * carried a disclosure when counting was on, so the row had to match the
   * deployment that wrote it, and seeding never overwrites. The maintainer had
   * that message taken off the site whether it is counting or not. What stood
   * here then was *stores each page as the same tree whether the deployment
   * counts or not* — two trees, built with `counting: true` and
   * `counting: false`, compared whole. It held for all three pages, which is
   * the fact this change started from.
   *
   * **It cannot be written any more, and that is the improvement.** `counting`
   * is off the page context and off the `ChromeContext`, so there is no second
   * tree to compare: a builder cannot read a field that does not exist. What
   * is left to guard is the way it would come back, which is a builder
   * reaching past the context to the setting itself — and that is a claim
   * about imports rather than about trees.
   *
   * **Why it matters more here than anywhere else.** A page of this site is a
   * row (0259), seeding never overwrites, and nothing revisits a row once it
   * is written. A node built from a setting is therefore frozen at the moment
   * the row was written and is wrong from the first time anybody changes it —
   * and *nobody reading this page has been counted* is the worst of the
   * possible sentences to be wrong about.
   *
   * The one assertion the old rule made that this one does not is that two
   * such trees are equal. Nothing can build the second one, so there is
   * nothing to assert; `pages/handed.test.ts` holds the other end, that a
   * field on the context is read by somebody.
   */
  it("is built by nothing that can read what this deployment has switched on", () => {
    const sources = [
      ...readdirSync(fileURLToPath(new URL("./pages", import.meta.url)))
        .filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"))
        .map((name) => [`pages/${name}`, read(`./pages/${name}`)] as const),
      ["chrome.ts", read("./chrome.ts")] as const,
      ["stored.ts", read("./stored.ts")] as const,
    ]

    const reaching = sources
      .filter(([, source]) => /readersCountedHere|readerSignalUrl|INTAKE_KEY|process\.env/.test(source))
      .map(([name]) => name)

    expect(reaching).toEqual([])
  })

  /**
   * And the sweep is looking at the files it means to, which is the clause the
   * 29 September entry in `FINDINGS.md` says to write: a sweep over a list
   * that came back empty passes, and the list here is a directory read.
   */
  it("swept every builder this site has", () => {
    const swept = readdirSync(fileURLToPath(new URL("./pages", import.meta.url))).filter(
      (name) => name.endsWith(".ts") && !name.endsWith(".test.ts")
    )

    expect(swept).toContain("home.ts")
    expect(swept).toContain("why-use-it.ts")
    expect(swept).toContain("what-you-run.ts")
    expect(swept.length).toBeGreaterThanOrEqual(SITE_ROUTES.length)
  })
})

describe("seeding", () => {
  it.each(SITE_ROUTES.map((route) => [route.path, route] as const))(
    "puts %s in the store at revision 0",
    async (_path, route) => {
      await seedSitePages()

      const id = storedIdFor(route)
      const head = id === undefined ? undefined : await appStore.head(id)

      expect(head?.ok === true ? head.value.revision : "absent").toBe(0)
    }
  )

  /**
   * The one rule of this module, and the only one whose failure destroys
   * something: a page in the store has been through whatever happened to it,
   * and a deploy that re-seeded over the top would throw that away on every
   * release without anybody pressing anything.
   */
  it("never writes over a page that is already there", async () => {
    await seedSitePages()

    const id = storedIdFor(WHAT_YOU_RUN)
    if (id === undefined) throw new Error("loom: /what-you-run is not stored")

    const before = await appStore.head(id)
    if (!before.ok) throw new Error("loom: seeding did not store /what-you-run")

    const appended = await appStore.append(id, {
      proposalId: "p_1" as ProposalId,
      delta: configure(before.value, headingIn(before.value).id, { level: 3 }),
      provenance: PROVENANCE,
      appliedAt: "2026-10-12T00:00:00.000Z",
    })

    expect(appended.ok).toBe(true)

    /* A second deploy running `db:push` again, which is what a release is. */
    await seedSitePages()

    const after = await appStore.head(id)

    expect(after.ok === true ? after.value.revision : "absent").toBe(1)
  })
})

/**
 * What one request costs, counted rather than reasoned about.
 *
 * Until 13 October a marketing request made **four** store calls: three seeding
 * reads that each answered *already there*, and then the one the page is for.
 * The pool is `max: 1`, so those are four round trips in a row, and on a cold
 * instance they sit behind a TLS connection being opened as well.
 *
 * That is what put `the store did not answer within 1500ms` on `/portal` with
 * a database whose slowest statement is 31ms. A budget cannot fix a queue; the
 * only thing that does is not joining it.
 *
 * So the number is the test. Nothing here asserts *how fast* — that depends on
 * a network this suite does not have — only that a request asks the store for
 * the page it is serving and for nothing else.
 */
describe("what one request costs", () => {
  it("reaches the database once, and writes nothing", async () => {
    /**
     * Counted on the **unbounded** handle, which is the one that actually talks
     * to Postgres — `siteStore` is a wrapper over it, so one page read is one
     * call here. Four would be the old shape: three seeding reads and then the
     * page.
     */
    const reads = vi.spyOn(appStoreForWriting, "head")
    const writes = vi.spyOn(appStoreForWriting, "create")

    try {
      await storedPageFor(HOME)

      expect({ reads: reads.mock.calls.length, writes: writes.mock.calls.length }).toEqual({
        reads: 1,
        writes: 0,
      })
    } finally {
      reads.mockRestore()
      writes.mockRestore()
    }
  })
})

describe("what the route serves", () => {
  it("is the stored page, not a fresh build", async () => {
    const served = await pageTreeFor(HOME, CONTEXT)
    const stored = await storedPageFor(HOME)

    expect(served.treeId).toBe(stored?.treeId)
  })

  /**
   * **The whole of the change, in one assertion.**
   *
   * An append is how every change to a page arrives — a portal edit, a
   * proposal somebody accepted, an adaptation the Gate let through. If this
   * passes, all three reach the page a stranger is served; if it fails, the
   * portal is a window onto rows nobody reads.
   */
  it("is a change somebody made in the store", async () => {
    const before = await storedPageFor(WHY_USE_IT)
    if (before === undefined) throw new Error("loom: /why-use-it is not stored")

    const heading = headingIn(before)

    expect(heading.props["level"]).not.toBe(5)

    const appended = await appStore.append(before.treeId, {
      proposalId: "p_1" as ProposalId,
      delta: configure(before, heading.id, { level: 5 }),
      provenance: PROVENANCE,
      appliedAt: "2026-10-12T00:00:00.000Z",
    })

    if (!appended.ok) throw new Error("loom: the store refused the change")

    const served = await pageTreeFor(WHY_USE_IT, CONTEXT)

    expect({
      revision: served.revision,
      level: headingIn(served).props["level"],
    }).toEqual({ revision: 1, level: 5 })
  })

  /**
   * And the fallback, which is the other half of being honest about a store:
   * an unreachable one serves the authored page rather than an error, because
   * a site that will not load because a database is down is a worse product
   * than one serving what it was written as. The portal is where somebody
   * finds out, and the portal does not render if its store is gone.
   *
   * The read is made to fail rather than the store emptied, because *emptied*
   * is not the failure being claimed — and an earlier version of this test
   * asserted against a store that was still seeded by every test above it,
   * so it passed whether the fallback existed or not.
   */
  it("is the authored page when the store cannot be read", async () => {
    /**
     * On `siteStore`, which is the handle this surface reads through as of
     * 13 October — `appStore` carries the portal's longer budget and is not
     * what `storedPageFor` calls. A spy on it would never fire, and the
     * assertion below would be made against a store that answered normally.
     */
    const refuse = vi
      .spyOn(siteStore, "head")
      .mockResolvedValue(err({ code: "unavailable", detail: "the database is down" }))

    try {
      const served = await pageTreeFor(WHAT_YOU_RUN, CONTEXT)

      expect({ revision: served.revision, read: refuse.mock.calls.length > 0 }).toEqual({
        revision: 0,
        read: true,
      })
    } finally {
      refuse.mockRestore()
    }
  })
})
