import { describe, expect, it } from "vitest"

import { docsGatePolicy } from "../propose/policy"

import { produceAnswers, produceQueue, produceSecondLook } from "./queue"

/**
 * What the queue page prints, held against the runtime that produced it.
 *
 * The page's claim is not that a queue exists. It is that **a queue cannot tell
 * you which of the things in it can still be applied**, and that the comparison
 * which can is one a host makes for itself. So the tests below are mostly about
 * that subtraction: that both kinds of row are really there, that the runtime
 * really refuses the older one, and that refusing it takes it out of the queue
 * rather than leaving it to be answered again.
 *
 * Where a number on the page is produced, the test asserts the *relationship*
 * that makes it worth printing rather than the number — `heldAgainst` against
 * head, not "1 against 2". A page whose story needed re-tuning would otherwise
 * be re-tuned by editing the test to match it, which is the thing a test is for
 * stopping.
 */

describe("the review queue", () => {
  it("shows everything waiting for a person, oldest first", async () => {
    const queue = await produceQueue()
    const [first, second] = queue.waiting

    expect(queue.waiting).toHaveLength(2)
    expect(first?.heldAgainst).toBeLessThan(second?.heldAgainst ?? 0)
  })

  it("holds changes for both of the reasons a hold happens", async () => {
    const queue = await produceQueue()

    expect(queue.waiting.map((row) => row.reason)).toEqual([
      "stakes-above-ceiling",
      "confidence-below-minimum",
    ])
  })

  it("holds a low-stakes change when the planner was not sure enough", async () => {
    const queue = await produceQueue()
    const unsure = queue.waiting.find((row) => row.reason === "confidence-below-minimum")

    expect(unsure?.stakes).toBe("low")
    expect(unsure?.confidence).toBeLessThan(docsGatePolicy.minimumConfidence)
  })

  it("has one change that can still be applied and one that cannot", async () => {
    const queue = await produceQueue()

    expect(queue.answerable).toBe(1)
    expect(queue.dead).toBe(1)
  })

  /**
   * The claim the whole page rests on. Nothing a hold carries says "stale" — the
   * only thing that decides it is the revision it names against where the page
   * has got to, which is why a host has to make the comparison itself.
   */
  it("calls a change answerable exactly when it was judged against head", async () => {
    const queue = await produceQueue()

    for (const row of queue.waiting) {
      expect(row.stillAnswerable, row.asked).toBe(row.heldAgainst === queue.head)
    }
  })

  it("carries what a reviewer needs to decide, in the asker's own words", async () => {
    const queue = await produceQueue()

    for (const row of queue.waiting) {
      expect(row.asked.length, "the utterance").toBeGreaterThan(0)
      expect(row.askedBy, "the actor").not.toBe("nobody named")
      expect(row.rationale.length, "the plan").toBeGreaterThan(0)
      expect(row.detail.length, "the Gate's reason").toBeGreaterThan(0)
    }
  })
})

describe("answering one", () => {
  it("applies the change that was judged against the page as it stands", async () => {
    const [yes] = await produceAnswers()

    expect(yes?.ending).toBe("committed")
    expect(yes?.headAfter).toBe((yes?.headBefore ?? 0) + 1)
  })

  it("refuses the one the page moved past, and says which revisions disagree", async () => {
    const [, tooLate] = await produceAnswers()

    expect(tooLate?.ending).toBe("not-written")
    expect(tooLate?.said).toContain("moved on")
    expect(tooLate?.headAfter).toBe(tooLate?.headBefore)
  })

  /**
   * The part a reviewer has to be told, because it is the opposite of what a
   * queue usually does: the failed answer is not left to be tried again. Custody
   * ends on the attempt, so the row disappears.
   */
  it("takes the change out of the queue even though answering it failed", async () => {
    const [, tooLate] = await produceAnswers()

    expect(tooLate?.waitingAfter).toBe(0)
  })

  it("writes no revision when a person says no", async () => {
    const [, , no] = await produceAnswers()

    expect(no?.call).toBe("discardHeld")
    expect(no?.headAfter).toBe(no?.headBefore)
    expect(no?.waitingAfter).toBe(0)
  })

  it("answers each waiting change exactly once", async () => {
    const answers = await produceAnswers()

    expect(answers).toHaveLength(3)
    expect(answers.at(-1)?.waitingAfter).toBe(0)
  })
})

describe("the second look a confirmation takes", () => {
  it("judges the change under the policy that resolves now, not the one that held it", async () => {
    const look = await produceSecondLook()

    expect(look.heldUnder).not.toBe(look.answeredUnder)
    expect(look.ending).toBe("refused")
  })

  it("reaches a different verdict on the same change, from the same damage", async () => {
    const look = await produceSecondLook()

    expect(look.heldReason).toBe("stakes-above-ceiling")
    expect(look.nowReason).toBe("stakes-at-refusal-floor")
    expect(look.nowDetail).toBe(look.heldDetail)
  })

  it("writes nothing, and leaves nothing waiting", async () => {
    const look = await produceSecondLook()

    expect(look.head).toBe(0)
    expect(look.waitingAfter).toBe(0)
  })
})
