import { describe, expect, it } from "vitest"

import { MAX_WAIT_MS } from "../specimen/capture.js"
import { DEFAULT_VIEWPORTS, PHONE, WIDE } from "../specimen/specimen.js"

import { planShots, shotListSchema, VIEWPORTS } from "./plan.js"

const listOf = (source: unknown) => {
  const parsed = shotListSchema.safeParse(source)
  if (!parsed.success) throw new Error(parsed.error.issues.map((issue) => issue.message).join("; "))

  return parsed.data
}

describe("planning a shot list", () => {
  it("resolves a path against the base URL", () => {
    const planned = planShots(
      listOf({
        baseUrl: "http://localhost:3000",
        outDir: "reports",
        shots: [{ path: "/the-record", out: "record" }],
      })
    )

    expect(planned[0]?.url).toBe("http://localhost:3000/the-record")
    expect(planned[0]?.file).toBe("record.png")
  })

  it("does not double a slash between the base and the path", () => {
    const planned = planShots(
      listOf({ baseUrl: "http://localhost:3000/", shots: [{ path: "/x", out: "x" }] })
    )

    expect(planned[0]?.url).toBe("http://localhost:3000/x")
  })

  it("leaves an absolute address alone, so one list can mix two origins", () => {
    const planned = planShots(
      listOf({
        baseUrl: "http://localhost:3000",
        shots: [{ path: "http://localhost:8123/specimen.html", out: "specimen" }],
      })
    )

    expect(planned[0]?.url).toBe("http://localhost:8123/specimen.html")
  })

  it("keeps an extension the shot already has rather than adding a second", () => {
    const planned = planShots(listOf({ shots: [{ path: "/x", out: "already.png" }] }))

    expect(planned[0]?.file).toBe("already.png")
  })

  /**
   * The file is relative to the list's `outDir` and the capture loop joins it
   * on, because that loop is shared with `pnpm specimen` and does the same
   * thing for both. Resolving it here as well put the picture two directories
   * deep in a path that read correctly at each end.
   */
  it("leaves the out directory to the capture loop rather than joining it twice", () => {
    const planned = planShots(listOf({ outDir: "reports/wide", shots: [{ path: "/x", out: "x" }] }))

    expect(planned[0]?.file).toBe("x.png")
  })

  it("names a shot after the file it will write, which is what a report quotes", () => {
    const planned = planShots(listOf({ shots: [{ path: "/x", out: "the-record.png" }] }))

    expect(planned[0]?.name).toBe("the-record")
  })

  it("resolves a named viewport to the size every lane's reports already use", () => {
    const planned = planShots(
      listOf({
        shots: [
          { path: "/x", out: "phone", viewport: "phone" },
          { path: "/x", out: "wide", viewport: "wide" },
        ],
      })
    )

    expect(planned[0]?.viewport).toEqual(PHONE)
    expect(planned[1]?.viewport).toEqual(WIDE)
  })

  /**
   * The defect this file used to carry: `wide` was 1440 here and 1280 in the
   * specimen harness, so two lanes' "wide" screenshots of the same page were
   * different pictures and neither said so.
   */
  it("takes its viewports from the harness rather than declaring its own", () => {
    expect([VIEWPORTS.phone, VIEWPORTS.wide]).toEqual(DEFAULT_VIEWPORTS)
  })

  it("takes an explicit size for the shot a name does not cover", () => {
    const planned = planShots(
      listOf({ shots: [{ path: "/x", out: "x", viewport: { width: 768, height: 1024 } }] })
    )

    expect(planned[0]?.viewport).toEqual({
      width: 768,
      height: 1024,
      label: "custom",
      deviceScaleFactor: 2,
    })
  })

  it("defaults to the wide viewport and a viewport-sized shot", () => {
    const planned = planShots(listOf({ shots: [{ path: "/x", out: "x" }] }))

    expect(planned[0]?.viewport).toEqual(WIDE)
    expect(planned[0]?.fullPage).toBe(false)
  })

  it("carries a wait condition through, and omits it when there is none", () => {
    const planned = planShots(
      listOf({
        shots: [
          { path: "/portal", out: "a", waitFor: "h1" },
          { path: "/portal", out: "b" },
        ],
      })
    )

    expect(planned[0]?.waitFor).toBe("h1")
    expect(planned[1] && "waitFor" in planned[1]).toBe(false)
  })

  /**
   * A shot list is input — written by a run minutes earlier — so the failure
   * worth preventing is the misspelled key that photographs the wrong thing
   * without saying anything.
   */
  it("refuses a list with no shots in it", () => {
    expect(shotListSchema.safeParse({ shots: [] }).success).toBe(false)
  })

  it("refuses a viewport name it does not have", () => {
    expect(
      shotListSchema.safeParse({ shots: [{ path: "/x", out: "x", viewport: "tablet" }] }).success
    ).toBe(false)
  })

  it("refuses a shot with nowhere to write itself", () => {
    expect(shotListSchema.safeParse({ shots: [{ path: "/x" }] }).success).toBe(false)
  })

  it("refuses a base that is not a URL", () => {
    expect(
      shotListSchema.safeParse({ baseUrl: "localhost:3000", shots: [{ path: "/x", out: "x" }] })
        .success
    ).toBe(false)
  })
})

