import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * 0027 wants two independent checks on every page: the proxy turns
 * unauthenticated requests away, and `requireActor` runs inside the page. The
 * record is explicit that neither is optional — "the proxy covers the page
 * somebody forgets to guard, and `requireActor` covers the matcher somebody
 * edits" — but nothing enforced the second half, and `/portal/primitives` shipped
 * without it within a day of the record landing.
 *
 * Reading the source is crude. It is also the only check that runs without a
 * browser, a session and a server, which is what makes it a check that actually
 * runs.
 *
 * The sweep is the `(portal)` route group and nothing outside it. Marketing, the
 * docs and the lessons share this application (0067) and are public by design,
 * so a sweep over `app/` would report every one of their pages as unguarded —
 * which is this check saying the opposite of what it means.
 */
const APP = join(process.cwd(), "app", "(portal)")

/**
 * `/portal/sign-in` must be reachable without a session or nobody could ever get
 * one, and `/portal` only redirects — it renders nothing and reads nothing, so
 * an actor would gate a page that has no content to protect.
 *
 * The other five are redirects, and they are here for `/portal`'s reason
 * exactly: each renders nothing and reads nothing, so an actor would gate a page
 * with no content to protect.
 *
 * `/portal/demo` is where the demo lived until it moved to a public `/demo` of
 * its own. `/portal/trees`, `/portal/calibration`, `/portal/audit` and
 * `/portal/primitives` are the old names of routes renamed into a person's
 * words — `/portal/pages`, `/portal/trust`, `/portal/checkup` and
 * `/portal/pieces` — each kept alive as a 308 so a bookmark or a link written in
 * a report still lands somewhere.
 *
 * The proxy still covers all five, since all are under `/portal`. That matters
 * for the demo's: a signed-out visitor following an old link is forwarded to
 * `/demo` rather than sent to sign in for a page that needs no account.
 *
 * The list is allowed to grow with renames and must not grow with pages. An
 * exemption covering something that reads `portalStore` would be the failure it
 * exists to make visible, so the test below asserts that none of them does.
 */
const UNGUARDED_BY_DESIGN: readonly string[] = [
  "portal/sign-in/page.tsx",
  "portal/page.tsx",
  "portal/demo/page.tsx",
  "portal/trees/[[...rest]]/page.tsx",
  "portal/calibration/[[...rest]]/page.tsx",
  "portal/audit/[[...rest]]/page.tsx",
  "portal/primitives/[[...rest]]/page.tsx",
]

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
  it("exempts only the sign-in page and the six redirects", () => {
    expect([...UNGUARDED_BY_DESIGN].sort()).toEqual([
      "portal/audit/[[...rest]]/page.tsx",
      "portal/calibration/[[...rest]]/page.tsx",
      "portal/demo/page.tsx",
      "portal/page.tsx",
      "portal/primitives/[[...rest]]/page.tsx",
      "portal/sign-in/page.tsx",
      "portal/trees/[[...rest]]/page.tsx",
    ])
  })

  /**
   * The exemption is only defensible while it stays true. An unguarded page that
   * reached the portal's store, its telemetry journal or its identity would be
   * an open door to the very things the guard exists for — and it would look
   * exactly like an ordinary import.
   */
  it("keeps every unguarded page away from the portal's own store and journal", () => {
    /**
     * Auth is not on the list: `/portal/sign-in` exists to use it. What must not be
     * reachable without a session is the reviewed tree, the write path that
     * appends to it, and the journal of what has been asked of it.
     */
    const FORBIDDEN = [
      "@/app/(portal)/_lib/store",
      "@/app/(portal)/_lib/telemetry",
      "@/app/(portal)/_lib/write",
      "@/app/(portal)/_lib/database",
    ]

    const reaching = UNGUARDED_BY_DESIGN.filter((page) => {
      const source = readFileSync(join(APP, page), "utf8")

      return FORBIDDEN.some((module) => source.includes(`from "${module}`))
    })

    expect(reaching).toEqual([])
  })

  /**
   * The other half of the same problem, and the half that fails silently.
   *
   * A guarded page has no cookie during `next build`, so `requireActor`
   * redirects, and Next keeps that redirect as the page's prerendered output —
   * served, with a stale time, to a reviewer the proxy has already let through.
   * `/portal/primitives` shipped in that state and nothing noticed, because a page that
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
