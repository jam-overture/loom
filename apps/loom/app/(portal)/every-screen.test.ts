import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { namedScreens } from "./_lib/screen-names"
import { isForwarding, portalScreens, screenSource } from "./_lib/screen-source"

/**
 * The rules that hold on every screen in the portal, checked on every screen in
 * the portal.
 *
 * Seven screens carried a `reading-order.test.ts` of their own and each one
 * repeated the same two or three universal assertions alongside the one thing
 * that was actually about that screen. The universal half is here now, run over
 * whatever the filesystem holds; the per-screen half stays where it is, because
 * "the page comes before the index of the page" is a fact about the page screen
 * and belongs beside it.
 *
 * The reason this file exists rather than an eighth copy is in
 * `_lib/screen-source.ts`: **a guard somebody has to remember to write guards
 * the screens somebody remembered.** `/portal/trust` had no guard, and its first
 * contact with this one turned up a notice reporting a good result inside the
 * dashed box that means "nothing here yet".
 */

/** Everything in the lane, not only the routes. A component can misread as easily as a page. */
const sourcesUnder = (directory: string): readonly { file: string; source: string }[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)

    if (entry.isDirectory()) return sourcesUnder(path)
    if (!entry.name.endsWith(".tsx") || entry.name.includes(".test.")) return []

    return [{ file: path, source: readFileSync(path, "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/gu, "") }]
  })

const GROUP = join(process.cwd(), "app", "(portal)")

const screens = portalScreens()
const rendered = screens
  .map((screen) => ({ ...screen, source: screenSource(screen.file) }))
  .filter((screen) => !isForwarding(screen.source))

describe("the portal's screens, enumerated from the filesystem", () => {
  it("finds the screens that exist and none that do not", () => {
    const routes = screens.map((screen) => screen.route)

    expect(routes).toContain("/portal")
    expect(routes).toContain("/portal/pages/[treeId]")
    expect(routes).toContain("/portal/trust")
    expect(routes).not.toContain("/portal/nowhere")
  })

  /**
   * Guards the guard. If the enumeration silently returned nothing — a renamed
   * app directory, a `process.cwd()` that is not what this test assumes — every
   * rule below would pass over an empty list and report green.
   */
  it("finds more than a handful, so an empty sweep cannot pass as clean", () => {
    expect(screens.length).toBeGreaterThan(10)
    expect(rendered.length).toBeGreaterThan(8)
  })
})

/**
 * **A screen has one name.**
 *
 * On 7 September `/portal/activity` was called four different things by four
 * different parts of this portal — `Activity` in the rail, `Activity` in its own
 * heading, `What's been asked` in the strip, and `Everything anyone has asked
 * for →` at the foot of the front door. None of them was wrong on its own and no
 * test could see the set. `_lib/screen-names.ts` holds the argument.
 *
 * The check is that a declared name never appears as a literal in this route
 * group. Comments are already stripped, so the module's own reasoning about the
 * names it holds is not mistaken for a second copy of one — the same
 * arrangement that lets a guard sit under a comment naming the very string it
 * forbids.
 *
 * `.ts` files are swept as well as `.tsx`, which is what catches the case that
 * actually happened: the strip's labels lived in `_lib/page-views.ts` and
 * nothing rendered them from a component.
 */
describe("the name of a screen", () => {
  const NAMED = namedScreens()

  const everySource = (directory: string): readonly { file: string; source: string }[] =>
    readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const path = join(directory, entry.name)

      if (entry.isDirectory()) return everySource(path)
      if (!/\.tsx?$/u.test(entry.name) || entry.name.includes(".test.")) return []
      if (path === join(GROUP, "_lib", "screen-names.ts")) return []

      return [{ file: path, source: screenSource(path) }]
    })

  const sources = everySource(GROUP)

  it("finds the lane to sweep, so an empty sweep cannot pass as clean", () => {
    expect(sources.length).toBeGreaterThan(40)
    expect(NAMED.length).toBeGreaterThan(2)
  })

  it.each(NAMED.map((screen) => [screen.route, screen.name]))(
    "is written once for %s",
    (_route, name) => {
      const copies = sources
        .filter((entry) => entry.source.includes(name))
        .map((entry) => entry.file.slice(GROUP.length + 1))

      expect(copies).toEqual([])
    }
  )

  /**
   * The other end of the same rule: the name a screen used to have.
   *
   * A rename that only adds the new name leaves the old one wherever nobody
   * grepped. `_lib/waiting.ts` read "What was asked for stays in Activity" at
   * the moment a person decides whether to throw a change away — a sixth
   * wording, found by looking at a screenshot after four tests about naming had
   * already been written and passed.
   *
   * Bounded by letters on both sides, which is what lets `ActivityPage` and
   * `/portal/activity` stay exactly as they are. A symbol is a symbol and a
   * route is an address; neither is something a reader is shown.
   */
  it.each(
    NAMED.flatMap((screen) => screen.formerly.map((was) => [`${screen.route} — ${was}`, was]))
  )("no longer calls anything %s", (_label, was) => {
    const pattern = new RegExp(`(?<![A-Za-z])${was}(?![A-Za-z])`, "u")
    const left = sources
      .filter((entry) => pattern.test(entry.source))
      .map((entry) => entry.file.slice(GROUP.length + 1))

    expect(left).toEqual([])
  })

  /**
   * Guards the guard. If the sweep read nothing, or the names were compared
   * against sources they can never appear in, every case above would pass over
   * an empty list — so one string that is definitely in this lane has to be
   * found by exactly the same search.
   */
  it("detects a literal that is in the lane", () => {
    const found = sources.filter((entry) => entry.source.includes("TechnicalDetail"))

    expect(found.length).toBeGreaterThan(5)
  })
})

