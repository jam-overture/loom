import { describe, expect, it } from "vitest"

import { inspectConnectionString, resolveConnectionString } from "./connection"

const VALID = "postgresql://postgres.ref:pw@aws-1-us-west-2.pooler.supabase.com:6543/postgres"

describe("inspectConnectionString", () => {
  it("accepts a pooler connection string", () => {
    expect(inspectConnectionString(VALID)).toBeNull()
  })

  /**
   * This is the one that cost a deployment. `postgres.js` reports it as a bare
   * "Invalid URL" from inside a URL parser, and on a build it surfaces as
   * "Failed to collect page data" — neither of which mentions the environment.
   */
  it("catches a value that still carries its own key name", () => {
    expect(inspectConnectionString(`DATABASE_URL=${VALID}`)).toEqual({
      code: "carries-its-own-name",
      key: "DATABASE_URL",
    })
    expect(inspectConnectionString(`POSTGRES_URL=${VALID}`)).toEqual({
      code: "carries-its-own-name",
      key: "POSTGRES_URL",
    })
  })

  it("catches a string that is not a URL at all", () => {
    expect(inspectConnectionString("host=db port=6543")).toEqual({ code: "not-a-url" })
  })
})

describe("resolveConnectionString", () => {
  it("is undefined when nothing is configured, which is a supported state", () => {
    expect(resolveConnectionString({})).toBeUndefined()
  })

  it("prefers DATABASE_URL over POSTGRES_URL", () => {
    expect(resolveConnectionString({ DATABASE_URL: VALID, POSTGRES_URL: "postgres://other/x" })).toBe(
      VALID
    )
  })

  /** Refusing beats falling back to memory: a silent downgrade would lose writes. */
  it("throws on a malformed string rather than degrading to memory", () => {
    expect(() => resolveConnectionString({ DATABASE_URL: `DATABASE_URL=${VALID}` })).toThrow(
      /contains its own name/
    )
    expect(() => resolveConnectionString({ DATABASE_URL: "nonsense" })).toThrow(/not a valid URL/)
  })
})
