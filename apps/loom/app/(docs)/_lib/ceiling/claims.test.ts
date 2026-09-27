import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { describeCeiling } from "@jam-overture/loom"
import { describe, expect, it } from "vitest"

import { produceDefaults, produceDoors, produceRegions } from "./page"

/**
 * What *When nothing comes back* says in its own words, held against what it
 * shows.
 *
 * The two blocks on that page are produced and cannot lie. The prose around them
 * can, and on this page it does something the other pages do not: it **quotes
 * numbers into sentences**. "Ten minutes instead of three" and "will not wait
 * ten seconds" are claims about two constants in `src/`, written in words, in a
 * paragraph nothing renders differently when they change.
 *
 * The last code block is the sharpest of them. It prints the value a reader will
 * get back from a call the page tells them to make, comment and all — so it is
 * checked by making that call.
 */

const page = readFileSync(
  fileURLToPath(new URL("../../docs/the-runtime/when-nothing-comes-back/page.mdx", import.meta.url)),
  "utf8"
)

/** The prose with its line breaks flattened — every sentence here is hard-wrapped. */
const flowed = page.replace(/\s+/g, " ")

describe("the doors this page counts", () => {
  it("says three, and produces three", async () => {
    const doors = await produceDoors()

    expect(doors).toHaveLength(3)
    expect(flowed).toContain("Three times, the runtime stops and waits")
  })

  it("names each of them in the list it opens with", () => {
    expect(flowed).toContain("it asks **a model** what to change")
    expect(flowed).toContain("it asks **your app** to answer a question a node asked")
    expect(flowed).toContain("it asks **your app** where a form should post")
  })

  /**
   * The paragraph that tells a reader the failure they already handle is the one
   * they will get. It names two codes, and both are read off a real expiry
   * rather than typed — a renamed code would leave the page confidently naming
   * something the runtime no longer says.
   */
  it("names the codes the runtime really answered with", async () => {
    const doors = await produceDoors()

    for (const code of new Set(doors.map((door) => door.code))) {
      expect(flowed, `the page never mentions ${code}`).toContain(code)
    }
  })
})

describe("the numbers this page writes into sentences", () => {
  /**
   * `no answer in 10s` is quoted in the prose as an example of the runtime
   * saying it gave up. It is the real sentence at the real default, which is why
   * it is checked against the constant rather than against the produced row —
   * the produced rows run at five milliseconds.
   */
  it("quotes the detail a deployment would actually see", async () => {
    const doors = await produceDoors()
    const source = doors.find((door) => door.constant === "DEFAULT_SOURCE_CEILING_MS")

    expect(flowed).toContain(`no answer in ${source?.standard}`)
    expect(source?.standard).toBe("10s")
  })

  it("says in words what the two defaults are", async () => {
    const defaults = produceDefaults()

    expect(defaults.interpreter).toBe("3m")
    expect(defaults.source).toBe("10s")
    expect(flowed).toContain("Ten minutes instead of three.")
    expect(flowed).toContain("will not wait ten seconds")
    expect(flowed).toContain("waited the real ten seconds three times")
  })

  it("admits which ceiling its own evidence was produced at", () => {
    expect(flowed).toContain(
      `produced at a ceiling of five milliseconds`
    )
    expect(produceDefaults().docs).toBe(describeCeiling(5))
  })

  /**
   * The one block on this page that prints a value rather than describing one.
   * A reader is invited to copy those four lines and told what comes back, so
   * the comment under them is checked by making the same call.
   */
  it("prints what a fifty-millisecond ceiling really answers", async () => {
    const doors = await produceDoors()
    const model = doors.find((door) => door.constant === "DEFAULT_INTERPRETER_CEILING_MS")

    expect(page).toContain("ceilingMs: 50,")
    expect(page).toContain(
      `{ ok: false, error: { code: "${model?.code}", detail: "no reply in ${describeCeiling(50)}" } }`
    )
  })
})

describe("the page's claim about one silent source", () => {
  it("counts the regions the way the resolve did", async () => {
    const regions = await produceRegions()
    const answered = regions.filter((region) => region.status === "ready")

    expect(new Set(regions.map((region) => region.source)).size).toBe(3)
    expect(answered).toHaveLength(2)
    expect(flowed).toContain("one of its three sources replaced by one that never answers")
    expect(flowed).toContain("The two regions that could be answered were answered.")
    expect(flowed).toContain("The two bound to the silent source")
  })

  /**
   * The sentence is "one question, asked once, and handed to both", which is a
   * claim about the planner rather than about the ceiling — and it is the reason
   * two regions go dark here rather than one.
   */
  it("has both silent regions waiting on one question", async () => {
    const regions = await produceRegions()
    const silent = regions.filter((region) => region.status === "unavailable")

    expect(silent).toHaveLength(2)
    expect(new Set(silent.map((region) => region.source)).size).toBe(1)
    expect(new Set(silent.map((region) => region.value)).size).toBe(1)
  })
})
