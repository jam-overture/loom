import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

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
 * Headings whose text is an interpolation are skipped rather than exempted:
 * `<h1>{treeId}</h1>` prints a name the runtime chose, and 22 August settled
 * that names stay on the surface as they are. Filed as a finding, because a
 * heading that is *only* a name is a separate problem from a heading in the
 * wrong case.
 */
describe("every heading a reader meets", () => {
  const headings = sourcesUnder(GROUP).flatMap((entry) =>
    [...entry.source.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gu)]
      .map((match) => (match[1] ?? "").trim().replace(/\s+/gu, " "))
      .filter((text) => !text.startsWith("{"))
      .map((text) => [entry.file.slice(GROUP.length + 1), text] as const)
  )

  it("finds the headings this lane writes", () => {
    expect(headings.length).toBeGreaterThan(8)
  })

  it.each(headings.map(([file, text]) => [`${file} — ${text}`, text]))(
    "starts %s with a capital",
    (_label, text) => {
      expect(text.slice(0, 1)).toBe(text.slice(0, 1).toUpperCase())
    }
  )
})
