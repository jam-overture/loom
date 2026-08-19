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
 * `/portal/demo` is the third and the only one that renders anything. It is public
 * because its whole purpose is to be seen by someone with no account, and it is
 * safe to be public because it reads nothing this portal protects: its own
 * registry, its own in-memory store keyed by an opaque cookie, its own policy,
 * and no identity. An exemption that grew to include a page reading
 * `portalStore` would be the failure this list exists to make visible, so the
 * test below asserts that it does not.
 */
const UNGUARDED_BY_DESIGN: readonly string[] = [
  "portal/sign-in/page.tsx",
  "portal/page.tsx",
  "portal/demo/page.tsx",
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
  it("exempts only the sign-in page, the root redirect and the demo", () => {
    expect([...UNGUARDED_BY_DESIGN].sort()).toEqual([
      "portal/demo/page.tsx",
      "portal/page.tsx",
      "portal/sign-in/page.tsx",
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
