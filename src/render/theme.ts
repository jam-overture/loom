import type { CSSProperties } from "react"

import type { JsonObject, JsonValue } from "../json.js"
import { themeVariables } from "../theme/apply.js"
import type { ThemeError, ThemeRegistry } from "../theme/registry.js"
import type { ResolvedTheme } from "../theme/theme.js"

/**
 * The runtime's own props, and the theme read out of them.
 *
 * 0049 put a theme in the tree as three registered ids carried on the root
 * node's props, so that re-theming is an ordinary `configure` the Gate weighs
 * like anything else. That left one question open: props belong to the
 * primitive, and a root primitive declaring a strict schema would reject a key
 * it never asked for — blanking the page over the theme rather than wearing it.
 *
 * So the `loom:` prefix names a **reserved namespace**: keys under it belong to
 * the runtime, are read here, and are removed from the bag before either the
 * validator or the primitive sees it. That keeps 0049's other promise too — a
 * primitive reads `var(--loom-accent)` and never learns which palette is
 * mounted, which it could not claim if the palette id arrived in its props.
 *
 * Reserved keys the runtime does not recognise are dropped, and say so in a
 * diagnostic: a namespace that silently swallows whatever is put in it is a
 * place for data to go missing.
 */

/** Prop keys under this prefix belong to the runtime rather than to a primitive. */
export const RESERVED_PROP_PREFIX = "loom:"

/** The one reserved key that exists today: 0049's three ids, on the root node. */
export const THEME_PROP_KEY = `${RESERVED_PROP_PREFIX}theme`

export const isReservedPropKey = (key: string): boolean => key.startsWith(RESERVED_PROP_PREFIX)

export type PartitionedProps = {
  /** What the primitive and the validator see. */
  readonly props: JsonObject
  /** What the runtime reads, keyed as it appears in the tree. */
  readonly reserved: JsonObject
}

const NO_RESERVED_PROPS: JsonObject = Object.freeze({})

/**
 * Splitting costs one pass over the keys, and allocates nothing at all for the
 * ordinary node that carries no reserved key — which is every node but one.
 */
export const partitionReservedProps = (props: JsonObject): PartitionedProps => {
  const keys = Object.keys(props)
  if (!keys.some(isReservedPropKey)) return { props, reserved: NO_RESERVED_PROPS }

  const own: Record<string, JsonValue> = {}
  const reserved: Record<string, JsonValue> = {}

  for (const key of keys) {
    const value = props[key]
    if (value === undefined) continue

    if (isReservedPropKey(key)) reserved[key] = value
    else own[key] = value
  }

  return { props: own, reserved }
}

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
