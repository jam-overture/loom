import { err, ok, type Result } from "@jam-overture/loom"

import { publishKeySchema, type PublishKey } from "@/app/_lib/pages/publish-keys"

import { isPublicDeployment, type Environment } from "./site"

/**
 * Whether this build hands the site's pages to Loom, and where (0369).
 *
 * The build is the step 0312 names: the site's build sends what its code
 * authors, so Loom's copy of each page, and the live version a server pulls,
 * start from the page readers are about to be served rather than from
 * whatever somebody last published by hand.
 *
 * Three things must hold, and each one that does not is a sentence for the
 * build log rather than a failure: the deployment is the public one (a preview
 * is not the site), it holds a publish key, and its domain is pinned, because
 * the pages go to the deployment already answering there. A build has no
 * server of its own to send them to.
 */
export type DeployPublication = { readonly origin: string; readonly key: PublishKey }

export const deployPublicationOf = (env: Environment): Result<DeployPublication, string> => {
  if (!isPublicDeployment(env)) {
    return err("a preview does not publish; its pages are not the site's")
  }

  const given = env["LOOM_PUBLISH_KEY"]

  if (given === undefined || given.length === 0) {
    return err("no LOOM_PUBLISH_KEY, so the site's pages were not published")
  }

  const key = publishKeySchema.safeParse(given)

  if (!key.success) {
    return err("LOOM_PUBLISH_KEY is not a publish key (lp_ and 32 hex characters)")
  }

  const origin = env["LOOM_SITE_ORIGIN"]

  if (origin === undefined || !URL.canParse(origin)) {
    return err("no LOOM_SITE_ORIGIN, so there is no deployment to publish the pages to")
  }

  return ok({ origin, key: key.data })
}
