import { describe, expect, it } from "vitest"

import { randomIdFactory, systemClock, type LoomTree } from "@jam-overture/loom"
import { commitIntent, type HeldProposal } from "@jam-overture/loom/write"

import { partInQuestion, type PartInQuestion } from "./in-question"
import { settingsOf } from "./plain-change"
import { askedWith, DEMO_LEADING_PRESET, presetById, presetInterpreter } from "./presets"
import { whatTheRailShows } from "./rail"
import { recordFromEvents, type ChangeRecord } from "./record"
import { demoRegistry } from "./registry"
import { beginDemoWrite, demoSession, rememberRecord, type DemoSession } from "./session"

/**
 * The wiring, at last.
 *
 * Every other test in this lane checks a function the demo's page calls. This
 * one checks the *calling* — the arithmetic that turns a tree, a visitor's
 * records and the store's holds into the things the rail is allowed to say —
 * and it is the first test in twenty-four runs that can.
 *
 * **Why it could not exist before.** All of it lived in `page.tsx`, an `async`
 * Server Component that reads a cookie and opens a session, and no `vitest` run
 * can mount one. So the lane's defect matrix kept turning up rows where a
 * reading was unwired by deleting a single argument and the whole suite stayed
 * green: five of them, over four runs, each one a property this surface had
 * shipped a unit to guarantee. The 17 September finding named the shape and
 * `rail.ts` is it.
 *
 * **Nothing is stubbed but the browser.** The holds below are real holds from
 * the real write path, judged by the real policy, and the records are the ones
 * `actions.ts` writes. A fixture would have been quicker and would have checked
 * that this file agrees with itself.
 */

const sessionFor = async (name: string): Promise<DemoSession> =>
  demoSession(`rail-${name}-${Math.random()}`)

const headOf = async (session: DemoSession): Promise<LoomTree> => {
  const head = await session.store.head(session.seed.treeId)
  if (!head.ok) throw new Error(`no head: ${head.error.code}`)

  return head.value
}

const holdsOf = async (session: DemoSession, tree: LoomTree): Promise<readonly HeldProposal[]> => {
  const found = await session.holds.forTree(tree.treeId)
  if (!found.ok) throw new Error(`no holds: ${found.error.code}`)

  return found.value.held
}

const SETTINGS = settingsOf(demoRegistry)

/**
 * One ask, through the path the server action takes, remembered on the session
 * the way the server action remembers it.
 *
 * The session is threaded back out because `rememberRecord` returns a new one —
 * so a test that asked twice and read `session.records` off the first would be
 * reading a history with one press in it, which is the shape of the defect this
 * file exists to catch rather than to contain.
 */
const ask = async (
  session: DemoSession,
  presetId: string
): Promise<{ readonly session: DemoSession; readonly record: ChangeRecord }> => {
  const preset = presetById(presetId)
  if (!preset) throw new Error(`no preset ${presetId}`)

  const head = await headOf(session)
  const write = beginDemoWrite(session, presetInterpreter(preset, randomIdFactory, systemClock))

  await commitIntent(write.path, {
    intentId: randomIdFactory.intentId(),
    treeId: session.seed.treeId,
    baseRevision: head.revision,
    origin: "user-instruction",
    actor: "a demo visitor",
    utterance: preset.utterance,
    observedAt: systemClock.now(),
  })

  const record = recordFromEvents(write.narrated(), undefined, {
    before: head,
    settings: SETTINGS,
    earlier: session.records,
  })
  if (!record) throw new Error("the runtime narrated nothing")

  /**
   * Which button was pressed, stamped on the record exactly as `actions.ts`
   * stamps it. Nothing downstream can recover it — the runtime was handed the
   * preset's utterance and nothing to say a button produced it — and it is the
   * key `stillToAsk` joins on, so a helper that skipped it would be testing a
   * rail no visitor can reach.
   */
  const asked = askedWith(record, preset.id)

  return { session: rememberRecord(session, asked), record: asked }
}

