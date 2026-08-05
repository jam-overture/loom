import nextEnv from "@next/env"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import { applyRetention, describeRetention, retentionPolicySchema } from "@loom/runtime/telemetry"
import { postgresTelemetryJournal } from "@loom/runtime/telemetry/postgres"

import { resolveConnectionString } from "../lib/connection"

/**
 * Forgets telemetry older than the configured age.
 *
 * A script rather than something the app does, for the reason `db-push.ts` gives
 * about DDL and one more of its own: when to forget is an operational choice,
 * and a framework that deleted a host's history on a schedule it picked would be
 * making that choice on the host's behalf. The runtime supplies the rule; this
 * decides when it runs.
 *
 * Safe to run repeatedly and safe to interrupt. It is incremental by design — a
 * journal long past its horizon is caught up over several runs rather than in
 * one long transaction — so a cron that runs it nightly converges without ever
 * holding the table.
 */
const { loadEnvConfig } = nextEnv

loadEnvConfig(process.cwd())

const DEFAULT_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000

const policy = retentionPolicySchema.safeParse({
  maxAgeMs: Number(process.env.LOOM_TELEMETRY_MAX_AGE_MS ?? DEFAULT_MAX_AGE_MS),
})

if (!policy.success) {
  console.error(
    `LOOM_TELEMETRY_MAX_AGE_MS is not a usable retention age: ${
      policy.error.issues[0]?.message ?? "invalid"
    }`
  )
  process.exit(1)
}

const connectionString = resolveConnectionString()

if (connectionString === undefined) {
  console.error(
    "telemetry:prune needs DATABASE_URL (or POSTGRES_URL).\n" +
      "Without one the journal is in memory and there is nothing durable to forget."
  )
  process.exit(1)
}

const client = postgres(connectionString, { prepare: false, max: 1 })

try {
  const outcome = await applyRetention(postgresTelemetryJournal(drizzle(client)), {
    policy: policy.data,
  })

  console.log(`loom: ${describeRetention(outcome)}`)

  /** A run that could not read or write is a failed job, not a quiet success. */
  if (outcome.outcome === "unavailable" || outcome.outcome === "refused") process.exit(1)
} finally {
  await client.end()
}
