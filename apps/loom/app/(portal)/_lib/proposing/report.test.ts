import { describe, expect, it } from "vitest"

import { err, ok } from "@jam-overture/loom"
import { applicationIdSchema, DEFAULT_APPLICATION_ID } from "@jam-overture/loom/store"

import { MINIMUM_OPENED } from "./evidence"
import type { Passed } from "./propose"
import { mayPropose, passedSentence, proposedReport, siteReport } from "./report"

const SHOP = applicationIdSchema.parse("app_shop")
const nobody = () => []

describe("who may set Loom looking at a page", () => {
  it("is anybody who could accept a change, and not a viewer", () => {
    expect(mayPropose("owner")).toBe(true)
    expect(mayPropose("approver")).toBe(true)
    expect(mayPropose("viewer")).toBe(false)
  })
})

describe("passedSentence", () => {
  it.each<[string, Passed, RegExp]>([
    ["a change is waiting", { kind: "waiting" }, /already under Waiting/u],
    ["the copy is ahead", { kind: "unshipped", copy: 4 }, /does not serve yet \(version 4\)/u],
    ["the copy is behind", { kind: "behind", copy: 2 }, /newer version than Loom's copy/u],
    [
      "too few read it",
      { kind: "silent", silence: { kind: "too-few", opened: 3 } },
      new RegExp(`Only 3 page views.*waits for ${MINIMUM_OPENED}`, "u"),
    ],
    [
      "the model saw nothing",
      { kind: "nothing", reason: "All read." },
      /proposes nothing: All read\./u,
    ],
  ])("says why nothing was proposed when %s", (_name, passed, sentence) => {
    expect(passedSentence(passed)).toMatch(sentence)
  })
})

describe("siteReport", () => {
  const applied = { tone: "applied", headline: "Applied", meaning: "general", detail: "d" } as const

  it("says a customer's site keeps serving what it published", () => {
    expect(siteReport(applied, SHOP).meaning).toMatch(/keeps serving what it published/u)
  })

  it("says this deployment's own site serves the copy, so the change is live", () => {
    expect(siteReport(applied, DEFAULT_APPLICATION_ID).meaning).toMatch(/so it is live/u)
  })

  it("keeps the general sentence for an outcome the site does not change with", () => {
    expect(siteReport({ ...applied, tone: "rejected" }, SHOP).meaning).toBe("general")
  })
})

describe("proposedReport", () => {
  it("sends a model failure to the project's key", () => {
    const report = proposedReport(err({ code: "model", detail: "401" }), nobody, SHOP)

    expect(report.headline).toBe("The model did not answer")
    expect(report.meaning).toMatch(/model key in Settings/u)
  })

  it("says a store failure as a store failure", () => {
    expect(proposedReport(err({ code: "store", detail: "x" }), nobody, SHOP).headline).toBe(
      "The store did not answer"
    )
  })

  it("says why nothing was proposed", () => {
    const report = proposedReport(ok({ kind: "passed", passed: { kind: "waiting" } }), nobody, SHOP)

    expect(report.headline).toBe("Nothing proposed")
    expect(report.meaning).toBe(passedSentence({ kind: "waiting" }))
  })
})