/**
 * The rail, read the way the page reads it — except that the preview comes back
 * as the part itself rather than as an element.
 *
 * That substitution is the whole reason the function is generic. `page.tsx`
 * hands in a renderer because a `LoomTree` needs the registry and the registry
 * does not cross a client boundary; a test hands in the identity and gets to
 * assert the same map, built by the same code, rather than a parallel one it
 * joined itself.
 */
const railOf = async (session: DemoSession) => {
  const tree = await headOf(session)

  const shown: string[] = []

  const view = whatTheRailShows<PartInQuestion>({
    tree,
    records: session.records,
    held: await holdsOf(session, tree),
    registry: demoRegistry,
    ids: randomIdFactory,
    showPart: (part, proposalId) => {
      shown.push(proposalId)

      return part
    },
  })

  return { tree, view, shown }
}

describe("the asks the panel is handed", () => {
  /**
   * The first row of the 17 September finding, and the reason the finding
   * exists. Unwiring it was one edit — `stillToAsk(availablePresets(…), …)`
   * back to `availablePresets(…)` — and 440 tests stayed green.
   */
  it("withdraws the ask the visitor is already waiting on an answer to", async () => {
    const fresh = await sessionFor("withdraw")
    const before = await railOf(fresh)

    expect(before.view.available).toContain(DEMO_LEADING_PRESET)

    const asked = await ask(fresh, DEMO_LEADING_PRESET)
    expect(asked.record.outcome).toBe("awaiting-you")

    const after = await railOf(asked.session)
    expect(after.view.available).not.toContain(DEMO_LEADING_PRESET)
  })

  /**
   * And the other filter, which is a different question: the **tree** has
   * nothing for this ask to do. Two presses of *Add the opening hours* would
   * otherwise offer a third.
   */
  it("stops offering an ask the page has nothing left for", async () => {
    const fresh = await sessionFor("nothing-left")
    const first = await ask(fresh, "backdrop")
    const applied = await railOf(first.session)

    expect(applied.view.available).toContain("backdrop")

    /*
     * `band` inserts a section. Held, so the tree has not moved — which is the
     * point: `availablePresets` asks the tree and `stillToAsk` asks the store,
     * and only the second can see a question that is open against a page
     * nothing has happened to yet.
     */
    const second = await ask(first.session, "band")
    const held = await railOf(second.session)

    expect(held.view.available).not.toContain("band")
  })

  /**
   * The two halves of one claim, and the way they would disagree is the defect
   * the pair was built for: the rail saying *2 questions are still waiting on
   * you* over a panel that has withdrawn one.
   */
  it("counts exactly the questions it withdrew", async () => {
    const fresh = await sessionFor("counts")
    const one = await ask(fresh, "trim")
    const two = await ask(one.session, "band")

    const { view } = await railOf(two.session)

    expect(view.waiting?.questions).toBe(2)
    expect(view.available).not.toContain("trim")
    expect(view.available).not.toContain("band")
  })

  /**
   * The third row of the matrix, and the one my first pass at this file missed.
   *
   * Counting the holds rather than the live ones passes every test above,
   * because every test above has two questions that are both still answerable.
   * What it produces on the screen is the rail warning *One question is still
   * waiting on you* directly above a card saying that question is dead, beside a
   * panel that has just re-offered the button that made it.
   */
  it("stops counting a question once the page has moved past it", async () => {
    const fresh = await sessionFor("stops-counting")
    const held = await ask(fresh, "trim")
    const landed = await ask(held.session, "palette")

    expect(held.record.outcome).toBe("awaiting-you")
    expect(landed.record.outcome).toBe("applied")

    const { view } = await railOf(landed.session)

    expect(view.waiting).toBeUndefined()
    /* And the button that made it comes back, because there is nothing to lose. */
    expect(view.available).toContain("trim")
  })

  it("says nothing about a question when there is none", async () => {
    const fresh = await sessionFor("no-question")
    const asked = await ask(fresh, "palette")

    expect(asked.record.outcome).toBe("applied")
    expect((await railOf(asked.session)).view.waiting).toBeUndefined()
  })
})

