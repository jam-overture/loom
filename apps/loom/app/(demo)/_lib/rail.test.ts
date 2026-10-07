import { describe, expect, it } from "vitest"

import {
  findNode,
  proposalIdSchema,
  randomIdFactory,
  systemClock,
  type LoomTree,
} from "@jam-overture/loom"
import { commitIntent, confirmHeld, type HeldProposal } from "@jam-overture/loom/write"

import { roomToLand } from "./arrival"
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
 * Yes, on the one hold this session is carrying — through the real write path
 * and folded back onto the record that was waiting, which is the half the
 * other cases in this file do not need and this one cannot do without.
 *
 * A confirmation that moved the head but left `session.records` holding the
 * `awaiting-you` version would be a rail reading a history that does not
 * describe the page under it, and the reading being tested below is the one
 * computed only for a record that has landed.
 */
const allow = async (
  session: DemoSession,
  held: ChangeRecord
): Promise<{ readonly session: DemoSession; readonly record: ChangeRecord }> => {
  const proposalId = held.heldProposalId
  if (!proposalId) throw new Error("nothing was held")

  const write = beginDemoWrite(session)
  await confirmHeld(write.path, {
    proposalId: proposalIdSchema.parse(proposalId),
    actor: "a demo visitor",
  })

  const record = recordFromEvents(write.narrated(), held)
  if (!record) throw new Error("the runtime narrated nothing")

  return { session: rememberRecord(session, record), record }
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
    /** The same substitution for the ask's preview, which has no id to record. */
    showAsk: (part) => part,
    /** And for the part a landed change is holding, which is keyed by its record. */
    showKept: (part) => part,
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

/**
 * **The arrival screen's one invited press, and what it is about.**
 *
 * Both halves are here because both are wiring, and wiring is the one thing
 * four runs of this lane kept losing. The nomination used to be computed in
 * `ask-panel.tsx` and the preview could not be — an excerpt has to be rendered
 * through the registry, which does not cross a client boundary — so the two
 * could only meet here. A page that previewed one ask and offered another would
 * render, build, and pass every component test in this lane.
 */
describe("the ask the arrival screen leads with", () => {
  it("nominates an ask, and shows the part of the page it would touch", async () => {
    const fresh = await sessionFor("leading")
    const { view } = await railOf(fresh)

    expect(view.leading?.preset).toBe(DEMO_LEADING_PRESET)
    expect(view.leading?.part).toBeDefined()
    expect(view.leading?.part?.tree.root.type).toBe("loom.stat-grid")
    expect(view.leading?.part?.lead).toBe("This is what would come off the page.")

    /**
     * And it is an ask's excerpt rather than a question's, which is the rule
     * that draws it at 1280×900. The two are one function and one type apart,
     * so this is the only place the rail's two callbacks can be told apart.
     */
    expect(view.leading?.part?.where).toBe("ask")
  })

  /**
   * The green belongs to the demo's next step, and once a question exists that
   * step is *Apply this change* down inside the card. The panel used to work
   * this out from `waiting`; it is one value now, so the button and the preview
   * cannot come apart — a preview of a sixth thing that could happen, over a
   * question about the fifth, is the panel competing with itself.
   */
  it("nominates nothing while a question is waiting, so nothing is previewed either", async () => {
    const fresh = await sessionFor("leading-waiting")
    const asked = await ask(fresh, DEMO_LEADING_PRESET)
    const { view } = await railOf(asked.session)

    expect(view.waiting).toBeDefined()
    expect(view.leading).toBeUndefined()
  })

  /**
   * **The ask it leads with is one it is also offering.** A nomination read
   * from a different list than the one the panel filters would put a green
   * button above four secondary asks and the same ask in both, or a green
   * button for something the tree cannot do.
   */
  it("leads with an ask that is on the list it hands over", async () => {
    const fresh = await sessionFor("leading-offered")
    const { view } = await railOf(fresh)

    expect(view.leading).toBeDefined()
    expect(view.available).toContain(view.leading!.preset)
  })

  /**
   * A press moves the page, and the next nomination is read against the page as
   * it now stands. Answering the lead's question takes the stat grid off, so
   * the lead has nothing left to do and the rail leads with something else —
   * without a preview only if that something names the page itself.
   */
  it("re-reads the nomination against the page after it has moved", async () => {
    const fresh = await sessionFor("leading-after")
    const first = await ask(fresh, DEMO_LEADING_PRESET)
    const held = await holdsOf(first.session, await headOf(first.session))

    expect(held.length).toBe(1)

    /** Answered the way `actions.ts` answers it, through the real write path. */
    const outcome = await confirmHeld(beginDemoWrite(first.session).path, {
      proposalId: proposalIdSchema.parse(held[0]!.proposalId),
      actor: "a demo visitor",
    })

    expect(outcome.kind).toBe("committed")

    const { view, tree } = await railOf(first.session)

    expect(tree.revision).toBeGreaterThan(0)
    expect(view.available).not.toContain(DEMO_LEADING_PRESET)
    expect(view.leading?.preset).not.toBe(DEMO_LEADING_PRESET)
    expect(view.available).toContain(view.leading!.preset)
  })
})

/**
 * The reading that belongs to a change which has already happened.
 *
 * It is the sixth row of the table this file opens with, waiting to be
 * written: `kept.ts` is a pure function with nine tests of its own, and the
 * only way it reaches a visitor is a loop in `whatTheRailShows` and a callback
 * in `page.tsx`. Delete either and the excerpt is gone from the demo's payoff
 * screen with every one of those nine still green.
 */
describe("what a landed change is still holding", () => {
  it("puts the removed band on the reading of the record that removed it", async () => {
    const session = await sessionFor("kept")
    const asked = await ask(session, DEMO_LEADING_PRESET)
    const landed = await allow(asked.session, asked.record)

    expect(landed.record.outcome).toBe("applied")

    const { view, tree } = await railOf(landed.session)
    const reading = view.readings.get(landed.record.recordId)

    expect(reading?.kept).toBeDefined()
    expect(reading?.kept?.where).toBe("kept")
    expect(reading?.kept?.tree.root.type).toBe("loom.stat-grid")
    /** And it is not on the page, which is the whole of why it is worth drawing. */
    expect(findNode(tree.root, reading!.kept!.tree.root.id)).toBeNull()
  })

  /**
   * **And nothing on a change still waiting**, which is the reading that would
   * put two copies of one band on one card: the question's excerpt says *this
   * is what would come off*, and a second under it saying *this is what came
   * off* would be the card arguing with itself across one press.
   */
  it("holds nothing for a change the Gate has not been answered on", async () => {
    const session = await sessionFor("kept-held")
    const asked = await ask(session, DEMO_LEADING_PRESET)

    const { view } = await railOf(asked.session)
    const reading = view.readings.get(asked.record.recordId)

    expect(reading?.inQuestion).toBeDefined()
    expect(reading?.kept).toBeUndefined()
  })

  /**
   * Two records, two kinds of reading, one map — a landed change holding what
   * it took, above a question that still has its preview, its plain reading
   * and its effect.
   *
   * **It is not a test of the fold, and the defect matrix is what settled
   * that.** Replace the third loop's spread with a bare `set` and nothing goes
   * red, because the only entries it writes are landed records and a landed
   * record has no other reading to lose. The spread stays — three loops write
   * one map and the way that fails is silently — and the claim tested here is
   * the one that can fail: that the two kinds of reading coexist at all.
   */
  it("keeps a question's readings and a landed change's side by side", async () => {
    const session = await sessionFor("kept-fold")
    const asked = await ask(session, DEMO_LEADING_PRESET)
    const landed = await allow(asked.session, asked.record)
    const second = await ask(landed.session, "band")

    const { view } = await railOf(second.session)
    const held = view.readings.get(second.record.recordId)

    /** The newer question keeps everything a question has. */
    expect(held?.inQuestion).toBeDefined()
    expect(held?.effect).toBeDefined()
    expect(held?.plain?.length).toBeGreaterThan(0)
    /** And the landed removal still holds what it took. */
    expect(view.readings.get(landed.record.recordId)?.kept).toBeDefined()
  })
})

/**
 * The card the rail has to hold still, and it is a reading rather than a flag
 * for the same reason every other one here is: the two halves of the fix read
 * it — the trailing room the landing needs (`arrival.ts`) and the card the
 * scroll is taken to (`AnswerInView`) — and a room given for one card while a
 * scroll is taken to another is the pair of half-decisions the whole unit
 * exists to stop.
 */
describe("the card the visitor's press landed", () => {
  it("names the record whose answer produced the revision the page is at", async () => {
    const session = await sessionFor("landing")
    const asked = await ask(session, DEMO_LEADING_PRESET)
    const landed = await allow(asked.session, asked.record)

    const { view } = await railOf(landed.session)

    expect(view.landing).toBe(landed.record.recordId)
  })

  /** Nothing while the question is still the question. */
  it("names nothing while the change is still waiting on an answer", async () => {
    const session = await sessionFor("landing-held")
    const asked = await ask(session, DEMO_LEADING_PRESET)

    const { view } = await railOf(asked.session)

    expect(view.landing).toBeUndefined()
  })

  /**
   * **And the one the Gate let through on its own, which is the row this run
   * added.** `palette` is marked **GOES AHEAD** on the arrival screen: one
   * press, no question, and the record of it is the only place the Gate's
   * verdict, the reversibility and **Put it back** exist. It got no landing
   * until today, and measured at 1280 × 900 that left its card's top at 848 of
   * a 900px viewport.
   *
   * Asserted through the wiring rather than against `landed.ts` alone, because
   * the wiring is what was wrong: the reading was right about the card it named
   * and was being asked too narrow a question.
   */
  it("names a change that went ahead with nobody asked", async () => {
    const session = await sessionFor("landing-alone")
    const asked = await ask(session, "palette")

    const { view } = await railOf(asked.session)

    expect(asked.record.outcome).toBe("applied")
    expect(asked.record.answeredBy).toBeUndefined()
    expect(view.landing).toBe(asked.record.recordId)
  })

  /**
   * And it goes quiet on its own once anything else has moved the page — no
   * flag to clear, because the revision it is compared against is the page's.
   * Two changes, and the landing is the second: the card the visitor answered
   * is the one the page has moved past.
   */
  it("moves to the newest card once a later change has moved the page", async () => {
    const session = await sessionFor("landing-past")
    const asked = await ask(session, DEMO_LEADING_PRESET)
    const landed = await allow(asked.session, asked.record)
    const after = await ask(landed.session, "palette")

    const { view } = await railOf(after.session)

    expect(after.record.outcome).toBe("applied")
    expect(view.landing).toBe(after.record.recordId)
    expect(view.landing).not.toBe(landed.record.recordId)
  })

  /**
   * **And it is the one card left to carry a visitor to, in the sequence a
   * stranger actually makes.** The caution the rail pins exists because they
   * press a second ask before answering the first — and a one-press change
   * moves the page past the hold's base revision, so the question stops being
   * answerable (`movedOn`) and the caution goes with it. The card the press
   * landed is then the only thing on this rail that happened.
   *
   * Which `TheRecord` would hand the scroll to if both were live is its own
   * ordering and asserted there: a question the demo cannot proceed without
   * outranks a card that has already landed. Here the pair is asserted at the
   * other end — the room the landing needs (`arrival.ts`) is owed for it, which
   * is the half that used to be withheld from a change nobody was asked about.
   */
  it("is what is left to carry a visitor to once a second ask has set the question aside", async () => {
    const session = await sessionFor("landing-beside-question")
    const open = await ask(session, DEMO_LEADING_PRESET)
    const after = await ask(open.session, "palette")

    const { view } = await railOf(after.session)

    expect(view.readings.get(open.record.recordId)?.moved).toBeDefined()
    expect(view.waiting).toBeUndefined()
    expect(view.landing).toBe(after.record.recordId)
    expect(roomToLand(view)).toBe("lg:pb-[70vh]")
  })

  /**
   * **One card per revision, which is what makes the reading a lookup rather
   * than a search** — and it is asserted here, against records the pipeline
   * actually produced, because the defect matrix for this unit found it by its
   * absence. *The reading takes the last match instead of the first* was
   * restored and the whole lane stayed green: not because the ordering tests
   * are weak, but because a revision is produced once, so there is no second
   * record for an ordering to choose between.
   *
   * It is a claim about what `record.ts` emits and not about a fixture, so it
   * is made over a real sequence: a question asked and answered, then two asks
   * the Gate let through. A later record shape that let two cards claim one
   * revision — a repair minting its own, an undo folded onto the record it
   * undoes — fails here rather than showing a stranger whichever card
   * `Array.prototype.find` reached first.
   */
  it("leaves at most one record claiming any revision the page can be at", async () => {
    const session = await sessionFor("landing-unique")
    const asked = await ask(session, DEMO_LEADING_PRESET)
    const answered = await allow(asked.session, asked.record)
    const second = await ask(answered.session, "palette")
    const third = await ask(second.session, "backdrop")

    const { view } = await railOf(third.session)
    const claimed = third.session.records.flatMap((record) => record.revision?.produced ?? [])

    expect(third.record.outcome).toBe("applied")
    expect(claimed.length).toBeGreaterThan(2)
    expect(new Set(claimed).size).toBe(claimed.length)
    expect(view.landing).toBe(third.record.recordId)
  })
})

/**
 * The end of the sixty seconds, wired.
 *
 * `what-else.test.ts` holds the reading's three silences against values. What
 * is held here is that the rail hands it the three answers it already has —
 * the landing, the open question and the asks that survived — rather than a
 * fourth opinion of its own, over records the pipeline really produced.
 */
describe("what the rail has left to say", () => {
  /**
   * The screen this unit exists for, reached the way a stranger reaches it:
   * the one press the demo invites, then the answer to it. Measured on a
   * production build at 1280 × 900, that leaves the ask panel at `y −470`, its
   * three remaining rows above the viewport with it, and the footer's way out
   * ten pixels from the bottom edge of the scroller.
   */
  it("speaks once the visitor's own press has put a change on the page", async () => {
    const session = await sessionFor("end-after-answer")
    const asked = await ask(session, DEMO_LEADING_PRESET)
    const answered = await allow(asked.session, asked.record)

    const { view } = await railOf(answered.session)

    expect(view.landing).toBe(answered.record.recordId)
    expect(view.whatElse?.count).toBe(view.available.length)
    expect(view.whatElse?.label).toContain(`${view.available.length} more changes`)
  })

  /**
   * And on the other path through this surface, which is the one a stranger
   * reaches in fifteen seconds: an ask the Gate lets through unattended. The
   * record lands with no question anywhere, so the ending is owed there too.
   */
  it("speaks for a change that went ahead on its own", async () => {
    const session = await sessionFor("end-after-one-press")
    const landed = await ask(session, "palette")

    const { view } = await railOf(landed.session)

    expect(landed.record.outcome).toBe("applied")
    expect(view.waiting).toBeUndefined()
    expect(view.whatElse).toBeDefined()
  })

  /**
   * **The arrival screen is untouched**, and it is asserted here rather than
   * left to a screenshot: nothing has landed, so there is no loop to have
   * closed and nothing to caption.
   */
  it("says nothing on the screen a stranger arrives at", async () => {
    const { view } = await railOf(await sessionFor("end-arrival"))

    expect(view.landing).toBeUndefined()
    expect(view.whatElse).toBeUndefined()
  })

  /**
   * A visitor with a question open has a next move already, with a green
   * button under it, and the caution pinned to the top of the rail says what
   * asking for something else would cost them. Counting other asks underneath
   * that is the surface arguing with its own caution.
   */
  it("says nothing while a question is still waiting on the visitor", async () => {
    const session = await sessionFor("end-while-waiting")
    const asked = await ask(session, DEMO_LEADING_PRESET)

    const { view } = await railOf(asked.session)

    expect(view.waiting).toBeDefined()
    expect(view.whatElse).toBeUndefined()
  })

  /**
   * **The count is the list's**, not the preset table's — which is what makes
   * it a number the next press checks rather than a promise.
   *
   * The sequence is the one the demo invites, and it is the case that moves
   * the number: *Take the numbers off* removes the `loom.stat-grid` the preset
   * plans against, so `availablePresets` stops offering it and the panel is
   * five rows before the press and four after. A visitor who follows the link
   * finds exactly four.
   *
   * The two toggles are the reason this is asserted against `available` rather
   * than against a literal: `palette` and `backdrop` swap back, so they stay
   * on offer after they land and a count written here as a constant would be
   * a second opinion about the panel.
   */
  it("counts the asks the panel is actually about to offer", async () => {
    const session = await sessionFor("end-counts-the-panel")
    const before = await railOf(session)

    const asked = await ask(session, DEMO_LEADING_PRESET)
    const answered = await allow(asked.session, asked.record)
    const { view } = await railOf(answered.session)

    expect(before.view.available).toContain(DEMO_LEADING_PRESET)
    expect(view.available).not.toContain(DEMO_LEADING_PRESET)
    expect(view.available.length).toBe(before.view.available.length - 1)
    expect(view.whatElse?.count).toBe(view.available.length)
  })
})

/**
 * The window on the arrival screen, wired where the other six readings are.
 *
 * `the-page-itself.test.ts` holds which node it is of and that it goes quiet
 * once something has been asked for. What is held here is that **this file
 * answers the question**, over records the pipeline really produced — because
 * the alternative was the condition living in `page.tsx`, which no `vitest` run
 * can mount, and the five readings the 17 September finding counted were all
 * unwired by deleting one argument with the whole suite green.
 */
describe("the page on the first screen", () => {
  /**
   * The screen it exists for. On a production build at 390 × 844 the rail is
   * 1,013px and the stage begins at `y 1,094` — 250px past the fold — so a
   * visitor on a phone arrives on a full screen of instrument and is told to
   * ask *that page* for a change.
   */
  it("draws the top of the page for a visitor who has done nothing", async () => {
    const { tree, view } = await railOf(await sessionFor("itself-arrival"))
    const hero = tree.root.kind === "element" ? tree.root.children[0] : undefined

    expect(view.pageItself?.tree.root.id).toBe(hero?.id)
  })

  /**
   * And takes it away at the first press, which is the one silence this reading
   * has. A held question renders the band it is about inside itself
   * (`part-in-question.tsx`), so a window onto the top of the page above it
   * would be a second rendering competing with the one the visitor was asked
   * about.
   */
  it("says nothing once a question is open", async () => {
    const session = await sessionFor("itself-while-waiting")
    const asked = await ask(session, DEMO_LEADING_PRESET)

    const { view } = await railOf(asked.session)

    expect(view.waiting).toBeDefined()
    expect(view.pageItself).toBeUndefined()
  })

  /**
   * And after a change that went ahead on its own, where the page moving is its
   * own announcement and the record card is at the top of the rail.
   *
   * The two cases are one condition — a record is what an ask produces — and
   * they are asserted separately because the two outcomes reach it by different
   * routes: this one has no hold anywhere, and the one above has nothing
   * applied.
   */
  it("says nothing once a change has landed", async () => {
    const session = await sessionFor("itself-after-landing")
    const landed = await ask(session, "palette")

    const { view } = await railOf(landed.session)

    expect(landed.record.outcome).toBe("applied")
    expect(view.landing).toBeDefined()
    expect(view.pageItself).toBeUndefined()
  })

  /**
   * **The window is of the page the visitor is looking at, at the revision they
   * are looking at it.** A tree id or a revision of its own would be a second
   * opinion about which page this is, which is the defect `ground.ts` was
   * written about in colours.
   */
  it("is of this page, at this revision", async () => {
    const { tree, view } = await railOf(await sessionFor("itself-this-page"))

    expect(view.pageItself?.tree.treeId).toBe(tree.treeId)
    expect(view.pageItself?.tree.revision).toBe(tree.revision)
  })
})
