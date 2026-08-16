import type { CSSProperties } from "react"

import type { JsonObject } from "../json.js"
import { THEME_PROP_KEY } from "../reserved-props.js"
import { themeVariables } from "../theme/apply.js"
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
 * config as well as of the tree — the failure 0049 rejected when it rejected
 * host-supplied theming outright. An unthemed tree renders unstyled, and says so.
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