describe("the marks the page is carrying", () => {
  /**
   * The fourth row of the matrix. `marked` is built from the marks that were
   * **drawn**, never from the changes that asked for one — a re-theme
   * configures the page root, and a ring around the whole stage points at
   * nothing, so the rail must not promise a mark for it.
   */
  it("never lets the rail claim a mark the page is not carrying", async () => {
    const fresh = await sessionFor("marks")

    /*
     * The re-theme is the case: one configure against the page root, worth
     * marking and impossible to mark — a ring around the whole stage points at
     * nothing. The removal beside it draws a real one.
     */
    const themed = await ask(fresh, "palette")
    const removed = await ask(themed.session, "trim")

    const { view } = await railOf(removed.session)

    expect(view.spots.length).toBeGreaterThan(0)
    for (const spot of view.spots) expect(spot.nodeId).not.toBe(removed.record.recordId)

    /*
     * Two changes are marked-worthy and one mark was drawn, so the rail says
     * the single-mark line and names nobody — rather than the *each question is
     * marked* line, which over one ring is a promise the page is not keeping.
     */
    expect(view.marked.words.has(themed.record.recordId)).toBe(false)
    expect(view.marked.words.size).toBe(0)
    expect(view.marked.tone).toBe("awaiting")
  })

  /**
   * The fourth row, from the side it is actually observable on.
   *
   * `markedPage` is handed each change's **own** marks. Handed the page's whole
   * set instead, it still counts and still picks a tone — so a single open
   * question is indistinguishable — and the two cards below come out wearing one
   * label between them. A stranger reading two questions in the rail and two
   * rings on the page is then told, twice, to look at the same ring.
   */
  it("gives each marked question its own words, not the page's first mark twice", async () => {
    const fresh = await sessionFor("own-words")
    const one = await ask(fresh, "trim")
    const two = await ask(one.session, "band")

    const { view } = await railOf(two.session)

    const first = view.marked.words.get(one.record.recordId)
    const second = view.marked.words.get(two.record.recordId)

    expect(first).toBeDefined()
    expect(second).toBeDefined()
    expect(first).not.toBe(second)

    /* And each is a label the page really drew, for that change and no other. */
    expect(view.spots.map((spot) => spot.label)).toContain(first)
    expect(view.spots.map((spot) => spot.label)).toContain(second)
  })

  /**
   * The fifth row, and the newest: the eighth reading, added on 20 September
   * and unwired the same day by changing `putsSomethingBack(one.record)` to
   * `false`, with 490 tests green.
   *
   * Two presses of a toggle put the page back where it started, so the mark on
   * the band must say it went **back** rather than that it is new. The card
   * three inches away already said so; this is the half that was contradicting
   * it.
   */
  it("marks a second press of a toggle as one that went back", async () => {
    const fresh = await sessionFor("went-back")
    const once = await ask(fresh, "backdrop")
    const twice = await ask(once.session, "backdrop")

    expect(twice.record.wentBack).toBe(true)

    const { view } = await railOf(twice.session)
    const labels = view.spots.map((spot) => spot.label)

    expect(labels.length).toBeGreaterThan(0)
    expect(labels.some((label) => /back/i.test(label))).toBe(true)
    expect(labels.some((label) => /just changed|just added/i.test(label))).toBe(false)
  })

  /**
   * The stage scrolls on a token rather than on a count, so a second question
   * asked against the same revision still carries the visitor to its own mark.
   */
  it("moves the scroll token when the newest question changes at one revision", async () => {
    const fresh = await sessionFor("token")
    const one = await ask(fresh, "trim")
    const first = await railOf(one.session)

    const two = await ask(one.session, "band")
    const second = await railOf(two.session)

    expect(second.tree.revision).toBe(first.tree.revision)
    expect(second.view.spotlightToken).not.toBe(first.view.spotlightToken)
    expect(second.view.about?.record.recordId).toBe(two.record.recordId)
  })
})

