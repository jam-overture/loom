import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

import { minimalPalette } from "@loom/runtime"

const css = readFileSync(fileURLToPath(new URL("./globals.css", import.meta.url)), "utf8")

/** The value a `:root` custom property is declared with, for comparing against the registry. */
const tokenValue = (token: string): string | undefined =>
  new RegExp(`${token}:\\s*([^;]+);`).exec(css)?.[1]?.trim()

const required = (token: string): string => {
  const value = tokenValue(token)
  if (value === undefined) throw new Error(`the demo's stylesheet declares no ${token}`)

  return value
}

/**
 * Relative luminance, and then contrast, straight out of WCAG 2.1.
 *
 * A dark chrome is the one place where "it looked fine on my screen" is least
 * trustworthy: the whole palette is compressed into the bottom third of the
 * range, and a grey that reads as comfortably muted on a bright laptop can be
 * illegible on a dimmed one. The portal never needed this — black on white
 * passes whatever you do to it — and this surface is the reason to write it.
 */
const luminance = (hex: string): number => {
  const parsed = /^#([0-9a-f]{6})$/i.exec(hex.trim())
  if (!parsed?.[1]) throw new Error(`${hex} is not a six-digit hex colour`)

  const channels = [0, 2, 4].map((offset) => {
    const part = Number.parseInt(parsed[1]!.slice(offset, offset + 2), 16) / 255

    return part <= 0.03928 ? part / 12.92 : ((part + 0.055) / 1.055) ** 2.4
  })

  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!
}

const contrast = (a: string, b: string): number => {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x)

  return (light! + 0.05) / (dark! + 0.05)
}

/**
 * A stylesheet is the one part of this app nothing else can check. The type
 * checker does not read it, no component imports it by name, and a token that
 * drifts reappears on every part of the surface at once.
 *
 * These are assertions about *decisions*, not about formatting. The demo's
 * chrome is dark and its stage is not; the accent is the registry's green and
 * appears in two roles; the text is readable. All three are cheap to reverse by
 * accident and expensive to notice.
 */
describe("the demo's stylesheet", () => {
  /**
   * The decision the whole layout rests on. Both halves used to be white, and
   * the specimen page's hero therefore read as the demo's own promise — the
   * confusion this surface exists to remove.
   */
  it("puts the chrome on a dark ground and the stage on a light one", () => {
    expect(luminance(required("--surface-page"))).toBeLessThan(0.05)
    expect(required("--surface-stage")).toBe("#ffffff")
  })

  it("takes the stage's ground from the registered palette's canvas", () => {
    expect(required("--surface-stage")).toBe(minimalPalette.slots["bg-canvas"])
  })

  /**
   * The green is the registry's, not a colour this surface picked, and it is
   * the only hue in the chrome — so the thing to press and the mark on a change
   * that landed are the same green, and nothing else is.
   */
  it("draws its accent from the registered palette's green", () => {
    expect(required("--accent")).toBe(minimalPalette.slots["brand-secondary"])
    expect(required("--accent-quiet")).toBe(minimalPalette.slots["brand-secondary-strong"])
    expect(required("--action-affirm-bg")).toBe(minimalPalette.slots["brand-secondary"])
    expect(required("--outcome-applied-text")).toBe(minimalPalette.slots["brand-secondary"])
  })

  it("puts the palette's own ink on the accent, so a filled button is legible", () => {
    expect(required("--action-affirm-text")).toBe(minimalPalette.slots["fg-default"])
    expect(contrast(required("--action-affirm-bg"), required("--action-affirm-text"))).toBeGreaterThan(4.5)
  })

  /**
   * Three ink weights against two grounds. `--text-muted` is the one that
   * decides it: it carries every caption on the surface, including the sentence
   * under the primary button, and it is the token a retune would darken first.
   */
  it.each([
    ["--text-primary", "--surface-page", 4.5],
    ["--text-primary", "--surface-raised", 4.5],
    ["--text-secondary", "--surface-page", 4.5],
    ["--text-secondary", "--surface-raised", 4.5],
    ["--text-muted", "--surface-page", 4.5],
    ["--text-muted", "--surface-raised", 4.5],
  ])("keeps %s legible on %s", (ink, ground, ratio) => {
    expect(contrast(required(ink), required(ground))).toBeGreaterThanOrEqual(ratio)
  })

  /**
   * The five outcome tints are the demo's only coloured surfaces, and each one
   * carries a word — "Applied", "Waiting on you", "Refused". A tint whose text
   * fails is a state a visitor cannot read on the one card that matters.
   */
  it.each([
    ["applied"],
    ["awaiting"],
    ["rejected"],
    ["uninterpreted"],
    ["inapplicable"],
  ])("keeps the %s badge readable", (state) => {
    const ratio = contrast(required(`--outcome-${state}-bg`), required(`--outcome-${state}-text`))

    expect(ratio).toBeGreaterThanOrEqual(4.5)
  })

  it("gives the stage its own ground and its own stacking context", () => {
    const stage = /\.loom-stage\s*\{([^}]*)\}/.exec(css)?.[1] ?? ""

    expect(stage).toContain("background-color: var(--surface-stage)")
    expect(stage).toContain("isolation: isolate")
  })

  it("draws a focus ring of its own rather than leaving it to the browser", () => {
    expect(css).toContain(":focus-visible")
    expect(css).toMatch(/outline:\s*var\(--focus-ring-width\)\s+solid\s+var\(--focus-ring\)/)
  })

  /**
   * `:focus` would ring a pointer user who clicked a button. `:focus-visible`
   * is the whole reason the rule is acceptable as a universal selector.
   */
  it("never styles bare :focus, which would ring a mouse click too", () => {
    expect(css).not.toMatch(/[^-]:focus\s*\{/)
  })

  /**
   * The way back exists because a stacked layout can scroll its record off the
   * screen. A wide one cannot — the rail is its own scroller — so the bar there
   * would be an offer to show something already on show.
   *
   * Asserted here rather than in the component because that is where the
   * decision is: a `matchMedia` read at mount is right until somebody resizes a
   * window, and this is a surface whose whole job is a first impression on a
   * viewport nobody controls.
   */
  it("keeps the way back off the layout that cannot lose its record", () => {
    expect(css).toMatch(/@media\s*\(min-width:\s*1024px\)\s*\{\s*\.loom-reach\s*\{\s*display:\s*none/)
  })

  /**
   * Hidden by `visibility` and not by `display` or a conditional render, which
   * is what lets it leave the way it arrived — and, more importantly, what keeps
   * it out of the tab order while it is gone. A bar sitting at opacity zero over
   * the page would still be the next thing a keyboard visitor reached.
   */
  it("takes the way back out of the tab order while it is out of the way", () => {
    const reach = /\.loom-reach\s*\{([^}]*)\}/.exec(css)?.[1] ?? ""

    expect(reach).toContain("visibility: hidden")
  })
})
