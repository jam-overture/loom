import { z } from "zod"

/**
 * The theme vocabulary, ported from the Hermes registry (§4b).
 *
 * Three orthogonal pieces — color, type, and shape — because they vary
 * independently in practice: a host swaps the palette for a dark mode without
 * touching the typographic ramp, and swaps the ramp for a rebrand without
 * touching the radii.
 *
 * Every piece is *registered and addressed by id*, never inlined. That is the
 * same bargain the primitive registry makes: a bounded vocabulary a model may
 * choose from, so "make it warmer" resolves to a named palette a human approved
 * rather than to seventeen colors a model invented. The alternative — letting a
 * proposal carry raw hex — would put an unbounded value space inside the one
 * part of the system that exists to bound what AI may produce.
 */

const colorSchema = z
  .string()
  .regex(/^(#[0-9a-fA-F]{3,8}|rgba?\(.+\)|hsla?\(.+\)|[a-z]+)$/)

/**
 * Every palette declares every slot. Normalised on purpose: a tree themed with
 * one palette can be re-themed with any other, because there is no slot a
 * primitive might read that some palette leaves undefined.
 */
export const paletteSlotSchema = z.enum([
  // Surface tier, bottom-up
  "bg-canvas",
  "bg-surface",
  "bg-surface-muted",
  "bg-overlay",
  // Foreground tier
  "fg-default",
  "fg-muted",
  "fg-subtle",
  "fg-on-accent",
  // Accent tier
  "accent",
  "accent-strong",
  "accent-subtle",
  // Brand secondary — reserved even for single-accent palettes, which mirror
  // their accent into it, so every palette has the same shape.
  "brand-secondary",
  "brand-secondary-strong",
  // Border tier
  "border-default",
  "border-strong",
  "border-subtle",
  "border-accent",
])
export type PaletteSlot = z.infer<typeof paletteSlotSchema>

export const PALETTE_SLOTS = paletteSlotSchema.options

/**
 * The type ramp and the spacing scale have a fixed number of steps, for exactly
 * the reason every palette declares every slot: a primitive reading
 * `--loom-spacing-7` must get a length from any registered preset, or a
 * re-theme silently unstyles it. A ramp whose length varied would make "renders
 * under both palettes" a property of which two you happened to pick.
 */
export const RAMP_STEPS = 8

export const themeIdSchema = z
  .string()
  .regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/)
  .brand<"ThemeId">()
export type ThemeId = z.infer<typeof themeIdSchema>

export const paletteSchema = z.object({
  id: themeIdSchema,
  name: z.string().min(1),
  description: z.string().min(1),
  slots: z.record(paletteSlotSchema, colorSchema).refine(
    (slots) => PALETTE_SLOTS.every((slot) => slots[slot] !== undefined),
    { message: "a palette must declare every slot" }
  ),
})
export type Palette = z.infer<typeof paletteSchema>

/**
 * Where one face is, for a reader that cannot look a family name up.
 *
 * A family stack is an instruction to something that already has fonts. A
 * browser resolves `Fraunces` against the faces the machine holds and the ones
 * the host's stylesheet loaded; anything drawing text itself resolves it against
 * nothing, falls back silently, and looks entirely deliberate while doing it.
 *
 * So a pack may say where a face is as well as what to ask for. The value is an
 * address and the runtime never dereferences one — a host or a renderer fetches
 * it, on its own schedule and against its own allowlist. Everything that reads
 * this is in `faces.ts`.
 *
 * The character class is narrow because both fields are interpolated into CSS
 * by `fontFaceRules`, and a family or a URL carrying a quote or a brace would
 * be closing a declaration rather than naming a font.
 */
const cssSafe = z
  .string()
  .min(1)
  .regex(/^[^"'{};\r\n]+$/, "may not contain quotes, braces, semicolons or newlines")

export const fontFaceSchema = z.object({
  /** The family this face provides, as the stack asks for it and without quotes. */
  family: cssSafe,
  weight: z.number().int().positive(),
  style: z.enum(["normal", "italic"]).default("normal"),
  /** Where the face data is: a URL, or a path the host knows how to resolve. */
  source: cssSafe,
  format: z.enum(["woff2", "woff", "truetype", "opentype"]).optional(),
})
export type FontFace = z.infer<typeof fontFaceSchema>

/**
 * A pack declares a face for each role the library actually reads, and no
 * others. There were three roles here and a primitive read two of them: an
 * `accentFamily` was emitted as `--loom-accent-family` and referenced by
 * nothing, while `loom.code` and `loom.kbd` needed a monospace face the
 * vocabulary had no word for. A variable a host can set and no primitive
 * consults is worse than an absent one — it looks like a seam and behaves like
 * a comment (0085).
 *
 * `monoFamily` is optional where the other two are required, and the asymmetry
 * is deliberate rather than an oversight. A palette declares every slot because
 * an undeclared color has no universal fallback; an undeclared *face* has one,
 * because every operating system ships a monospace. `tokens.ts` asks for
 * `var(--loom-mono-family, <system stack>)`, so a pack with no opinion about
 * code costs a reader nothing, and a pack built around a particular mono gets
 * to say so.
 */
export const fontPackSchema = z.object({
  id: themeIdSchema,
  name: z.string().min(1),
  description: z.string().min(1),
  headingFamily: z.string().min(1),
  bodyFamily: z.string().min(1),
  /** Emitted as `--loom-mono-family` when declared, and omitted when not. */
  monoFamily: z.string().min(1).optional(),
  headingWeight: z.number().int().positive(),
  bodyWeight: z.number().int().positive(),
  /** Typographic ramp in px, smallest first. Emitted as `--loom-scale-1…8`. */
  scaleRamp: z.array(z.number().positive()).length(RAMP_STEPS),
  /**
   * Where the families above are, for a reader that cannot look one up.
   *
   * Optional, and absent on every pack the starter library ships: those name
   * only faces an operating system already has, or say in their description
   * that a host must serve them, and neither case wants this file holding an
   * address on somebody else's CDN. It is here for a host registering its own
   * pack, and for a renderer that draws text without a browser.
   */
  faces: z.array(fontFaceSchema).optional(),
})
export type FontPack = z.infer<typeof fontPackSchema>

export const stylePresetSchema = z.object({
  id: themeIdSchema,
  name: z.string().min(1),
  description: z.string().min(1),
  radii: z.object({
    sm: z.number().nonnegative(),
    md: z.number().nonnegative(),
    lg: z.number().nonnegative(),
    full: z.number().nonnegative(),
  }),
  /** Spacing steps in px, smallest first. Emitted as `--loom-spacing-1…8`. */
  spacingScale: z.array(z.number().nonnegative()).length(RAMP_STEPS),
  motion: z.object({
    fast: z.number().nonnegative(),
    medium: z.number().nonnegative(),
    slow: z.number().nonnegative(),
  }),
  density: z.enum(["compact", "comfortable", "spacious"]),
})
export type StylePreset = z.infer<typeof stylePresetSchema>

/**
 * What a tree carries: three ids, not three documents.
 *
 * This is what makes a theme change a `configure` operation on the root like
 * any other — small enough for a model to emit, bounded by the registry, and
 * gated, attributed and reversed by exactly the machinery §1–§2 already built
 * (0048).
 */
export const themeSelectionSchema = z.object({
  palette: themeIdSchema,
  fontPack: themeIdSchema,
  stylePreset: themeIdSchema,
})
export type ThemeSelection = z.infer<typeof themeSelectionSchema>

export type ResolvedTheme = {
  readonly palette: Palette
  readonly fontPack: FontPack
  readonly stylePreset: StylePreset
}
