import type { JsonObject, JsonValue } from "./json.js"

/**
 * The runtime's own corner of a node's props.
 *
 * [0050](../decisions/0050-the-runtimes-props-are-namespaced-and-the-root-mounts-the-theme.md)
 * reserved the `loom:` prefix and said what the next key would cost: "a key and
 * a diagnostic rather than another record". `loom:data` is that next key, and
 * the namespace moved here from `render/theme.ts` when it acquired a second
 * reader — the data seam has to know which keys are the runtime's, and it is not
 * part of rendering. A reserved key is a property of a node's props, so it lives
 * beside `json.ts` rather than inside either of the two things that read one.
 */

/** Prop keys under this prefix belong to the runtime rather than to a primitive. */
export const RESERVED_PROP_PREFIX = "loom:"

/** 0049's three theme ids, honoured on the root node. */
export const THEME_PROP_KEY = `${RESERVED_PROP_PREFIX}theme`

/** 0058's bindings — what a node asks the host to answer, honoured on any node. */
export const DATA_PROP_KEY = `${RESERVED_PROP_PREFIX}data`

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
 * ordinary node that carries no reserved key — which is most of them.
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
