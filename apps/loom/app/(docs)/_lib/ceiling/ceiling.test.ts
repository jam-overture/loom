import {
  DEFAULT_ENDPOINT_CEILING_MS,
  DEFAULT_INTERPRETER_CEILING_MS,
  DEFAULT_SOURCE_CEILING_MS,
} from "@loom/runtime"
import { describe, expect, it } from "vitest"

import { DOCS_CEILING_MS, produceDefaults, produceDoors, produceRegions } from "./page"

/**
 * The three doors, and the property the whole page rests on.
 *
 * These producers are the only place on this site where the subject is something
 * that does **not** happen: a promise nobody settles. So the tests are written
 * against the two halves a reader is asked to believe. The runtime answered —
 * which is the claim that every await has a ceiling — and it aborted what it
 * walked away from, which is the claim a host's connection pool depends on and
 * the one nothing on the page could otherwise show.
 *
 * Every assertion here would have failed before 13 September, and it would have
 * failed by hanging rather than by going red. A test that never returns is the
 * shape of the bug, which is why each of these is a real await rather than an
 * assertion about `withCeiling`.
 */

describe("every door into somebody else's code", () => {
  it("answers rather than waiting, when nothing comes back", async () => {
    const doors = await produceDoors()

    expect(doors).toHaveLength(3)

    for (const door of doors) {
      expect(door.sentence, door.door).not.toBe("")
      expect(door.code, door.door).toBe(
        door.call.startsWith("modelInterpreter") ? "interpreter-unavailable" : "unavailable"
      )
    }
  })

  /**
   * The half of the ceiling that is not about the answer. Walking away from a
   * promise does not stop the work behind it, so an implementation that is never
   * told is one holding a connection whose answer nothing will read.
   */
  it("aborts what it walked away from, and says how long it waited", async () => {
    const doors = await produceDoors()

    for (const door of doors) {
      expect(door.abort, door.door).toContain(`in ${produceDefaults().docs}`)
    }
  })

  it("prints the runtime's sentence rather than one of its own", async () => {
    const doors = await produceDoors()

    for (const door of doors) {
      expect(door.sentence, door.door).toContain(produceDefaults().docs)
    }
  })

  it("names a different door each time, in the order the page introduces them", async () => {
    const doors = await produceDoors()

    expect(doors.map((door) => door.constant)).toEqual([
      "DEFAULT_INTERPRETER_CEILING_MS",
      "DEFAULT_SOURCE_CEILING_MS",
      "DEFAULT_ENDPOINT_CEILING_MS",
    ])
  })
})

describe("the numbers the page prints", () => {
  /**
   * Read off the package, so a deployment's real ceilings and the page's
   * description of them cannot drift. Changing either constant in `src/` changes
   * the page at the next build and fails here if the page has written one down.
   */
  it("are the runtime's own constants, said the way somebody would say them", () => {
    const defaults = produceDefaults()

    expect(DEFAULT_INTERPRETER_CEILING_MS).toBe(180_000)
    expect(defaults.interpreter).toBe("3m")

    expect(DEFAULT_SOURCE_CEILING_MS).toBe(10_000)
    expect(DEFAULT_ENDPOINT_CEILING_MS).toBe(10_000)
    expect(defaults.source).toBe("10s")
    expect(defaults.endpoint).toBe("10s")
  })

  it("keeps the ceiling this site builds under far below any of them", () => {
    expect(DOCS_CEILING_MS).toBeLessThan(DEFAULT_SOURCE_CEILING_MS)
    expect(produceDefaults().docs).toBe("5ms")
  })
})

describe("one silent source, on a page of three", () => {
  /**
   * The decision in one assertion. A shared budget would make the page's regions
   * compete, so the two that could answer would lose their answers to whichever
   * one was being waited for — which is the failure the ceiling was written to
   * close, rearranged rather than fixed.
   */
  it("costs its own region and not the ones beside it", async () => {
    const regions = await produceRegions()

    const silent = regions.filter((region) => region.status === "unavailable")
    const answered = regions.filter((region) => region.status === "ready")

    expect(silent.map((region) => region.source)).toEqual([
      "catalogue.services",
      "catalogue.services",
    ])
    expect(answered.map((region) => region.reads)).toEqual(["loom.data.hours", "loom.data.bio"])
  })

  it("hands the regions that answered their real answers", async () => {
    const regions = await produceRegions()
    const bio = regions.find((region) => region.reads === "loom.data.bio")

    expect(bio?.value).toContain("Mill Street")
  })
})
