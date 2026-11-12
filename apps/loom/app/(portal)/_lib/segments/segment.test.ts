import { describe, expect, it } from "vitest"

import { treeIdSchema } from "@jam-overture/loom"
import { audienceIdSchema, type AudienceRule } from "@jam-overture/loom/store"

import {
  audienceOfSegment,
  conditionsSentence,
  conditionsText,
  contextKeysOf,
  movedRule,
  placeRule,
  readConditions,
  segmentCountAfter,
  segmentsOf,
  segmentWordSchema,
  withoutRule,
  type PageRules,
} from "./segment"

const aud = (word: string) => audienceIdSchema.parse(`aud_${word}`)

const rule = (word: string, key = "device", values: readonly string[] = [word]): AudienceRule => ({
  audienceId: aud(word),
  clauses: [{ key, anyOf: values }],
})

const page = (treeId: string, rules: readonly AudienceRule[], revision = 1): PageRules => ({
  treeId,
  name: treeId === "t_home" ? "Home" : "Pricing",
  head:
    rules.length === 0 && revision === 0
      ? undefined
      : {
          treeId: treeIdSchema.parse(treeId),
          revision,
          rules,
          actor: "owner@example.com",
          recordedAt: "2026-11-11T20:00:00.000Z",
        },
})

describe("a segment's word", () => {
  it("is one lowercase word, read as typed with its case and spaces forgiven", () => {
    expect(segmentWordSchema.parse("  Phone ")).toBe("phone")
    expect(audienceOfSegment(segmentWordSchema.parse("returning2"))).toBe("aud_returning2")
  })

  it("refuses two words, a leading digit, punctuation and the base's own word", () => {
    for (const typed of ["from search", "2nd", "from-search", "everyone", "", "a".repeat(33)]) {
      expect(segmentWordSchema.safeParse(typed).success).toBe(false)
    }
  })
})

describe("reading the conditions typed", () => {
  it("reads one condition a line, values on a line as alternatives, repeats dropped", () => {
    expect(readConditions("device = phone\n\n source = search, social, search \n")).toEqual({
      ok: true,
      clauses: [
        { key: "device", anyOf: ["phone"] },
        { key: "source", anyOf: ["search", "social"] },
      ],
    })
  })

  it("says which line is wrong and why", () => {
    expect(readConditions("device phone\n2x = a\nsource =  ,")).toEqual({
      ok: false,
      faults: [
        { line: 1, says: "needs a key, an “=” and the values it may hold" },
        {
          line: 2,
          says: "starts with a key of letters, digits, “_”, “.” or “-”, beginning with a letter",
        },
        { line: 3, says: "gives source no value to match" },
      ],
    })
  })

  it("refuses nothing typed, and a key named twice", () => {
    expect(readConditions("  \n").ok).toBe(false)
    expect(readConditions("device = phone\ndevice = tablet")).toEqual({
      ok: false,
      faults: [{ line: 0, says: "device is named twice; put its values on one line." }],
    })
  })

  it("writes back what it reads, so a segment opened to change shows its own conditions", () => {
    const read = readConditions("device = phone, tablet\nreturning = yes")

    expect(read.ok && readConditions(conditionsText(read.clauses))).toEqual(read)
  })

  it("says the conditions as a sentence", () => {
    expect(
      conditionsSentence([
        { key: "device", anyOf: ["phone"] },
        { key: "source", anyOf: ["search", "social", "mail"] },
      ])
    ).toBe("device is “phone”, and source is “search”, “social” or “mail”")
  })
})

describe("a page's order", () => {
  const rules = [rule("phone"), rule("search", "source"), rule("returning", "returning", ["yes"])]

  it("puts a new segment last and a changed one in its own place", () => {
    expect(placeRule(rules, rule("eu", "region")).map((each) => each.audienceId)).toEqual([
      "aud_phone",
      "aud_search",
      "aud_returning",
      "aud_eu",
    ])

    const changed = placeRule(rules, rule("search", "source", ["search", "ads"]))

    expect(changed.map((each) => each.audienceId)).toEqual(rules.map((each) => each.audienceId))
    expect(changed[1]?.clauses[0]?.anyOf).toEqual(["search", "ads"])
  })

  it("moves a segment one place either way, and leaves the ends where they are", () => {
    expect(movedRule(rules, aud("search"), "earlier").map((each) => each.audienceId)).toEqual([
      "aud_search",
      "aud_phone",
      "aud_returning",
    ])
    expect(movedRule(rules, aud("search"), "later").map((each) => each.audienceId)).toEqual([
      "aud_phone",
      "aud_returning",
      "aud_search",
    ])
    expect(movedRule(rules, aud("phone"), "earlier")).toBe(rules)
    expect(movedRule(rules, aud("returning"), "later")).toBe(rules)
    expect(movedRule(rules, aud("absent"), "later")).toBe(rules)
  })

  it("takes a segment off, and leaves an empty list rather than nothing", () => {
    expect(withoutRule([rule("phone")], aud("phone"))).toEqual([])
  })
})

describe("the project's segments", () => {
  const pages = [
    page("t_home", [rule("phone"), rule("search", "source")]),
    page("t_pricing", [rule("search", "source", ["search", "ads"])], 3),
  ]

  it("lists each segment once by word, with where it sits on every page it is on", () => {
    const [phone, search] = segmentsOf(pages)

    expect(phone).toMatchObject({
      word: "phone",
      sameEverywhere: true,
      places: [{ treeId: "t_home", page: "Home", position: 1, of: 2 }],
    })
    expect(search).toMatchObject({
      word: "search",
      sameEverywhere: false,
      places: [
        { treeId: "t_home", position: 2, of: 2 },
        { treeId: "t_pricing", position: 1, of: 1 },
      ],
    })
  })

  it("has none on pages nobody wrote rules for", () => {
    expect(segmentsOf([page("t_home", [], 0)])).toEqual([])
  })

  it("names every key the site must set, once", () => {
    expect(contextKeysOf(segmentsOf(pages))).toEqual(["device", "source"])
  })

  it("counts the segments an edit would leave", () => {
    expect(segmentCountAfter(pages, new Map())).toBe(2)
    expect(segmentCountAfter(pages, new Map([["t_home", [rule("eu", "region")]]]))).toBe(2)
    expect(segmentCountAfter(pages, new Map([["t_pricing", []]]))).toBe(2)
    expect(
      segmentCountAfter(
        pages,
        new Map([
          ["t_home", []],
          ["t_pricing", []],
        ])
      )
    ).toBe(0)
  })
})
