import { DEFAULT_READER_SIGNAL_PATH } from "@jam-overture/loom/signals/broadcast"
import { DEFAULT_APPLICATION_ID } from "@jam-overture/loom/store"

import { SITE_READ_BUDGET_MS } from "@/app/_lib/app/bounded"
import { readWithin, unavailable } from "@/app/_lib/app/bounded-store"
import { appIngestKeys } from "@/app/_lib/reader-signals/key-store"
import { INGEST_KEY_PARAMETER, type IngestKeyStore } from "@/app/_lib/reader-signals/keys"

/**
 * Where this site's pages post their readers' signals, key and all, or `null`
 * when it has no key to post with.
 *
 * **This site is a project like any customer's** (0298 clause 4). Its pages
 * are this deployment's own application — the one every row written before
 * applications existed belongs to — and since the door files nothing it cannot
 * name, they carry that application's key like any snippet would. The
 * difference is only where the key comes from: a customer pastes it, and this
 * site reads it from the table the door reads, so there is no second copy in
 * an environment variable to drift from the first.
 *
 * **No key is no broadcaster**, not a broadcaster posting into refusals. A
 * deployment that switched intake on and has not run
 * `pnpm signals:key prj_default` counts nobody on this site, and a page that
 * started an observer and a beacon every five seconds for a door that will
 * refuse every one of them is cost with nothing at the end of it. A store that
 * cannot answer within the site's budget reads the same way: the page is
 * served, uncounted, rather than held up.
 *
 * Read on the server, per request, and only when `readersCountedHere()` has
 * already said yes — so a deployment that never asked for signals never asks
 * this table anything.
 */
export const siteSignalUrl = async (
  keys: IngestKeyStore = appIngestKeys
): Promise<string | null> => {
  const held = await readWithin(
    () => keys.keyOf(DEFAULT_APPLICATION_ID),
    unavailable,
    SITE_READ_BUDGET_MS
  )

  if (!held.ok || held.value === null) return null

  return `${DEFAULT_READER_SIGNAL_PATH}?${INGEST_KEY_PARAMETER}=${held.value}`
}
