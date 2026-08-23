import { PALETTE_SLOTS, type ResolvedTheme } from "./theme.js"

/**
 * A resolved theme, flattened into CSS custom properties.
 *
 * Pure, like the renderer it feeds: the same theme always produces the same
 * variables, so two requests for one revision cannot disagree about what the
 * page looks like any more than they can disagree about what it contains.
 *
 * CSS variables rather than class names or inline styles on every node, for one
 * reason that matters downstream: a primitive reads `var(--loom-accent)` without
 * knowing which palette is mounted, so re-theming a tree changes nothing about
 * the tree and touches no primitive. A theme change is one `configure` on the
 * root, and every node below re-reads through the cascade.
 */

export type ThemeVariables = Readonly<Record<string, string>>

export const themeVariables = (theme: ResolvedTheme): ThemeVariables => {
  const variables: Record<string, string> = {}

  for (const slot of PALETTE_SLOTS) {
    const value = theme.palette.slots[slot]
    if (value !== undefined) variables[`--loom-${slot}`] = value
  }

  variables["--loom-heading-family"] = theme.fontPack.headingFamily
  variables["--loom-body-family"] = theme.fontPack.bodyFamily
  /**
   * Omitted rather than defaulted when the pack declares none. The primitive
   * asking for it supplies the system stack as its `var()` fallback, so an
   * absent variable resolves to a real face; writing a default here would
   * instead put this file's opinion about monospace above the reader's (0084).
   */
  if (theme.fontPack.monoFamily) {
    variables["--loom-mono-family"] = theme.fontPack.monoFamily
  }
  variables["--loom-heading-weight"] = String(theme.fontPack.headingWeight)
  variables["--loom-body-weight"] = String(theme.fontPack.bodyWeight)

  theme.fontPack.scaleRamp.forEach((step, index) => {
    variables[`--loom-scale-${index + 1}`] = `${step}px`
  })

  const { radii, spacingScale, motion, density } = theme.stylePreset
  variables["--loom-radius-sm"] = `${radii.sm}px`
  variables["--loom-radius-md"] = `${radii.md}px`
  variables["--loom-radius-lg"] = `${radii.lg}px`
  variables["--loom-radius-full"] = `${radii.full}px`

  spacingScale.forEach((step, index) => {
    variables[`--loom-spacing-${index + 1}`] = `${step}px`
  })

  variables["--loom-motion-fast"] = `${motion.fast}ms`
  variables["--loom-motion-medium"] = `${motion.medium}ms`
  variables["--loom-motion-slow"] = `${motion.slow}ms`
  variables["--loom-density"] = density

  return variables
}
