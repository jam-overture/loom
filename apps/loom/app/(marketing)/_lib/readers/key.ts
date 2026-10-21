import { DEFAULT_READER_SIGNAL_PATH } from "@jam-overture/loom/signals/broadcast"
import {
  DEFAULT_APPLICATION_ID,
  DEFAULT_PROJECT_ID,
  projectIdSchema,
  type ApplicationId,
  type ApplicationStore,
} from "@jam-overture/loom/store"

import { SITE_READ_BUDGET_MS } from "@/app/_lib/app/bounded"
import { readWithin, unavailable } from "@/app/_lib/app/bounded-store"
import { soleApplicationOf } from "@/app/_lib/app/sole-application"
import { appApplications } from "@/app/_lib/app/store"
import { appIngestKeys } from "@/app/_lib/reader-signals/key-store"
import { INGEST_KEY_PARAMETER, type IngestKeyStore } from "@/app/_lib/reader-signals/keys"

/**
 * Which project this site's readers are counted under: the variable's name.
 *
 * Unset is the deployment's own project, which is where the site's readers
 * were counted before there was a choice, and where every deployment that never
 * set this goes on counting them.
 */
export const SITE_PROJECT_KEY = "LOOM_SITE_PROJECT"

/**
 * The application the site posts as, or `null` when the setting names nothing
 * the site can post as.
 *
 * **A project rather than a key**, so the key stays where the door reads it
 * and nowhere else. A key in an environment variable would be a second copy,
 * and replacing the key on the project's *Connect your site* screen would stop
 * the site being counted with nothing to say why. Named by the project because
 * that is the id a person can see; the key belongs to the one application
 * inside it (0296).
 *
 * The deployment's own project needs no read, because its application is
 * fixed. Any other is one listing on the site's budget, and a project that does
 * not hold exactly one open application is `null` — a broadcaster posting
 * under a closed project's key is posting into refusals (0289).
 */
const siteApplication = async (
  env: Record<string, string | undefined>,
  applications: Pick<ApplicationStore, "list">
): Promise<ApplicationId | null> => {
  const named = env[SITE_PROJECT_KEY]?.trim() ?? ""

  if (named === "") return DEFAULT_APPLICATION_ID

  const project = projectIdSchema.safeParse(named)

  if (!project.success) return null
  if (project.data === DEFAULT_PROJECT_ID) return DEFAULT_APPLICATION_ID

  const listed = await readWithin(
    () => applications.list({ closed: "all" }),
    unavailable,
    SITE_READ_BUDGET_MS
  )

  if (!listed.ok) return null

  const application = soleApplicationOf(listed.value, project.data)

  return application === undefined || application.closedAt !== undefined
    ? null
    : application.applicationId
}

/**
 * Where this site's pages post their readers' signals, key and all, or `null`
 * when it has no key to post with.
 *
 * **This site is a project like any customer's** (0298 clause 4). Its pages
 * carry the key of the project {@link SITE_PROJECT_KEY} names — the
 * deployment's own unless a deployment says otherwise — and since the door
 * files nothing it cannot name, that is the project their readers are counted
 * under. The difference from a customer is only where the key comes from: a
 * customer pastes it, and this site reads it from the table the door reads, so
 * there is no second copy to drift from the first.
 *
 * **No key is no broadcaster**, not a broadcaster posting into refusals. A
 * deployment that switched intake on and has not run
 * `pnpm signals:key` for that project counts nobody on this site, and a page that
 * started an observer and a beacon every five seconds for a door that will
 * refuse every one of them is cost with nothing at the end of it. A store that
 * cannot answer within the site's budget reads the same way: the page is
 * served, uncounted, rather than held up.
 *
 * Read on the server, per request, and only through `readerSignalUrl` in
 * `./counting.ts`, which asks the switch first — so a deployment that never
 * asked for signals never asks this table anything. This function is the key
 * half alone and does not read the switch; calling it directly is asking *is
 * there a key*, which is a different question from *does this deployment
 * count*.
 */
export const siteSignalUrl = async (
  keys: IngestKeyStore = appIngestKeys,
  env: Record<string, string | undefined> = process.env,
  applications: Pick<ApplicationStore, "list"> = appApplications
): Promise<string | null> => {
  const application = await siteApplication(env, applications)

  if (application === null) return null

  const held = await readWithin(() => keys.keyOf(application), unavailable, SITE_READ_BUDGET_MS)

  if (!held.ok || held.value === null) return null

  return `${DEFAULT_READER_SIGNAL_PATH}?${INGEST_KEY_PARAMETER}=${held.value}`
}
