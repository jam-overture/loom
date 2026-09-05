import { describe, expect, it } from "vitest"

import { portalFile, screenSource } from "@/app/(portal)/_lib/screen-source"

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
const file = portalFile("portal", "activity", "page.tsx")
const source = screenSource(file)

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
})
