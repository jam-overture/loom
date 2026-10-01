import { describe, expect, it } from "vitest"

import { pageMetadata } from "./share"
import { HOME, isPublicDeployment, SITE_ROUTES, type Environment } from "./site"

/**
 * Which deployments are for finding, approved by the maintainer on
 * 27 September.
 *
 * Every pull request gets a deployment, and since #406 each one serves a
 * `schema.org` graph naming this product and an `/llms.txt` describing it. An
 * indexed preview is not a stray copy of some HTML: it is a second thing on the
 * internet stating, in the format a machine reads as fact, that it is Loom.
 *
 * **The assertion that matters most here is the negative one** — that a
 * deployment Vercel says nothing about is left exactly as it was. This file
 * ships in the repository, and the obvious spelling of the rule would silently
 * de-index the site of anybody running their own Loom deployment outside
 * Vercel. That failure cannot be seen from here and is far worse than a preview
 * being crawled.
 */

const ORIGIN = "https://loom.example"
const env = (vercelEnv?: string): Environment =>
  vercelEnv === undefined ? {} : { VERCEL_ENV: vercelEnv }

describe("which deployments are for finding", () => {
  it("is the production one", () => {
    expect(isPublicDeployment(env("production"))).toBe(true)
  })

  it.each(["preview", "development"])("is not the %s one", (where) => {
    expect(isPublicDeployment(env(where))).toBe(false)
  })

  /**
   * The negative case, which is the one this rule exists to get right.
   *
   * A local `next start`, a test run, and a self-hosted Loom site all have no
   * `VERCEL_ENV`. Every one of them keeps the behavior it had before this
   * rule existed.
   */
  it.each([undefined, ""])("leaves a deployment Vercel says nothing about alone (%s)", (value) => {
    expect(isPublicDeployment(value === undefined ? {} : { VERCEL_ENV: value })).toBe(true)
  })
})

describe("what a page tells a crawler about itself", () => {
  it.each(SITE_ROUTES)("$path says nothing on a public deployment", (route) => {
    const meta = pageMetadata(route, { origin: ORIGIN, theme: "minimal" })

    expect(meta.robots).toBeUndefined()
  })

  /**
   * Asserted through the same function the route calls rather than against the
   * predicate, because the failure worth catching is the metadata forgetting to
   * ask — and the canonical is checked alongside it, since the two together are
   * what stop a preview competing with production.
   */
  it("carries the canonical whether or not it is indexed", () => {
    const meta = pageMetadata(HOME, { origin: ORIGIN, theme: "minimal" })

    expect(meta.alternates?.canonical).toBe(`${ORIGIN}/`)
  })
})
