import { existsSync, readdirSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { screenName } from "@/app/(portal)/_lib/screen-names"

import { NAV_GROUPS } from "./nav-items"

/**
 * A nav item is a claim that a route exists, and until this test that claim was
 * unchecked — three of four items pointed at 404s on a deployed portal. Reading
 * the filesystem is cruder than reading Next's route manifest, but the manifest
 * only exists after a build, and a test that needs a build to run is a test that
 * stops being run.
 */
const APP = join(process.cwd(), "app")

/**
 * A route group contributes nothing to a URL, so `/portal/pages` is on disk at
 * `app/(portal)/portal/pages` — the group is where the file is, the segment is
 * what a reader types, and only the second half appears in an `href`.
 *
 * Which group holds it is therefore not something an `href` can be read for, and
 * as of the demo's move to `/demo` the rail points at two of them. So the search
 * is over every group rather than the portal's own: a nav item that left this
 * surface is still a claim that a route exists, and checking it only where this
 * lane's files live would report a working link as broken and — worse, the next
 * time — a broken one as unverifiable.
 */
const GROUPS = (): readonly string[] =>
  readdirSync(APP, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("("))
    .map((entry) => join(APP, entry.name))

const routeExists = (href: string): boolean =>
  GROUPS().some((group) => existsSync(join(group, href.replace(/^\//, ""), "page.tsx")))

describe("NAV_GROUPS", () => {
  const items = NAV_GROUPS.flatMap((group) => group.items)

  it("points every item at a route that exists", () => {
    const broken = items.filter((item) => !routeExists(item.href)).map((item) => item.href)

    expect(broken).toEqual([])
  })

  it("has no duplicate destinations", () => {
    const hrefs = items.map((item) => item.href)

    expect(new Set(hrefs).size).toBe(hrefs.length)
  })

  /** Guards the guard: a broken href must actually be detected as broken. */
  it("detects a route that does not exist", () => {
    expect(routeExists("/nowhere")).toBe(false)
    expect(routeExists("/portal/pages")).toBe(true)
  })

  /**
   * The reason the search widened, asserted rather than assumed. `/demo` is
   * served by `app/(demo)/demo/page.tsx` and nothing under `(portal)`, so a
   * check scoped to this lane's own group would call the rail's demo entry
   * broken — and the fix for that failing test is not to point the rail back at
   * a redirect.
   */
  /**
   * The rail leads with the thing every other entry is about.
   *
   * It led with the front door until 1 October, and the argument for that was
   * right while the portal was a review queue with screens around it: the queue
   * is the one screen with something urgent on it. It is wrong for a governance
   * surface. A reader who does not know what they have cannot read a list of
   * changes to it, and the queue is empty on every deployment nobody has asked
   * anything of — which is every deployment on its first day, which is every
   * deployment a new person meets.
   */
  it("leads with the app, which is what everything else here is about", () => {
    expect(NAV_GROUPS[0]?.name).toBe("Your app")
    expect(NAV_GROUPS[0]?.items[0]?.href).toBe("/portal/app")
  })

  /**
   * The front door is still exact wherever it sits. `/portal` is the prefix of
   * every other href in this rail, so without it the front door is the active
   * item on every screen in the portal and the rail stops distinguishing
   * anything. Asserted by href rather than by position, which is the half that
   * survived the reordering above.
   */
  it("keeps the front door claiming only its own path", () => {
    expect(items.find((item) => item.href === "/portal")?.exact).toBe(true)
  })

  /**
   * Every group is named, which is the change this rearrangement is for. A
   * divider says *these are not the same kind of thing* and cannot say what kind
   * either of them is — so a reader met twelve nouns in three heaps and had to
   * infer the model from the nouns.
   */
  it("names every group, and gives no two the same name", () => {
    const names = NAV_GROUPS.map((group) => group.name)

    expect(names.filter((name) => name.trim() === "")).toEqual([])
    expect(new Set(names).size).toBe(names.length)
    expect(names.length).toBeGreaterThan(2)
  })

  /** A group with nothing in it is a heading over a gap. */
  it("puts at least one place in every group", () => {
    expect(NAV_GROUPS.filter((group) => group.items.length === 0)).toEqual([])
  })

  /**
   * The rail does not name a screen; it reads the name.
   *
   * `Waiting on you` was this entry's label from the day the rail existed, and
   * it stopped describing its screen on 7 September when that screen grew a
   * second half — without anything failing, because the label and the heading
   * were two independent strings. It also named two other things on this
   * surface: the front door's first section, and the state of a change on every
   * badge in the portal.
   *
   * Asserted against `screenName` rather than against a literal, which is the
   * point: a test carrying its own copy of the name would be a fourth place to
   * update and would pass while the rail said something else.
   */
  it("reads the name of every screen that has one", () => {
    const labelled = items.filter((item) =>
      ["/portal", "/portal/activity", "/portal/history"].includes(item.href)
    )

    expect(labelled).toHaveLength(3)
    expect(labelled.map((item) => item.label)).toEqual([
      screenName("/portal"),
      screenName("/portal/activity"),
      screenName("/portal/history"),
    ])
  })

  /**
   * Two rail entries a reader cannot tell apart make the rail worth less than
   * one. `Activity` and `History` were exactly that pair for a fortnight — the
   * two screens are nearly opposites and their names were synonyms — so the
   * property is asserted rather than left to whoever adds the tenth entry.
   *
   * Case and punctuation are normalised because the failure this catches is a
   * reader's, and a reader does not distinguish `Sign-ins` from `sign ins`.
   */
  it("gives no two entries the same label", () => {
    const normalised = items.map((item) =>
      item.label.toLowerCase().replace(/[^a-z0-9]+/gu, " ").trim()
    )

    expect(new Set(normalised).size).toBe(normalised.length)
  })

  it("marks every item whose href is a prefix of another's as exact", () => {
    const hrefs = items.map((item) => item.href)
    const ambiguous = items.filter((item) =>
      hrefs.some((other) => other !== item.href && other.startsWith(`${item.href}/`))
    )

    expect(ambiguous.filter((item) => item.exact !== true)).toEqual([])
  })

  it("finds a route served by another surface's route group", () => {
    expect(GROUPS().length).toBeGreaterThan(1)
    expect(routeExists("/demo")).toBe(true)
    expect(items.some((item) => item.href === "/demo")).toBe(true)
  })
})
