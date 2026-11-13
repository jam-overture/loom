import { describe, expect, it } from "vitest"

import { audienceIdSchema } from "@jam-overture/loom/store"

import { audienceOfPick, segmentAsked, segmentChoicesOf, type SegmentHref } from "./segment-pick"

const hrefOf: SegmentHref = (word) =>
  word === undefined ? "/portal/prj_a/goals" : `/portal/prj_a/goals?segment=${word}`

describe("the segment an address asks for", () => {
  it("is a segment's word, tidied as the Segments screen keeps it", () => {
    expect(segmentAsked("phone")).toBe("phone")
    expect(segmentAsked(" Phone ")).toBe("phone")
  })

  it("is everyone for no word, the base's own word, or one no segment could have", () => {
    expect(segmentAsked(undefined)).toBeUndefined()
    expect(segmentAsked("everyone")).toBeUndefined()
    expect(segmentAsked("aud_phone")).toBeUndefined()
    expect(segmentAsked("two words")).toBeUndefined()
  })

  it("reads the counters for the segment's audience, and for every reader without one", () => {
    expect(audienceOfPick("phone")).toBe(audienceIdSchema.parse("aud_phone"))
    expect(audienceOfPick(undefined)).toBeUndefined()
  })
})

describe("the picker's chips", () => {
  it("offers everyone first, then each segment alphabetically, marking the one shown", () => {
    expect(segmentChoicesOf({ word: "phone", offered: ["search", "phone"] }, hrefOf)).toEqual([
      { label: "Everyone", href: "/portal/prj_a/goals", selected: false },
      { label: "phone", href: "/portal/prj_a/goals?segment=phone", selected: true },
      { label: "search", href: "/portal/prj_a/goals?segment=search", selected: false },
    ])
  })

  it("offers nothing for a project with no segment, where a lone Everyone would do nothing", () => {
    expect(segmentChoicesOf({ word: undefined, offered: [] }, hrefOf)).toEqual([])
    expect(segmentChoicesOf({ word: undefined, offered: undefined }, hrefOf)).toEqual([])
  })

  it("keeps the segment shown among the chips where the rules no longer name it, or could not be read", () => {
    const labels = (offered: readonly string[] | undefined) =>
      segmentChoicesOf({ word: "returning", offered }, hrefOf).map((chip) => chip.label)

    expect(labels(["phone"])).toEqual(["Everyone", "phone", "returning"])
    expect(labels(undefined)).toEqual(["Everyone", "returning"])
  })
})
