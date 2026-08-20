import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

import { minimalPalette, preciseStylePreset } from "@loom/runtime"

const css = readFileSync(fileURLToPath(new URL("./globals.css", import.meta.url)), "utf8")

/** The value a `:root` custom property is declared with, for comparing against the registry. */
const tokenValue = (token: string): string | undefined =>
  new RegExp(`${token}:\\s*([^;]+);`).exec(css)?.[1]?.trim()

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

/**
 * The chrome copies the registered theme's values as literals rather than
 * reading `var(--loom-*)`, because the preview pane mounts the *previewed
 * tree's* theme (0050) and a chrome token defined through that variable would
 * be repainted by whatever tree is on screen.
 *
 * Copying is the right call and it has the obvious cost: two places holding one
 * value, free to drift the moment somebody edits the palette. These tests are
 * what makes that safe. They are the link the cascade is deliberately not
 * providing — retune `minimal` in the registry and this suite says exactly which
 * chrome tokens no longer agree with it.
 */
describe("the chrome's tokens against the registered minimal theme", () => {
  const slot = (name: keyof typeof minimalPalette.slots): string => {
    const value = minimalPalette.slots[name]
    if (value === undefined) throw new Error(`the minimal palette has no ${name}`)

    return value
  }

  it.each([
    ["--surface-page", "bg-canvas"],
    ["--surface-base", "bg-surface"],
    ["--surface-sidebar", "bg-surface"],
    ["--surface-topbar", "bg-surface"],
    ["--surface-preview", "bg-surface"],
    ["--surface-hover", "bg-surface-muted"],
    ["--surface-active", "accent-subtle"],
    ["--border-default", "border-default"],
    ["--border-subtle", "border-subtle"],
    ["--border-strong", "border-strong"],
    ["--text-primary", "fg-default"],
    ["--text-secondary", "fg-muted"],
    ["--text-muted", "fg-subtle"],
    ["--text-placeholder", "fg-subtle"],
    ["--text-inverse", "fg-on-accent"],
    ["--nav-active-bg", "accent-subtle"],
    ["--nav-active-border", "border-accent"],
    ["--nav-inactive-text", "fg-muted"],
    ["--focus-ring", "accent"],
    ["--action-affirm-bg", "accent"],
    ["--action-affirm-text", "fg-on-accent"],
    ["--action-affirm-border", "accent"],
    ["--action-refuse-bg", "bg-surface"],
    ["--action-refuse-text", "fg-default"],
    ["--action-refuse-border", "border-default"],
    ["--action-neutral-bg", "bg-surface"],
    ["--action-neutral-text", "fg-muted"],
    ["--action-neutral-border", "border-default"],
    ["--outcome-applied-bg", "accent-subtle"],
    ["--outcome-applied-text", "accent-strong"],
    ["--outcome-uninterpreted-bg", "bg-surface-muted"],
    ["--outcome-uninterpreted-text", "fg-muted"],
    ["--outcome-inapplicable-bg", "bg-surface-muted"],
    ["--outcome-inapplicable-text", "fg-subtle"],
    ["--node-selected-outline", "brand-secondary-strong"],
    ["--node-label-bg", "brand-secondary-strong"],
    ["--node-label-text", "fg-on-accent"],
  ] as const)("draws %s from the palette's %s", (token, name) => {
    expect(tokenValue(token)).toBe(slot(name))
  })

  it("takes its radii from the precise style preset", () => {
    expect(tokenValue("--radius-base")).toBe(`${preciseStylePreset.radii.sm}px`)
    expect(tokenValue("--radius-medium")).toBe(`${preciseStylePreset.radii.md}px`)
    expect(tokenValue("--radius-large")).toBe(`${preciseStylePreset.radii.lg}px`)
  })

  /**
   * The three verdict colours that are *not* from the palette, asserted as a
   * decision rather than left to look like an oversight. A single-accent palette
   * cannot say "applied", "waiting on you" and "refused" in three
   * distinguishable colours, and a reviewer scanning a queue reads those by
   * colour before they read the label. `applied` is the theme's green exactly;
   * the other two are functional and deliberately outside the brand.
   */
  it("keeps a distinct hue for held and refused, which the palette cannot supply", () => {
    const awaiting = tokenValue("--outcome-awaiting-text")
    const rejected = tokenValue("--outcome-rejected-text")
    const applied = tokenValue("--outcome-applied-text")

    expect(new Set([awaiting, rejected, applied]).size).toBe(3)
    for (const verdict of [awaiting, rejected]) {
      expect(Object.values(minimalPalette.slots)).not.toContain(verdict)
    }
  })

  /**
   * A font pack names a family and never ships one (the pack's own comment says
   * so), so the portal is what makes Geist real. If this binding is dropped the
   * page still renders — in the fallback — which is exactly the kind of silent
   * regression a screenshot review misses.
   */
  it("loads the font pack's first family rather than only naming it", () => {
    expect(css).toMatch(/font-family:\s*var\(--font-geist-sans\)/)
    expect(minimalPalette.id).toBe("minimal")
  })
})
