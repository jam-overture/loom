import type { LoomTree, Result } from "@jam-overture/loom"
import type { ApplicationId } from "@jam-overture/loom/store"

import type { ModelKey, ModelKeyStanding } from "@/app/_lib/models/model-keys"
import type { PublishedPage } from "@/app/_lib/pages/published"

import { publishedRowOf } from "../published-view"
import type { PageRun } from "./run"

/**
 * The AI looking at every page of every project, once a day, by itself
 * (0329 clause 5).
 *
 * Only projects with a model key of their own are looked at (0332), so the
 * schedule spends each project's key on that project and nobody's on anybody
 * else's. Pages are looked at one after another, because each is two calls to
 * a model, and the sweep stops starting pages once its time is nearly spent:
 * a page left out today is looked at first tomorrow, because the order turns
 * by one every day.
 */

/** How long a sweep starts new pages for, inside the route's five minutes. */
export const SWEEP_BUDGET_MS = 240_000

export type SweepDeps = {
  readonly applications: () => Promise<
    Result<readonly { readonly applicationId: ApplicationId }[], unknown>
  >
  readonly keyOf: (application: ApplicationId) => Promise<Result<ModelKeyStanding, unknown>>
  readonly pagesOf: (
    application: ApplicationId
  ) => Promise<Result<readonly PublishedPage[], unknown>>
  readonly run: (page: {
    readonly application: ApplicationId
    readonly key: ModelKey
    readonly published: LoomTree
    readonly name: string
  }) => Promise<PageRun>
  /** Milliseconds, for the budget and for which way round the pages are today. */
  readonly now: () => number
}

/** What one sweep did, counted, for the log a scheduled run leaves. */
export type SweepReport = {
  readonly projects: number
  readonly proposed: number
  readonly passed: number
  readonly failed: number
  /** Pages not started because the budget ran out. */
  readonly deferred: number
}

const DAY_MS = 86_400_000

/** Every page, turned by one each day, so whatever the budget cut today comes first tomorrow. */
export const inTurn = <T>(items: readonly T[], at: number): readonly T[] => {
  if (items.length === 0) return items

  const start = Math.floor(at / DAY_MS) % items.length

  return [...items.slice(start), ...items.slice(0, start)]
}

type Turn = {
  readonly application: ApplicationId
  readonly key: ModelKey
  readonly page: PublishedPage
}

type Ending = "proposed" | "passed" | "failed" | "deferred"

/** One project's pages as turns, or nothing for a project without a key of its own. */
const turnsOf = async (
  deps: SweepDeps,
  application: ApplicationId
): Promise<{ readonly looked: boolean; readonly turns: readonly Turn[] | undefined }> => {
  const key = await deps.keyOf(application)

  if (!key.ok || key.value.kind !== "set") return { looked: false, turns: [] }

  const set = key.value.key
  const pages = await deps.pagesOf(application)

  return {
    looked: true,
    turns: pages.ok ? pages.value.map((page) => ({ application, key: set, page })) : undefined,
  }
}

const count = (endings: readonly Ending[], ending: Ending): number =>
  endings.filter((each) => each === ending).length

export const sweep = async (deps: SweepDeps): Promise<SweepReport> => {
  const started = deps.now()
  const applications = await deps.applications()

  if (!applications.ok) {
    return { projects: 0, proposed: 0, passed: 0, failed: 1, deferred: 0 }
  }

  const projects = await Promise.all(
    applications.value.map(({ applicationId }) => turnsOf(deps, applicationId))
  )
  const turns = projects.flatMap((project) => project.turns ?? [])

  /** One page after another: each is two model calls, and the budget is checked between them. */
  const endings = await inTurn(turns, started).reduce<Promise<readonly Ending[]>>(
    async (earlier, turn) => {
      const done = await earlier

      if (deps.now() - started >= SWEEP_BUDGET_MS) return [...done, "deferred"]

      const { run } = await deps.run({
        application: turn.application,
        key: turn.key,
        published: turn.page.tree,
        name: publishedRowOf(turn.page).name,
      })

      return [...done, !run.ok ? "failed" : run.value.kind]
    },
    Promise.resolve([])
  )

  return {
    projects: projects.filter((project) => project.looked).length,
    proposed: count(endings, "proposed"),
    passed: count(endings, "passed"),
    failed:
      count(endings, "failed") + projects.filter((project) => project.turns === undefined).length,
    deferred: count(endings, "deferred"),
  }
}
