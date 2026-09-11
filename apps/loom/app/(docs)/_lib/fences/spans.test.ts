import { describe, expect, it } from "vitest"

import { fenceSpansIn, outsideFences } from "./spans"

/**
 * The rules with a wrong answer, held against markdown written to exercise
 * them.
 *
 * Every one of these was a rule four separate scanners each had their own
 * opinion about. The nested case is the one that was actually wrong in three of
 * them, and it is first.
 */
describe("finding the fences", () => {
  it("reads a block that contains a fence as one block", () => {
    const source = ["````md", "```ts", "const x = 1", "```", "````", "after"].join("\n")

    const spans = fenceSpansIn(source)

    expect(spans).toHaveLength(1)
    expect(spans[0]?.info).toBe("md")
    expect(spans[0]?.code).toBe("```ts\nconst x = 1\n```")
    expect(spans[0]?.closesAt).toBe(5)
  })

  it("does not let a shorter run close a longer fence", () => {
    const source = ["````", "```", "still inside"].join("\n")

    expect(fenceSpansIn(source)[0]?.closesAt).toBeUndefined()
  })

  it("lets a longer run close a shorter fence, which markdown allows", () => {
    const source = ["```ts", "const x = 1", "`````"].join("\n")

    expect(fenceSpansIn(source)[0]?.closesAt).toBe(3)
  })

  it("does not let tildes close backticks", () => {
    const source = ["```ts", "const x = 1", "~~~"].join("\n")

    expect(fenceSpansIn(source)[0]?.closesAt).toBeUndefined()
  })

  it("reads a tilde fence, which is the same fence", () => {
    const spans = fenceSpansIn(["~~~bash", "pnpm add", "~~~"].join("\n"))

    expect(spans).toHaveLength(1)
    expect(spans[0]?.info).toBe("bash")
    expect(spans[0]?.code).toBe("pnpm add")
  })

  it("keeps the info string untouched, because somebody else reads it", () => {
    expect(fenceSpansIn(["```ts object-body", "a: 1", "```"].join("\n"))[0]?.info).toBe(
      "ts object-body"
    )
  })

  it("does not close on a line that has words after the ticks", () => {
    const source = ["```ts", "const x = 1", "``` and more", "```"].join("\n")

    expect(fenceSpansIn(source)[0]?.closesAt).toBe(4)
  })

  it("reports a fence that never closes rather than pretending it did", () => {
    const spans = fenceSpansIn(["```ts", "const x = 1"].join("\n"))

    expect(spans).toHaveLength(1)
    expect(spans[0]?.closesAt).toBeUndefined()
    expect(spans[0]?.code).toBe("const x = 1")
  })

  it("reads every block on a page, in reading order", () => {
    const spans = fenceSpansIn(
      ["```ts", "one", "```", "prose", "```bash", "two", "```"].join("\n")
    )

    expect(spans.map((span) => span.code)).toEqual(["one", "two"])
    expect(spans.map((span) => span.opensAt)).toEqual([1, 5])
  })

  it("finds nothing in markdown with no code in it", () => {
    expect(fenceSpansIn("# A page\n\nSome words about it.")).toEqual([])
  })
})

describe("what is left when the code is taken out", () => {
  it("blanks the fence and everything in it, and keeps the line count", () => {
    const source = ["# Title", "```bash", "# install the runtime", "```", "Words."].join("\n")

    expect(outsideFences(source)).toEqual(["# Title", "", "", "", "Words."])
  })

  it("blanks to the end of the file when a fence never closes", () => {
    const source = ["Words.", "```ts", "const x = 1", "more"].join("\n")

    expect(outsideFences(source)).toEqual(["Words.", "", "", ""])
  })

  it("leaves markdown with no fences exactly as it was", () => {
    const lines = ["## A heading", "", "A sentence with `a name` in it."]

    expect(outsideFences(lines.join("\n"))).toEqual(lines)
  })
})
