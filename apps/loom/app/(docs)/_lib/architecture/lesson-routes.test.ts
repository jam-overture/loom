import { describe, expect, it } from "vitest"

import { COURSE } from "./course"
import { WRITTEN_LESSONS } from "@/app/(lessons)/_lib/syllabus"

/**
 * The one check that is worth reaching across a lane boundary for.
 *
 * This section links `/lessons/07`. Nothing in this directory serves that
 * address: the lessons surface does, from its own route group, and it generates
 * one route per *written* lesson with `dynamicParams` off — so a lesson this
 * section thinks is written and that surface does not is not a soft failure. It
 * is a link on the friendliest page in the section, with a 404 behind it.
 *
 * Both surfaces answer *which lessons are written* by parsing the same table in
 * `lessons/README.md`, with their own small parser, deliberately
 * ([course.ts](./course.ts) says why). Two parsers agreeing today is not the
 * same as two parsers agreeing, and the failure mode is invisible from either
 * side alone. So this asserts the agreement itself.
 *
 * **It is an import out of this lane, and the only one.** It appears in a test
 * and never in anything that renders, so nothing this section serves depends on
 * another surface's module — what depends on it is the claim that the links
 * resolve, which is a claim about both surfaces and belongs to neither. If
 * `WRITTEN_LESSONS` is renamed or its rule changes, this goes red, and going
 * red is the point: the addresses on this page moved.
 */

describe("the lessons this section links and the lessons that surface serves", () => {
  it("is the same set of numbers, both non-empty", () => {
    const linked = COURSE.filter((lesson) => lesson.href !== undefined).map(
      (lesson) => lesson.number
    )
    const served = WRITTEN_LESSONS.map((lesson) => lesson.number)

    expect(linked.length).toBeGreaterThan(0)
    expect([...linked].sort((a, b) => a - b)).toEqual([...served].sort((a, b) => a - b))
  })

  it("agrees about the file each one is rendered from", () => {
    for (const served of WRITTEN_LESSONS) {
      const here = COURSE.find((lesson) => lesson.number === served.number)

      expect(here?.file, `lesson ${served.number}`).toBe(served.file)
    }
  })

  /**
   * A lesson the syllabus has not linked yet is a row on that surface and an
   * address on neither. This is the half that is empty today — the course is
   * complete — and is asserted anyway, because it is the half that comes back
   * the day a twenty-seventh lesson is planned.
   */
  it("links nothing that surface has no route for", () => {
    const served = new Set(WRITTEN_LESSONS.map((lesson) => lesson.number))

    for (const lesson of COURSE) {
      if (lesson.href === undefined) continue

      expect(served.has(lesson.number), `lesson ${lesson.number}`).toBe(true)
    }
  })
})
