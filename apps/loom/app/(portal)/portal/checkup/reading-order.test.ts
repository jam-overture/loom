import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * The order a reader meets this screen in, pinned at the source.
 *
 * The fourth guard of this shape, after the page screen's, Activity's and
 * History's. All three were written because a screenshot found a reading order
 * that dozens of component tests could not: every one of them renders a
 * component rather than the page, so none can see what order the page puts them
 * in.
 *
 * What it pins here is the order this unit is about — the answer, then what to
 * do, then the parts that disagree, and only then what the check was made of. A
 * basis is context and never an action, and a screen that led with its own
 * methodology would be the runtime talking about itself again.
 */
const file = join(process.cwd(), "app", "(portal)", "portal", "checkup", "page.tsx")

/**
 * Comments stripped first, for the reason the other three guards strip them:
 * the comments here name the order they are enforcing, and a check that could
 * not tell a note from the thing it describes would make the note unwriteable.
 */
const source = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/gu, "")

describe("the checkup screen's reading order", () => {
  it("says what the screen is before it renders a verdict", () => {
    const heading = source.indexOf("<h1")
    const verdict = source.indexOf("<CheckupVerdictPanel")

    expect(heading).toBeGreaterThan(-1)
    expect(verdict).toBeGreaterThan(heading)
  })

  /**
   * The verdict answers the question the reader arrived with and is the only
   * thing here that has to be near the top. The basis is what that answer was
   * made of, and it is worth nothing to somebody who has not read the answer
   * yet.
   */
  it("puts the verdict above what the verdict was made of", () => {
    expect(source.indexOf("<CheckupVerdictPanel")).toBeLessThan(source.indexOf("<CheckupBasis"))
  })

  /**
   * Both read the same report. Two `describeAudit` calls would let the verdict
   * and the basis describe two different folds of the same page, and nothing on
   * screen would say which one the reader was looking at.
   */
  it("reads the audit once and hands the same report to both", () => {
    expect(source.match(/describeAudit\(/gu)).toHaveLength(1)
    expect(source).toContain("<CheckupVerdictPanel report={report}")
    expect(source).toContain("<CheckupBasis report={report}")
  })

  /**
   * An empty state is the clearest instance of "what do I do now?", and on this
   * screen it is what a reader arriving from the nav meets: no tree named, so
   * nothing to check. The chooser is the thing to do.
   */
  it("gives the screen with no page named something to do", () => {
    expect(source.indexOf("<CheckupTreeChooser")).toBeGreaterThan(-1)
  })

  it("never reverses a row or a column to place something", () => {
    expect(source).not.toContain("flex-row-reverse")
    expect(source).not.toContain("flex-col-reverse")
  })
})
