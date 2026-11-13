import { describe, expect, it } from "vitest"

import { proposalIdSchema, sequentialIdFactory, type LoomTree } from "@jam-overture/loom"
import {
  memoryAudienceOverlayStore,
  memoryTreeStore,
  type AudienceOverlayStore,
} from "@jam-overture/loom/store"
import { memoryHoldStore, type HeldProposal } from "@jam-overture/loom/write"

import { SEGMENT_CHANGES_PER_PAGE } from "./segment-changes"
import { memorySegmentChangeStore } from "./segment-changes-memory"
import {
  GAP,
  LEVEL,
  PAGE,
  PHONE,
  REMOVE_HEADING,
  SEARCH,
  TONE,
  WITHOUT_HEADING,
  heldOn,
  segmentChange,
} from "./segment-fixtures"
import { acceptForSegment, rebuildSegmentForms, type SegmentFormsGiven } from "./segment-forms"

const AT = Date.UTC(2026, 10, 13, 9)

/** A deployment that follows nothing: with no copy in the store, the page is live as published. */
const setup = async (...waiting: readonly HeldProposal[]) => {
  const holds = memoryHoldStore()

  for (const held of waiting) await holds.hold(held)

  return {
    live: { trees: memoryTreeStore(), copies: [], follows: false },
    changes: memorySegmentChangeStore(),
    forms: memoryAudienceOverlayStore(),
    deltaId: sequentialIdFactory("form").deltaId,
    now: () => AT,
    holds,
  } satisfies SegmentFormsGiven & { readonly holds: typeof holds }
}

const overlayOf = async (given: { readonly forms: AudienceOverlayStore }) => {
  const read = await given.forms.overlay(PAGE.treeId)

  if (!read.ok) throw new Error("the overlay reads")

  return read.value.forms
}

const accept = (
  given: Awaited<ReturnType<typeof setup>>,
  held: HeldProposal,
  audienceId = PHONE,
  published: LoomTree = PAGE
) => acceptForSegment(given, { held, published, audienceId, actor: "ada@example.com" })

describe("Accept for one segment only", () => {
  it("writes the segment's form on the page as it is live, keeps the change and takes it out of the queue", async () => {
    const held = heldOn(PAGE, [LEVEL])
    const given = await setup(held)
    const accepted = await accept(given, held)

    expect(accepted).toEqual({
      ok: true,
      value: {
        proposalId: held.proposalId,
        pageId: PAGE.treeId,
        audienceId: PHONE,
        operations: [LEVEL],
        acceptedBy: "ada@example.com",
        acceptedAt: AT,
      },
    })
    expect(await overlayOf(given)).toEqual([
      {
        audienceId: PHONE,
        delta: expect.objectContaining({
          treeId: PAGE.treeId,
          baseRevision: PAGE.revision,
          operations: [LEVEL],
        }),
      },
    ])
    expect((await given.holds.get(held.proposalId)).ok).toBe(false)
    expect(await given.forms.forms(PAGE.treeId)).toMatchObject({
      ok: true,
      value: [{ audienceId: PHONE, actor: "ada@example.com" }],
    })
  })

  it("adds a later change to the segment's form after the earlier ones, and leaves other segments alone", async () => {
    const first = heldOn(PAGE, [LEVEL], 1)
    const second = heldOn(PAGE, [TONE], 2)
    const elsewhere = heldOn(PAGE, [TONE], 3)
    const given = await setup(first, second, elsewhere)

    await accept(given, first)
    await accept(given, elsewhere, SEARCH)
    await accept(given, second)

    expect(
      (await overlayOf(given)).map((form) => [form.audienceId, form.delta.operations])
    ).toEqual([
      [PHONE, [LEVEL, TONE]],
      [SEARCH, [TONE]],
    ])
  })

  it("refuses a change that does not fit the segment's form, and leaves it waiting", async () => {
    const removing = heldOn(PAGE, [REMOVE_HEADING], 1)
    const leveling = heldOn(PAGE, [LEVEL], 2)
    const given = await setup(removing, leveling)

    await accept(given, removing)

    expect(await accept(given, leveling)).toEqual({ ok: false, error: { code: "does-not-fit" } })
    expect((await given.holds.get(leveling.proposalId)).ok).toBe(true)
    expect(await given.changes.forPage(PAGE.treeId)).toMatchObject({
      value: [{ proposalId: removing.proposalId }],
    })
  })

  it("says a change somebody already answered was answered, and keeps nothing", async () => {
    const held = heldOn(PAGE, [LEVEL])
    const given = await setup()

    expect(await accept(given, held)).toEqual({ ok: false, error: { code: "answered" } })
    expect(await given.changes.forPage(PAGE.treeId)).toEqual({ ok: true, value: [] })
    expect(await overlayOf(given)).toEqual([])
  })

  it("refuses once the page keeps as many changes for segments as one read answers", async () => {
    const held = heldOn(PAGE, [LEVEL])
    const given = await setup(held)

    for (let n = 1; n <= SEGMENT_CHANGES_PER_PAGE; n += 1) {
      await given.changes.record(
        segmentChange(n, { proposalId: proposalIdSchema.parse(`p_kept${n}`) })
      )
    }

    expect(await accept(given, held)).toEqual({ ok: false, error: { code: "full" } })
    expect((await given.holds.get(held.proposalId)).ok).toBe(true)
  })
})

describe("bringing each segment's form up to its page", () => {
  it("costs one read and writes nothing on a page nothing was accepted on for a segment", async () => {
    const given = await setup()

    expect(await rebuildSegmentForms(given, PAGE)).toEqual({ ok: true, value: undefined })
    expect(await overlayOf(given)).toEqual([])
  })

  it("leaves a form already on the live page as its author wrote it", async () => {
    const held = heldOn(PAGE, [LEVEL])
    const given = await setup(held)

    await accept(given, held)
    await rebuildSegmentForms(given, PAGE)

    expect(await given.forms.forms(PAGE.treeId)).toMatchObject({
      value: [{ actor: "ada@example.com", baseRevision: PAGE.revision }],
    })
  })

  it("writes the form again on the page's new revision once the page moves", async () => {
    const held = heldOn(PAGE, [LEVEL])
    const given = await setup(held)
    const moved: LoomTree = { ...PAGE, revision: PAGE.revision + 2 }

    await accept(given, held)
    await rebuildSegmentForms(given, moved)

    expect(await given.forms.forms(PAGE.treeId)).toMatchObject({
      value: [{ actor: "Loom", baseRevision: moved.revision }],
    })
    expect((await overlayOf(given))[0]?.delta.operations).toEqual([LEVEL])
  })

  it("drops a change the moved page has no room for, and says when", async () => {
    const kept = heldOn(PAGE, [GAP], 1)
    const lost = heldOn(PAGE, [LEVEL], 2)
    const given = await setup(kept, lost)

    await accept(given, kept, SEARCH)
    await accept(given, lost)
    await rebuildSegmentForms(given, WITHOUT_HEADING)

    expect(await given.changes.forPage(PAGE.treeId)).toMatchObject({
      value: [{ proposalId: kept.proposalId }, { proposalId: lost.proposalId, droppedAt: AT }],
    })
    expect(await given.forms.forms(PAGE.treeId)).toMatchObject({
      value: [
        { audienceId: PHONE, baseRevision: PAGE.revision },
        { audienceId: SEARCH, baseRevision: WITHOUT_HEADING.revision, actor: "Loom" },
      ],
    })
  })
})
