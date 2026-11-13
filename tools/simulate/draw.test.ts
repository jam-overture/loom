import { bytesOf, drawOf, happens } from "./draw.js"

describe("a named draw", () => {
  it("is the same every time for the same seed and path", () => {
    expect(drawOf(7, ["reader", 3, "stay", 1])).toBe(drawOf(7, ["reader", 3, "stay", 1]))
  })

  it("moves with the seed and with every step of the path", () => {
    const one = drawOf(7, ["reader", 3])

    expect(drawOf(8, ["reader", 3])).not.toBe(one)
    expect(drawOf(7, ["reader", 4])).not.toBe(one)
  })

  it("is in [0, 1) and spread evenly over it", () => {
    const draws = Array.from({ length: 20_000 }, (_, index) => drawOf(1, ["even", index]))
    const tenths = Array.from(
      { length: 10 },
      (_, tenth) => draws.filter((draw) => Math.floor(draw * 10) === tenth).length
    )

    expect(draws.every((draw) => draw >= 0 && draw < 1)).toBe(true)
    expect(Math.min(...tenths)).toBeGreaterThan(1_850)
    expect(Math.max(...tenths)).toBeLessThan(2_150)
  })

  it("happens about as often as its chance says", () => {
    const hits = Array.from({ length: 10_000 }, (_, index) =>
      happens(2, ["chance", index], 0.3)
    ).filter(Boolean).length

    expect(hits).toBeGreaterThan(2_850)
    expect(hits).toBeLessThan(3_150)
  })

  it("gives bytes, each its own draw", () => {
    const bytes = bytesOf(3, ["view"], 16)

    expect(bytes).toHaveLength(16)
    expect(bytesOf(3, ["view"], 16)).toEqual(bytes)
    expect(new Set(bytes).size).toBeGreaterThan(8)
  })
})
