import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * The front door's reading order, pinned at the source.
 *
 * The fourth guard of this shape, after the page screen's, Activity's and
 * History's, and the one with most riding on it: this is the screen somebody
 * lands on when they sign in, so whatever it says first is the portal's first
 * sentence to them.
 *
 * Comments are stripped first, as in the other three — the comments here name
 * what the screen replaced, and a check that could not tell a warning from the
 * thing it warns about would make the warning unwriteable.
 */
const file = join(process.cwd(), "app", "(portal)", "portal", "page.tsx")
const source = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/gu, "")

describe("the front door's reading order", () => {
  /**
   * The screen used to be seven lines and a `redirect`. A reviewer's first
   * screen was a list of the places a change might be waiting rather than the
   * changes themselves, and finding out whether anything needed them meant
   * opening every page in turn.
   */
  it("is a screen rather than a redirect somewhere else", () => {
    expect(source).not.toContain("redirect(")
  })

  /**
   * Measured over the markup rather than over the file, because the import list
   * mentions every one of these names before the first line of JSX and would
   * otherwise satisfy the assertion without the screen being in that order at
   * all. The first `<h1` is where the reader's copy of this file begins.
   */
  it("says how much is waiting before it lists a single change", () => {
    const markup = source.slice(source.indexOf("<h1"))

    expect(source.indexOf("<h1")).toBeGreaterThan(-1)
    expect(markup.indexOf("waitingSummary")).toBeGreaterThan(-1)
    expect(markup.indexOf("<WaitingCard")).toBeGreaterThan(markup.indexOf("waitingSummary"))
  })

  /**
   * Two empty states, and they are different states: a deployment with no pages
   * cannot have anything waiting, and a deployment with pages and an empty
   * queue is somebody being told they are done. Both are places a person
   * actually starts, so both keep an action.
   */
  it("gives both empty states something to do", () => {
    const notices = source.split('tone="empty"').slice(1)

    expect(notices.length).toBe(2)
    for (const notice of notices) expect(notice.slice(0, 600)).toContain("action=")
  })

  /**
   * The queue is ordered by how long something has waited, and it is ordered
   * here rather than left in whatever order the holds came back in. A queue
   * that is not ordered is a list.
   */
  it("orders the queue rather than printing the store's order", () => {
    expect(source).toContain("inQueueOrder")
  })

  /**
   * A page whose holds could not be read is counted and said, never dropped.
   * This screen's whole claim is that it is where you find out whether anything
   * needs you, and a silent under-report is the one failure that breaks it.
   */
  it("counts a page it could not check", () => {
    expect(source).toContain("unreadable")
    expect(source).toContain("!holds.ok")
  })

  /**
   * A screenshot found "Your pages →" twice on the caught-up state, six lines
   * apart — once as the empty state's action and once in the strip below it.
   * Every assertion passed, because each half was correct on its own; what was
   * wrong was the pair, and only the whole screen has one.
   *
   * The empty states are mutually exclusive, so the check is per branch rather
   * than over the file: the no-pages state and the caught-up state never appear
   * together, and counting their hrefs as one screen would report a repeat that
   * no reader can see.
   */
  it("never sends a reader to the same place twice on one screen", () => {
    const hrefsIn = (text: string): readonly string[] =>
      Array.from(text.matchAll(/href="([^"{]+)"/gu), (match) => match[1] ?? "")

    const strip = hrefsIn(source.slice(source.indexOf("<nav")))
    const branches = source
      .split('tone="empty"')
      .slice(1)
      .map((chunk) => hrefsIn(chunk.slice(0, chunk.indexOf("</StateNotice>"))))

    /** Guards the guard: an empty slice would pass this trivially. */
    expect(strip.length).toBe(2)
    expect(branches.length).toBe(2)
    for (const branch of branches) expect(branch.length).toBeGreaterThan(0)

    for (const branch of branches) {
      const onScreen = [...branch, ...strip]

      expect(new Set(onScreen).size, onScreen.join(" ")).toBe(onScreen.length)
    }
  })

  /** The guard rather than the symptom, same as the other three. */
  it("never reverses a row or a column to place something", () => {
    expect(source).not.toContain("flex-row-reverse")
    expect(source).not.toContain("flex-col-reverse")
  })
})
