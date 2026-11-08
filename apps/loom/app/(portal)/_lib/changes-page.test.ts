import { describe, expect, it } from "vitest"

import { proposalIdSchema, type ProposalId } from "@jam-overture/loom"

import { CHANGES_PAGE_SIZE, changesPage } from "./changes-page"

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

  it("starts from the newest for a change it does not hold", () => {
    expect(changesPage(many, "p_unknown").rows[0]?.proposalId).toBe("p_052")
  })

  it("has no older page for a list that fits on one", () => {
    expect(changesPage(many.slice(0, 3), undefined)).toEqual({
      rows: many.slice(0, 3),
      older: undefined,
    })
  })
})