describe("reaching the state worth photographing", () => {
  it("carries the steps through to the shot, in the order they were written", () => {
    const planned = planShots(
      listOf({
        shots: [
          {
            path: "http://localhost:3000/what-your-readers-do",
            out: "signals",
            do: [{ click: "[data-cta]" }, { wait: 400 }],
          },
        ],
      })
    )

    expect(planned[0]?.do).toEqual([{ click: "[data-cta]" }, { wait: 400 }])
  })

  it("gives a shot that asks for nothing an empty step list rather than undefined", () => {
    const planned = planShots(listOf({ shots: [{ path: "/x", out: "x" }] }))

    expect(planned[0]?.do).toEqual([])
  })

  it("carries a clip through, and omits the key entirely when there is none", () => {
    const planned = planShots(
      listOf({
        shots: [
          { path: "/x", out: "x", clip: "[data-figure]" },
          { path: "/y", out: "y" },
        ],
      })
    )

    expect(planned[0]?.clip).toBe("[data-figure]")
    expect(planned[1] && "clip" in planned[1]).toBe(false)
  })

  /**
   * The misspelling is the whole reason this is a schema: a permissive object
   * would parse `clik` as an empty step, run it, do nothing, and photograph the
   * page the load produced without a word.
   */
  it("refuses a misspelled step rather than running an empty one", () => {
    expect(
      shotListSchema.safeParse({
        shots: [{ path: "/x", out: "x", do: [{ clik: "[data-cta]" }] }],
      }).success
    ).toBe(false)
  })

  it("refuses a step that is both a click and a wait", () => {
    expect(
      shotListSchema.safeParse({
        shots: [{ path: "/x", out: "x", do: [{ click: "[data-cta]", wait: 10 }] }],
      }).success
    ).toBe(false)
  })

  /** No way to wait forever, for 0140's reason applied to an instrument. */
  it("refuses a wait longer than the ceiling, and a wait that is not a positive integer", () => {
    const wait = (ms: unknown) =>
      shotListSchema.safeParse({ shots: [{ path: "/x", out: "x", do: [{ wait: ms }] }] }).success

    expect(wait(MAX_WAIT_MS)).toBe(true)
    expect(wait(MAX_WAIT_MS + 1)).toBe(false)
    expect(wait(0)).toBe(false)
    expect(wait(1.5)).toBe(false)
  })

  /**
   * Refused rather than resolved by precedence: the two mean opposite things,
   * so picking a winner hands a lane the picture it did not ask for silently.
   */
  it("refuses a shot that asks for all of the page and one element of it", () => {
    const parsed = shotListSchema.safeParse({
      shots: [{ path: "/x", out: "x", clip: "[data-figure]", fullPage: true }],
    })

    expect(parsed.success).toBe(false)
    expect(!parsed.success && parsed.error.issues[0]?.message).toContain("cannot set both")
  })
})
