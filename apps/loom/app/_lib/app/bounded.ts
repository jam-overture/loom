/**
 * Waiting for the database, with a limit.
 *
 * It lives beside the store rather than in a route group because both surfaces
 * need it and neither owns it — `(marketing)` importing it from `(portal)` was
 * a lane crossing I made and am undoing here.
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


/**
 * A read, or nothing, within the budget.
 *
 * The companion to the seeding budget and the more important half. Every
 * surface that reads the store already handles a store that *refuses* — the
 * marketing pages fall back to the page they were authored as, which is what
 * [0262](../../../../../decisions/0262-the-control-plane-is-hosted-and-the-render-path-stays-in-the-customers-app.md)
 * means by an unreachable control plane degrading to the authored page.
 *
 * **None of them handled a store that simply does not answer.** A refusal is a
 * `Result`; a hang is nothing at all, so the fallback never ran and the page
 * waited instead. On 12 October that was the difference between a site that
 * serves what it was written as through a database outage and a site that
 * serves nothing — Supabase was reporting *"multiple technical issues"*, and
 * the right behaviour was available the whole time and unreachable.
 *
 * A caller that gets `undefined` cannot tell a slow store from a broken one.
 * That is correct: at render time they are the same thing, and the one place
 * the difference matters is the portal, where somebody is asking.
 */
export const within = async <T>(
  work: Promise<T>,
  budgetMs: number = STORE_BUDGET_MS
): Promise<T | undefined> => {
  let timer: ReturnType<typeof setTimeout> | undefined

  const ranOut = new Promise<undefined>((resolve) => {
    timer = setTimeout(() => resolve(undefined), budgetMs)
  })

  try {
    return await Promise.race([work.catch(() => undefined), ranOut])
  } finally {
    if (timer !== undefined) clearTimeout(timer)
  }
}

/**
 * What a page waits for a store before serving what it already has.
 *
 * Longer than the seeding budget because this is the read the page is actually
 * for, and short enough that a reader gets a page rather than a spinner. A
 * healthy read here is a primary-key lookup in single-digit milliseconds.
 */
export const STORE_BUDGET_MS = 1_500
