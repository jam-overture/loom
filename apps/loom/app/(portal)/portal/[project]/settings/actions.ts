"use server"

import { revalidatePath } from "next/cache"

import { readRename, type NamingFault } from "@/app/(portal)/_lib/registering"
import { portalApplicationsForWriting, portalProjectsForWriting } from "@/app/(portal)/_lib/store"

import { ownedSite } from "../_lib/owned-site"

export type SettingsReport = {
  readonly faults: readonly NamingFault[]
  /** A failure that is not about a field: not yours, closed, or a store declining. */
  readonly detail?: string
}

/**
 * A project's name and the site its deliveries are taken from, saved together
 * from its *Settings* screen, by the rules registration read them under
 * (`readRename`).
 *
 * **One name, written twice.** A project holds one application and no screen
 * says *application* (0296), so registration gives both the same name and a
 * rename keeps them the same. The project is written first, because it is the
 * name every screen shows; an application left behind by a failure in between
 * is reported, and saving again finishes it.
 *
 * **An empty address clears the host** rather than leaving it alone, because
 * the box starts with the host the project has: emptying it is somebody saying
 * *any site*, and a save that kept the old one would be a form that ignored
 * what was typed into it.
 */
export const saveSettingsAction = async (
  _previous: SettingsReport | null,
  form: FormData
): Promise<SettingsReport> => {
  const site = await ownedSite(form)

  if (!site.ok) return { faults: [], ...site.report }

  const read = readRename({ name: form.get("name"), host: form.get("host") })

  if (!read.ok) return { faults: read.faults }

  const project = await portalProjectsForWriting.rename(site.projectId, { name: read.value.name })

  if (!project.ok) return { faults: [], detail: "The name could not be saved, so nothing changed." }

  const application = await portalApplicationsForWriting.rename(site.application.applicationId, {
    name: read.value.name,
    host: read.value.host ?? null,
  })

  if (!application.ok) {
    return {
      faults: [],
      detail: "The name was saved but the site's address was not. Save again to finish.",
    }
  }

  revalidatePath("/portal", "layout")

  return { faults: [] }
}
