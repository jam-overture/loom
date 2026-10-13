import { describe, expect, it } from "vitest"

import { PORTAL_READ_BUDGET_MS, SITE_READ_BUDGET_MS, within } from "./bounded"

const never = (): Promise<void> => new Promise<void>(() => undefined)

describe("a read that will not answer", () => {
  it("comes back as nothing rather than waiting", async () => {
    const started = Date.now()

    expect(await within(never(), 20)).toBeUndefined()
    expect(Date.now() - started).toBeLessThan(1_000)
  })

  /**
   * The case the marketing site needed. Its fallback to the authored page was
   * only reachable when the store returned a refusal; a hang returned nothing
   * at all, so the page waited instead of serving what it was written as.
   */
  it("hands back what the store said when it answered in time", async () => {
    expect(await within(Promise.resolve({ ok: true as const, value: 7 }), 500)).toEqual({
      ok: true,
      value: 7,
    })
  })

  it("comes back as nothing when the store threw", async () => {
    expect(await within(Promise.reject(new Error("no database")))).toBeUndefined()
  })

  it("does not mistake a falsy answer for an absent one", async () => {
    expect(await within(Promise.resolve(0), 500)).toBe(0)
  })
})

/**
 * The two numbers, held against each other rather than against themselves.
 *
 * What matters is not what either is but that the site gives up sooner than the
 * portal, because the site has a page to fall back to and the portal has a
 * sentence. A later change that made them equal would have quietly thrown that
 * away, and nothing else in this repository would have noticed.
 */
describe("the two budgets", () => {
  it("lets the site give up sooner than the portal", () => {
    expect(SITE_READ_BUDGET_MS).toBeLessThan(PORTAL_READ_BUDGET_MS)
  })

  /**
   * A cold serverless instance opens a TLS connection and authenticates before
   * its first query, which is most of the 1.48 seconds a sign-in round trip
   * took on 12 October. A portal budget at or under that reports an outage
   * every time an instance is new, which is what 1500ms did.
   */
  it("gives the portal more than a cold connection costs", () => {
    expect(PORTAL_READ_BUDGET_MS).toBeGreaterThan(1_500)
  })
})
