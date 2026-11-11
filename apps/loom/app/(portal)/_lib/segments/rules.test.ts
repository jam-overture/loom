import { describe, expect, it } from "vitest"

import { err } from "@jam-overture/loom"
import {
  audienceIdSchema,
  memoryAudienceOverlayStore,
  type AudienceOverlayStore,
  type AudienceRule,
} from "@jam-overture/loom/store"

import { planSave } from "./editing"
import { readPageRules, writePageRules } from "./rules"

const rule = (word: string): AudienceRule => ({
  audienceId: audienceIdSchema.parse(`aud_${word}`),
  clauses: [{ key: "device", anyOf: [word] }],
})

const PAGES = [
  { treeId: "t_home", name: "Home" },
  { treeId: "t_pricing", name: "Pricing" },
]

const AT = "2026-11-11T21:00:00.000Z"

describe("the rules, read and written through 0376's store", () => {
  it("reads every page, a page nobody wrote rules for as having none", async () => {
    const store = memoryAudienceOverlayStore()
    const read = await readPageRules(store, PAGES)

    expect(read).toEqual({
      ok: true,
      pages: [
        { treeId: "t_home", name: "Home", head: undefined },
        { treeId: "t_pricing", name: "Pricing", head: undefined },
      ],
    })
  })

  it("records a planned edit on every page, attributed, and reads it back", async () => {
    const store = memoryAudienceOverlayStore()
    const before = await readPageRules(store, PAGES)
    const planned = before.ok ? planSave(before.pages, { kind: "every" }, rule("phone")) : undefined

    expect(planned?.ok).toBe(true)

    const outcome = await writePageRules(
      store,
      planned?.ok === true ? planned.writes : [],
      "owner@example.com",
      AT
    )
    const after = await readPageRules(store, PAGES)

    expect(outcome).toEqual({ written: 2, moved: [], failed: [] })
    expect(after.ok && after.pages.map((page) => page.head)).toEqual([
      {
        treeId: "t_home",
        revision: 1,
        rules: [rule("phone")],
        actor: "owner@example.com",
        recordedAt: AT,
      },
      {
        treeId: "t_pricing",
        revision: 1,
        rules: [rule("phone")],
        actor: "owner@example.com",
        recordedAt: AT,
      },
    ])
  })

  it("reads pages by id alone, as the read door asks, keeping whatever else each page carries", async () => {
    const store = memoryAudienceOverlayStore()

    await writePageRules(
      store,
      [{ treeId: "t_pricing", expectedRevision: 0, rules: [rule("phone"), rule("tablet")] }],
      "owner@example.com",
      AT
    )

    const read = await readPageRules(store, [{ treeId: "t_home" }, { treeId: "t_pricing" }])

    expect(read.ok && read.pages.map((page) => [page.treeId, page.head?.rules])).toEqual([
      ["t_home", undefined],
      ["t_pricing", [rule("phone"), rule("tablet")]],
    ])
  })

  it("refuses, on that page alone, an edit of a list somebody changed since it was read", async () => {
    const store = memoryAudienceOverlayStore()
    const stale = await readPageRules(store, PAGES)

    await writePageRules(
      store,
      [{ treeId: "t_home", expectedRevision: 0, rules: [rule("tablet")] }],
      "someone@example.com",
      AT
    )

    const planned = stale.ok ? planSave(stale.pages, { kind: "every" }, rule("phone")) : undefined
    const outcome = await writePageRules(
      store,
      planned?.ok === true ? planned.writes : [],
      "owner@example.com",
      AT
    )

    expect(outcome).toEqual({ written: 1, moved: ["t_home"], failed: [] })
  })

  it("says the rules cannot be read when one page's cannot, rather than a list missing it", async () => {
    const store = memoryAudienceOverlayStore()
    const failing: AudienceOverlayStore = {
      ...store,
      rules: async () => err({ code: "unavailable", detail: "relation does not exist" }),
    }

    expect(await readPageRules(failing, PAGES)).toEqual({
      ok: false,
      detail: "storage is unavailable: relation does not exist",
    })
    expect(await readPageRules(store, [{ treeId: "not a page", name: "?" }])).toEqual({
      ok: false,
      detail: "not a page is not a page id",
    })
  })

  it("counts a write the store refused for any other reason as failed", async () => {
    const store = memoryAudienceOverlayStore()
    const failing: AudienceOverlayStore = {
      ...store,
      recordRules: async () => err({ code: "unavailable", detail: "down" }),
    }

    expect(
      await writePageRules(
        failing,
        [{ treeId: "t_home", expectedRevision: 0, rules: [] }],
        "owner@example.com",
        AT
      )
    ).toEqual({ written: 0, moved: [], failed: ["t_home"] })
  })
})
