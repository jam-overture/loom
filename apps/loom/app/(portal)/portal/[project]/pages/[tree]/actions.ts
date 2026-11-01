"use server"

import { revalidatePath } from "next/cache"

import { treeIdSchema } from "@jam-overture/loom"

import type { WriteReport } from "@/app/(portal)/_lib/outcome"
import { mayPropose, proposedReport } from "@/app/(portal)/_lib/proposing/report"
import { runOnPage } from "@/app/(portal)/_lib/proposing/run"
import { publishedRowOf } from "@/app/(portal)/_lib/published-view"
import { modelKeyOf } from "@/app/_lib/models/store"
import { publishedPagesFor } from "@/app/_lib/pages/store"

import { siteFor } from "../../_lib/owned-site"

/** What looking says back: what the AI proposed and what became of it, or why nothing was. */
export type LookReport = {
  readonly refusal?: string
  readonly report?: WriteReport & { readonly request?: string }
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

  if (!site.ok) return { refusal: site.report.detail ?? "That is not a project you can change." }

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
