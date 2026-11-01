"use server"

import { revalidatePath } from "next/cache"

import { randomIdFactory, treeIdSchema } from "@jam-overture/loom"
import { commitIntent } from "@jam-overture/loom/write"

import {
  askedReport,
  governedCopyOf,
  intentFor,
  mayAsk,
  requestOf,
} from "@/app/(portal)/_lib/asking"
import { reportOf, type WriteReport } from "@/app/(portal)/_lib/outcome"
import { beginWrite } from "@/app/(portal)/_lib/write"
import { publishedPagesFor } from "@/app/_lib/pages/store"

import { siteFor } from "../../_lib/owned-site"

/** What asking says back: what happened to the request, or why it was not made. */
export type AskReport = {
  readonly refusal?: string
  readonly report?: WriteReport
  /** What was typed, so a refused request is still in the box to correct. */
  readonly request?: string
}

/**
 * A person asking for a change to one of their site's pages (0329).
 *
 * The page is read from what the site published, never from the form, so a
 * request cannot name a tree the project does not hold; the copy it is asked
 * against is the project's own (clause 3). From there it is the write path's:
 * the interpreter drafts, the Gate applies, holds or refuses, and the screen
 * says which in `outcome.ts`'s words.
 */
export const askAction = async (
  _previous: AskReport | null,
  form: FormData
): Promise<AskReport> => {
  const typed = String(form.get("request") ?? "")
  const site = await siteFor(form, mayAsk)

  if (!site.ok) {
    return {
      refusal: site.report.detail ?? "That is not a project you can change.",
      request: typed,
    }
  }

  const request = requestOf(typed)

  if (!request.ok) return { refusal: request.error, request: typed }

  const treeId = treeIdSchema.safeParse(form.get("treeId"))
  const published = await publishedPagesFor(site.application.applicationId).list()

  if (!published.ok) {
    return { refusal: "The store did not answer. Nothing was asked.", request: typed }
  }

  const page = treeId.success
    ? published.value.find((held) => held.tree.treeId === treeId.data)?.tree
    : undefined

  if (page === undefined) {
    return { refusal: "That is not a page this project's site has published.", request: typed }
  }

  const write = beginWrite(site.application.applicationId)
  const copy = await governedCopyOf(write.path.store, page)

  if (!copy.ok) {
    return { refusal: "The store did not answer. Nothing was asked.", request: typed }
  }

  const outcome = await commitIntent(
    write.path,
    intentFor({
      ids: randomIdFactory,
      page: copy.value,
      request: request.value,
      actor: site.actor,
      at: new Date(),
    })
  )

  await write.finish()

  revalidatePath(`/portal/${site.projectId}/pages/${page.treeId}`)

  return {
    report: askedReport(reportOf(outcome, write.weighedAgainst), site.application.applicationId),
  }
}
