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

  it("carries what to type through with the field it goes in", () => {
    const planned = planShots(
      listOf({
        shots: [
          {
            path: "/docs",
            out: "search",
            do: [{ click: "[data-search]" }, { fill: "input[type=search]", text: "planReverts" }],
          },
        ],
      })
    )

    expect(planned[0]?.do).toEqual([
      { click: "[data-search]" },
      { fill: "input[type=search]", text: "planReverts" },
    ])
  })

  /** A cleared field is a state a screen is in, so an empty string is a value. */
  it("takes an empty string to type, and refuses a fill with nothing to type into", () => {
    const fill = (step: unknown) =>
      shotListSchema.safeParse({ shots: [{ path: "/x", out: "x", do: [step] }] }).success

    expect(fill({ fill: "input", text: "" })).toBe(true)
    expect(fill({ fill: "input" })).toBe(false)
    expect(fill({ fill: "", text: "a" })).toBe(false)
    expect(fill({ fill: "input", text: 7 })).toBe(false)
  })

  /**
   * 0159's fourth item, resolved the way 0159 said it resolves: naming the
   * thing to wait for is a reach, and "wait until the count is 3" is an
   * assertion wearing a wait's clothes and is still not expressible.
   */
  it("carries a wait for a selector through, beside a wait for a duration", () => {
    const planned = planShots(
      listOf({
        shots: [
          {
            path: "/portal",
            out: "signed-in",
            do: [{ click: "button[type=submit]" }, { waitFor: "[data-signed-in]" }],
          },
        ],
      })
    )

    expect(planned[0]?.do).toEqual([
      { click: "button[type=submit]" },
      { waitFor: "[data-signed-in]" },
    ])
  })

  it("refuses a step that is both a wait for a selector and a wait for a duration", () => {
    expect(
      shotListSchema.safeParse({
        shots: [{ path: "/x", out: "x", do: [{ waitFor: "[data-x]", wait: 10 }] }],
      }).success
    ).toBe(false)
  })

  it("carries the frame a shot names through, and omits the key when there is none", () => {
    const planned = planShots(
      listOf({
        shots: [
          { path: "/", out: "framed", frame: "iframe[title='Loom demo']", do: [{ click: "[data-yes]" }] },
          { path: "/", out: "top" },
        ],
      })
    )

    expect(planned[0]?.frame).toBe("iframe[title='Loom demo']")
    expect(planned[1] && "frame" in planned[1]).toBe(false)
  })

  /**
   * Refused rather than ignored: a misspelled `frame` on a permissive object is
   * dropped in silence, and what comes back is a correct picture of the top
   * document — the wrong-thing-photographed failure this schema exists for,
   * one level up from the steps it has always caught it in.
   */
  it("refuses a key the shot does not have, rather than photographing the wrong document", () => {
    expect(
      shotListSchema.safeParse({ shots: [{ path: "/x", out: "x", fram: "iframe" }] }).success
    ).toBe(false)
  })
})

