import { describe, expect, it } from "vitest"

import { waitForSeeding, within } from "./bounded"

const never = (): Promise<void> => new Promise<void>(() => undefined)

describe("waiting for a seed", () => {
  it("says so when it finished", async () => {
    expect(await waitForSeeding(Promise.resolve())).toBe("seeded")
  })

  /**
   * The case that took the portal down. Before this, a page awaited the seed
   * with no limit, so one stuck query held every later request on that instance
   * until it was recycled.
   */
  it("gives up on a seed that never finishes, rather than waiting forever", async () => {
    const started = Date.now()

    expect(await waitForSeeding(never(), 20)).toBe("still-going")
    expect(Date.now() - started).toBeLessThan(1_000)
  })

  it("does not throw when the seed failed", async () => {
    expect(await waitForSeeding(Promise.reject(new Error("no database")))).toBe("failed")
  })

  it("prefers the seed when it beats the budget", async () => {
    const quick = new Promise<void>((resolve) => setTimeout(resolve, 1))

    expect(await waitForSeeding(quick, 500)).toBe("seeded")
  })
})

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
