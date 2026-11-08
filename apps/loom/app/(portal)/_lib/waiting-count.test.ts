import { describe, expect, it } from "vitest"

import { waitingCountBody, waitingCountOf } from "./waiting-count"

describe("the count of what waits for review", () => {
  it("reads back the count it was sent", () => {
    expect(waitingCountOf(waitingCountBody(3))).toBe(3)
    expect(waitingCountOf(waitingCountBody(0))).toBe(0)
  })

  it("is no count where the changes could not be read, never a nought", () => {
    expect(waitingCountBody(undefined)).toEqual({ waiting: null })
    expect(waitingCountOf(waitingCountBody(undefined))).toBeUndefined()
  })

  it("is no count for anything that is not an answer", () => {
    expect(waitingCountOf(null)).toBeUndefined()
    expect(waitingCountOf("<!doctype html>")).toBeUndefined()
    expect(waitingCountOf({ waiting: -1 })).toBeUndefined()
    expect(waitingCountOf({ waiting: 1.5 })).toBeUndefined()
    expect(waitingCountOf({})).toBeUndefined()
  })
})
