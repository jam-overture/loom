import { describe, expect, it } from "vitest"

import { applicationIdSchema } from "@jam-overture/loom/store"

import { appIntake, readingsFor } from "./intake"

/**
 * That a screen reads the stores the door files into, and no others.
 *
 * Nothing in the suite sets `DATABASE_URL`, so this is the memory side, which
 * is the side where it can go wrong: two constructions there are two maps, and
 * a screen reading the second would show nothing the door had put in the
 * first.
 */
describe("one application's stores", () => {
  const shop = applicationIdSchema.parse("app_intakeshop")
  const other = applicationIdSchema.parse("app_intakeother")

  it("are the ones the door files into", () => {
    const filing = appIntake.filingFor(shop)
    const readings = readingsFor(shop)

    expect(readings.journal).toBe(filing.journal)
    expect(readings.tallies).toBe(filing.openings)
  })

  it("are the same stores on every ask", () => {
    expect(readingsFor(shop).journal).toBe(readingsFor(shop).journal)
  })

  /** One application's readers read back as another's is the mixing 0298 exists to prevent. */
  it("are never another application's", () => {
    expect(readingsFor(shop).journal).not.toBe(readingsFor(other).journal)
    expect(readingsFor(shop).tallies).not.toBe(readingsFor(other).tallies)
  })
})
