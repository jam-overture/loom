import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * 0027 wants two independent checks on every page: the proxy turns
 * unauthenticated requests away, and `requireActor` runs inside the page. The
 * record is explicit that neither is optional — "the proxy covers the page
 * somebody forgets to guard, and `requireActor` covers the matcher somebody
 * edits" — but nothing enforced the second half, and `/primitives` shipped
 * without it within a day of the record landing.
 *
 * Reading the source is crude. It is also the only check that runs without a
 * browser, a session and a server, which is what makes it a check that actually
 * runs.
 */
const APP = join(process.cwd(), "app")

/**
 * `/sign-in` must be reachable without a session or nobody could ever get one,
 * and `/` only redirects — it renders nothing and reads nothing, so an actor
 * would gate a page that has no content to protect.
 */
const UNGUARDED_BY_DESIGN: readonly string[] = ["sign-in/page.tsx", "page.tsx"]

const pagesUnder = (directory: string, prefix = ""): readonly string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const relative = prefix === "" ? entry.name : `${prefix}/${entry.name}`

    if (entry.isDirectory()) return pagesUnder(join(directory, entry.name), relative)

    return entry.name === "page.tsx" ? [relative] : []
  })

describe("every page", () => {
  const pages = pagesUnder(APP)

  it("finds the pages at all, so an empty sweep cannot pass silently", () => {
    expect(pages.length).toBeGreaterThanOrEqual(5)
  })

  it("calls requireActor, unless it is unguarded by design", () => {
    const unguarded = pages
      .filter((page) => !UNGUARDED_BY_DESIGN.includes(page))
      .filter((page) => !readFileSync(join(APP, page), "utf8").includes("requireActor("))

    expect(unguarded).toEqual([])
  })

  /** The exemptions are a list someone can append to, so they are named. */
  it("exempts only the sign-in page and the root redirect", () => {
    expect([...UNGUARDED_BY_DESIGN].sort()).toEqual(["page.tsx", "sign-in/page.tsx"])
  })

  /**
   * The other half of the same problem, and the half that fails silently.
   *
   * A guarded page has no cookie during `next build`, so `requireActor`
   * redirects, and Next keeps that redirect as the page's prerendered output —
   * served, with a stale time, to a reviewer the proxy has already let through.
   * `/primitives` shipped in that state and nothing noticed, because a page that
   * renders correctly in `pnpm dev` gives no sign of it.
   *
   * Declared once in the root layout and asserted here, since the alternative is
   * remembering it per page and finding out from a deployment.
   */
  it("is rendered per request, declared for the whole segment in the layout", () => {
    const layout = readFileSync(join(APP, "layout.tsx"), "utf8")

    expect(layout).toContain('export const dynamic = "force-dynamic"')
  })
})
