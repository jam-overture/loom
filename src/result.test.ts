import { describe, expect, it } from "vitest"

import { assertNever, err, flatMapResult, mapResult, ok, reduceResult } from "./result.js"

describe("mapResult", () => {
  it("transforms a value and passes an error through untouched", () => {
    expect(mapResult(ok(2), (value) => value * 3)).toEqual({ ok: true, value: 6 })
    expect(mapResult(err("boom"), (value: number) => value * 3)).toEqual({
      ok: false,
      error: "boom",
    })
  })
})

describe("flatMapResult", () => {
  it("chains fallible steps and short-circuits on error", () => {
    const double = (value: number) => ok(value * 2)

    expect(flatMapResult(ok(2), double)).toEqual({ ok: true, value: 4 })
    expect(flatMapResult(err("boom"), double)).toEqual({ ok: false, error: "boom" })
    expect(flatMapResult(ok(2), () => err("inner"))).toEqual({ ok: false, error: "inner" })
  })
})

describe("reduceResult", () => {
  it("folds every item when each step succeeds", () => {
    const result = reduceResult([1, 2, 3], 0, (total, item) => ok(total + item))
    expect(result).toEqual({ ok: true, value: 6 })
  })

  it("stops at the first failure and reports its index", () => {
    const visited: number[] = []
    const result = reduceResult([1, 2, 3], 0, (total, item, index) => {
      visited.push(item)
      return item === 2 ? err(index) : ok(total + item)
    })

    expect(result).toEqual({ ok: false, error: 1 })
    expect(visited).toEqual([1, 2])
  })
})

describe("assertNever", () => {
  it("throws with the offending value, guarding exhaustive switches", () => {
    expect(() => assertNever("unexpected" as never, "test")).toThrow(/unexpected/)
  })
})
