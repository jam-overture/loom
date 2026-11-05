import { err, randomIdFactory, type LoomTree, type Result } from "@jam-overture/loom"
import type { ApplicationId } from "@jam-overture/loom/store"

import { appApplications } from "@/app/_lib/app/store"
import type { ModelKey } from "@/app/_lib/models/model-keys"
import { modelKeyOf } from "@/app/_lib/models/store"
import { publishedPagesFor } from "@/app/_lib/pages/store"
import { readingsFor } from "@/app/_lib/reader-signals/intake"

import { goalsFor, proposalGoalsFor } from "../goals/stores"
import { projectModel } from "../interpreter"
import type { WeighedAgainst } from "../outcome"
import { portalRegistry } from "../registry"
import { beginWrite } from "../write"
import { proposeFor, type ProposeError, type Proposed } from "./propose"
import { followsItsSite, pageCopiesFor, turnedDownFor } from "./stores"
import { sweep, type SweepReport } from "./sweep"

/**
 * One run of the AI over one page, wired to this deployment: the project's own
 * model, its own governed pages, copies and holds, what was turned down on its
 * pages, its goals, and the readings its door filed.
 * The page screen's button and the daily sweep both run it, so the two can
 * never propose by different rules.
 */
export type PageRun = {
  readonly run: Result<Proposed, ProposeError>
  readonly weighedAgainst: WeighedAgainst
}

export const runOnPage = async ({
  application,
  key,
  published,
  name,
}: {
  readonly application: ApplicationId
  readonly key: ModelKey
  readonly published: LoomTree
  readonly name: string
}): Promise<PageRun> => {
  const goals = await goalsFor(application).list()

  /** Nothing was written, so nothing was weighed. */
  if (!goals.ok)
    return {
      run: err({ code: "store", detail: goals.error.detail }),
      weighedAgainst: () => [],
    }

  const model = projectModel(key)
  const write = beginWrite(application, model)

  const run = await proposeFor({
    path: write.path,
    copies: pageCopiesFor(application),
    turnedDown: turnedDownFor(application),
    goals: goals.value,
    proposalGoals: proposalGoalsFor(application),
    follows: followsItsSite(application),
    client: model.client,
    sources: { tallies: readingsFor(application).tallies },
    declarations: portalRegistry,
    ids: randomIdFactory,
    published,
    name,
    at: new Date(),
  })

  await write.finish()

  return { run, weighedAgainst: write.weighedAgainst }
}

/** The daily sweep over this deployment's projects, with its own stores and clock. */
export const sweepDeployment = (): Promise<SweepReport> =>
  sweep({
    applications: () => appApplications.list(),
    keyOf: modelKeyOf,
    pagesOf: (application) => publishedPagesFor(application).list(),
    run: runOnPage,
    now: Date.now,
  })
