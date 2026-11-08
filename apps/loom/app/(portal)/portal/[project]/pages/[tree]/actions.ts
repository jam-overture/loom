"use server"

import { revalidatePath } from "next/cache"

import { proposalIdSchema, randomIdFactory, treeIdSchema } from "@jam-overture/loom"

import { proposalGoalsFor } from "@/app/(portal)/_lib/goals/stores"
import { revertReportOf, type WriteReport } from "@/app/(portal)/_lib/outcome"
import { mayPropose, proposedReport, siteReport } from "@/app/(portal)/_lib/proposing/report"
import { proposeReverting, type NotReverted } from "@/app/(portal)/_lib/proposing/revert"
import { runOnPage } from "@/app/(portal)/_lib/proposing/run"
import { madeFromFor, pageCopiesFor } from "@/app/(portal)/_lib/proposing/stores"
import { publishedRowOf } from "@/app/(portal)/_lib/published-view"
import { beginWrite } from "@/app/(portal)/_lib/write"
import { modelKeyOf } from "@/app/_lib/models/store"
import { publishedPagesFor } from "@/app/_lib/pages/store"

import { siteFor } from "../../_lib/owned-site"

/** What looking says back: what the AI proposed and what became of it, or why nothing was. */
export type LookReport = {
  readonly refusal?: string
  readonly report?: WriteReport & {
    readonly request?: string
    readonly goal?: string
  }
}

/**
 * Set the AI looking at one page now, rather than waiting for the schedule
 * (0329 clause 5).
 *
 * The page is read from what the site published, never from the form, so a
 * run cannot name a tree the project does not hold. It is paid for with the
 * project's own key (0332), and a project without one is told where to set it.
 */
export const lookAction = async (
  _previous: LookReport | null,
  form: FormData
): Promise<LookReport> => {
  const site = await siteFor(form, mayPropose)

  if (!site.ok)
    return {
      refusal: site.report.detail ?? "That is not a project you can change.",
    }

  const application = site.application.applicationId
  const key = await modelKeyOf(application)

  if (!key.ok) return { refusal: "The store did not answer. Nothing was proposed." }
  if (key.value.kind !== "set") {
    return {
      refusal: "This project has no model key that Loom can use. An owner sets one in Settings.",
    }
  }

  const treeId = treeIdSchema.safeParse(form.get("treeId"))
  const published = await publishedPagesFor(application).list()

  if (!published.ok) return { refusal: "The store did not answer. Nothing was proposed." }

  const page = treeId.success
    ? published.value.find((held) => held.tree.treeId === treeId.data)
    : undefined

  if (page === undefined) {
    return { refusal: "That is not a page this project's site has published." }
  }

  const { run, weighedAgainst } = await runOnPage({
    application,
    key: key.value.key,
    published: page.tree,
    name: publishedRowOf(page).name,
  })

  revalidatePath(`/portal/${site.projectId}/pages/${page.tree.treeId}`)

  return { report: proposedReport(run, weighedAgainst, application) }
}

/** What *Propose reverting* says back: what became of the revert, or why there was none. */
export type RevertReport = {
  readonly refusal?: string
  readonly report?: WriteReport & { readonly goal?: string }
  /** Where the revert is followed from here: its timeline once made, *For review* while it waits. */
  readonly followAt?: string
}

const NOT_REVERTED: Readonly<Record<NotReverted["kind"], string>> = {
  "not-standing":
    "This change is no longer on the live page, so there is nothing to revert. Reload to see where it stands.",
  "an-undo":
    "This change is itself a revert. To have what it took off back, Loom has to propose that change again.",
  "site-moved":
    "Your site has published a newer version of this page, and Loom follows it on its next look at the page. Revert after that.",
}

/**
 * Raise the revert of an accepted change on a page (8c, *Propose reverting*).
 *
 * The page is read from what the site published, never from the form. The
 * revert is weighed by the Gate like any change a person asks for (0032):
 * within the project's rules it goes live on the site's next pull, otherwise
 * it waits under *For review*.
 *
 * Nothing is revalidated, as with an answer on *For review*: the result is
 * shown on the card the revert was asked from, and a revalidation would
 * re-render the history under it and take the card's answer away with it. The
 * history is read per request, so the next visit shows the revert.
 */
export const revertAction = async (
  _previous: RevertReport | null,
  form: FormData
): Promise<RevertReport> => {
  const site = await siteFor(form, mayPropose)

  if (!site.ok) return { refusal: site.report.detail ?? "That is not a project you can change." }

  const application = site.application.applicationId
  const treeId = treeIdSchema.safeParse(form.get("treeId"))
  const proposalId = proposalIdSchema.safeParse(form.get("proposalId"))
  const published = await publishedPagesFor(application).list()

  if (!published.ok) return { refusal: "The store did not answer. Nothing was changed." }

  const page = treeId.success
    ? published.value.find((held) => held.tree.treeId === treeId.data)
    : undefined

  if (page === undefined || !proposalId.success) {
    return { refusal: "That is not a change on a page this project's site has published." }
  }

  const write = beginWrite(application)
  const reverting = await proposeReverting({
    path: write.path,
    copies: pageCopiesFor(application),
    proposalGoals: proposalGoalsFor(application),
    made: madeFromFor(application),
    ids: randomIdFactory,
    published: page.tree,
    proposalId: proposalId.data,
    actor: site.actor,
    at: new Date(),
  })

  await write.finish()

  if (!reverting.ok) return { refusal: "The store did not answer. Nothing was changed." }
  if (reverting.value.kind === "not-reverted") {
    return { refusal: NOT_REVERTED[reverting.value.why.kind] }
  }

  const { outcome, goal } = reverting.value
  const report = {
    ...siteReport(revertReportOf(outcome, write.weighedAgainst), application),
    ...(goal === undefined ? {} : { goal: goal.name }),
  }

  switch (outcome.kind) {
    case "committed":
      return {
        report,
        followAt: `/portal/${site.projectId}/review/accepted/${outcome.proposal.proposalId}`,
      }
    case "held":
      return { report, followAt: `/portal/${site.projectId}/review` }
    default:
      return { report }
  }
}