describe("reaching a state that is not photographed", () => {
  it("resolves a before's address against the same base the shot uses", () => {
    const planned = planShots(
      listOf({
        baseUrl: "http://localhost:3210",
        shots: [
          {
            path: "/portal/readers",
            out: "readers",
            waitFor: "[data-readers]",
            before: {
              path: "/portal/sign-in",
              waitFor: "form",
              do: [
                { fill: "#email", text: "reviewer@example.com" },
                { fill: "#password", text: "hunter2" },
                { click: "button[type=submit]" },
                { waitFor: "[data-signed-in]" },
              ],
            },
          },
        ],
      })
    )

    expect(planned[0]?.before?.url).toBe("http://localhost:3210/portal/sign-in")
    expect(planned[0]?.url).toBe("http://localhost:3210/portal/readers")
    expect(planned[0]?.before?.waitFor).toBe("form")
    expect(planned[0]?.before?.do).toHaveLength(4)
  })

  it("omits the key entirely for a shot that needs nothing before it", () => {
    const planned = planShots(listOf({ shots: [{ path: "/x", out: "x" }] }))

    expect(planned[0] && "before" in planned[0]).toBe(false)
  })

  it("gives a before with no steps an empty list, like a shot with none", () => {
    const planned = planShots(
      listOf({ shots: [{ path: "/x", out: "x", before: { path: "/set-a-cookie" } }] })
    )

    expect(planned[0]?.before?.do).toEqual([])
  })

  it("lets a before name its own frame, independently of the shot's", () => {
    const planned = planShots(
      listOf({
        shots: [
          {
            path: "/",
            out: "x",
            frame: "iframe#demo",
            before: { path: "/", frame: "iframe#setup", do: [{ click: "[data-seed]" }] },
          },
        ],
      })
    )

    expect(planned[0]?.before?.frame).toBe("iframe#setup")
    expect(planned[0]?.frame).toBe("iframe#demo")
  })

  /**
   * A `before` is an approach and nothing else. Letting it carry a camera would
   * make it a shot, and a shot list's shots are the pictures it takes — which
   * is the property a report quotes when it says how many there were.
   */
  it("refuses a before that tries to take a picture, or misspells a step", () => {
    const before = (value: unknown) =>
      shotListSchema.safeParse({ shots: [{ path: "/x", out: "x", before: value }] }).success

    expect(before({ path: "/sign-in" })).toBe(true)
    expect(before({ path: "/sign-in", out: "sign-in" })).toBe(false)
    expect(before({ path: "/sign-in", clip: "[data-form]" })).toBe(false)
    expect(before({ path: "/sign-in", viewport: "phone" })).toBe(false)
    expect(before({ path: "/sign-in", do: [{ fil: "#email", text: "a" }] })).toBe(false)
    expect(before({ do: [{ click: "#x" }] })).toBe(false)
  })

  /**
   * The reading three lanes wrote a scratch driver for, four runs running
   * (0212). It is a list because the claim a report makes is a table, and a
   * lane that can ask about one block of a rail will ask about the next.
   */
  it("carries the selectors a shot asked the size of, in the order it asked", () => {
    const planned = planShots(
      listOf({
        shots: [{ path: "/demo", out: "x", measure: ["aside", "aside li[id]", "text=Put it back"] }],
      })
    )

    expect(planned[0]?.measure).toEqual(["aside", "aside li[id]", "text=Put it back"])
  })

  /**
   * Empty and not absent, for `do`'s reason: the capture loop never branches
   * on undefined, and a shot that measures nothing says so where it is planned.
   */
  it("gives a shot that named nothing an empty list rather than no field", () => {
    const planned = planShots(listOf({ shots: [{ path: "/x", out: "x" }] }))

    expect(planned[0]?.measure).toEqual([])
  })

  /**
   * `stepSchema`'s rule, for the same failure: a misspelling on a permissive
   * object parses, runs, measures nothing, and prints a shot line that looks
   * exactly like a shot that asked for nothing.
   */
  it("refuses a misspelled measure, and an empty selector inside a good one", () => {
    const measure = (value: unknown) =>
      shotListSchema.safeParse({ shots: [{ path: "/x", out: "x", measure: value }] }).success

    expect(measure(["aside"])).toBe(true)
    expect(measure([])).toBe(true)
    expect(measure([""])).toBe(false)
    expect(measure("aside")).toBe(false)
    expect(
      shotListSchema.safeParse({ shots: [{ path: "/x", out: "x", measur: ["aside"] }] }).success
    ).toBe(false)
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

describe("reaching a state a press cannot produce", () => {
  /**
   * The second gap of this shape and the first that is about position. A rail
   * that pins a caution to its scroller has a state — *the visitor scrolled
   * back to the controls* — that is a fact about scroll position and nothing
   * else, and the lane that needed it took the picture with a scratch driver
   * in `/tmp`.
   */
  it("carries a scroll through beside the presses, in the order it was written", () => {
    const planned = planShots(
      listOf({
        shots: [
          {
            path: "/demo",
            out: "back-at-the-controls",
            do: [{ click: "[data-ask]" }, { waitFor: "[data-answered]" }, { scrollTo: "[data-controls]" }],
          },
        ],
      })
    )

    expect(planned[0]?.do).toEqual([
      { click: "[data-ask]" },
      { waitFor: "[data-answered]" },
      { scrollTo: "[data-controls]" },
    ])
  })

  it("refuses a misspelled scroll, an empty selector, and a scroll that is also a press", () => {
    const step = (value: unknown) =>
      shotListSchema.safeParse({ shots: [{ path: "/x", out: "x", do: [value] }] }).success

    expect(step({ scrollTo: "[data-controls]" })).toBe(true)
    expect(step({ scrolTo: "[data-controls]" })).toBe(false)
    expect(step({ scrollTo: "" })).toBe(false)
    expect(step({ scrollTo: 400 })).toBe(false)
    expect(step({ scrollTo: "[data-controls]", click: "[data-ask]" })).toBe(false)
  })
})

describe("what the browser started with", () => {
  it("carries a seeded record through, and omits the key when a shot asks for nothing", () => {
    const planned = planShots(
      listOf({
        shots: [
          {
            path: "/lessons/3",
            out: "unreadable-record",
            start: { storage: { "loom.lessons.progress.v1": "{{{" } },
          },
          { path: "/lessons/3", out: "ordinary" },
        ],
      })
    )

    expect(planned[0]?.start).toEqual({ storage: { "loom.lessons.progress.v1": "{{{" } })
    expect(planned[1] && "start" in planned[1]).toBe(false)
  })

  it("carries blocked storage through, which is the state no map of keys can reach", () => {
    const planned = planShots(
      listOf({ shots: [{ path: "/lessons/3", out: "blocked", start: { storageBlocked: true } }] })
    )

    expect(planned[0]?.start).toEqual({ storageBlocked: true })
  })

  /**
   * The union is what refuses the pair, and it refuses it by construction
   * rather than by a refinement written afterwards: *seed this key* and *make
   * storage throw* are opposite instructions and the pair has no meaning.
   */
  it("refuses a shot that both seeds storage and blocks it", () => {
    expect(
      shotListSchema.safeParse({
        shots: [{ path: "/x", out: "x", start: { storage: { a: "1" }, storageBlocked: true } }],
      }).success
    ).toBe(false)
  })

  /**
   * 0195's whole content, as a test: a shot list is data, and the one field
   * that could have carried code does not exist.
   */
  it("has no way to run a script, however it is spelled", () => {
    const start = (value: unknown) =>
      shotListSchema.safeParse({ shots: [{ path: "/x", out: "x", start: value }] }).success

    expect(start({ initScript: "window.x = 1" })).toBe(false)
    expect(start({ script: "window.x = 1" })).toBe(false)
    expect(start({ storage: { a: "1" }, initScript: "window.x = 1" })).toBe(false)
  })

  it("refuses a misspelled member rather than starting an ordinary browser", () => {
    const start = (value: unknown) =>
      shotListSchema.safeParse({ shots: [{ path: "/x", out: "x", start: value }] }).success

    expect(start({ storeage: { a: "1" } })).toBe(false)
    expect(start({ storageBloked: true })).toBe(false)
    expect(start({})).toBe(false)
  })

  /**
   * An empty map parses, runs, writes nothing and photographs the page an
   * ordinary load produces — the silent wrong picture, arriving through the
   * one field added to reach a state a load cannot.
   */
  it("refuses an empty map, an empty key and a value that is not a string", () => {
    const start = (value: unknown) =>
      shotListSchema.safeParse({ shots: [{ path: "/x", out: "x", start: value }] }).success

    expect(start({ storage: {} })).toBe(false)
    expect(start({ storage: { "": "1" } })).toBe(false)
    expect(start({ storage: { a: 1 } })).toBe(false)
    expect(start({ storage: { a: "" } })).toBe(true)
  })

  /**
   * `false` is a field that reads as a decision and means nothing, and a lane
   * that writes it has said something it will believe later.
   */
  it("refuses storage that is declared unblocked", () => {
    expect(
      shotListSchema.safeParse({
        shots: [{ path: "/x", out: "x", start: { storageBlocked: false } }],
      }).success
    ).toBe(false)
  })

  /**
   * It is the shot's, not the approach's: the state belongs to the context,
   * and the context is what a shot gets one of. A `before` carrying its own
   * would be two answers to *what did the browser start with*.
   */
  it("refuses a before that tries to bring its own start state", () => {
    expect(
      shotListSchema.safeParse({
        shots: [
          { path: "/x", out: "x", before: { path: "/sign-in", start: { storageBlocked: true } } },
        ],
      }).success
    ).toBe(false)
  })
})
