import { describe, expect, it } from "vitest"

import { proposalIdSchema, type StakeFactorCode } from "@jam-overture/loom"

import { runtimeWordsIn } from "../_test/plain-language"
import {
  askedFor,
  basisOf,
  costOf,
  leftOut,
  MOVEMENTS,
  movedIn,
  readsTheRulesWrong,
  restOf,
  verdictOf,
  whatHappened,
  WOULD_HAPPEN,
} from "./what-if-view"
import type { Gameplan, JudgedChange, Movement, Replay } from "./what-if"

const change = (over: Partial<JudgedChange> = {}): JudgedChange => ({
  proposalId: proposalIdSchema.parse("p_1"),
  origin: "user-instruction",
  confidence: 0.9,
  stakes: "low",
  reversible: true,
  factors: [] as readonly StakeFactorCode[],
  recorded: { kind: "accepted", code: "within-policy" },
  answer: undefined,
  held: false,
  asked: "make the heading friendlier",
  at: "2026-10-01T09:00:00.000Z",
  ...over,
})

const replay = (over: Partial<Replay> = {}): Replay => ({
  changes: [],
  judged: 0,
  setAside: {
    "judged-under-other-rules": 0,
    "not-enough-recorded": 0,
    "did-not-reproduce": 0,
  },
  ...over,
})

const plan = (over: Partial<Gameplan> = {}): Gameplan => ({
  weighed: 0,
  unchanged: 0,
  moved: [],
  againstYourNo: 0,
  offYourQueue: 0,
  ...over,
})

const moved = (movement: Exclude<Movement, "unchanged">, over: Partial<JudgedChange> = {}) => ({
  change: change(over),
  would: { kind: "accepted", code: "within-policy" } as const,
  movement,
})

describe("what a change would become", () => {
  it("has a reading for every movement, the unchanged one included", () => {
    expect(Object.keys(WOULD_HAPPEN).sort()).toEqual(
      ["asks-you", "goes-ahead", "turned-down", "unchanged"].sort()
    )
  })

  it("draws a group for the three movements that are news, in that order", () => {
    expect(MOVEMENTS).toEqual(["goes-ahead", "asks-you", "turned-down"])
    expect(MOVEMENTS).not.toContain("unchanged")
  })

  it.each(Object.entries(WOULD_HAPPEN))("says %s without the runtime's vocabulary", (_key, words) => {
    expect(runtimeWordsIn(words.label)).toEqual([])
    expect(runtimeWordsIn(words.meaning)).toEqual([])
  })

  /**
   * The runtime's own name is kept, one click down, for every one of them —
   * the governing principle is that nothing is removed, and a reader comparing
   * this screen against a change's record needs the word the record uses.
   */
  it("keeps the runtime's own name for each", () => {
    expect(WOULD_HAPPEN["goes-ahead"].technical).toBe("accepted")
    expect(WOULD_HAPPEN["asks-you"].technical).toBe("requires-confirmation")
    expect(WOULD_HAPPEN["turned-down"].technical).toBe("rejected")
  })

  it("tells the three apart by tone", () => {
    expect(WOULD_HAPPEN["goes-ahead"].tone).toBe("applied")
    expect(WOULD_HAPPEN["asks-you"].tone).toBe("awaiting")
    expect(WOULD_HAPPEN["turned-down"].tone).toBe("rejected")
  })
})

