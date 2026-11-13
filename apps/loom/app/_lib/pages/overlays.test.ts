import { describe, expect, it } from "vitest"

import {
  deltaIdSchema,
  err,
  nodeIdSchema,
  treeIdSchema,
  type TreeDelta,
  type TreeId,
} from "@jam-overture/loom"
import {
  audienceIdSchema,
  memoryAudienceOverlayStore,
  type AudienceOverlayReader,
  type AudienceRule,
} from "@jam-overture/loom/store"

import { readPageOverlays } from "./overlays"

const HOME = treeIdSchema.parse("t_home")
const PRICING = treeIdSchema.parse("t_pricing")
const AT = "2026-11-13T00:00:00.000Z"

const PHONE: AudienceRule = {
  audienceId: audienceIdSchema.parse("aud_phone"),
  clauses: [{ key: "device", anyOf: ["phone"] }],
}

const deltaFor = (treeId: TreeId): TreeDelta => ({
  deltaId: deltaIdSchema.parse("d_one"),
  treeId,
  baseRevision: 0,
  operations: [{ op: "remove", nodeId: nodeIdSchema.parse("n_gone") }],
})

const stocked = async () => {
  const store = memoryAudienceOverlayStore()

  await store.recordRules(HOME, { rules: [PHONE], actor: "someone", recordedAt: AT })
  await store.setForm(HOME, {
    audienceId: PHONE.audienceId,
    delta: deltaFor(HOME),
    actor: "someone",
    authoredAt: AT,
  })

  return store
}

describe("readPageOverlays", () => {
  it("answers each page's rules and forms from one read of the store", async () => {
    const read = await readPageOverlays(await stocked(), [HOME, PRICING])
    if (!read.ok) throw new Error(read.error.detail)

    expect(read.value).toEqual([
      { treeId: HOME, rules: [PHONE], forms: [{ audienceId: PHONE.audienceId, delta: deltaFor(HOME) }] },
      { treeId: PRICING, rules: [], forms: [] },
    ])
  })

  it("answers the pages in the order it was asked for them", async () => {
    const read = await readPageOverlays(await stocked(), [PRICING, HOME])

    expect(read.ok && read.value.map(({ treeId }) => treeId)).toEqual([PRICING, HOME])
  })

  it("answers nothing at all for a page id that is not one", async () => {
    const read = await readPageOverlays(await stocked(), ["not an id" as TreeId])

    expect(read.ok).toBe(false)
    expect(!read.ok && read.error.detail).toContain("not an id")
  })

  /**
   * A reading missing one page's overlay would have the site hold the answer
   * as current and serve that page's segments the base, with their signals
   * still naming them (0371 clause 4).
   */
  it("fails whole when one page of several cannot be read", async () => {
    const store = await stocked()
    const refusing: AudienceOverlayReader = {
      ...store,
      overlay: (treeId) =>
        treeId === PRICING
          ? Promise.resolve(err({ code: "unavailable", detail: "the store did not answer" }))
          : store.overlay(treeId),
    }

    const read = await readPageOverlays(refusing, [HOME, PRICING])

    expect(read.ok).toBe(false)
    expect(!read.ok && read.error.detail).toContain("did not answer")
  })

  it("answers an empty list for no pages, which is a site that has published none", async () => {
    const read = await readPageOverlays(await stocked(), [])

    expect(read.ok && read.value).toEqual([])
  })
})
