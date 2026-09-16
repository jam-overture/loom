import { describe, expect, it } from "vitest"

import { GET, POST } from "@/app/api/reader-signals/route"

import { INTAKE_KEY } from "./settings"

/**
 * That the endpoint is actually wired, which is the whole of what was missing.
 *
 * Everything the handler decides is tested in `receive.test.ts` against an
 * injected intake. This is the other half: the route file exists, exports the
 * two methods Next will look for, and reaches the intake this deployment built
 * from its own environment. Nothing in the suite sets `LOOM_SIGNAL_INTAKE`, so
 * what it proves about a default checkout is that the door is shut.
 */
describe("/api/reader-signals", () => {
  it("is shut on a deployment that never asked", async () => {
    expect(process.env[INTAKE_KEY]).toBeUndefined()

    const response = await POST(
      new Request("https://loom.test/api/reader-signals", { method: "POST", body: "[]" })
    )

    expect(response.status).toBe(404)
  })

  it("says why it is shut, and how to open it", async () => {
    const status = (await GET().json()) as Record<string, unknown>

    expect(status["intake"]).toBe("off")
    expect(String(status["detail"])).toContain(`${INTAKE_KEY}=on`)
  })

  /** Memory on a checkout with no DATABASE_URL, and the status says so rather than implying it. */
  it("reports whether what it keeps would outlive the process", async () => {
    const status = (await GET().json()) as Record<string, unknown>

    expect(status["durable"]).toBe(process.env["DATABASE_URL"] !== undefined)
  })

  it("is never cached", () => {
    expect(GET().headers.get("cache-control")).toBe("no-store")
  })
})