describe("a question the page has moved past", () => {
  /**
   * Two presses: one the Gate holds, then one that lands on its own. The second
   * moves the revision, and the first question dies where it stands — the
   * runtime's `baseRevision` is how a reader can tell without parsing the delta.
   */
  const stranded = async (name: string) => {
    const fresh = await sessionFor(name)
    const held = await ask(fresh, "trim")
    const landed = await ask(held.session, "palette")

    expect(held.record.outcome).toBe("awaiting-you")
    expect(landed.record.outcome).toBe("applied")

    return { ...(await railOf(landed.session)), stale: held.record, session: landed.session }
  }

  it("tells the card the page moved on, and tells it nothing else", async () => {
    const { view, stale } = await stranded("note-only")

    expect(view.readings.get(stale.recordId)).toEqual({
      moved: expect.objectContaining({ technical: expect.any(String) }),
    })
  })

  /**
   * **The defect this extraction found on its first day.**
   *
   * `page.tsx` filtered the effect and the plain reading to the holds that could
   * still be answered, said in its own comment that the preview was filtered
   * "for the same reason", and built the preview from *every* hold. Nothing
   * caught it, because the filter and the map it guards were forty lines apart
   * in a file no test could reach.
   *
   * What a stranger got, on the stacked layout — the one layout the preview
   * exists for — was a card that said **Nothing changed**, then *"The change no
   * longer fits this page — something it referred to has moved or gone"*, and
   * then a rendered picture of the thing, plainly still there, captioned **"This
   * is what would come off the page."** One card, contradicting itself twice, at
   * the demo's most interesting moment.
   *
   * The part is still perfectly renderable, which is why this is asserted from
   * both sides: the reading is absent *and* the renderer was never called.
   */
  it("shows no preview of a change that can no longer happen", async () => {
    const { view, shown, tree, stale, session } = await stranded("no-preview")

    expect(view.readings.get(stale.recordId)?.inQuestion).toBeUndefined()
    expect(shown).toEqual([])

    /*
     * And the part was there to be drawn, so the absence is this unit's
     * decision rather than an accident of the tree. This is the assertion that
     * fails if the filter is taken back out: the renderer gets called, with a
     * real part, for a change that can never happen.
     */
    const hold = (await holdsOf(session, tree)).find(
      (one) => one.proposalId === stale.heldProposalId
    )
    if (hold === undefined) throw new Error("the store dropped the stranded hold")

    expect(partInQuestion(tree, hold.proposal.delta)).toBeDefined()
  })

  it("computes neither reading against a tree the hold never saw", async () => {
    const { view, stale } = await stranded("neither")
    const reading = view.readings.get(stale.recordId)

    expect(reading?.effect).toBeUndefined()
    expect(reading?.plain).toBeUndefined()
  })
})

describe("a question that can still be answered", () => {
  it("gets all three readings, and the preview is the part the delta names", async () => {
    const fresh = await sessionFor("answerable")
    const asked = await ask(fresh, "trim")

    const { view, tree, shown } = await railOf(asked.session)
    const reading = view.readings.get(asked.record.recordId)

    expect(reading?.effect).toBeDefined()
    expect(reading?.plain?.length).toBeGreaterThan(0)
    expect(reading?.moved).toBeUndefined()

    const hold = (await holdsOf(asked.session, tree))[0]
    if (hold === undefined) throw new Error("the store kept nothing")

    expect(shown).toEqual([hold.proposalId])
    expect(reading?.inQuestion).toEqual(partInQuestion(tree, hold.proposal.delta))
  })

  /**
   * A held change the page has not moved past is the one the visitor is being
   * asked about, so it outranks a receipt: the marks, the legend and the way
   * back are all about it.
   */
  it("is the change the page is about, ahead of one that already landed", async () => {
    const fresh = await sessionFor("outranks")
    const landed = await ask(fresh, "palette")
    const held = await ask(landed.session, "trim")

    const { view } = await railOf(held.session)

    expect(view.about?.record.recordId).toBe(held.record.recordId)
    expect(view.about?.tone).toBe("awaiting")
  })
})

describe("a visitor who has done nothing", () => {
  it("is offered every ask the page has room for, and told about no question", async () => {
    const fresh = await sessionFor("arrival")
    const { view, shown } = await railOf(fresh)

    expect(view.available.length).toBeGreaterThan(0)
    expect(view.waiting).toBeUndefined()
    expect(view.readings.size).toBe(0)
    expect(view.spots).toEqual([])
    expect(view.about).toBeUndefined()
    expect(shown).toEqual([])
    expect(view.spotlightToken).toBe("0:")
  })
})
