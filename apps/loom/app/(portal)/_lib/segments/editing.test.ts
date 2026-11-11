import { describe, expect, it } from "vitest"

import { treeIdSchema } from "@jam-overture/loom"
import { audienceIdSchema, type AudienceRule } from "@jam-overture/loom/store"

import { outcomeSentence, planMove, planRemove, planSave, targetOf } from "./editing"
import { MAX_SEGMENTS, type PageRules } from "./segment"

const aud = (word: string) => audienceIdSchema.parse(`aud_${word}`)

const rule = (word: string): AudienceRule => ({
  audienceId: aud(word),
  clauses: [{ key: "device", anyOf: [word] }],
})

const page = (
  treeId: string,
  rules: readonly AudienceRule[] | undefined,
  revision = 1
): PageRules => ({
  treeId,
  name: treeId,
  head:
    rules === undefined
      ? undefined
      : {
          treeId: treeIdSchema.parse(treeId),
          revision,
          rules,
          actor: "owner@example.com",
          recordedAt: "2026-11-11T20:00:00.000Z",
        },
})

const pages = [page("t_home", [rule("phone")], 4), page("t_pricing", undefined)]

describe("which pages an edit is for", () => {
  it("is every page unless one is named", () => {
    expect(targetOf(null)).toEqual({ kind: "every" })
    expect(targetOf("every")).toEqual({ kind: "every" })
    expect(targetOf("t_home")).toEqual({ kind: "page", treeId: "t_home" })
  })
})

describe("saving a segment", () => {
  it("copies it to every page, each against the revision it was read at, the first as 0", () => {
    expect(planSave(pages, { kind: "every" }, rule("tablet"))).toEqual({
      ok: true,
      writes: [
        { treeId: "t_home", expectedRevision: 4, rules: [rule("phone"), rule("tablet")] },
        { treeId: "t_pricing", expectedRevision: 0, rules: [rule("tablet")] },
      ],
    })
  })

  it("writes nothing to a page it leaves as it was", () => {
    expect(planSave(pages, { kind: "every" }, rule("phone"))).toEqual({
      ok: true,
      writes: [{ treeId: "t_pricing", expectedRevision: 0, rules: [rule("phone")] }],
    })
  })

  it("refuses a page the site did not publish", () => {
    expect(planSave(pages, { kind: "page", treeId: "t_gone" }, rule("tablet")).ok).toBe(false)
  })

  it(`refuses an eleventh segment, and still lets one of ${MAX_SEGMENTS} change`, () => {
    const full = [
      page(
        "t_home",
        Array.from({ length: MAX_SEGMENTS }, (_, index) => rule(`s${index}`))
      ),
    ]

    expect(planSave(full, { kind: "every" }, rule("one"))).toEqual({
      ok: false,
      says: `This project has ${MAX_SEGMENTS} segments already. Remove one before adding another.`,
    })
    expect(
      planSave(full, { kind: "every" }, { ...rule("s3"), clauses: [{ key: "k", anyOf: ["v"] }] }).ok
    ).toBe(true)
  })
})

describe("removing a segment", () => {
  it("writes only to the pages it was on", () => {
    expect(planRemove(pages, { kind: "every" }, aud("phone"))).toEqual({
      ok: true,
      writes: [{ treeId: "t_home", expectedRevision: 4, rules: [] }],
    })
  })
})

describe("moving a segment", () => {
  const ordered = [page("t_home", [rule("phone"), rule("tablet")], 4)]

  it("writes against the revision the person was looking at", () => {
    expect(planMove(ordered, "t_home", aud("tablet"), "earlier", 3)).toEqual({
      ok: true,
      writes: [{ treeId: "t_home", expectedRevision: 3, rules: [rule("tablet"), rule("phone")] }],
    })
  })

  it("writes nothing for a move past either end", () => {
    expect(planMove(ordered, "t_home", aud("phone"), "earlier", 4)).toEqual({
      ok: true,
      writes: [],
    })
  })
})

describe("what an edit says back", () => {
  const nameOf = (treeId: string) => (treeId === "t_home" ? "Home" : "Pricing")

  it("says nothing when every page took it", () => {
    expect(outcomeSentence({ written: 2, moved: [], failed: [] }, nameOf)).toBeUndefined()
  })

  it("says which pages took it and which did not, and why", () => {
    expect(outcomeSentence({ written: 1, moved: ["t_home"], failed: ["t_pricing"] }, nameOf)).toBe(
      "Saved on 1 page. Someone changed the segments on Home while you were editing, so those were left as they are; the list below is current. Pricing could not be saved just now; try again in a moment."
    )
    expect(outcomeSentence({ written: 0, moved: [], failed: ["t_home"] }, nameOf)).toBe(
      "Nothing was saved. Home could not be saved just now; try again in a moment."
    )
  })
})
