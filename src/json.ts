import { z } from "zod"

/**
 * Everything that crosses a Loom boundary — the tree, deltas, telemetry — must
 * round-trip through JSON without loss. Props are therefore restricted to JSON
 * values: no functions, no Dates, no undefined, no class instances.
 */
export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

export const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number().finite(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ])
)

export type JsonObject = { [key: string]: JsonValue }

/**
 * A narrower view of a `JsonObject` — what a schema declares it needs, rather
 * than everything a stored object may hold. Optional members are allowed to be
 * `undefined` because an absent key in a `JsonObject` reads that way; the value
 * space itself is unchanged, since `undefined` never survives serialisation and
 * so can never be a stored prop.
 *
 * Every `JsonObject` is a `JsonObjectView`; the reverse is what validation at a
 * boundary establishes.
 */
export type JsonObjectView = { [key: string]: JsonValue | undefined }

export const jsonObjectSchema: z.ZodType<JsonObject> = z.record(z.string(), jsonValueSchema)
