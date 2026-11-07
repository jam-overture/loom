import { readdirSync, readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import {
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

import { appStore, appStoreForWriting } from "@/app/_lib/app/store"

import { treeFor } from "./builders"
import { pageTreeFor } from "./render"
import { HOME, SITE_ROUTES, WHAT_YOU_RUN, WHY_USE_IT } from "./site"
import { seedSitePages, sitePagesStored, storedIdFor } from "./stored"

/**
 * The rows this site's pages are stored as, and what they are not.
 *
 * Seeding puts each page in the store once and never writes over it: the rows
 * are what the portal governs and what a proposal is held against (0259
 * condition 1). Since 7 November they are not what a reader is served (0363);
 * the last block below holds that.
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
 * What a reader is served, whatever the store holds (0363).
 *
 * Until 7 November the route served the stored row and fell back to the
 * builder when the store was slow. The row was seeded once and never
 * overwritten, so the two were different pages, and the front door changed
 * headline between requests with nothing merged in between. These hold the
 * fix from both ends: the route does not ask the store, and a row that has
 * moved away from the code does not reach a reader.
 */
describe("what the route serves", () => {
  it("never reads the store", () => {
    const reads = vi.spyOn(appStoreForWriting, "head")

    try {
      for (const route of SITE_ROUTES) pageTreeFor(route, CONTEXT)

      expect(reads.mock.calls.length).toBe(0)
    } finally {
      reads.mockRestore()
    }
  })

  it("is the authored page when the stored row has moved away from it", async () => {
    const id = storedIdFor(WHY_USE_IT)
    if (id === undefined) throw new Error("loom: /why-use-it is not stored")

    const stored = await appStore.head(id)
    if (!stored.ok) throw new Error("loom: seeding did not store /why-use-it")

    const appended = await appStore.append(id, {
      proposalId: "p_2" as ProposalId,
      delta: configure(stored.value, headingIn(stored.value).id, { level: 5 }),
      provenance: PROVENANCE,
      appliedAt: "2026-11-07T00:00:00.000Z",
    })

    if (!appended.ok) throw new Error("loom: the store refused the change")

    const served = pageTreeFor(WHY_USE_IT, CONTEXT)
    const authored = treeFor(WHY_USE_IT, CONTEXT)

    expect({
      revision: served.revision,
      level: headingIn(served).props["level"],
    }).toEqual({ revision: 0, level: headingIn(authored).props["level"] })
  })
})
