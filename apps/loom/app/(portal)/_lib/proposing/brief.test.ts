import { describe, expect, it } from "vitest"

import { err, ok } from "@jam-overture/loom"
import { scriptedModelClient } from "@jam-overture/loom/testing"

import { pageFixture } from "@/app/_lib/pages/fixtures"

import { BRIEF_SYSTEM_PROMPT, briefFor, briefFrom, MAX_REQUEST_LENGTH, requestOf } from "./brief"
import { readEvidence } from "./evidence"
import { NOTHING_DECLARED, readersOn } from "./fixtures"

const CHANGE = JSON.stringify({
  outcome: "change",
  request: "Make n_home2 shorter.",
  evidence: "Only 40% of readers reach it.",
})

describe("briefFrom", () => {
  it("reads a change, with the figure that argues for it", () => {
    expect(briefFrom(CHANGE)).toEqual(
      ok({ kind: "change", request: "Make n_home2 shorter. (Why: Only 40% of readers reach it.)" })
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
      err({ code: "unreadable", detail: "the model's answer was not one this could read" })
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

describe("briefFor", () => {
  const page = pageFixture("home", "Welcome", 2)

  it("tells the model the page by name and what readers did on it", async () => {
    const evidence = await readEvidence(readersOn(page, 80, 60), NOTHING_DECLARED, page)
    if (!evidence.ok) throw new Error("expected evidence")
    const client = scriptedModelClient(CHANGE)

    expect((await briefFor(client, "Home", evidence.value)).ok).toBe(true)
    expect(client.requests[0]?.system).toBe(BRIEF_SYSTEM_PROMPT)
    expect(client.requests[0]?.userMessage).toMatch(/^The page "Home"\.\n\n80 page views/u)
  })

  it("passes on what went wrong with the model", async () => {
    const evidence = await readEvidence(readersOn(page, 80), NOTHING_DECLARED, page)
    if (!evidence.ok) throw new Error("expected evidence")
    const client = scriptedModelClient(err({ code: "misconfigured", detail: "invalid x-api-key" }))

    expect(await briefFor(client, "Home", evidence.value)).toEqual(
      err({ code: "model", detail: "invalid x-api-key" })
    )
  })
})
