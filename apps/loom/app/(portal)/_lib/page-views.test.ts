import { existsSync, readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import type { TreeId } from "@loom/runtime"

import { UNTITLED, type PageName } from "./page-name"
import {
  everyPageHref,
  pageViewsFor,
  scopedLead,
  type PageViewKey,
  type ScopedView,
} from "./page-views"
import { readingOf } from "./vocabulary"

const TREE = "t_seed1" as TreeId

/** A page as every caller of `scopedLead` now holds one: named, with its id kept. */
const NAMED: PageName = { name: "Autumn arrivals", treeId: TREE, derived: true }

const KEYS: readonly PageViewKey[] = ["page", "asked", "changed", "readers", "trust", "checkup"]
const SCOPED: readonly ScopedView[] = ["asked", "changed", "readers", "trust", "checkup"]

describe("pageViewsFor", () => {
  it("offers every view of the page, in a fixed order", () => {
    expect(pageViewsFor(TREE, "page").map((view) => view.key)).toEqual(KEYS)
  })

  it("scopes every view to the page it was asked about", () => {
    expect(pageViewsFor(TREE, "page").map((view) => view.href)).toEqual([
      "/portal/pages/t_seed1",
      "/portal/activity?tree=t_seed1",
      "/portal/history?tree=t_seed1",
      "/portal/readers?tree=t_seed1",
      "/portal/trust?tree=t_seed1",
      "/portal/checkup?tree=t_seed1",
    ])
  })

  it("marks exactly one view as the reader's own, whichever they are on", () => {
    for (const key of KEYS) {
      const current = pageViewsFor(TREE, key).filter((view) => view.current)

      expect(current.map((view) => view.key)).toEqual([key])
    }
  })

  /**
   * The labels are what this whole strip is for, so what is pinned is the
   * property rather than the wording: a label that names a route or a data
   * structure is the thing the 18 August redirection exists to remove, and
   * `/trees` reappearing as a tab is exactly how it would come back.
   */
  it("never labels a view with the route or the runtime's word for it", () => {
    const labels = pageViewsFor(TREE, "page").map((view) => view.label.toLowerCase())

    for (const word of ["tree", "audit", "calibration", "revision", "delta", "portal", "/"]) {
      expect(labels.some((label) => label.includes(word))).toBe(false)
    }
  })
})

/**
 * A tab is a claim that a route exists, and the rail's own test was written
 * after three of its four items pointed at 404s on a deployed portal. This strip
 * makes the same claim five times on five screens, and one of those routes only
 * answers when a query parameter is present — which is the case a link is most
 * likely to get wrong and least likely to be noticed getting wrong.
 */
const APP = join(process.cwd(), "app")

const GROUPS = (): readonly string[] =>
  readdirSync(APP, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("("))
    .map((entry) => join(APP, entry.name))

/**
 * `/portal/pages/t_seed1` is served by `portal/pages/[treeId]`, so the last
 * segment of a scoped page link is a value rather than a directory. Everything
 * else keeps its tree in the query string, which contributes no segment at all.
 */
const routeExists = (href: string): boolean => {
  const path = href.split("?")[0]!
  const onDisk = path.replace(/^\/portal\/pages\/t_[0-9a-z]+$/u, "/portal/pages/[treeId]")

  return GROUPS().some((group) => existsSync(join(group, onDisk.replace(/^\//, ""), "page.tsx")))
}

describe("where the strip points", () => {
  it("points every view at a route that exists", () => {
    const broken = pageViewsFor(TREE, "page")
      .map((view) => view.href)
      .filter((href) => !routeExists(href))

    expect(broken).toEqual([])
  })

  it("points the way out at the same view, unscoped", () => {
    expect(KEYS.map(everyPageHref)).toEqual([
      "/portal/pages",
      "/portal/activity",
      "/portal/history",
      "/portal/readers",
      "/portal/trust",
      "/portal/checkup",
    ])
  })

  it("points the way out at a route that exists too", () => {
    expect(KEYS.map(everyPageHref).filter((href) => !routeExists(href))).toEqual([])
  })

  /** Guards the guard: a route that is not there must be detected as not there. */
  it("detects a route that does not exist", () => {
    expect(routeExists("/portal/nowhere")).toBe(false)
    expect(routeExists("/portal/pages/t_seed1")).toBe(true)
  })
})

describe("scopedLead", () => {
  /**
   * The whole sentence, not either half. A `before` that has lost its trailing
   * space still satisfies every `toContain` anybody would write, and reads
   * `…asked Loom to change ont_seed1` on the screen.
   */
  it("reads as one sentence with the page's name in it", () => {
    expect(readingOf(scopedLead("asked", NAMED))).toBe(
      "Everything anyone has asked Loom to change on Autumn arrivals t_seed1, newest first — including the changes it wasn’t allowed to make and the requests it didn’t understand. Those leave no other trace anywhere."
    )
  })

  it("names the page on every scoped screen, and ends in a full stop", () => {
    for (const view of SCOPED) {
      const reading = readingOf(scopedLead(view, NAMED))

      expect(reading).toContain(" Autumn arrivals t_seed1")
      expect(reading.endsWith(".")).toBe(true)
    }
  })

  /**
   * The id never leaves, on any of the four. It is what a reader pastes into a
   * URL, quotes in a support thread and matches against a log line, and 22
   * August settled that identity is not technical detail — so the words are
   * added beside it rather than in place of it.
   */
  it("keeps the id in the sentence beside the words", () => {
    for (const view of SCOPED) {
      expect(readingOf(scopedLead(view, NAMED))).toContain("t_seed1")
    }
  })

  /**
   * A page that never said what it is called still has to be talked about. The
   * sentence reads "Untitled page t_seed1" rather than losing its subject —
   * which is also what a failed store read produces, deliberately: a screen
   * that cannot name the page it is scoped to still knows which page it is.
   */
  it("still reads as a sentence when the page has no name of its own", () => {
    const reading = readingOf(scopedLead("changed", { name: UNTITLED, treeId: TREE, derived: false }))

    expect(reading).toContain(`${UNTITLED} t_seed1`)
    expect(reading.startsWith("Every change")).toBe(true)
  })

  /**
   * The defect this replaces: a filtered screen that made the deployment's
   * claim. A scoped sentence saying "everything" without saying what it is
   * everything *of* is the sentence that was wrong before, in new words.
   */
  it("never claims to be showing every page", () => {
    for (const view of SCOPED) {
      expect(readingOf(scopedLead(view, NAMED)).toLowerCase()).not.toContain("every page")
    }
  })

  it("keeps the name verbatim, so two pages are told apart by it", () => {
    expect(
      scopedLead("changed", { name: "Winter sale", treeId: "t_other", derived: true }).subject
    ).toBe("Winter sale t_other")
  })
})

/**
 * The check the wiring cannot forget.
 *
 * Six screens have to render the strip and each has to claim a different one of
 * the six views, and none of that is visible from any one screen's own tests. A
 * sixth view added to the module with no screen behind it, or a screen that
 * quietly drops the strip in a refactor, both come back here — which is the
 * failure that left `/portal/trust?tree=` reachable only by typing a URL for as
 * long as the screen has existed.
 */
const SCREENS: Readonly<Record<PageViewKey, readonly string[]>> = {
  page: ["portal", "pages", "[treeId]", "page.tsx"],
  asked: ["portal", "activity", "page.tsx"],
  changed: ["portal", "history", "page.tsx"],
  readers: ["portal", "readers", "page.tsx"],
  trust: ["portal", "trust", "page.tsx"],
  checkup: ["portal", "checkup", "page.tsx"],
}

const sourceOf = (parts: readonly string[]): string =>
  readFileSync(join(APP, "(portal)", ...parts), "utf8").replace(
    /\/\*[\s\S]*?\*\/|\/\/[^\n]*/gu,
    ""
  )

describe("every view's screen", () => {
  it("renders the strip", () => {
    const missing = KEYS.filter((key) => !sourceOf(SCREENS[key]).includes("<PageViews"))

    expect(missing).toEqual([])
  })

  it("claims its own view, and no two claim the same one", () => {
    const claimed = KEYS.map((key) => {
      const found = /current="([a-z]+)"/u.exec(sourceOf(SCREENS[key]))

      return found?.[1]
    })

    expect(claimed).toEqual(KEYS)
  })

  /**
   * Reading order: where you are, then where else you could be, then the thing
   * itself. A strip above the heading puts five destinations in front of a
   * reader who has not yet been told which page they are on — and this strip is
   * the most repeated element in the portal, so getting it the wrong way round
   * gets it wrong five times.
   *
   * The page screen is checked separately below, because its heading is inside
   * `PreviewFrame` rather than in the route file, and an index comparison
   * against the heading in its error branch would pass for the wrong reason.
   */
  it("comes after the heading on every screen that owns its heading", () => {
    for (const key of SCOPED) {
      const source = sourceOf(SCREENS[key])

      expect([key, source.indexOf("<PageViews") > source.indexOf("<h1")]).toEqual([key, true])
    }
  })

  it("comes after the page's own name, and before the page", () => {
    const frame = sourceOf(["portal", "pages", "[treeId]", "_components", "preview-frame.tsx"])

    expect(frame.indexOf("{views}")).toBeGreaterThan(frame.indexOf("</header>"))
    expect(frame.indexOf("{views}")).toBeLessThan(frame.indexOf("{children}"))
  })

  /**
   * One vocabulary, enforced. Every scoped cross-view link now comes from this
   * module, so a screen writing another view's URL by hand is a screen about to
   * disagree with the strip beside it about what that view is called — which is
   * what five screens with five wordings for the same five destinations were.
   *
   * Scoped query links only. `/portal/pages/…` is deliberately not covered: an
   * empty state's action is a link to the page and it is the answer to "what do
   * I do now", not a second navigation. The strip is where you go to *look*;
   * the action is where you go to *do*, and a screen is allowed both.
   */
  it("hand-builds no scoped link to another view of the same page", () => {
    const paths = Object.fromEntries(
      SCOPED.map((view) => [view, everyPageHref(view)])
    ) as Record<ScopedView, string>

    for (const key of KEYS) {
      const source = sourceOf(SCREENS[key])

      for (const view of SCOPED.filter((other) => other !== key)) {
        expect([key, view, source.includes(`${paths[view]}?`)]).toEqual([key, view, false])
      }
    }
  })
})
