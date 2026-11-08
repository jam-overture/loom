import { describe, expect, it } from "vitest"

import { err, ok, proposalIdSchema } from "@jam-overture/loom"
import { scriptedModelClient } from "@jam-overture/loom/testing"

import { pageFixture } from "@/app/_lib/pages/fixtures"

import {
  BRIEF_SYSTEM_PROMPT,
  briefFor,
  briefFrom,
  briefMessage,
  goalText,
  MAX_REQUEST_LENGTH,
  requestOf,
  requestPartsOf,
} from "./brief"
import { readEvidence } from "./evidence"
import { elementIdsOf, goalOn, NOTHING_DECLARED, readersOn } from "./fixtures"

const CHANGE = JSON.stringify({
  outcome: "change",
  request: "Make n_home2 shorter.",
  evidence: "Only 40% of readers reach it.",
})

describe("briefFrom", () => {
  it("reads a change, with the figure that argues for it", () => {
    expect(briefFrom(CHANGE)).toEqual(
      ok({
        kind: "change",
        request: "Make n_home2 shorter. (Why: Only 40% of readers reach it.)",
      })
    )
  })

  it("says why a change turned down before is back", () => {
    const again = JSON.stringify({
      outcome: "change",
      request: "Make n_home2 shorter.",
      evidence: "Only 20% of readers reach it.",
      again: "Half as many readers reach it as when it was turned down.",
    })

    expect(briefFrom(again)).toEqual(
      ok({
        kind: "change",
        request:
          "Make n_home2 shorter. (Why: Only 20% of readers reach it.) (Turned down before. Proposed again because: Half as many readers reach it as when it was turned down.)",
      })
    )
  })

  it("reads nothing, with the model's reason", () => {
    expect(
      briefFrom(JSON.stringify({ outcome: "nothing", reason: "Readers reach it all." }))
    ).toEqual(ok({ kind: "nothing", reason: "Readers reach it all." }))
  })

  it.each([
    ["not JSON", "Make it shorter"],
    ["a change with no request", JSON.stringify({ outcome: "change", evidence: "x" })],
    ["another outcome", JSON.stringify({ outcome: "maybe" })],
  ])("refuses %s", (_name, text) => {
    expect(briefFrom(text)).toEqual(
      err({
        code: "unreadable",
        detail: "the model's answer was not one this could read",
      })
    )
  })
})

describe("requestOf", () => {
  it("is cut to one change's length", () => {
    const request = requestOf("x".repeat(MAX_REQUEST_LENGTH), "because")

    expect(request).toHaveLength(MAX_REQUEST_LENGTH)
    expect(request.endsWith("…")).toBe(true)
  })
})

describe("requestPartsOf", () => {
  it("reads back the change and the figure requestOf joined", () => {
    expect(requestPartsOf(requestOf("Move n_cta up", "60% leave before n_cta"))).toEqual({
      change: "Move n_cta up",
      why: "60% leave before n_cta",
      again: null,
    })
  })

  it("reads back why a change turned down before is proposed again", () => {
    expect(
      requestPartsOf(requestOf("Move n_cta up", "60% leave (most) early", "Twice the readers now"))
    ).toEqual({
      change: "Move n_cta up",
      why: "60% leave (most) early",
      again: "Twice the readers now",
    })
  })

  it("keeps a request it did not write, or one cut short, as the change alone", () => {
    const cut = requestOf("x".repeat(MAX_REQUEST_LENGTH), "because")

    expect(requestPartsOf("Make the heading shorter")).toEqual({
      change: "Make the heading shorter",
      why: null,
      again: null,
    })
    expect(requestPartsOf(cut)).toEqual({ change: cut, why: null, again: null })
  })
})

const PAGE = pageFixture("home", "Welcome", 2)
const [, HEADING] = elementIdsOf(PAGE)

if (HEADING === undefined) throw new Error("the fixture has a heading")

const GOAL = goalOn(HEADING, { name: "Reads the welcome" })

describe("goalText", () => {
  it("names the goal and what it counts, by the part's id", () => {
    expect(goalText(GOAL)).toBe(
      `The goal, "Reads the welcome", counts each time a reader presses ${HEADING}.`
    )
    expect(goalText({ ...GOAL, kind: "completed" })).toMatch(/a reader sends /u)
  })
})

describe("briefMessage", () => {
  const page = PAGE
  const turnedDown = [
    {
      proposalId: proposalIdSchema.parse("p_newer"),
      pageId: page.treeId,
      request: "Remove n_home2.",
      reason: "We need the heading.",
      by: "jonathan",
      at: Date.UTC(2026, 10, 2),
    },
    {
      proposalId: proposalIdSchema.parse("p_older"),
      pageId: page.treeId,
      request: "Move n_home2 lower.",
      reason: null,
      by: null,
      at: Date.UTC(2026, 10, 1),
    },
  ]

  it("reads exactly as before for a page nothing was turned down on", async () => {
    const evidence = await readEvidence(readersOn(page, 80, 60), NOTHING_DECLARED, page)
    if (!evidence.ok) throw new Error("expected evidence")

    expect(
      briefMessage({
        pageName: "Home",
        goal: GOAL,
        evidence: evidence.value,
        turnedDown: [],
      })
    ).not.toMatch(/turned down/u)
  })

  it("lists what was turned down after the evidence, with the reason or that none was given", async () => {
    const evidence = await readEvidence(readersOn(page, 80, 60), NOTHING_DECLARED, page)
    if (!evidence.ok) throw new Error("expected evidence")
    const message = briefMessage({
      pageName: "Home",
      goal: GOAL,
      evidence: evidence.value,
      turnedDown,
    })

    expect(message).toMatch(
      /\n\nChanges a person turned down on this page before, newest first:\n- On 2 November 2026: "Remove n_home2\."\. Their reason: We need the heading\.\n- On 1 November 2026: "Move n_home2 lower\."\. No reason was given\.$/u
    )
  })
})

describe("briefFor", () => {
  const page = PAGE

  it("tells the model the page by name, its goal, and what readers did on it", async () => {
    const evidence = await readEvidence(readersOn(page, 80, 60), NOTHING_DECLARED, page)
    if (!evidence.ok) throw new Error("expected evidence")
    const client = scriptedModelClient(CHANGE)

    expect(
      (
        await briefFor(client, {
          pageName: "Home",
          goal: GOAL,
          evidence: evidence.value,
          turnedDown: [],
        })
      ).ok
    ).toBe(true)
    expect(client.requests[0]?.system).toBe(BRIEF_SYSTEM_PROMPT)
    expect(client.requests[0]?.userMessage).toMatch(
      /^The page "Home"\.\n\nThe goal, "Reads the welcome", counts [^\n]+\n\n80 page views/u
    )
  })

  it("passes on what went wrong with the model", async () => {
    const evidence = await readEvidence(readersOn(page, 80), NOTHING_DECLARED, page)
    if (!evidence.ok) throw new Error("expected evidence")
    const client = scriptedModelClient(err({ code: "misconfigured", detail: "invalid x-api-key" }))

    expect(
      await briefFor(client, {
        pageName: "Home",
        goal: GOAL,
        evidence: evidence.value,
        turnedDown: [],
      })
    ).toEqual(err({ code: "model", detail: "invalid x-api-key" }))
  })
})
