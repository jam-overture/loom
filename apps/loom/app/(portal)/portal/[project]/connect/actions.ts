"use server"

import { revalidatePath } from "next/cache"

import { issuePublishKey } from "@/app/_lib/pages/publish-keys"
import { appPublishKeys } from "@/app/_lib/pages/store"
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

/** What making a publish key says back: the key itself, once, or why there is none. */
export type PublishKeyReport = ProjectReport & {
  readonly key?: string
}

/**
 * A publish key for the project's site, ending whatever one it held (0312
 * clause 2).
 *
 * The key is in what this returns and nowhere else: the store keeps its
 * digest, so this answer is the only time anybody sees it. Only an owner, and
 * only an open project, for `issueKeyAction`'s reasons.
 */
export const issuePublishKeyAction = async (
  _previous: PublishKeyReport | null,
  form: FormData
): Promise<PublishKeyReport> => {
  const site = await ownedSite(form)

  if (!site.ok) return site.report

  const issued = await issuePublishKey(appPublishKeys)(site.application.applicationId, Date.now())

  if (!issued.ok) return { detail: "The key could not be saved, so nothing changed." }

  revalidatePath(`/portal/${site.projectId}/connect`)

  return { key: issued.value }
}
