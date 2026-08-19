import { describe, expect, it } from "vitest"

import { memoryAttemptLog } from "./attempts"
import { describeAttemptLogContract } from "./attempts.contract"

describeAttemptLogContract("memoryAttemptLog", () => memoryAttemptLog())

describe("memoryAttemptLog", () => {
  it("keeps its subjects apart from another log's", async () => {
    const first = memoryAttemptLog()
    const second = memoryAttemptLog()

    await first.penalise("a", 1, 0)

    const seen = await second.recall("a", 0)

    expect(seen.ok && seen.value).toBeNull()
  })

  /**
   * Dropped on read rather than swept. Worth a test because it is the property
   * that keeps a long-lived process from holding a row for every caller that has
   * ever mistyped a key.
   */
  it("drops a stale record instead of carrying it for the life of the process", async () => {
    const log = memoryAttemptLog()
    await log.penalise("a", 1_000, 0)
    await log.recall("a", 2_000)

    const revived = await log.recall("a", 0)

    expect(revived.ok && revived.value).toBeNull()
  })
})
