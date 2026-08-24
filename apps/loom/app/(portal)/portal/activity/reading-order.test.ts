import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * The order a reader meets this screen in, pinned at the source.
 *
 * The page screen got a guard like this one after a phone screenshot found a
 * reading order that forty-six component tests could not — every one of them
 * rendered a component rather than the page, so none of them could see what
 * order the page put them in. Activity has the same blind spot and the same
 * cheap remedy.
 *
 * What it pins is the one thing this screen exists to answer. The summary says
 * whether anything is waiting on the reader; the list says what happened. A
 * refactor that moves the summary below a page of episodes has not broken a
 * test anywhere else, and has buried the answer under everything that is not
 * it.
 */
const file = join(process.cwd(), "app", "(portal)", "portal", "activity", "page.tsx")

/**
 * Comments are stripped first, for the reason the page screen's guard strips
 * them: the comments here name the words this screen stopped using, and a check
 * that could not tell a warning from the thing it warns about would make the
 * warning unwriteable.
 */
const source = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/gu, "")

describe("the activity screen's reading order", () => {
  it("says what this page adds up to before listing what is on it", () => {
    expect(source.indexOf("<TallyBar")).toBeGreaterThan(-1)
    expect(source.indexOf("<EpisodeCard")).toBeGreaterThan(-1)
    expect(source.indexOf("<TallyBar")).toBeLessThan(source.indexOf("<EpisodeCard"))
  })

  /**
   * An empty state is where a new person actually starts, and it is the
   * clearest instance of "what do I do now?". This one has to keep an `action`
   * — the prop `StateNotice` exists to make the answer unmissable.
   */
  it("gives the empty state something to do", () => {
    const empty = source.slice(source.indexOf('tone="empty"'))

    expect(empty).toContain("action=")
    expect(empty).toContain("/portal/pages")
  })

  /**
   * The guard rather than the symptom, same as the page screen's. Any reversal
   * reintroduces the split between reading order and source order, and it is
   * invisible until somebody opens the screen on a phone.
   */
  it("never reverses a row or a column to place something", () => {
    expect(source).not.toContain("flex-row-reverse")
    expect(source).not.toContain("flex-col-reverse")
  })
})
