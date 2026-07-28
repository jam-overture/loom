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

export const jsonObjectSchema: z.ZodType<JsonObject> = z.record(z.string(), jsonValueSchema)
