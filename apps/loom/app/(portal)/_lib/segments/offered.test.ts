import { describe, expect, it } from "vitest"

import { err, ok, treeIdSchema } from "@jam-overture/loom"
import type { AudienceRule } from "@jam-overture/loom/store"
import type { ArrivalCounterHandle } from "@jam-overture/loom/signals"

import { offeredOf, readOfferedSegments } from "./offered"
import { PAGE, PHONE, SEARCH } from "./segment-fixtures"

const rule = (audienceId: AudienceRule["audienceId"]): AudienceRule => ({
  audienceId,
  clauses: [{ key: "device", anyOf: ["phone"] }],
})

const RULES = [rule(SEARCH), rule(PHONE), rule(SEARCH)]

const rulesReading = (rules: readonly AudienceRule[] | undefined) => ({
  rules: () =>
    Promise.resolve(
      ok(
        rules === undefined
          ? undefined
          : {
              treeId: PAGE.treeId,
              revision: 1,
              rules,
              actor: "ada",
              recordedAt: "2026-11-13T00:00:00.000Z",
            }
      )
    ),
})

/** Counters where the named segments have page views on `PAGE` and nothing else does. */
const counted = (...audiences: readonly string[]): ArrivalCounterHandle => ({
  arrivals: (request) =>
    Promise.resolve(
      ok(
        request?.treeId === PAGE.treeId && audiences.includes(request.audience ?? "")
          ? { hours: [], begins: 1 }
          : { hours: [] }
      )
    ),
})

describe("the segments a change can be accepted for alone", () => {
  it("are those the rules name, once each and in the rules' order, that have page views counted", () => {
    expect(offeredOf(RULES, new Set([PHONE, SEARCH]))).toEqual([SEARCH, PHONE])
    expect(offeredOf(RULES, new Set([PHONE]))).toEqual([PHONE])
    expect(offeredOf(RULES, new Set())).toEqual([])
  })

  it("are read from the page's rules and its own counters, never another page's", async () => {
    expect(
      await readOfferedSegments(
        { rules: rulesReading(RULES), tallies: counted(PHONE) },
        PAGE.treeId
      )
    ).toEqual([PHONE])
    expect(
      await readOfferedSegments(
        { rules: rulesReading(RULES), tallies: counted(PHONE) },
        treeIdSchema.parse("t_elsewhere")
      )
    ).toEqual([])
  })

  it("are none for a page with no rules, rules that could not be read, or counters that did not answer", async () => {
    expect(
      await readOfferedSegments(
        { rules: rulesReading(undefined), tallies: counted(PHONE) },
        PAGE.treeId
      )
    ).toEqual([])
    expect(
      await readOfferedSegments(
        {
          rules: { rules: () => Promise.resolve(err({ code: "unavailable", detail: "down" })) },
          tallies: counted(PHONE),
        },
        PAGE.treeId
      )
    ).toEqual([])
    expect(
      await readOfferedSegments(
        {
          rules: rulesReading(RULES),
          tallies: {
            arrivals: () => Promise.resolve(err({ code: "unavailable", detail: "down" })),
          },
        },
        PAGE.treeId
      )
    ).toEqual([])
  })
})
