import { describe, expect, it } from "vitest"

import type { AttemptLog } from "./attempts"
import type { AttemptRecord } from "./throttle"

/**
 * One suite, run against every `AttemptLog`.
 *
 * The same argument the runtime's store and journal contracts make: an interface
 * is only tested once a second implementation exists. It matters more here than
 * it does there, because the Postgres implementation restates `afterFailure` as
 * SQL `CASE` expressions to get atomicity — so a disagreement between memory and
 * Postgres is not a curiosity, it is a throttle that behaves one way in
 * development and another in production. This suite is what turns that into a
 * failing test.
 */

const T0 = 1_700_000_000_000

/** Cutoffs are handed in as plain numbers, so a test can name one directly. */
const FORGETS_NOTHING = 0

const unwrap = async (
  operation: Promise<{ readonly ok: true; readonly value: AttemptRecord | null } | { readonly ok: false }>
): Promise<AttemptRecord | null> => {
  const result = await operation

  if (!result.ok) throw new Error("the attempt log failed during a contract test")

  return result.value
}

export const describeAttemptLogContract = (
  name: string,
  build: () => Promise<AttemptLog> | AttemptLog
): void => {
  describe(`${name} — AttemptLog contract`, () => {
    it("remembers nothing about a subject it has not seen", async () => {
      const log = await build()

      expect(await unwrap(log.recall("nobody", FORGETS_NOTHING))).toBeNull()
    })

    it("starts a record on the first failure", async () => {
      const log = await build()

      expect(await unwrap(log.penalise("a", T0, FORGETS_NOTHING))).toEqual({
        failures: 1,
        firstFailureAt: T0,
        lastFailureAt: T0,
      })
    })

    it("counts up and holds the first failure's time", async () => {
      const log = await build()
      await log.penalise("a", T0, FORGETS_NOTHING)

      expect(await unwrap(log.penalise("a", T0 + 500, FORGETS_NOTHING))).toEqual({
        failures: 2,
        firstFailureAt: T0,
        lastFailureAt: T0 + 500,
      })
    })

    it("answers with what it wrote, so no caller has to read it back", async () => {
      const log = await build()
      const written = await unwrap(log.penalise("a", T0, FORGETS_NOTHING))

      expect(await unwrap(log.recall("a", FORGETS_NOTHING))).toEqual(written)
    })

    it("counts subjects separately", async () => {
      const log = await build()
      await log.penalise("a", T0, FORGETS_NOTHING)
      await log.penalise("a", T0 + 1, FORGETS_NOTHING)
      await log.penalise("b", T0 + 2, FORGETS_NOTHING)

      expect((await unwrap(log.recall("a", FORGETS_NOTHING)))?.failures).toBe(2)
      expect((await unwrap(log.recall("b", FORGETS_NOTHING)))?.failures).toBe(1)
    })

    it("forgets a subject on request, which is what a correct key buys", async () => {
      const log = await build()
      await log.penalise("a", T0, FORGETS_NOTHING)
      await log.forgive("a")

      expect(await unwrap(log.recall("a", FORGETS_NOTHING))).toBeNull()
    })

    it("forgives a subject it has never seen without complaining", async () => {
      const log = await build()

      expect((await log.forgive("nobody")).ok).toBe(true)
    })

    it("reports a record older than the cutoff as no record at all", async () => {
      const log = await build()
      await log.penalise("a", T0, FORGETS_NOTHING)

      expect(await unwrap(log.recall("a", T0 + 1))).toBeNull()
    })

    /**
     * The cutoff is the whole of what "stale" means at this seam, and both
     * implementations have to apply it on the write as well as the read — a
     * `penalise` that carried a forgotten count forward would hand a returning
     * caller somebody else's escalation.
     */
    it("restarts the count when the record it would have carried is stale", async () => {
      const log = await build()
      await log.penalise("a", T0, FORGETS_NOTHING)
      await log.penalise("a", T0 + 1, FORGETS_NOTHING)

      expect(await unwrap(log.penalise("a", T0 + 5_000, T0 + 4_000))).toEqual({
        failures: 1,
        firstFailureAt: T0 + 5_000,
        lastFailureAt: T0 + 5_000,
      })
    })

    it("keeps counting when the record is inside the cutoff", async () => {
      const log = await build()
      await log.penalise("a", T0, FORGETS_NOTHING)

      expect((await unwrap(log.penalise("a", T0 + 5_000, T0 - 1_000)))?.failures).toBe(2)
    })

    /**
     * Two failures arriving together must both be counted. A read-then-write
     * implementation passes every test above and fails this one, and an attacker
     * who sends their guesses in parallel is exactly the caller who would find
     * that out first.
     */
    it("counts concurrent failures for the same subject without losing any", async () => {
      const log = await build()

      await Promise.all(
        Array.from({ length: 8 }, (_, index) => log.penalise("a", T0 + index, FORGETS_NOTHING))
      )

      expect((await unwrap(log.recall("a", FORGETS_NOTHING)))?.failures).toBe(8)
    })
  })
}
