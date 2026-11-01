import { describe, expect, it } from "vitest"

import {
  fixedPolicy,
  ok,
  outlineTree,
  sequentialIdFactory,
  type IntentId,
} from "@jam-overture/loom"
import {
  applicationIdSchema,
  DEFAULT_APPLICATION_ID,
  memoryTreeStore,
} from "@jam-overture/loom/store"
import {
  buildProposal,
  collectingEventSink,
  fixedClock,
  scriptedInterpreter,
} from "@jam-overture/loom/testing"
import { commitIntent, memoryHoldStore } from "@jam-overture/loom/write"

import { pageFixture } from "@/app/_lib/pages/fixtures"

import {
  askedReport,
  governedCopyOf,
  intentFor,
  MAX_REQUEST_LENGTH,
  mayAsk,
  requestOf,
} from "./asking"
import { reportOf } from "./outcome"
import { portalPolicy } from "./policy"

describe("who may ask for a change", () => {
  it("is anybody who could accept one, and not a viewer", () => {
    expect(mayAsk("owner")).toBe(true)
    expect(mayAsk("approver")).toBe(true)
    expect(mayAsk("viewer")).toBe(false)
  })
})

describe("what a person typed", () => {
  it("is a request once trimmed", () => {
    expect(requestOf("  Make the heading shorter \n")).toEqual(ok("Make the heading shorter"))
  })

  it.each([
    ["nothing", undefined],
    ["only spaces", "   "],
    ["too much", "x".repeat(MAX_REQUEST_LENGTH + 1)],
  ])("is refused when it is %s, with a sentence saying why", (_name, typed) => {
    const read = requestOf(typed)

    expect(read.ok).toBe(false)
    if (!read.ok) expect(read.error).toMatch(/\.$/u)
  })
})

describe("the governed copy of a page", () => {
  it("starts as the published tree, exactly, the first time anybody asks", async () => {
    const trees = memoryTreeStore()
    const published = pageFixture("home", "Welcome", 3)

    expect(await governedCopyOf(trees, published)).toEqual(ok(published))
    expect(await trees.head(published.treeId)).toEqual(ok(published))
  })

  it("is the copy already held, not the page as published again", async () => {
    const trees = memoryTreeStore()
    const first = pageFixture("home", "Welcome", 3)
    const later = { ...pageFixture("home", "Welcome back", 4), treeId: first.treeId }

    await governedCopyOf(trees, first)

    expect(await governedCopyOf(trees, later)).toEqual(ok(first))
  })

  it("reads what another request made when two ask at once", async () => {
    const trees = memoryTreeStore()
    const published = pageFixture("home", "Welcome")
    const racing = {
      head: trees.head,
      create: async (tree: typeof published) => {
        await trees.create(tree)

        return trees.create(tree)
      },
    }

    expect(await governedCopyOf(racing, published)).toEqual(ok(published))
  })
})

describe("the intent a request becomes", () => {
  it("is asked against the version of the page it was typed beside", () => {
    const page = pageFixture("home", "Welcome", 3)

    expect(
      intentFor({
        ids: { intentId: () => "i_1" as IntentId },
        page,
        request: "Make the heading shorter",
        actor: "jonathan",
        at: new Date(Date.UTC(2026, 10, 1)),
      })
    ).toEqual({
      intentId: "i_1",
      treeId: page.treeId,
      baseRevision: 3,
      origin: "user-instruction",
      actor: "jonathan",
      utterance: "Make the heading shorter",
      observedAt: "2026-11-01T00:00:00.000Z",
    })
  })
})

/**
 * The whole of what the ask action does between the form and the screen,
 * through the real write path, with only the model's answer scripted.
 */
describe("asking for a change to a published page", () => {
  it("changes the project's copy and leaves the published page as the site sent it", async () => {
    const published = pageFixture("home", "Welcome", 3)
    const heading = outlineTree(published.root).find(
      (entry) => entry.node.kind === "element" && entry.node.type === "loom.heading"
    )
    if (heading === undefined) throw new Error("the fixture has a heading")

    const ids = sequentialIdFactory("ask")
    const trees = memoryTreeStore()
    const copy = await governedCopyOf(trees, published)
    if (!copy.ok) throw new Error("the copy was made")

    const intent = intentFor({
      ids,
      page: copy.value,
      request: "Make the heading smaller",
      actor: "jonathan",
      at: new Date(Date.UTC(2026, 10, 1)),
    })
    const proposal = buildProposal(ids, {
      intentId: intent.intentId,
      delta: {
        deltaId: ids.deltaId(),
        treeId: published.treeId,
        baseRevision: 3,
        operations: [{ op: "configure", nodeId: heading.node.id, set: { level: 2 }, unset: [] }],
      },
    })

    const outcome = await commitIntent(
      {
        store: trees,
        holds: memoryHoldStore(),
        runtime: {
          interpreter: scriptedInterpreter(ok(proposal)),
          policySource: fixedPolicy(portalPolicy),
          events: collectingEventSink(),
          clock: fixedClock(),
          idFactory: ids,
        },
      },
      intent
    )

    expect(reportOf(outcome).tone).toBe("applied")
    expect(await trees.head(published.treeId)).toMatchObject({ ok: true, value: { revision: 4 } })
    expect(published.revision).toBe(3)
  })
})

describe("what an asked-for change means for the site", () => {
  const applied = { tone: "applied", headline: "Applied", meaning: "general", detail: "d" } as const

  it("says a customer's site keeps serving what it published", () => {
    expect(askedReport(applied, applicationIdSchema.parse("app_shop")).meaning).toMatch(
      /keeps serving what it published/u
    )
  })

  it("says this deployment's own site serves the copy, so the change is live", () => {
    expect(askedReport(applied, DEFAULT_APPLICATION_ID).meaning).toMatch(/so it is live/u)
  })

  it("keeps the general sentence for an outcome the site does not change with", () => {
    const refused = { ...applied, tone: "rejected" } as const

    expect(askedReport(refused, DEFAULT_APPLICATION_ID).meaning).toBe("general")
  })
})
