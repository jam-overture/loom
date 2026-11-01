/*
 * Imports come from `@jam-overture/loom`'s **built** output, so this script is
 * only ever as current as `dist/` — which is why the package script builds the
 * package before running it. `db-push.ts` carries the full version of this
 * note and the incident behind it.
 */
import nextEnv from "@next/env"

import { sitePageTrees } from "../app/(marketing)/_lib/stored"
import { publishPages } from "../app/_lib/pages/publish"
import { publishKeySchema } from "../app/_lib/pages/publish-keys"

/**
 * Hands a deployment this site's own pages (0312, unit 6b): the first site to
 * publish through `/api/pages`, and the same request a customer's build makes.
 *
 *     LOOM_PUBLISH_KEY=lp_… pnpm pages:publish https://www.loomjs.org
 *
 * The key is made by an owner on the project's *Connect your site* screen and
 * shown once. It is read from the environment rather than an argument, so it
 * stays out of shell history the way a build keeps it out of its log.
 *
 * Unlike `signals:key` this asks the database nothing: it is a client of the
 * deployment, and the deployment decides.
 */

/** `@next/env` is CommonJS, so the named export is only reachable off the default. */
const { loadEnvConfig } = nextEnv

loadEnvConfig(process.cwd())

const usage =
  "usage: LOOM_PUBLISH_KEY=lp_… pnpm pages:publish <deployment address>\n" +
  "  LOOM_PUBLISH_KEY=lp_… pnpm pages:publish https://www.loomjs.org"

const [origin] = process.argv.slice(2)

if (origin === undefined || !URL.canParse(origin)) {
  console.error(usage)
  process.exit(1)
}

const key = publishKeySchema.safeParse(process.env.LOOM_PUBLISH_KEY)

if (!key.success) {
  console.error(
    "pages:publish needs LOOM_PUBLISH_KEY, the project's publish key (lp_ and 32 hex characters).\n" +
      "An owner makes one on the project's Connect your site screen."
  )
  process.exit(1)
}

const published = await publishPages({
  origin,
  key: key.data,
  pages: sitePageTrees(),
  send: (request) => fetch(request),
})

if (!published.ok) {
  console.error(`loom: the deployment refused the pages — ${published.error}`)
  process.exit(1)
}

console.log(`loom: ${published.value}`)
