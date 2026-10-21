"use server"

import { revalidatePath } from "next/cache"

import { appIngestKeys } from "@/app/_lib/reader-signals/key-store"
import { issueIngestKey } from "@/app/_lib/reader-signals/keys"

import { ownedSite, type ProjectReport } from "../_lib/owned-site"

/**
 * A first key for a project registered before registration minted keys, or a
 * new one for a project whose key turned up on a site it should not be on.
 *
 * Both are the same act — mint, and end whatever was held (0298 clause 1) —
 * so they are one action, and the screen says which of the two it is. Only an
 * owner, and only an open project: see `ownedSite`.
 */
export const issueKeyAction = async (
  _previous: ProjectReport | null,
  form: FormData
): Promise<ProjectReport> => {
  const site = await ownedSite(form)

  if (!site.ok) return site.report

  const issued = await issueIngestKey(appIngestKeys)(site.application.applicationId, Date.now())

  if (!issued.ok) return { detail: "The key could not be saved, so nothing changed." }

  revalidatePath(`/portal/${site.projectId}/connect`)

  return {}
}
