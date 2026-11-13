import { describe, expect, it } from "vitest"

import { err, ok, treeIdSchema } from "@jam-overture/loom"
import { audienceIdSchema } from "@jam-overture/loom/store"
import type { ArrivalReadRequest, StoredArrivals } from "@jam-overture/loom/signals"

import { readSegmentViews, segmentViewsOf, segmentViewsWords } from "./segment-views"

const PHONE = audienceIdSchema.parse("aud_phone")
const SEARCH = audienceIdSchema.parse("aud_search")
const HOUR = 3_600_000
const RANGE = { from: 100 * HOUR, to: 268 * HOUR }

const hour = (at: number, views: number) => ({
  treeId: treeIdSchema.parse("t_home"),
  revision: 1,
  hour: at,
  views,
  audienceId: PHONE,
  updatedAt: "2026-11-11T20:00:00.000Z",
})

describe("a segment's page views", () => {
  it("is None yet, not a nought, while nothing was ever counted under it", () => {
    expect(segmentViewsOf({ hours: [] })).toEqual({ kind: "none-yet" })
    expect(segmentViewsWords({ kind: "none-yet" })).toBe("None yet")
  })

  it("adds the hours in the range once the segment has been counted", () => {
    const stored: StoredArrivals = {
      hours: [hour(120 * HOUR, 1200), hour(121 * HOUR, 34)],
      begins: 90 * HOUR,
    }

    expect(segmentViewsOf(stored)).toEqual({ kind: "counted", views: 1234, begins: 90 * HOUR })
    expect(segmentViewsWords(segmentViewsOf(stored))).toBe("1,234 page views")
    expect(segmentViewsWords({ kind: "counted", views: 1, begins: 0 })).toBe("1 page view")
    expect(segmentViewsWords({ kind: "counted", views: 0, begins: 0 })).toBe("0 page views")
  })

  it("reads each segment under its own audience, and one that fails costs only its own figure", async () => {
    const asked: ArrivalReadRequest[] = []
    const views = await readSegmentViews(
      {
        arrivals: async (request = {}) => {
          asked.push(request)

          return request.audience === PHONE
            ? ok({ hours: [hour(120 * HOUR, 5)], begins: 110 * HOUR })
            : err({ code: "unavailable", detail: "down" })
        },
      },
      [PHONE, SEARCH],
      RANGE
    )

    expect(asked).toEqual([
      { audience: PHONE, ...RANGE },
      { audience: SEARCH, ...RANGE },
    ])
    expect(views.get(PHONE)).toEqual({ kind: "counted", views: 5, begins: 110 * HOUR })
    expect(segmentViewsWords(views.get(SEARCH))).toBe("Could not be read just now")
  })
})
