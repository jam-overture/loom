import { describe, expect, it } from "vitest"

import { waitForSeeding } from "./seeding-wait"

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
