/**
 * Waiting for seeding, with a limit, and never twice for the same failure.
 *
 * Both seeds memoise their promise so the work happens once per process. The
 * first version stored it with `??=` and never cleared it, which is correct
 * while the promise resolves and is a trap when it does not:
 *
 * - **A hung promise hangs everything behind it.** One stuck query on the first
 *   request poisons the instance — every later request awaits the same pending
 *   promise, forever, long after the database recovers, until the instance is
 *   recycled. `/portal` returning 504 after five minutes while `/portal/sign-in`
 *   answered in 1.48s is this: sign-in does not seed, and the portal does.
 * - **A rejected promise rejects forever.** `??=` keeps it, so a transient
 *   failure on the first request becomes a permanent one.
 *
 * So: a seed gets a budget. Past it the page renders anyway — from a store that
 * may not be seeded yet, which is a screen saying *nothing here* rather than a
 * screen that never arrives. The seeding is not cancelled; it finishes in the
 * background and the next request finds its rows.
 */

/**
 * Long enough that a healthy seed always wins — on a warm instance it is six
 * primary-key `SELECT`s — and short enough that a person is looking at
 * something rather than waiting.
 */
export const SEEDING_BUDGET_MS = 2_000

export type SeedingOutcome = "seeded" | "still-going" | "failed"

/**
 * Await `work`, but never past the budget, and tell the caller which happened.
 *
 * A rejection is swallowed deliberately: the caller is a page render, and a
 * seed that could not run is not a reason to refuse somebody the screen. What
 * it is is a reason to let the next request try again, which is the `onFailure`
 * callback's job.
 */
export const waitForSeeding = async (
  work: Promise<void>,
  budgetMs: number = SEEDING_BUDGET_MS
): Promise<SeedingOutcome> => {
  let timer: ReturnType<typeof setTimeout> | undefined

  const ranOut = new Promise<"still-going">((resolve) => {
    timer = setTimeout(() => resolve("still-going"), budgetMs)
  })

  try {
    const settled: Promise<SeedingOutcome> = work
      .then((): SeedingOutcome => "seeded")
      .catch((): SeedingOutcome => "failed")

    return await Promise.race([settled, ranOut])
  } finally {
    if (timer !== undefined) clearTimeout(timer)
  }
}
