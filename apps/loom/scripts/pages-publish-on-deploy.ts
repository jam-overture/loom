/*
 * Imports come from `@jam-overture/loom`'s **built** output, which the package's
 * `build` script makes before `next build` runs and so before this does.
 * `db-push.ts` carries the full version of this note.
 */
import nextEnv from "@next/env"

import { deployPublicationOf } from "../app/(marketing)/_lib/deploy-publication"
import { sitePageTrees } from "../app/(marketing)/_lib/stored"
import { publishPages } from "../app/_lib/pages/publish"

/**
 * The last step of `pnpm build`: hand Loom the pages this build serves (0369).
 *
 * `pages:publish` by itself, run by the build instead of by a person, so the
 * portal and the live pages a server pulls start from the code that is about
 * to go out rather than from whatever was published last.
 *
 * **It never fails the build.** A deploy that Loom could stop would put Loom in
 * front of the site, which 0262 rules out: a refusal, a timeout or a missing
 * setting is one line in the build log, saying which, and the deploy goes on.
 */

const { loadEnvConfig } = nextEnv

/** Long enough for a cold deployment to answer, short enough not to hold a deploy. */
const PUBLISH_TIMEOUT_MS = 20_000

loadEnvConfig(process.cwd())

const publication = deployPublicationOf(process.env)

if (!publication.ok) {
  console.log(`loom: ${publication.error}`)
  process.exit(0)
}

const published = await publishPages({
  ...publication.value,
  pages: sitePageTrees(),
  send: (request) => fetch(request, { signal: AbortSignal.timeout(PUBLISH_TIMEOUT_MS) }),
}).catch((cause: unknown) => ({
  ok: false as const,
  error: cause instanceof Error ? cause.message : String(cause),
}))

const NOT_PUBLISHED = "loom: warning — the site's pages were not published, and the deploy goes on"

console.log(published.ok ? `loom: ${published.value}` : `${NOT_PUBLISHED}: ${published.error}`)
