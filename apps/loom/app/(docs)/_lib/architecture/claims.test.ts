import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

import { COURSE } from "./course"
import { ARCHITECTURE_IDEAS } from "./ideas"
import { readCourseFile } from "./source"

/**
 * What *How it fits together* tells a reader will happen if they go through a
 * door, held against what is really behind it.
 *
 * The links on that page are resolved and cannot lie about *where* they go. The
 * sentence describing what a lesson is like is typed by hand, and it is the one
 * a reader decides on: it says the course runs in order, that a lesson opens
 * with a closed-book warm-up on the lessons before it, and that the explanation
 * is behind that. Three claims about twenty-six files in another directory,
 * none of which this section owns.
 *
 * They were true when they were written because a run went and looked. That is
 * exactly the kind of sentence this site keeps promising not to leave lying
 * around, so it is read off the lessons instead.
 */

const page = readFileSync(
  fileURLToPath(
    new URL("../../docs/architecture/how-it-fits-together/page.mdx", import.meta.url)
  ),
  "utf8"
)

const flowed = page.replace(/\s+/g, " ")

/** The `## ` headings of a lesson, in the order the document has them. */
const sectionsOf = (file: string): readonly string[] =>
  readCourseFile(file)
    .split("\n")
    .flatMap((line) => (line.startsWith("## ") ? [line.slice(3).trim()] : []))

/** The lessons the eight ideas actually send a reader to. */
const linked = ARCHITECTURE_IDEAS.map((idea) => idea.lesson).filter(
  (lesson) => lesson.file !== undefined
)

describe("what the page says is behind the first door", () => {
  it("says it, so the checks below are about a sentence that is there", () => {
    expect(flowed).toContain("closed-book warm-up on the lessons before it")
    expect(flowed).toContain("the explanation is behind that")
  })

  it("opens every lesson it links with that warm-up", () => {
    expect(linked.length).toBe(8)

    for (const lesson of linked) {
      expect(sectionsOf(lesson.file ?? "")[0], `lesson ${lesson.number}`).toBe("Warm-up")
    }
  })

  /**
   * "Behind that" is a claim about the order of the document, which is the half
   * a reader meets first — the surface's own gates hold it back further, and
   * that is theirs to keep. If a lesson ever explained itself before it asked
   * anything, the sentence would be wrong here before it was wrong there.
   */
  it("puts the asking before the explaining in every one of them", () => {
    for (const lesson of linked) {
      const sections = sectionsOf(lesson.file ?? "")
      const explaining = sections.findIndex(
        (heading) => heading !== "Warm-up" && heading !== "Predict"
      )

      expect(sections.indexOf("Predict"), `lesson ${lesson.number}`).toBeGreaterThan(0)
      expect(explaining, `lesson ${lesson.number}`).toBeGreaterThan(
        sections.indexOf("Predict")
      )
    }
  })

  /**
   * The one lesson with nothing before it is the one with nothing to be warmed
   * up on, which is why the sentence says *on the lessons before it* rather than
   * *every lesson*. Asserted so that a first lesson growing a warm-up, or a
   * second lesson losing one, is a rewrite of the sentence rather than a
   * surprise.
   */
  it("asks nothing of a reader at the lesson that has nothing before it", () => {
    const first = COURSE.find((lesson) => lesson.number === 1)

    expect(first?.file).toBeDefined()
    expect(sectionsOf(first?.file ?? "")).not.toContain("Warm-up")
  })
})
