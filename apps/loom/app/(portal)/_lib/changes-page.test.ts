import { describe, expect, it } from "vitest"

import { proposalIdSchema, type ProposalId } from "@jam-overture/loom"

import { CHANGES_PAGE_SIZE, changesPage, newerHref, olderHref } from "./changes-page"

describe("changesPage", () => {
  const many: readonly { readonly proposalId: ProposalId }[] = Array.from(
    { length: CHANGES_PAGE_SIZE + 3 },
    (_, index) => ({
      proposalId: proposalIdSchema.parse(
        `p_${String(CHANGES_PAGE_SIZE + 2 - index).padStart(3, "0")}`
      ),
    })
  )

  it("shows the newest fifty, and carries on from the last of them", () => {
    const newest = changesPage(many, undefined)

    expect(newest.rows).toHaveLength(CHANGES_PAGE_SIZE)
    expect(newest.rows[0]?.proposalId).toBe("p_052")
    expect(newest.older).toBe(newest.rows.at(-1)?.proposalId)

    const older = changesPage(many, newest.older)

    expect(older.rows.map((change) => change.proposalId)).toEqual(["p_002", "p_001", "p_000"])
    expect(older.older).toBeUndefined()
  })

  it("says where each page sits in the list", () => {
    const newest = changesPage(many, undefined)

    expect(newest).toMatchObject({ first: 1, last: CHANGES_PAGE_SIZE })
    expect(changesPage(many, newest.older)).toMatchObject({
      first: CHANGES_PAGE_SIZE + 1,
      last: CHANGES_PAGE_SIZE + 3,
    })
  })

  it("has no newer page on the newest, and leads back to the newest from the second", () => {
    const newest = changesPage(many, undefined)

    expect(newest.newer).toBeUndefined()
    expect(changesPage(many, newest.older).newer).toEqual({ before: undefined })
  })

  it("leads back a whole page from a later one", () => {
    const longer = Array.from({ length: CHANGES_PAGE_SIZE * 3 }, (_, index) => ({
      proposalId: proposalIdSchema.parse(`p_${String(index).padStart(3, "0")}`),
    }))
    const second = changesPage(longer, changesPage(longer, undefined).older)
    const third = changesPage(longer, second.older)

    expect(third.newer).toEqual({ before: changesPage(longer, undefined).older })
    expect(changesPage(longer, third.newer?.before).rows).toEqual(second.rows)
  })

  it("starts from the newest for a change it does not hold", () => {
    expect(changesPage(many, "p_unknown").rows[0]?.proposalId).toBe("p_052")
  })

  it("has no older page for a list that fits on one", () => {
    expect(changesPage(many.slice(0, 3), undefined)).toEqual({
      rows: many.slice(0, 3),
      first: 1,
      last: 3,
      newer: undefined,
      older: undefined,
    })
  })
})

describe("newerHref and olderHref", () => {
  const here = "/portal/prj_1/review/accepted"
  const change = proposalIdSchema.parse("p_007")

  it("leads to the newest without a cursor, and to a later page with one", () => {
    expect(newerHref(here, { before: undefined })).toBe(here)
    expect(newerHref(here, { before: change })).toBe(`${here}?before=p_007`)
    expect(olderHref(here, change)).toBe(`${here}?before=p_007`)
  })

  it("leads nowhere past either end", () => {
    expect(newerHref(here, undefined)).toBeUndefined()
    expect(olderHref(here, undefined)).toBeUndefined()
  })
})
