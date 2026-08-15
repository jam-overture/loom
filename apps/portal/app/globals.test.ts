import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

const css = readFileSync(fileURLToPath(new URL("./globals.css", import.meta.url)), "utf8")

/**
 * A stylesheet is the one part of this app nothing else can check. The type
 * checker does not read it, no component imports it by name, and a token that
 * comes back reappears on every page at once — which is exactly how the tint
 * these tests forbid arrived in the first place: carried over wholesale from
 * another product's design system and never questioned.
 *
 * These are deliberately assertions about *decisions*, not about formatting. The
 * portal is white; the focus ring exists. Both are cheap to reverse by accident
 * and expensive to notice.
 */
describe("the portal's stylesheet", () => {
  it("has no wash, and no gradient anywhere", () => {
    expect(css).not.toContain("--surface-wash")
    expect(css).not.toContain("gradient")
  })

  it("paints the page white", () => {
    expect(css).toMatch(/--surface-page:\s*#ffffff/)
  })

  it("puts no background image on the body", () => {
    const body = /body\s*\{([^}]*)\}/.exec(css)?.[1] ?? ""

    expect(body).not.toContain("background-image")
    expect(body).not.toContain("background-repeat")
    expect(body).toContain("background-color: var(--surface-page)")
  })

  /*
   * Every resting surface being the same white is the whole point: separation
   * comes from a border, so a card that reintroduced an off-white would be
   * quietly restoring the layered look the white removed.
   */
  it("keeps every resting surface the same white, so borders do the separating", () => {
    for (const token of [
      "--surface-page",
      "--surface-base",
      "--surface-sidebar",
      "--surface-topbar",
      "--surface-preview",
    ]) {
      expect(css).toMatch(new RegExp(`${token}:\\s*#ffffff`))
    }
  })

  it("draws a focus ring of its own rather than leaving it to the browser", () => {
    expect(css).toContain(":focus-visible")
    expect(css).toMatch(/outline:\s*var\(--focus-ring-width\)\s+solid\s+var\(--focus-ring\)/)
  })

  /*
   * `:focus` would outline a pointer user who clicked a button. `:focus-visible`
   * is the whole reason the rule is acceptable as a universal selector.
   */
  it("never styles bare :focus, which would ring a mouse click too", () => {
    expect(css).not.toMatch(/[^-]:focus\s*\{/)
  })
})
