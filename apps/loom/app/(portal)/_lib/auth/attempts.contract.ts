import { describe, expect, it } from "vitest"

import type { AttemptLog, AttemptSurvey } from "./attempts"
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

const surveyed = async (log: AttemptLog, cutoff: number, limit: number): Promise<AttemptSurvey> => {
  const result = await log.survey(cutoff, limit)

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

    /**
     * The survey half. Same argument as above and then some: the Postgres
     * implementation computes its totals in SQL and the memory one in
     * JavaScript, so nothing but this suite makes them agree on what "live"
     * means, on what an empty table reports, or on which rows a cap keeps.
     */
    describe("survey", () => {
      it("reports nothing over an empty log, rather than reporting no dates as zero", async () => {
        const log = await build()

        expect(await surveyed(log, FORGETS_NOTHING, 10)).toEqual({
          subjects: 0,
          failures: 0,
          earliestFailureAt: null,
          latestFailureAt: null,
          records: [],
        })
      })

      it("counts subjects and failures separately", async () => {
        const log = await build()
        await log.penalise("a", T0, FORGETS_NOTHING)
        await log.penalise("a", T0 + 1, FORGETS_NOTHING)
        await log.penalise("b", T0 + 2, FORGETS_NOTHING)

        const survey = await surveyed(log, FORGETS_NOTHING, 10)

        expect(survey.subjects).toBe(2)
        expect(survey.failures).toBe(3)
      })

      it("spans from the earliest first failure to the latest last one", async () => {
        const log = await build()
        await log.penalise("a", T0, FORGETS_NOTHING)
        await log.penalise("a", T0 + 900, FORGETS_NOTHING)
        await log.penalise("b", T0 + 400, FORGETS_NOTHING)

        const survey = await surveyed(log, FORGETS_NOTHING, 10)

        expect(survey.earliestFailureAt).toBe(T0)
        expect(survey.latestFailureAt).toBe(T0 + 900)
      })

      it("leaves out a record the cutoff has forgotten, totals included", async () => {
        const log = await build()
        await log.penalise("old", T0, FORGETS_NOTHING)
        await log.penalise("new", T0 + 5_000, FORGETS_NOTHING)

        const survey = await surveyed(log, T0 + 1_000, 10)

        expect(survey.subjects).toBe(1)
        expect(survey.failures).toBe(1)
        expect(survey.latestFailureAt).toBe(T0 + 5_000)
      })

      it("leaves out a subject that was forgiven", async () => {
        const log = await build()
        await log.penalise("a", T0, FORGETS_NOTHING)
        await log.forgive("a")

        expect((await surveyed(log, FORGETS_NOTHING, 10)).subjects).toBe(0)
      })

      it("returns the records newest first", async () => {
        const log = await build()
        await log.penalise("a", T0 + 100, FORGETS_NOTHING)
        await log.penalise("b", T0 + 300, FORGETS_NOTHING)
        await log.penalise("c", T0 + 200, FORGETS_NOTHING)

        expect(
          (await surveyed(log, FORGETS_NOTHING, 10)).records.map((record) => record.lastFailureAt)
        ).toEqual([T0 + 300, T0 + 200, T0 + 100])
      })

      /**
       * The cap is on the sample and never on the totals — an operator reading
       * "2 subjects" off a page that fetched one row would be reading their own
       * page size back to themselves.
       */
      it("caps the records without capping the totals", async () => {
        const log = await build()
        await log.penalise("a", T0 + 1, FORGETS_NOTHING)
        await log.penalise("b", T0 + 2, FORGETS_NOTHING)
        await log.penalise("c", T0 + 3, FORGETS_NOTHING)

        const survey = await surveyed(log, FORGETS_NOTHING, 2)

        expect(survey.subjects).toBe(3)
        expect(survey.records).toHaveLength(2)
      })

      /** The cap keeps the newest, because those are the ones a lockout can still be running on. */
      it("keeps the newest records when it caps", async () => {
        const log = await build()
        await log.penalise("a", T0 + 1, FORGETS_NOTHING)
        await log.penalise("b", T0 + 2, FORGETS_NOTHING)
        await log.penalise("c", T0 + 3, FORGETS_NOTHING)

        expect(
          (await surveyed(log, FORGETS_NOTHING, 1)).records.map((record) => record.lastFailureAt)
        ).toEqual([T0 + 3])
      })

      it("carries each subject's own count into its record", async () => {
        const log = await build()
        await log.penalise("a", T0, FORGETS_NOTHING)
        await log.penalise("a", T0 + 1, FORGETS_NOTHING)

        expect((await surveyed(log, FORGETS_NOTHING, 10)).records).toEqual([
          { failures: 2, firstFailureAt: T0, lastFailureAt: T0 + 1 },
        ])
      })
    })
  })
}
