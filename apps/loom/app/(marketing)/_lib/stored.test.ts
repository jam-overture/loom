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
import { beforeEach, describe, expect, it, vi } from "vitest"

import { appStore } from "@/app/_lib/app/store"

import { treeFor } from "./builders"
import { pageTreeFor } from "./render"
import { HOME, HOW_IT_WORKS, SITE_ROUTES, WHAT_YOU_RUN } from "./site"
import { ensureSiteSeeded, sitePagesStored, storedIdFor, storedPageFor } from "./stored"

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
 * The memo that makes seeding happen once per process, reset per test.
 *
 * `ensureSiteSeeded` deliberately holds its promise on `globalThis` so that a
 * server handling its second request does not re-walk three pages. A test that
 * wants to know what a *fresh* process does has to put that back, and reaching
 * for the symbol is the honest way to say so — the alternative is an exported
 * `resetForTests`, which is production API existing for the tests.
 */
const asIfFirstRequest = (): void => {
  delete (globalThis as Record<symbol, unknown>)[Symbol.for("loom.site.seeding")]
}

const headingIn = (tree: LoomTree): ElementNode => {
  const heading = [...walkTree(tree.root)].find(
    (node): node is ElementNode => node.kind === "element" && node.type === "loom.heading"
  )

  if (heading === undefined) throw new Error("loom: the page has no heading")

  return heading
}

const configure = (tree: LoomTree, nodeId: NodeId, set: JsonObject): TreeDelta => ({
  deltaId: `d_${tree.revision + 1}` as DeltaId,
  treeId: tree.treeId,
  baseRevision: tree.revision,
  operations: [{ op: "configure", nodeId, set, unset: [] }],
})

beforeEach(asIfFirstRequest)

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
    expect(storedIdFor(HOME)).toBe(treeFor(HOME, { ...CONTEXT, counting: false }).treeId)
  })
})

describe("seeding", () => {
  it.each(SITE_ROUTES.map((route) => [route.path, route] as const))(
    "puts %s in the store at revision 0",
    async (_path, route) => {
      await ensureSiteSeeded()

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
    await ensureSiteSeeded()

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

    /* A second process starting up, which is what a deploy is. */
    asIfFirstRequest()
    await ensureSiteSeeded()

    const after = await appStore.head(id)

    expect(after.ok === true ? after.value.revision : "absent").toBe(1)
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
    const before = await storedPageFor(HOW_IT_WORKS)
    if (before === undefined) throw new Error("loom: /how-it-works is not stored")

    const heading = headingIn(before)

    expect(heading.props["level"]).not.toBe(5)

    const appended = await appStore.append(before.treeId, {
      proposalId: "p_1" as ProposalId,
      delta: configure(before, heading.id, { level: 5 }),
      provenance: PROVENANCE,
      appliedAt: "2026-10-12T00:00:00.000Z",
    })

    if (!appended.ok) throw new Error("loom: the store refused the change")

    const served = await pageTreeFor(HOW_IT_WORKS, CONTEXT)

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
    const refuse = vi
      .spyOn(appStore, "head")
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
