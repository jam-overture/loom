import { describe, expect, it } from "vitest"

import { sequentialIdFactory } from "@jam-overture/loom"

import { segmentFormsOn } from "./segment-form"
import {
  LEVEL,
  PAGE,
  PHONE,
  REMOVE_HEADING,
  SEARCH,
  TONE,
  WITHOUT_HEADING,
  segmentChange,
} from "./segment-fixtures"

const ids = () => sequentialIdFactory("form").deltaId

describe("each segment's form of a page", () => {
  it("is nothing where nothing was accepted for a segment", () => {
    expect(segmentFormsOn(PAGE, [], ids())).toEqual({ forms: [], dropped: [] })
  })

  it("is one delta per segment on the live page, its changes oldest first, segments in the order first accepted", () => {
    const built = segmentFormsOn(
      PAGE,
      [
        segmentChange(1, { audienceId: SEARCH, operations: [TONE] }),
        segmentChange(2),
        segmentChange(3, { audienceId: SEARCH, operations: [LEVEL] }),
      ],
      ids()
    )

    expect(built.dropped).toEqual([])
    expect(built.forms.map((form) => form.audienceId)).toEqual([SEARCH, PHONE])
    expect(built.forms[0]?.delta).toMatchObject({
      treeId: PAGE.treeId,
      baseRevision: PAGE.revision,
      operations: [TONE, LEVEL],
    })
    expect(built.forms[1]?.delta.operations).toEqual([LEVEL])
  })

  it("mints a fresh id for each form", () => {
    const built = segmentFormsOn(
      PAGE,
      [segmentChange(1), segmentChange(2, { audienceId: SEARCH })],
      ids()
    )

    expect(new Set(built.forms.map((form) => form.delta.deltaId)).size).toBe(2)
  })

  it("drops a change that no longer applies on top of the ones before it, and goes on without it", () => {
    const built = segmentFormsOn(
      PAGE,
      [
        segmentChange(1, { operations: [REMOVE_HEADING] }),
        segmentChange(2, { operations: [LEVEL] }),
        segmentChange(3, { audienceId: SEARCH, operations: [TONE] }),
      ],
      ids()
    )

    expect(built.dropped).toEqual([segmentChange(2).proposalId])
    expect(built.forms.map((form) => form.delta.operations)).toEqual([[REMOVE_HEADING], [TONE]])
  })

  it("leaves a segment none of whose changes fit the page with no form", () => {
    const built = segmentFormsOn(
      WITHOUT_HEADING,
      [segmentChange(1), segmentChange(2, { audienceId: SEARCH, operations: [TONE] })],
      ids()
    )

    expect(built.forms).toEqual([])
    expect(built.dropped).toEqual([segmentChange(1).proposalId, segmentChange(2).proposalId])
  })
})
