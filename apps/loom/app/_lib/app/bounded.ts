/**
 * Waiting for the database, with a limit.
 *
 * It lives beside the store rather than in a route group because both surfaces
 * need it and neither owns it — `(marketing)` importing it from `(portal)` was
 * a lane crossing I made and am undoing here.
 *
 * ## The budget a read gets depends on what happens when it runs out
 *
 * Two numbers, because the two surfaces are not in the same situation.
 *
 * **The site falls back to a real page.** `pageTreeFor` serves what the page
 * was authored as when the store does not answer, which is a reader getting
 * the site rather than an error — so waiting longer buys almost nothing and
 * costs the reader directly. It gets the shorter number.
 *
 * **The portal falls back to a sentence.** *We couldn't list what you have* is
 * honest and it is not what somebody opened the portal for, so here waiting is
 * worth something: a page that arrives in four seconds is better than an
 * apology that arrives in one and a half.
 *
 * Neither number is about how long a query takes. A query here takes
 * single-digit milliseconds — `pg_stat_statements` on the live database, taken
 * 13 October, puts the slowest statement this repository issues anywhere at
 * **31ms**, and that is DDL from `db:push`. What the budget has to cover is
 * everything that is not execution: a cold serverless instance opening a TLS
 * connection to the pooler and authenticating, which is most of the 1.48
 * seconds a sign-in round trip took on 12 October, and the wait behind
 * whatever else is already on the one connection this pool allows.
 */

/**
 * What a portal screen waits before saying it could not reach the store.
 *
 * Roughly half a serverless function's default ten-second ceiling, so there is
 * room to render the answer either way. It was 1.5 seconds until 13 October,
 * when `/portal` drew *the store did not answer within 1500ms* against a
 * database whose slowest statement is 31ms — a budget shorter than a cold
 * connection is a budget that reports an outage every time an instance is new.
 */
export const PORTAL_READ_BUDGET_MS = 5_000

/**
 * What a marketing page waits before serving what it was authored as.
 *
 * Shorter on purpose: this fallback is a page, and a reader who gets it has
 * lost nothing they can see.
 */
export const SITE_READ_BUDGET_MS = 1_500

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
  budgetMs: number = PORTAL_READ_BUDGET_MS
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