describe("what there is to play against", () => {
  it("says a deployment nothing has happened on is empty, and what would end that", () => {
    expect(basisOf(replay())).toContain("Ask for a change")
  })

  /**
   * Nothing to weigh and nothing judged are different claims, and the screen
   * has to be able to make both: a reader whose thirty changes were all set
   * aside is in a very different position from one who has asked for nothing.
   */
  it("says so differently when there are changes but none can be weighed", () => {
    const some = replay({ judged: 4, setAside: { "judged-under-other-rules": 4, "not-enough-recorded": 0, "did-not-reproduce": 0 } })

    expect(basisOf(some)).toContain("4 changes")
    expect(basisOf(some)).not.toContain("Ask for a change")
  })

  it("counts what it can weigh rather than what was judged", () => {
    const some = replay({
      changes: [change(), change()],
      judged: 9,
      setAside: { "judged-under-other-rules": 7, "not-enough-recorded": 0, "did-not-reproduce": 0 },
    })

    expect(basisOf(some)).toContain("2 changes")
    expect(basisOf(some)).not.toContain("9")
  })

  it.each([0, 1, 4])("reads plainly with %s on the record", (judged) => {
    expect(runtimeWordsIn(basisOf(replay({ judged })))).toEqual([])
  })
})

describe("the answer in one sentence", () => {
  it("asks for a dial to be moved before it claims anything", () => {
    expect(verdictOf(plan({ weighed: 3 }), false)).toContain("Move one of the settings")
  })

  /**
   * Said out loud rather than shown as an empty list. A reader who has just
   * moved a dial is owed a yes or a no, and this lane has repeatedly found
   * that an empty box reads as a screen that failed to load.
   */
  it("says nothing would change rather than showing nothing", () => {
    expect(verdictOf(plan({ weighed: 30, unchanged: 30 }), true)).toBe(
      "None of your last 30 changes would have gone any differently."
    )
  })

  it("counts what would move", () => {
    expect(verdictOf(plan({ weighed: 30, moved: [moved("goes-ahead")] }), true)).toBe(
      "1 of your last 30 changes would have gone a different way."
    )
  })

  it("says there is nothing to try against rather than reporting a zero", () => {
    expect(verdictOf(plan(), true)).toContain("nothing on the record")
  })

  it("agrees with itself about one change", () => {
    expect(verdictOf(plan({ weighed: 1, unchanged: 1 }), true)).toContain("1 change would")
  })

  it.each([
    [plan({ weighed: 3 }), false],
    [plan({ weighed: 3, unchanged: 3 }), true],
    [plan({ weighed: 3, moved: [moved("asks-you")] }), true],
    [plan(), true],
  ] as const)("reads plainly", (given, asked) => {
    expect(runtimeWordsIn(verdictOf(given, asked))).toEqual([])
  })
})

describe("the changes that would not move", () => {
  /**
   * Found on a screenshot of a refusal floor at `low`, where every change
   * moves: **"The other 0 would have gone exactly as they did."** A count of
   * nothing printed as a reassurance is the shape of sentence a template
   * produces and only an eye catches.
   */
  it("says nothing rather than reassuring about nothing", () => {
    expect(restOf(plan({ weighed: 3, unchanged: 0, moved: [moved("turned-down")] }))).toBe("")
  })

  it("counts the ones that stay put", () => {
    expect(restOf(plan({ weighed: 3, unchanged: 2 }))).toBe(
      "The other 2 would have gone exactly as they did."
    )
  })

  it("agrees with itself about one", () => {
    expect(restOf(plan({ weighed: 2, unchanged: 1 }))).toBe(
      "The other one would have gone exactly as it did."
    )
  })

  it("reads plainly", () => {
    expect(runtimeWordsIn(restOf(plan({ unchanged: 4 })))).toEqual([])
  })
})

describe("the half a loosening hides", () => {
  it("says nothing when there is nothing to warn about", () => {
    expect(costOf(plan({ weighed: 4, moved: [moved("goes-ahead")] }))).toBe("")
  })

  it("names the changes somebody turned down", () => {
    expect(costOf(plan({ againstYourNo: 2 }))).toBe(
      "Of the ones that would go ahead without asking, 2 are changes you said no to."
    )
  })

  it("names the changes still waiting", () => {
    expect(costOf(plan({ offYourQueue: 1 }))).toContain("1 is still waiting for your answer")
  })

  it("joins the two rather than printing one sentence each", () => {
    const reading = costOf(plan({ againstYourNo: 1, offYourQueue: 3 }))

    expect(reading).toContain("1 is a change you said no to and 3 are still waiting")
    expect(reading.split(".").filter((part) => part.trim() !== "")).toHaveLength(1)
  })

  it("reads plainly", () => {
    expect(runtimeWordsIn(costOf(plan({ againstYourNo: 2, offYourQueue: 1 })))).toEqual([])
  })
})

