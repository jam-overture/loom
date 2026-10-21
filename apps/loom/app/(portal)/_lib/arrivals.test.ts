import { describe, expect, it } from "vitest"

import type { ReceivedBatch, StoredPageViews } from "@jam-overture/loom/signals"

import { arrivalsOf } from "./arrivals"

const row = (
  treeId: string,
  revision: number,
  opened: number,
  updatedAt: string,
  audienceId = "aud_everyone"
): StoredPageViews =>
  ({ treeId, revision, opened, appearances: opened, audienceId, updatedAt }) as StoredPageViews

const batch = (seq: number, treeId: string, receivedAt: string, signals = 2): ReceivedBatch =>
  ({
    seq,
    treeId,
    revision: 1,
    receivedAt,
    sentAt: 0,
    view: "0123456789abcdef0123456789abcdef",
    audienceId: "aud_everyone",
    signals: Array.from({ length: signals }, () => ({})),
  }) as unknown as ReceivedBatch

describe("what has arrived for a project", () => {
  it("is nothing at all for a project nothing has reached", () => {
    expect(arrivalsOf([], [])).toEqual({ opened: 0, pages: [], recent: [], latest: undefined })
  })

  /** `opened` is the one figure that adds across versions and months (0219). */
  it("adds every page view counted, across pages and versions", () => {
    const arrivals = arrivalsOf(
      [row("t_a", 1, 3, "2026-10-20T10:00:00.000Z"), row("t_b", 2, 4, "2026-10-20T11:00:00.000Z")],
      []
    )

    expect(arrivals.opened).toBe(7)
  })

  /** Whether readers arrived is a question about the page, so its audiences are one row here. */
  it("puts a page's audiences together into one row", () => {
    const arrivals = arrivalsOf(
      [
        row("t_a", 1, 3, "2026-10-20T10:00:00.000Z", "aud_everyone"),
        row("t_a", 1, 2, "2026-10-20T12:00:00.000Z", "aud_trial"),
      ],
      []
    )

    expect(arrivals.pages).toEqual([
      { treeId: "t_a", revision: 1, opened: 5, lastMoved: "2026-10-20T12:00:00.000Z" },
    ])
  })

  it("keeps two versions of one page apart", () => {
    const arrivals = arrivalsOf(
      [row("t_a", 1, 3, "2026-10-20T10:00:00.000Z"), row("t_a", 2, 1, "2026-10-20T11:00:00.000Z")],
      []
    )

    expect(arrivals.pages.map((page) => page.revision)).toEqual([1, 2])
  })

  it("lists the busiest page first, and the most recent of two equally busy", () => {
    const arrivals = arrivalsOf(
      [
        row("t_quiet", 1, 1, "2026-10-20T12:00:00.000Z"),
        row("t_old", 1, 5, "2026-10-20T09:00:00.000Z"),
        row("t_new", 1, 5, "2026-10-20T10:00:00.000Z"),
      ],
      []
    )

    expect(arrivals.pages.map((page) => page.treeId)).toEqual(["t_new", "t_old", "t_quiet"])
  })

  /** The batch somebody just sent is the one they are looking for. */
  it("lists the newest arrival first, whatever order the buffer returned", () => {
    const arrivals = arrivalsOf(
      [],
      [batch(1, "t_a", "2026-10-20T10:00:00.000Z"), batch(2, "t_b", "2026-10-20T10:01:00.000Z")]
    )

    expect(arrivals.recent.map((arrival) => arrival.treeId)).toEqual(["t_b", "t_a"])
    expect(arrivals.recent[0]?.signals).toBe(2)
  })

  /** The buffer stamps the instant it received a batch, which is exact. */
  it("says when the last one arrived while the buffer holds it", () => {
    const arrivals = arrivalsOf(
      [row("t_a", 1, 3, "2026-10-20T12:00:00.000Z")],
      [batch(7, "t_a", "2026-10-20T11:59:00.000Z")]
    )

    expect(arrivals.latest).toEqual({ kind: "arrived", at: "2026-10-20T11:59:00.000Z" })
  })

  /**
   * A row moves on arrival and again when collection counts it, so once the
   * buffer is empty it can only say when something was last counted.
   */
  it("says only when something was last counted once the buffer is empty", () => {
    const arrivals = arrivalsOf(
      [row("t_a", 1, 3, "2026-10-20T10:00:00.000Z"), row("t_b", 1, 1, "2026-10-20T12:00:00.000Z")],
      []
    )

    expect(arrivals.latest).toEqual({ kind: "counted", at: "2026-10-20T12:00:00.000Z" })
  })
})