describe("what every screen owes a reader", () => {
  /**
   * The defect this rule was written for cost a screenshot to find and no test
   * could have caught it: `lg:flex-row-reverse` reads correctly at 1280px and,
   * at 390px where the row is not a row, puts an address book before the thing
   * it addresses. Focus order follows the source too, so the same reversal
   * costs a keyboard user at every width.
   *
   * Three screens pinned this separately. It is pinned over the whole lane
   * here, components included — a component can reverse a row as easily as a
   * page, and none of the three per-screen copies could see one that did.
   */
  it.each(sourcesUnder(GROUP).map((entry) => [entry.file.slice(GROUP.length + 1), entry.source]))(
    "%s never reverses a row or a column to place something",
    (_name, source) => {
      expect(source).not.toContain("flex-row-reverse")
      expect(source).not.toContain("flex-col-reverse")
    }
  )

  /**
   * The governing principle, made mechanical: **plain language is the default
   * and the technical record is one click away.** A screen that opens a
   * `<TechnicalDetail>` before it has said what a reader is looking at has
   * inverted it, and no component test can see the inversion because every one
   * of them renders the disclosure on its own.
   */
  it.each(rendered.map((screen) => [screen.route, screen.source]))(
    "%s names its subject before it opens the technical record",
    (_route, source) => {
      const disclosure = source.indexOf("<TechnicalDetail")

      if (disclosure === -1) return

      const heading = source.indexOf("<h1")

      expect(heading).toBeGreaterThan(-1)
      expect(heading).toBeLessThan(disclosure)
    }
  )
})

/**
 * Sentence case, over the whole lane.
 *
 * A heading is the largest text on a screen and the first thing read, so a lower
 * case one is the loudest possible signal about which voice the surface is
 * written in. `something here failed` was the portal's error screen until this
 * run — the one screen where a person is already deciding whether this software
 * is looked after.
 *
 * Headings whose text is an interpolation are skipped by the case rule rather
 * than exempted from every rule: a heading that renders a value cannot be case
 * checked from the source, and the rule below is the one that applies to it.
 */
describe("every heading a reader meets", () => {
  const allHeadings = sourcesUnder(GROUP).flatMap((entry) =>
    [...entry.source.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gu)]
      .map((match) => (match[1] ?? "").trim().replace(/\s+/gu, " "))
      .map((text) => [entry.file.slice(GROUP.length + 1), text] as const)
  )

  const headings = allHeadings.filter(([, text]) => !text.startsWith("{"))

  it("finds the headings this lane writes", () => {
    expect(headings.length).toBeGreaterThan(8)
  })

  it.each(headings.map(([file, text]) => [`${file} — ${text}`, text]))(
    "starts %s with a capital",
    (_label, text) => {
      expect(text.slice(0, 1)).toBe(text.slice(0, 1).toUpperCase())
    }
  )

  /**
   * **A heading is never a machine identifier.**
   *
   * `/portal/pages/[treeId]` was headed `<h1>{treeId}</h1>` — `t_seed1`, the
   * largest text on the busiest screen in the portal — for as long as the screen
   * existed. It was filed as a finding by the run that added the rule above,
   * because a heading that is *only* a name is a different problem from a
   * heading in the wrong case, and it is the problem this rule closes.
   *
   * The check is on the expression rather than on what it evaluates to, which is
   * all a source read can see: a heading may not interpolate anything whose name
   * says it is a tree id. That is exactly why `_lib/page-name.ts` hands screens a
   * `PageName` whose readable half is `name` — the words a person reads and the
   * identifier they quote are two fields, so a screen cannot reach for the wrong
   * one by accident, and a rewrite that put the id back in the heading has to
   * type the word to do it.
   */
  const interpolated = allHeadings.filter(([, text]) => text.startsWith("{"))

  it("finds the headings that render a value rather than a literal", () => {
    expect(interpolated.length).toBeGreaterThan(0)
  })

  it.each(interpolated.map(([file, text]) => [`${file} — ${text}`, text]))(
    "does not head %s with an identifier",
    (_label, text) => {
      expect(text.toLowerCase()).not.toContain("treeid")
    }
  )
})