describe("one change on a row", () => {
  it("prints what was asked for", () => {
    expect(askedFor(change())).toBe("make the heading friendlier")
  })

  /**
   * A row with no words on it is a row a reader cannot tell from the next one.
   * The runtime does not promise a rationale, so the absence gets a sentence
   * rather than a blank line.
   */
  it("says something rather than nothing when no reason was recorded", () => {
    expect(askedFor(change({ asked: "   " }))).toBe("Somebody asked for a change here.")
  })

  it.each([
    [{ answer: "confirmed" as const }, "You said yes"],
    [{ answer: "discarded" as const }, "You said no"],
    [
      { recorded: { kind: "requires-confirmation" as const, code: "irreversible" as const }, held: true },
      "still waiting for your answer",
    ],
    [
      { recorded: { kind: "requires-confirmation" as const, code: "irreversible" as const }, held: false },
      "never reached anybody",
    ],
    [
      { recorded: { kind: "rejected" as const, code: "confidence-below-floor" as const } },
      "was turned down",
    ],
    [{}, "went ahead without anybody being asked"],
  ])("says what really became of it", (over, expected) => {
    expect(whatHappened(change(over))).toContain(expected)
  })

  it.each([
    [{ answer: "confirmed" as const }],
    [{ answer: "discarded" as const }],
    [{ recorded: { kind: "rejected" as const, code: "confidence-below-floor" as const } }],
    [{}],
  ])("reads plainly", (over) => {
    expect(runtimeWordsIn(whatHappened(change(over)))).toEqual([])
  })
})

describe("what was left out", () => {
  it("says nothing when nothing was", () => {
    expect(leftOut(replay({ judged: 2, changes: [change(), change()] }))).toEqual([])
  })

  it("gives a reason per kind, and only for the ones that happened", () => {
    const readings = leftOut(
      replay({
        judged: 5,
        setAside: {
          "judged-under-other-rules": 3,
          "not-enough-recorded": 0,
          "did-not-reproduce": 1,
        },
      })
    )

    expect(readings).toHaveLength(2)
    expect(readings[0]).toContain("3 changes were judged under rules that are not the ones you have now")
    expect(readings[1]).toContain("this screen being wrong about a rule")
  })

  it.each(["judged-under-other-rules", "not-enough-recorded", "did-not-reproduce"] as const)(
    "reads %s plainly",
    (reason) => {
      const readings = leftOut(
        replay({ judged: 1, setAside: { "judged-under-other-rules": 0, "not-enough-recorded": 0, "did-not-reproduce": 0, [reason]: 1 } })
      )

      expect(runtimeWordsIn(readings[0] ?? "")).toEqual([])
    }
  )

  /**
   * One change this screen could not reproduce means it has misread a rule, and
   * no amount of the rest being right makes that safe to bury under a smaller
   * denominator.
   */
  it("is a warning rather than a footnote when the arithmetic did not reproduce", () => {
    expect(readsTheRulesWrong(replay({ judged: 1 }))).toBe(false)
    expect(
      readsTheRulesWrong(
        replay({ setAside: { "judged-under-other-rules": 9, "not-enough-recorded": 9, "did-not-reproduce": 1 } })
      )
    ).toBe(true)
  })
})

describe("picking the changes for one group", () => {
  it("takes only the ones that land there", () => {
    const given = plan({ moved: [moved("goes-ahead"), moved("asks-you"), moved("goes-ahead")] })

    expect(movedIn(given, "goes-ahead")).toHaveLength(2)
    expect(movedIn(given, "turned-down")).toEqual([])
  })
})
