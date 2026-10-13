import { existsSync, readdirSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { runtimeWordsIn } from "@/app/(portal)/_test/plain-language"
import { isForwarding, portalScreens, screenSource } from "@/app/(portal)/_lib/screen-source"
import { screenName } from "@/app/(portal)/_lib/screen-names"

import { SECTIONS, sectionFor, sectionItems } from "./sections"

/**
 * A nav item is a claim that a route exists, and until the rail's first test
 * that claim was unchecked — three of four items pointed at 404s on a deployed
 * portal. Reading the filesystem is cruder than reading Next's route manifest,
 * but the manifest only exists after a build, and a test that needs a build to
 * run is a test that stops being run.
 *
 * Carried over from `nav-items.test.ts`, which this replaces, along with the
 * assertions that earned their place there. What is new is at the bottom: a
 * check that the rail reaches every screen, which the one-level rail could not
 * ask because it had no notion of a screen that was not in it.
 */
const APP = join(process.cwd(), "app")

/**
 * A route group contributes nothing to a URL, so `/portal/pages` is on disk at
 * `app/(portal)/portal/pages` — the group is where the file is, the segment is
 * what a reader types, and only the second half appears in an `href`.
 *
 * Which group holds it is therefore not something an `href` can be read for, so
 * the search is over every group rather than the portal's own: checking only
 * where this lane's files live would report a working link as broken and —
 * worse, the next time — a broken one as unverifiable.
 */
const GROUPS = (): readonly string[] =>
  readdirSync(APP, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("("))
    .map((entry) => join(APP, entry.name))

const routeExists = (href: string): boolean =>
  GROUPS().some((group) => existsSync(join(group, href.replace(/^\//, ""), "page.tsx")))

const items = SECTIONS.flatMap((section) => sectionItems(section))
const hrefs = [...SECTIONS.map((section) => section.href), ...items.map((item) => item.href)]

describe("the sections the rail offers", () => {
  it("points every destination, at either level, at a route that exists", () => {
    const broken = hrefs.filter((href) => !routeExists(href))

    expect(broken).toEqual([])
  })

  /** Guards the guard: a broken href must actually be detected as broken. */
  it("detects a route that does not exist", () => {
    expect(routeExists("/nowhere")).toBe(false)
    expect(routeExists("/portal/pages")).toBe(true)
  })

  /**
   * The reason the search is over every group, asserted rather than assumed.
   * `/` is the marketing front door the wordmark points at, served by
   * `(marketing)` and by nothing under `(portal)`.
   */
  it("still resolves an href outside this route group", () => {
    expect(GROUPS().length).toBeGreaterThan(1)
    expect(routeExists("/")).toBe(true)
  })

  it("names every section, and gives no two the same name", () => {
    const labels = SECTIONS.map((section) => section.label)

    expect(labels.filter((label) => label.trim() === "")).toEqual([])
    expect(new Set(labels).size).toBe(labels.length)
    expect(labels.length).toBeGreaterThan(2)
  })

  it("leads every section somewhere different", () => {
    const leads = SECTIONS.map((section) => section.href)

    expect(new Set(leads).size).toBe(leads.length)
  })

  /**
   * A section with a submenu leads into it.
   *
   * The glyph and the first entry of the second rail are the same press, and a
   * section whose glyph went somewhere its own submenu does not list would be a
   * screen reachable one way and unmarked the other — the rail would highlight
   * a section and then highlight nothing inside it.
   */
  it("leads a section with a submenu at one of its own screens", () => {
    const astray = SECTIONS.filter(
      (section) =>
        section.groups !== undefined &&
        !sectionItems(section).some((item) => item.href === section.href)
    )

    expect(astray).toEqual([])
  })

  /** A group with nothing in it is a heading over a gap. */
  it("puts at least one screen in every group it declares", () => {
    const empty = SECTIONS.flatMap((section) => section.groups ?? []).filter(
      (group) => group.items.length === 0
    )

    expect(empty).toEqual([])
  })

  /**
   * **No submenu of one.** A second rail listing the screen you are already on
   * is a rail that exists to be symmetrical, and it is the same mistake as a
   * portal geared to one app: a list is a claim that there is a choice.
   */
  it("declares no submenu that offers a single screen", () => {
    const lonely = SECTIONS.filter(
      (section) => section.groups !== undefined && sectionItems(section).length < 2
    )

    expect(lonely).toEqual([])
  })

  /**
   * Two entries a reader cannot tell apart make the rail worth less than one.
   * `Activity` and `History` were exactly that pair for a fortnight — the two
   * screens are nearly opposites and their names were synonyms.
   *
   * Within a rail rather than across both of them, which is the one thing that
   * changed with the second level: `Rules` is a section *and* the screen at the
   * top of it, the way every tool's `Settings` section opens on `General`. A
   * reader meeting the same word twice on two levels reads it as the same
   * place, because it is.
   *
   * Case and punctuation are normalised because the failure this catches is a
   * reader's, and a reader does not distinguish `Sign-ins` from `sign ins`.
   */
  const plainly = (label: string): string =>
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/gu, " ")
      .trim()

  it("gives no two entries in one rail the same label", () => {
    for (const rail of [
      SECTIONS.map((section) => section.label),
      ...SECTIONS.map((section) => sectionItems(section).map((item) => item.label)),
    ]) {
      const normalised = rail.map(plainly)

      expect(new Set(normalised).size).toBe(normalised.length)
    }
  })

  /**
   * The rail does not name a screen; it reads the name.
   *
   * `Waiting on you` was the front door's label from the day the rail existed,
   * and it stopped describing its screen on 7 September when that screen grew a
   * second half — without anything failing, because the label and the heading
   * were two independent strings.
   */
  it("reads the name of every screen that has one", () => {
    const declared = items.filter((item) =>
      ["/portal", "/portal/activity", "/portal/history"].includes(item.href)
    )

    expect(declared).toHaveLength(3)
    expect(declared.map((item) => item.label)).toEqual([
      screenName("/portal"),
      screenName("/portal/activity"),
      screenName("/portal/history"),
    ])
  })

  it("marks every item whose href is a prefix of another destination as exact", () => {
    const ambiguous = items.filter((item) =>
      hrefs.some((other) => other !== item.href && other.startsWith(`${item.href}/`))
    )

    expect(ambiguous.length).toBeGreaterThan(0)
    expect(ambiguous.filter((item) => item.exact !== true)).toEqual([])
  })

  it("offers no demo", () => {
    expect(hrefs.filter((href) => href.includes("demo"))).toEqual([])
    expect(
      [...SECTIONS.map((section) => section.label), ...items.map((item) => item.label)].filter(
        (label) => /demo/iu.test(label)
      )
    ).toEqual([])
  })

  /**
   * The plain-language rule, asserted here because nothing else sweeps this
   * file.
   *
   * `every-screen.test.ts` reads the lane's `.tsx` files — a label is usually
   * written in the component that draws it. These labels are data in a `.ts`
   * module, which is the right place for them and is outside that sweep, so the
   * rule that stopped `did-not-apply` and `Allowed by nobody` reaching a reader
   * is applied to the first words anybody on this surface meets.
   */
  it("says nothing in the runtime's vocabulary", () => {
    const words = [
      ...SECTIONS.map((section) => section.label),
      ...SECTIONS.flatMap((section) => section.groups ?? []).map((group) => group.name),
      ...items.map((item) => item.label),
    ]

    for (const word of words) expect(runtimeWordsIn(word)).toEqual([])
  })
})

/**
 * The check the one-level rail could not ask.
 *
 * A flat list of twelve had no way to say what it was missing: every screen
 * either was an entry or was not, and nothing knew which screens there were.
 * `_lib/screen-source.ts` enumerates them from the filesystem, so the rail can
 * now be held to reaching all of them — and `/portal/primitives` is the reason
 * that is worth a test rather than a habit. It shipped as a rail entry pointing
 * at a page that answered every signed-in reviewer with a redirect to the
 * sign-in they had already passed.
 */
describe("what the rail reaches", () => {
  /**
   * A screen a reader could type, which is the set a rail is answerable for.
   *
   * One segment under `/portal` and no dynamic ones: `/portal/pages/[treeId]`
   * is reached *from* a screen rather than from a rail, and a rail entry
   * carrying a particular tree would be a bookmark rather than a destination.
   */
  const topLevel = portalScreens()
    .filter((screen) => /^\/portal(\/[a-z-]+)?$/u.test(screen.route))
    .filter((screen) => !isForwarding(screenSource(screen.file)))
    .map((screen) => screen.route)

  /**
   * The two that are deliberately not in it, named here rather than filtered
   * quietly.
   *
   * `/portal/sign-in` is the one page in this group reached without a session,
   * drawn without the chrome — a rail on it would offer routes that all
   * redirect back to it. `/portal/preview` is the shell prototype: invented
   * data, arguing for a shape, and an entry in the real rail would be the
   * portal recommending its own mock-up.
   */
  const NOT_IN_THE_RAIL: readonly string[] = ["/portal/sign-in", "/portal/preview"]

  it("finds the screens it is supposed to be checking", () => {
    expect(topLevel).toContain("/portal")
    expect(topLevel).toContain("/portal/trust")
    expect(topLevel.length).toBeGreaterThanOrEqual(10)
  })

  it("offers every screen a reader could ask for by name", () => {
    const unreachable = topLevel
      .filter((route) => !NOT_IN_THE_RAIL.includes(route))
      .filter((route) => !hrefs.includes(route))

    expect(unreachable).toEqual([])
  })
})

describe("the section a path is in", () => {
  it("is the one that claims the path most specifically", () => {
    expect(sectionFor("/portal")?.key).toBe("overview")
    expect(sectionFor("/portal/app")?.key).toBe("overview")
    expect(sectionFor("/portal/pages")?.key).toBe("pages")
    expect(sectionFor("/portal/rules")?.key).toBe("rules")
    expect(sectionFor("/portal/rules/what-if")?.key).toBe("rules")
    expect(sectionFor("/portal/activity")?.key).toBe("logs")
    expect(sectionFor("/portal/trust")?.key).toBe("logs")
  })

  /**
   * Longest match rather than first, which is the whole of why this is a
   * function and not a lookup. `/portal` is a prefix of every path in the
   * portal, so a first match would put every screen in `Overview` and the icon
   * rail would light the same glyph everywhere.
   */
  it("does not give the front door every screen beneath it", () => {
    expect(sectionFor("/portal/pieces")?.key).not.toBe("overview")
    expect(sectionFor("/portal/checkup/everything")?.key).toBe("logs")
  })

  /** A section claims what is inside its screens, however deep. */
  it("keeps a reader inside the section they opened", () => {
    expect(sectionFor("/portal/pages/t_home1")?.key).toBe("pages")
    expect(sectionFor("/portal/pages/t_home1/versions")?.key).toBe("pages")
    expect(sectionFor("/portal/pages/t_home1/proposed/p_1")?.key).toBe("pages")
  })

  /**
   * Prefix matching respects segment boundaries. A bare `startsWith` makes
   * `/portal/pages` claim `/portal/pagesetter`, which is invisible until a
   * route happens to share a prefix with another.
   */
  it("does not let one section claim a path that merely starts like it", () => {
    expect(sectionFor("/portal/pagesetter")?.key).not.toBe("pages")
  })

  /**
   * Nothing, rather than a guess. A rail that highlights the wrong place is
   * worse than one that highlights none, and both of these paths are screens
   * the rail is deliberately not answerable for.
   */
  it("claims neither the sign-in nor the prototype", () => {
    expect(sectionFor("/portal/sign-in")).toBeUndefined()
    expect(sectionFor("/portal/preview")).toBeUndefined()
    expect(sectionFor("/portal/preview/overture/logs")).toBeUndefined()
  })
})
