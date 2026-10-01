import type { CSSProperties } from "react"

import type { JsonObject } from "../json.js"
import { THEME_PROP_KEY } from "../reserved-props.js"
import { themeVariables } from "../theme/apply.js"
import { paletteScheme, type PaletteScheme } from "../theme/measure.js"
import type { ThemeError, ThemeRegistry } from "../theme/registry.js"
import type { ResolvedTheme } from "../theme/theme.js"

/**
 * The theme read out of the runtime's own props.
 *
 * 0049 put a theme in the tree as three registered ids carried on the root
 * node's props, so that re-theming is an ordinary `configure` the Gate weighs
 * like anything else. That left one question open: props belong to the
 * primitive, and a root primitive declaring a strict schema would reject a key
 * it never asked for — blanking the page over the theme rather than wearing it.
 *
 * So the `loom:` prefix names a **reserved namespace** ([`reserved-props.ts`](../reserved-props.ts)):
 * keys under it belong to the runtime, are read here, and are removed from the
 * bag before either the validator or the primitive sees it. That keeps 0049's
 * other promise too — a primitive reads `var(--loom-accent)` and never learns
 * which palette is mounted, which it could not claim if the palette id arrived
 * in its props.
 *
 * Reserved keys the runtime does not recognise are dropped, and say so in a
 * diagnostic: a namespace that silently swallows whatever is put in it is a
 * place for data to go missing.
 */

export {
  isReservedPropKey,
  partitionReservedProps,
  RESERVED_PROP_PREFIX,
  THEME_PROP_KEY,
  type PartitionedProps,
} from "../reserved-props.js"

export type ThemeResolution =
  | { readonly outcome: "themed"; readonly theme: ResolvedTheme }
  /** The node names no theme — the ordinary case for every node but the root. */
  | { readonly outcome: "unthemed" }
  /** Named, and the registry refused it: an unknown id, or a malformed selection. */
  | { readonly outcome: "unresolved"; readonly error: ThemeError }
  /** Named, and this render was given no registry to resolve it against. */
  | { readonly outcome: "unregistered" }

/**
 * There is no fallback theme, deliberately. A host-supplied default would mount
 * a look the tree does not name, which makes the page a function of deployment
 * config as well as of the tree — the failure that rejecting host-supplied
 * theming outright was meant to prevent (0049). An unthemed tree renders
 * unstyled, and says so.
 */
export const resolveTheme = (
  reserved: JsonObject,
  registry: ThemeRegistry | undefined
): ThemeResolution => {
  const declared = reserved[THEME_PROP_KEY]
  if (declared === undefined) return { outcome: "unthemed" }
  if (!registry) return { outcome: "unregistered" }

  const resolved = registry.resolve(declared)

  return resolved.ok
    ? { outcome: "themed", theme: resolved.value }
    : { outcome: "unresolved", error: resolved.error }
}

/**
 * A resolved theme as a style object the root primitive applies.
 *
 * React passes any `--`-prefixed key in a style object straight through to the
 * element, so the custom properties reach the DOM; its `CSSProperties` type has
 * no index signature to describe them. The conversion is therefore a
 * types-only step, and it happens once here rather than in every primitive that
 * has to apply it.
 */
export const themeStyle = (theme: ResolvedTheme): CSSProperties =>
  themeVariables(theme) as unknown as CSSProperties

/**
 * The ground a host paints when it draws a frame standing in for the page.
 *
 * `themeStyle` hands over every variable a primitive reads, and a host drawing a
 * whole page needs nothing else — the root primitive paints `bg-canvas` itself.
 * A host drawing *part* of a tree is the case this exists for: an excerpt rooted
 * at a band has no root primitive above it, so the frame around it has to paint
 * the ground the excerpt would have sat on, and the frame is the host's rather
 * than the tree's.
 *
 * It was written by hand twice before it was here, by one lane, in one week, and
 * the second copy cost a **1.10:1** contrast ratio on the frame whose whole job
 * was to show a stranger what they were about to lose: a stylesheet carried
 * `background-color` and `color-scheme` as constants, the tree's palette moved
 * from a light one to a dark one, and the two stopped agreeing. Nothing errored,
 * because a stylesheet holding a copy of a decision the tree owns is not a thing
 * any test in either place could see (0049).
 *
 * `bg-canvas` rather than `bg-surface`, because that is what the root primitive
 * paints and therefore what is behind any band excerpted out of the page; a band
 * that paints a surface of its own paints it over this, exactly as it does in
 * place. `color` alongside it because a frame setting only the ground leaves
 * anything inheriting its color reading the *host's* ink on the tree's paper —
 * the tree's own primitives read `--loom-fg-default` and are unaffected, and
 * everything the host puts in that frame is not.
 */
export type ThemeGround = {
  readonly backgroundColor: string
  readonly color: string
  /**
   * Absent — rather than guessed — when either end of the palette's body-copy
   * pair is a color `channelsOf` declines to read, in which case whatever
   * `color-scheme` the host's own stylesheet sets stands. Every registered
   * palette declares both as hex and resolves.
   */
  readonly colorScheme?: PaletteScheme
}

/**
 * A resolved theme as the three declarations a host's own frame applies.
 *
 * Takes a `ResolvedTheme` and not a `ThemeResolution`, which is the same bargain
 * `themeStyle` makes: there is no fallback theme, so *the tree names no theme* is
 * a case the host has to answer for its own chrome and not one the runtime can
 * answer by handing back a ground. An unthemed excerpt inherits the same nothing
 * an unthemed page does.
 *
 * `undefined` is the other case and a narrower one — a palette whose pair cannot
 * be read. Both ends come from the palette either way, so a frame re-themes with
 * everything else and cannot be legible under one palette and not another.
 */
export const themeGround = (theme: ResolvedTheme): ThemeGround | undefined => {
  const backgroundColor = theme.palette.slots["bg-canvas"]
  const color = theme.palette.slots["fg-default"]
  if (backgroundColor === undefined || color === undefined) return undefined

  const colorScheme = paletteScheme(theme.palette)

  return { backgroundColor, color, ...(colorScheme === undefined ? {} : { colorScheme }) }
}
