import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * The order a reader meets this screen in, pinned at the source, and the two
 * properties that separate it from every other screen in the portal.
 *
 * The first is that **the rules do not depend on the read that can fail.** A
 * refactor that moved the list of rules inside the `page.ok` branch would break
 * no component test anywhere — every one of them renders a card with a record
 * handed to it — and would turn the one screen that works on an empty
 * deployment into another screen that shows a failure notice and nothing else.
 *
 * The second is that this screen offers nothing to do to anything. 0031 makes a
 * reading of the runtime's own judgement a reader; a form here would be a way to
 * move a policy threshold from a browser, which is the whole of what that record
 * says not to build.
 */
const file = join(process.cwd(), "app", "(portal)", "portal", "rules", "page.tsx")

/**
 * Comments are stripped first, as on the activity and page screens: the comments
 * here name the very shapes this file must not contain, and a check that could
 * not tell a warning from the thing it warns about would make the warning
 * unwriteable.
 */
const source = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/gu, "")

describe("the rules screen's reading order", () => {
  it("says what has happened under these rules before listing them", () => {
    expect(source.indexOf("headlineOf(record)")).toBeGreaterThan(-1)
    expect(source.indexOf("<RuleCard")).toBeGreaterThan(-1)
    expect(source.indexOf("headlineOf(record)")).toBeLessThan(source.indexOf("<RuleCard"))
  })

  /**
   * The 390px defect, pinned. `justify-between` on a heading and a link puts
   * them on one line at 1280 and wraps the link between the heading and its own
   * sentence on a phone, so a reader meets "what else can I do" before "what
   * this is". The lead paragraph has to come before the way out in the source,
   * which is the only place the order is decided.
   */
  it("puts the heading's own sentence before the way out of the screen", () => {
    const lead = source.indexOf("Every change the AI writes is judged")
    const out = source.indexOf("Ask for a change")

    expect(lead).toBeGreaterThan(-1)
    expect(out).toBeGreaterThan(lead)
    expect(source).not.toContain("justify-between")
  })

  it("renders the rules whether or not the record could be read", () => {
    const list = source.indexOf("rules.map")
    const failure = source.indexOf('tone="failure"')

    expect(list).toBeGreaterThan(-1)
    expect(failure).toBeGreaterThan(-1)
    /* The notice sits above the list rather than instead of it. */
    expect(failure).toBeLessThan(list)
    expect(source).toContain("NO_RECORD")
  })

  it("reads the same policy object the write path is built with", () => {
    expect(source).toContain("portalPolicy")
    expect(source).not.toContain("defaultGatePolicy")
  })

  it("offers nothing to press", () => {
    expect(source).not.toContain("<form")
    expect(source).not.toContain("<button")
    expect(source).not.toContain("action=")
  })

  it("never reverses a row or a column to place something", () => {
    expect(source).not.toContain("flex-row-reverse")
    expect(source).not.toContain("flex-col-reverse")
  })
})
