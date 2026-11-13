import { START_GOAL, STARTS_LOW } from "./fixtures.js"
import { bandsOf, featuresOf } from "./page.js"
import {
  goalChanceOf,
  isWeekend,
  pickPersona,
  seesBand,
  sharesOn,
  type Persona,
} from "./persona.js"
import { FIRST_WORLD } from "./world.js"

const hurried = 0

const personaNamed = (name: string): Persona => {
  const found = FIRST_WORLD.personas.find((persona) => persona.name === name)

  if (found === undefined) throw new Error(`no persona ${name}`)

  return found
}

describe("a world's readers", () => {
  it("add up to everyone on every day", () => {
    Array.from({ length: 28 }, (_, day) => sharesOn(FIRST_WORLD, day)).forEach((shares) =>
      expect(shares.reduce((sum, share) => sum + share, 0)).toBeCloseTo(1, 12)
    )
  })

  it("are a different mix at the weekend and drift over the weeks", () => {
    const monday = sharesOn(FIRST_WORLD, 0)

    expect(isWeekend(5)).toBe(true)
    expect(isWeekend(7)).toBe(false)
    expect(sharesOn(FIRST_WORLD, 5)[hurried]).toBeGreaterThan(monday[hurried] ?? 1)
    expect(sharesOn(FIRST_WORLD, 28)[hurried]).toBeGreaterThan(monday[hurried] ?? 1)
  })

  it("are picked in proportion to their shares", () => {
    expect(pickPersona([0.5, 0.25, 0.25], 0)).toBe(0)
    expect(pickPersona([0.5, 0.25, 0.25], 0.5)).toBe(1)
    expect(pickPersona([0.5, 0.25, 0.25], 0.999)).toBe(2)
    expect(pickPersona([0.5, 0.25, 0.25], 1)).toBe(2)
  })

  it("read differently far down a page", () => {
    const phone = personaNamed("Hurried phone reader")
    const developer = personaNamed("Developer comparing")

    expect(seesBand(phone, 0)).toBe(1)
    expect(seesBand(developer, 4)).toBeGreaterThan(seesBand(phone, 4) * 10)
  })

  it("never do the goal on a page without its part, and do it at most always", () => {
    const page = featuresOf(bandsOf(STARTS_LOW), START_GOAL)

    FIRST_WORLD.personas.forEach((persona) => {
      expect(goalChanceOf(persona, { ...page, goalBand: undefined })).toBe(0)
      expect(goalChanceOf(persona, page)).toBeGreaterThanOrEqual(0)
      expect(goalChanceOf(persona, page)).toBeLessThanOrEqual(1)
    })
  })
})
