"use server"

import { revalidatePath } from "next/cache"

import { describeApplicationStoreError } from "@jam-overture/loom/store"

import { requireActor } from "@/app/(portal)/_lib/auth/identity"
import { readRename, type NamingFault } from "@/app/(portal)/_lib/registering"
import { applicationFromRoute } from "@/app/(portal)/_lib/scoped"
import { portalApplications } from "@/app/(portal)/_lib/store"

/**
 * Renaming an application, which is the first thing this portal could never do
 * to a thing it had just let somebody create.
 *
 * The rules are `_lib/registering.ts`'s and are shared with registration on
 * purpose: a rename that accepted what the form refused would let somebody walk
 * an application into a state the screen that created it would not have allowed.
 * What is here is the part that cannot be asked a question without a request —
 * a session, a store and a revalidation.
 */

export type RenameReport = {
  readonly faults: readonly NamingFault[]
  /** A failure that is not about a field: the store declining, or refusing. */
  readonly detail?: string
  /** Said once, after a rename that landed, because nothing else on the screen moves. */
  readonly saved?: true
}

export const renameApplication = async (
  _previous: RenameReport | null,
  form: FormData
): Promise<RenameReport> => {
  const raw = form.get("applicationId")
  const applicationId = typeof raw === "string" ? applicationFromRoute(raw) : undefined

  if (applicationId === undefined) {
    return { faults: [], detail: "That is not an application." }
  }

  await requireActor(`/portal/${applicationId}/settings`)

  const read = readRename({ name: form.get("name"), host: form.get("host") })

  if (!read.ok) return { faults: read.faults }

  /**
   * **A host cannot be removed yet, and saying so is better than not doing it.**
   *
   * `ApplicationStore.rename` reads an absent host as *leave it alone* — in the
   * Postgres store and in the memory one, both by spreading `to.host` only when
   * it is defined. So emptying the box and pressing save would rename nothing
   * and report success, which is the one outcome a settings screen must never
   * produce.
   *
   * Filed for `Loom framework` rather than worked around here: clearing a field
   * is a change to what `rename` means, and a surface does not get to decide
   * that. Until then the screen refuses the half of the edit it cannot make and
   * leaves the rest alone.
   */
  const current = await portalApplications.get(applicationId)

  if (current.ok && current.value.host !== undefined && read.value.host === undefined) {
    return {
      faults: [
        {
          field: "host",
          detail:
            "A host cannot be removed yet — only changed. Nothing was saved. Put the old one back, or type a new one.",
        },
      ],
    }
  }

  const renamed = await portalApplications.rename(applicationId, {
    name: read.value.name,
    ...(read.value.host === undefined ? {} : { host: read.value.host }),
  })

  if (!renamed.ok) {
    return { faults: [], detail: describeApplicationStoreError(renamed.error) }
  }

  /**
   * Both, because the name is on both screens: this one in its fields, and the
   * application's own screen in its heading and in the workspace list above it.
   */
  revalidatePath(`/portal/${applicationId}/settings`)
  revalidatePath("/portal")

  return { faults: [], saved: true }
}
