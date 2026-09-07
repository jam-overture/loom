import { describe, expect, it } from "vitest"

import { portalFile, screenSource } from "@/app/(portal)/_lib/screen-source"

/**
 * The front door's reading order, pinned at the source.
 *
 * The fourth guard of this shape, after the page screen's, Activity's and
 * History's, and the one with most riding on it: this is the screen somebody
 * lands on when they sign in, so whatever it says first is the portal's first
 * sentence to them.
 */
const file = portalFile("portal", "page.tsx")
const source = screenSource(file)

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
   * Two states with no queue on screen, and this guard is here because they are
   * not the same state.
   *
   * A deployment with no pages has nothing yet: dashed, and the body's job is to
   * say what would put something there. A deployment with pages and an empty
   * queue is somebody being told **they are done**, which is a result — and it
   * shipped in the dashed box for a fortnight, so a reader who did not open the
   * disclosure met a blank slot where a clean bill of health should be.
   *
   * Both still carry an action, and only one of them has to: an `empty` cannot
   * compile without one. `settled` may, and here it does, because when nothing
   * needs answering the standing question is whether the changes Loom made
   * *without* asking were sound.
   */
  it("tells nothing-yet apart from all-clear, and gives both something to do", () => {
    const notices = [...source.split('tone="empty"').slice(1), ...source.split('tone="settled"').slice(1)]

    expect(source.split('tone="empty"').length - 1).toBe(1)
    expect(source.split('tone="settled"').length - 1).toBe(1)
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
   * The other half of the same promise, and the half that shipped missing.
   *
   * A listing is bounded and hands back a cursor; this screen fans out from one
   * listing page. So a deployment larger than that bound has changes this screen
   * never looked for — and unlike an unreadable page, *nothing fails*. The
   * cursor is the only thing that says so, and a version of this file that stops
   * reading it goes back to printing a confident sentence about a deployment it
   * has only partly seen.
   */
  it("reads the listing cursor, so an unreached page is not reported as an empty one", () => {
    expect(source).toContain("cursor")
    expect(source).toContain("complete: cursor === null")
  })

  /**
   * The caveat is said before the queue, not under it. A reader who takes the
   * count at face value and scrolls no further is the reader this notice is for.
   */
  it("says what it did not check before it lists what it found", () => {
    const markup = source.slice(source.indexOf("<h1"))

    expect(markup.indexOf("sweepIsPartial")).toBeGreaterThan(-1)
    expect(markup.indexOf("<WaitingCard")).toBeGreaterThan(markup.indexOf("sweepIsPartial"))
  })

  /**
   * A screenshot found "Your pages →" twice on the caught-up state, six lines
   * apart — once as the empty state's action and once in the strip below it.
   * Every assertion passed, because each half was correct on its own; what was
   * wrong was the pair, and only the whole screen has one.
   *
   * The two states are mutually exclusive, so the check is per branch rather
   * than over the file: the no-pages state and the caught-up state never appear
   * together, and counting their hrefs as one screen would report a repeat that
   * no reader can see.
   */
  it("never sends a reader to the same place twice on one screen", () => {
    const hrefsIn = (text: string): readonly string[] =>
      Array.from(text.matchAll(/href="([^"{]+)"/gu), (match) => match[1] ?? "")

    const strip = hrefsIn(source.slice(source.indexOf("<nav")))
    const branches = [
      ...source.split('tone="empty"').slice(1),
      ...source.split('tone="settled"').slice(1),
    ].map((chunk) => hrefsIn(chunk.slice(0, chunk.indexOf("</StateNotice>"))))

    /** Guards the guard: an empty slice would pass this trivially. */
    expect(strip.length).toBe(2)
    expect(branches.length).toBe(2)
    for (const branch of branches) expect(branch.length).toBeGreaterThan(0)

    for (const branch of branches) {
      const onScreen = [...branch, ...strip]

      expect(new Set(onScreen).size, onScreen.join(" ")).toBe(onScreen.length)
    }
  })
})

/**
 * The second half, added on 7 September: what Loom changed without asking.
 *
 * The screen had one subject and now has two, and every rule below is about the
 * join. A front door that answers "does anything need me?" and stops is a
 * screen somebody opens when they are expecting bad news; a front door that
 * also answers "what happened without me?" is one they open in the morning.
 */
describe("what happened without you", () => {
  /**
   * Urgency first, always. Both halves are about changes and only one of them
   * is waiting on a human being — a reader who reads the first section and
   * closes the tab has lost nothing they had to act on.
   */
  it("puts what is waiting before what has already happened", () => {
    const markup = source.slice(source.indexOf("<h1"))

    expect(markup.indexOf("Waiting on you")).toBeGreaterThan(-1)
    expect(markup.indexOf("Changed without asking you")).toBeGreaterThan(
      markup.indexOf("Waiting on you")
    )
  })

  /**
   * The heading names the screen rather than one of its two sections. It read
   * `Waiting on you` when that was the whole screen, and a reader who took that
   * at face value would read the second section as more of the first — which is
   * the one misreading this screen must not cause, because "changed without
   * asking you" read as "waiting on you" invites an answer to a settled change.
   */
  it("is headed by something true of both halves", () => {
    const heading = /<h1[^>]*>([\s\S]*?)<\/h1>/u.exec(source)?.[1]?.trim()

    expect(heading).toBe("What Loom has been doing")
  })

  /** The count before the cards, for the reason the waiting half says its own. */
  it("says how much happened without you before it lists any of it", () => {
    const markup = source.slice(source.indexOf("<h1"))

    expect(markup.indexOf("unattendedSummary")).toBeGreaterThan(-1)
    expect(markup.indexOf("<UnattendedCard")).toBeGreaterThan(markup.indexOf("unattendedSummary"))
  })

  /**
   * **The cap is on the read, never on what came back.**
   *
   * A screen that reads a hundred changes and renders five has hidden
   * ninety-five and said nothing; a screen with a smaller window has a window,
   * and the sentence above the list is what says so. The difference is
   * invisible on screen and total to a reader deciding whether they have seen
   * everything.
   */
  it("bounds the record it reads rather than slicing what it read", () => {
    expect(source).toContain("limit: RECENT_RECORDS")
    expect(source).not.toContain("unattended.changes.slice")
    expect(source).not.toContain("changes.slice(0")
  })

  /**
   * The two halves come from two sources — the hold store and the journal — and
   * neither may take the other down with it. A journal that will not read costs
   * the second section and says so; it must not blank a queue that is still
   * true, so there is no early return on it.
   */
  it("lets the record fail without taking the queue with it", () => {
    expect(source).toContain("record.ok ?")
    expect(source).not.toContain("if (!record.ok) return")
  })

  /**
   * A read that failed and a record with nothing in it are opposite answers to
   * "has Loom changed anything on its own?", and the failure is the one a
   * reader has to be told about because it looks like the good news.
   */
  it("tells a failed read apart from a quiet record", () => {
    expect(source).toContain("describeTelemetryError")
    expect(source).toContain('title="This half of the screen didn\'t load."')
  })

  /**
   * The caught-up notice used to send a reader to `/portal/trust` to answer
   * "were the changes Loom made without asking sound?" — a question the section
   * directly below it now answers half of. A link that sends somebody away past
   * the answer is worse than no link.
   */
  it("no longer sends the caught-up reader away to a question this screen answers", () => {
    expect(source).not.toContain("Has the AI been getting it right?")
    expect(source).toContain("Has its judgment been sound?")
  })
})

/**
 * Two defects a screenshot found on the first build of the section above, and
 * neither had a failing test — both are about a pair of things that are each
 * correct alone, which is the shape this lane keeps finding by looking.
 */
describe("what the first screenshot of it found", () => {
  /**
   * `Nothing is waiting for you.` sat three lines above a green box headed
   * `You're all caught up.` — one fact, twice, and the second says it with a
   * shape as well as with words. It had been there since the settled tone
   * shipped and only read as a stutter once the section got a heading of its
   * own.
   */
  it("does not say the queue is empty twice", () => {
    const markup = source.slice(source.indexOf("<h1"))

    expect(markup).toContain("{changes.length > 0 && (")
    expect(markup.indexOf("changes.length > 0")).toBeLessThan(markup.indexOf("waitingSummary"))
  })
})
