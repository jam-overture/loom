import { describe, expect, it } from "vitest"

import { screenName } from "@/app/(portal)/_lib/screen-names"
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
   * **The pages come before what has happened to them.**
   *
   * The 27 September direction, as a property. `/portal` opened on a queue, so a
   * person arriving with nothing waiting met an empty one — on the surface whose
   * whole subject is pages that exist nowhere else they could be looked at. The
   * fix is only a fix if the pages are *first*: a grid of them under two queues
   * is the same screen with a picture at the bottom.
   */
  it("shows the pages themselves before anything that happened to them", () => {
    const markup = source.slice(source.indexOf("<h1"))

    expect(markup.indexOf("<PageCardLink")).toBeGreaterThan(-1)
    expect(markup.indexOf("<PageCardLink")).toBeLessThan(markup.indexOf("<WaitingCard"))
    expect(markup.indexOf("<PageCardLink")).toBeLessThan(markup.indexOf("<UnattendedCard"))
  })

  /**
   * A card is a summary and never the queue with pictures.
   *
   * The two sections answer different questions — *what is my site* and *what
   * needs me* — and the moment a card carries a change's own account of itself,
   * the second is answered twice and the first not at all. What is waiting is a
   * **mark** on a card and a **row** in the queue.
   */
  it("keeps the change out of the card and leaves it in the queue", () => {
    const card = source.slice(source.indexOf("<PageCardLink"), source.indexOf("<WaitingCard"))

    expect(card).not.toContain("effect")
    expect(card).not.toContain("answers")
  })

  /**
   * The grid is absent with no pages rather than an empty heading, and this is a
   * guard's finding rather than a judgement that was made well the first time.
   * The section shipped its own `tone="empty"` notice — a second dashed box
   * saying what the one below it already said, with a second link to the same
   * demo — and the two assertions above caught it.
   */
  it("draws no pages section at all when there are no pages", () => {
    expect(source).toContain("cards.length > 0 &&")
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
   * A page whose holds could not be read is named and said, never dropped. This
   * screen's whole claim is that it is where you find out whether anything
   * needs you, and a silent under-report is the one failure that breaks it.
   *
   * The guard used to look for `!holds.ok` — the failure being *noticed*, inline
   * in this file — and that is no longer where it happens. The pairing of a
   * failed read with the page it was about is `unreadableIn`, in `_lib`, where a
   * test can call the same function this screen calls rather than a copy of it
   * (the 17 September finding about this file). So what is guarded here is the
   * wiring that a source read can actually see: this screen asks for the pairing
   * and hands the result to the component that names the pages.
   */
  it("names the pages it could not check rather than counting them", () => {
    expect(source).toContain("unreadableIn(trees, perPage)")
    expect(source).toContain("<UnreadablePages")
  })

  /**
   * The row-level version of the same promise, added 20 September.
   *
   * 0175 split a listing into `{ held, unreadable }` — a page can now be read
   * successfully and still have one change on it that this build cannot make
   * sense of. This screen took `.held` and dropped the rest, so a change stuck
   * in somebody's queue was not on any screen in the portal.
   *
   * Guarded at the source for the same reason the pairing above is: the fan-out
   * lives in a file no test can reach, and a version of it that reaches for
   * `.held` alone leaves the whole suite green.
   */
  it("keeps the changes it could not read rather than dropping them from the queue", () => {
    expect(source).toContain("unreadableChangesIn(listing.treeId, holds.value)")
    expect(source).toContain("<UnreadableChangeCard")
  })

  /**
   * A row nobody can read still has a position in time, and the position is the
   * only fact it carries. Merging the two kinds into one order is what puts a
   * change stuck since July above four answerable ones — a list that sorted the
   * unreadable rows into a group would have taken that away.
   */
  it("draws both kinds of row in one order rather than two lists", () => {
    expect(source).toContain("inQueueOrder(changes, unreadableChanges, waitingSince)")
    expect(source).toContain("rows.map(")
  })

  /**
   * The confident empty state, in its sharpest form, guarded where it can only
   * be reintroduced.
   *
   * `changes.length === 0` was right while a queue had one kind of row in it.
   * Over a queue holding a change nobody can read it draws a green box headed
   * **"You're all caught up."** — the screen asserting the opposite of what is
   * on it, with the counter-evidence three lines below. The whole fix is the
   * word `rows`, which is exactly the sort of thing a later edit puts back.
   */
  it("does not call a reader caught up over a queue with a stuck row in it", () => {
    const markup = source.slice(source.indexOf("<h1"))

    expect(markup).toContain("rows.length === 0 ? (")
    expect(markup).not.toContain("changes.length === 0 ? (")
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
   * ## Why this is now stated over the screen rather than over a strip
   *
   * It used to compare the strip's hrefs against each mutually-exclusive empty
   * branch's, because those were the only two places this screen linked
   * anywhere. **The strip is gone** — 27 September put the pages themselves on
   * this screen, which is the question the strip's own comment said it existed
   * to answer, so the link to the paged index moved into that section and the
   * orphan at the bottom was removed rather than left to say `Your pages` a
   * second time.
   *
   * So the rule is read off the whole file instead: every literal `href`
   * outside the two branches must be unique, and neither branch may repeat one
   * of them. That is the property the original comment describes and it is
   * strictly more than the strip version could see — a repeat between two
   * ordinary sections was invisible to it, and that is exactly the repeat this
   * run would have shipped.
   */
  it("never sends a reader to the same place twice on one screen", () => {
    const hrefsIn = (text: string): readonly string[] =>
      Array.from(text.matchAll(/href="([^"{]+)"/gu), (match) => match[1] ?? "")

    /**
     * Every notice on the screen, whole, so a tone is read off the block it
     * belongs to rather than off a split that can run past the end of one.
     */
    const notices = [...source.matchAll(/<StateNotice[\s\S]*?<\/StateNotice>/gu)].map(
      (match) => match[0]
    )

    const branchChunks = notices.filter(
      (notice) => notice.includes('tone="empty"') || notice.includes('tone="settled"')
    )

    const branches = branchChunks.map(hrefsIn)

    /**
     * Everything the screen links to that is *not* inside one of the two
     * mutually-exclusive states. Those two never appear together, so counting
     * their hrefs as one screen would report a repeat no reader can see.
     */
    const always = hrefsIn(
      branchChunks.reduce((rest, chunk) => rest.replace(chunk, ""), source)
    )

    /**
     * Guards the guard, at both ends. An empty extraction would pass every
     * assertion below trivially, which is how this lane disarmed a demo guard
     * once by renaming the thing it looked for.
     */
    expect(branches.length).toBe(2)
    for (const branch of branches) expect(branch.length).toBeGreaterThan(0)
    expect(always).toContain("/portal/pages")
    expect(hrefsIn('<a href="/x">')).toEqual(["/x"])

    /** The unconditional half of the screen may not repeat itself. */
    expect(new Set(always).size, always.join(" ")).toBe(always.length)

    /** And neither branch may lead somewhere the screen already leads. */
    for (const branch of branches) {
      const onScreen = [...branch, ...always]

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

    expect(heading).toBe('{screenName("/portal")}')
    expect(screenName("/portal")).toBe("What Loom has been doing")
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
 * The third question, added 25 September: can you trust what you are looking at?
 *
 * The two sections above are read from records. Nothing on this screen checked
 * that those records still produce the pages people are being served, and that
 * fault is the one in Loom with no symptom — every request succeeds, nothing
 * throws, nothing is logged. The check exists over every page and the front door
 * did not mention it.
 */
describe("whether it all still adds up", () => {
  /**
   * The press, wired to the deployment-wide check rather than to the screen that
   * chooses one page. A front door that sent a reader to the chooser would be
   * handing them the list of pages the checkup screen already grew a press to
   * get away from.
   */
  it("invites the reader to the check over every page", () => {
    expect(source).toContain("<CheckupInvitation")
    expect(source).toContain("reach={reach}")
  })

  /**
   * **The fold does not happen here.** This is the assertion with the most
   * riding on it, because the version of this section that a later edit reaches
   * for is the one that shows a verdict — and a verdict means folding every
   * page's whole accepted history on the one screen a person opens every
   * morning, growing for the rest of the deployment's life (0016). What this
   * screen prints is what a press *would* cost, from the listing and the heads
   * it has already read.
   */
  it("does not run the check it is inviting the reader to", () => {
    expect(source).not.toContain("auditSnapshot")
    expect(source).not.toContain("sweepReading")
    expect(source).not.toContain("standingOf")
  })

  /**
   * And it adds no read to get there. Every input is already on this screen: the
   * listing, the heads read for the names and the queue's account, and a lookup
   * that touches no store.
   */
  it("reads nothing new to say what a check would be worth", () => {
    const wiring = source.slice(source.indexOf("const reach = checkupReach"))

    expect(wiring).toContain("trees.map((listing) => listing.treeId)")
    expect(wiring).toContain("heads,")
    expect(wiring).toContain("hasStartingShape: isAuditable")
    expect(source.split("await portalStore.list").length - 1).toBe(1)
    expect(source.split("headsOf(").length - 1).toBe(1)
  })

  /**
   * The reach is about the pages the sweep itself would take, which is one
   * listing page — the same bound, so a page beyond it is a page neither screen
   * can speak for. Handing the union with the journal's pages would count pages
   * the sweep never reaches among the ones it can check.
   */
  it("counts over the pages a check would reach rather than every page it has named", () => {
    const wiring = source.slice(source.indexOf("const reach = checkupReach"))

    expect(wiring).toContain("complete: sweep.complete")
    expect(wiring.slice(0, wiring.indexOf("})"))).not.toContain("named")
  })

  /**
   * Last of the three, and the order is the argument. The two sections above are
   * about changes and one of them is waiting on a human being; this is a standing
   * question with nothing urgent in it, and urgency is what orders this screen.
   */
  it("comes after both of the things that are waiting or have happened", () => {
    const markup = source.slice(source.indexOf("<h1"))

    expect(markup.indexOf("<CheckupInvitation")).toBeGreaterThan(
      markup.indexOf("Changed without asking you")
    )
    expect(markup.indexOf("<CheckupInvitation")).toBeGreaterThan(markup.indexOf("Waiting on you"))
  })

  /**
   * Withheld on a deployment with no pages, like the section above it and the
   * strip below. The one empty state that matters is the first screen a new
   * arrival sees, and a second offer under it competes with the only action that
   * screen should have.
   */
  it("offers nothing to check on a deployment with nothing in it", () => {
    expect(source).toContain("{trees.length > 0 && <CheckupInvitation")
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

    /*
     * `rows` rather than `changes` since 20 September, and the guard's intent is
     * unchanged: the summary is withheld exactly when the notice below it is
     * going to say the same thing. What moved is which emptiness that is — a
     * queue holding a change nobody can read draws no green box, so the summary
     * must appear, and it is the one that says *nothing is waiting that you can
     * answer*.
     */
    expect(markup).toContain("{rows.length > 0 && (")
    expect(markup.indexOf("rows.length > 0")).toBeLessThan(markup.indexOf("waitingSummary"))
  })
})
