import { describe, expect, it } from "vitest"

import { err, ok, type Result } from "@jam-overture/loom"
import { applicationIdSchema, type ApplicationId } from "@jam-overture/loom/store"

import { modelKeySchema, type ModelKeyStanding } from "@/app/_lib/models/model-keys"
import { pageFixture } from "@/app/_lib/pages/fixtures"
import type { PublishedPage } from "@/app/_lib/pages/published"

import type { ProposeError, Proposed } from "./propose"
import { inTurn, sweep, SWEEP_BUDGET_MS, type SweepDeps } from "./sweep"

const SHOP = applicationIdSchema.parse("app_shop")
const BLOG = applicationIdSchema.parse("app_blog")
const KEY = modelKeySchema.parse("sk-ant-api03-abcdefghijklmnopqrstuvwxyz")
const DAY = 86_400_000

const pages = (prefix: string, count: number): readonly PublishedPage[] =>
  Array.from({ length: count }, (_, index) => ({
    tree: pageFixture(`${prefix.replace(/[^a-z0-9]/gu, "")}${index}`, `Page ${index}`),
    receivedAt: 1,
  }))

const PASSED: Result<Proposed, ProposeError> = ok({ kind: "passed", passed: { kind: "waiting" } })

const depsWith = (overrides: Partial<SweepDeps> = {}): SweepDeps & { readonly ran: string[] } => {
  const ran: string[] = []

  return {
    ran,
    applications: () => Promise.resolve(ok([{ applicationId: SHOP }, { applicationId: BLOG }])),
    keyOf: (application: ApplicationId) =>
      Promise.resolve(
        ok<ModelKeyStanding>(
          application === SHOP
            ? { kind: "set", key: KEY, hint: "wxyz", setAt: 1 }
            : { kind: "none" }
        )
      ),
    pagesOf: (application) => Promise.resolve(ok(pages(application, 2))),
    run: ({ application, name }) => {
      ran.push(`${application}:${name}`)

      return Promise.resolve({ run: PASSED, weighedAgainst: () => [] })
    },
    now: () => 0,
    ...overrides,
  }
}

describe("inTurn", () => {
  it("turns the order by one each day, so nothing is always last", () => {
    expect(inTurn(["a", "b", "c"], 0)).toEqual(["a", "b", "c"])
    expect(inTurn(["a", "b", "c"], DAY)).toEqual(["b", "c", "a"])
    expect(inTurn(["a", "b", "c"], 3 * DAY)).toEqual(["a", "b", "c"])
    expect(inTurn([], DAY)).toEqual([])
  })
})

describe("sweep", () => {
  it("looks at every page of every project with a key of its own, and no other", async () => {
    const deps = depsWith()

    expect(await sweep(deps)).toEqual({
      projects: 1,
      proposed: 0,
      passed: 2,
      failed: 0,
      deferred: 0,
    })
    expect(deps.ran).toEqual(["app_shop:Page 0", "app_shop:Page 1"])
  })

  it("stops starting pages once its time is spent, and counts what it left", async () => {
    const times = [0, 0, SWEEP_BUDGET_MS]
    const deps = depsWith({ now: () => times.shift() ?? SWEEP_BUDGET_MS })

    expect(await sweep(deps)).toEqual({
      projects: 1,
      proposed: 0,
      passed: 1,
      failed: 0,
      deferred: 1,
    })
    expect(deps.ran).toHaveLength(1)
  })

  it("counts a proposal, a failed run and a project whose pages could not be read", async () => {
    const results: Result<Proposed, ProposeError>[] = [
      err({ code: "model", detail: "401" }),
      ok({ kind: "proposed", request: "r", outcome: {} as never }),
    ]
    const deps = depsWith({
      keyOf: () => Promise.resolve(ok({ kind: "set", key: KEY, hint: "wxyz", setAt: 1 })),
      pagesOf: (application) =>
        Promise.resolve(
          application === BLOG ? err({ code: "unavailable" }) : ok(pages(application, 2))
        ),
      run: () => Promise.resolve({ run: results.shift() ?? PASSED, weighedAgainst: () => [] }),
    })

    expect(await sweep(deps)).toEqual({
      projects: 2,
      proposed: 1,
      passed: 0,
      failed: 2,
      deferred: 0,
    })
  })

  it("does nothing, and says so, when the projects cannot be read", async () => {
    const deps = depsWith({ applications: () => Promise.resolve(err("down")) })

    expect(await sweep(deps)).toEqual({
      projects: 0,
      proposed: 0,
      passed: 0,
      failed: 1,
      deferred: 0,
    })
    expect(deps.ran).toHaveLength(0)
  })
})
