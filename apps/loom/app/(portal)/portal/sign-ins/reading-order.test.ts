import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * The order a reader meets this screen in, pinned at the source.
 *
 * The fourth guard of this shape, after the page screen's, Activity's and
 * History's, and it exists for the same reason all three do: every component
 * test renders a component, so none of them can see what order the page puts
 * them in. This screen is the one where that mattered most — its two paragraphs
 * of caveat came *before* anything that had happened, so a reader met the limits
 * of the table before they met the table.
 */
const file = join(process.cwd(), "app", "(portal)", "portal", "sign-ins", "page.tsx")

/**
 * Comments are stripped first, for the reason the other three guards strip them:
 * the comments here quote the words this screen stopped using, and a check that
 * could not tell a warning from the thing it warns about would make the warning
 * unwriteable.
 */
const source = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/gu, "")

describe("the sign-ins screen's reading order", () => {
  /**
   * A person arrives here with one question, and the heading was the route slug
   * in lower case. Every other screen in the portal either names a thing a
   * person has (`Your pages`) or asks the question they came with (`Can you
   * trust the AI?`, `Does this page add up?`); this one now does the second.
   */
  it("asks the reader's question in the heading rather than naming the route", () => {
    expect(source).toContain("Is anybody trying to get in?")
    expect(source).not.toMatch(/<h1[^>]*>\s*sign-ins/u)
  })

  it("says what is happening before it says what the numbers cannot tell you", () => {
    const heading = source.indexOf("<h1")
    const summary = source.indexOf("<PressureSummary")
    const caveats = source.indexOf("What this can and cannot tell you")

    expect(heading).toBeGreaterThan(-1)
    expect(summary).toBeGreaterThan(heading)
    expect(caveats).toBeGreaterThan(summary)
  })

  /**
   * Nothing is removed to make a screen simpler. Both caveat paragraphs are the
   * limits of what this table can honestly claim, which is the part it would be
   * worst to lose, so the guard is that the words are still in the file — behind
   * a disclosure rather than in front of the answer.
   */
  it("keeps both caveats word for word, behind a disclosure", () => {
    const disclosures = source.indexOf("What this can and cannot tell you")

    expect(source.slice(disclosures)).toContain("keyed digest of an address")
    expect(source.slice(disclosures)).toContain("Counting is per address")
    expect(source.indexOf("keyed digest of an address")).toBeGreaterThan(
      source.indexOf("<PressureSummary")
    )
  })

  /**
   * The policy is what makes a lockout count mean anything, and it is read at a
   * different moment from the count itself. It stays on the screen and stops
   * being the last thing before the footer with no heading over it.
   */
  it("gives the lockout rule a disclosure of its own, named", () => {
    expect(source).toContain('summary="What locks somebody out"')
    expect(source).toContain("describePolicy(policy)")
  })

  /**
   * The store's own error string is the operator's, and it goes where every
   * other screen in the portal puts one: one click down, unaltered. It was the
   * only raw `font-mono` error left in the route group's bodies.
   */
  it("puts the store's own words behind the disclosure in the failure state", () => {
    const failure = source.slice(source.indexOf('tone="failure"'))
    const technical = failure.indexOf("<TechnicalDetail")

    expect(technical).toBeGreaterThan(-1)
    expect(failure.indexOf("survey.error.detail")).toBeGreaterThan(technical)
  })

  /**
   * The failure state is the one that looks like success: an empty table and an
   * unread table are the same screen. It has to say which, and that a failed
   * read never let anybody through.
   */
  it("says a failed read is 'unknown' rather than 'quiet'", () => {
    const failure = source.slice(source.indexOf('tone="failure"'))

    expect(failure).toContain("unknown")
    expect(failure).toContain("Nobody has been let in")
  })
})
