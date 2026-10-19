/*
 * Imports come from `@jam-overture/loom`'s **built** output, so this script is
 * only ever as current as `dist/` — which is why the package script builds the
 * package before running it. `db-push.ts` carries the full version of this
 * note and the incident behind it.
 */
import nextEnv from "@next/env"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import { postgresApplicationStore } from "@jam-overture/loom/postgres"
import { describeApplicationStoreError, projectIdSchema } from "@jam-overture/loom/store"

import { INGEST_KEY_PARAMETER, mintIngestKey } from "../app/_lib/reader-signals/keys"
import { ensureIngestKeysSchema, postgresIngestKeyStore } from "../app/_lib/reader-signals/keys-postgres"
import { resolveConnectionString } from "../app/_lib/app/connection"

/**
 * Mints a project's ingest key, ending the one it held before
 * ([0298](../../../decisions/0298-a-projects-ingest-key-is-public-and-names-its-application-and-the-door-files-nothing-it-cannot-name.md)).
 *
 * Registration mints one when unit 4c gives it a screen to be shown on. Until
 * then this is how a project gets one, and afterwards it is how a key that
 * leaked into somebody else's site is replaced — on the terms
 * `portal:account` takes: whoever has the database already has every
 * authority this grants, so it asserts none of its own.
 *
 *     pnpm signals:key prj_a1b2c3
 *
 * Takes the **project**, because that is the id a person can see; the key is
 * given to the one application inside it (0296), which is what the reader
 * tables are scoped by.
 */

/** `@next/env` is CommonJS, so the named export is only reachable off the default. */
const { loadEnvConfig } = nextEnv

loadEnvConfig(process.cwd())

const usage = "usage: pnpm signals:key <project-id>\n  pnpm signals:key prj_a1b2c3"

const [projectArgument] = process.argv.slice(2)

if (projectArgument === undefined) {
  console.error(usage)
  process.exit(1)
}

const project = projectIdSchema.safeParse(projectArgument)

if (!project.success) {
  console.error(`"${projectArgument}" is not a project id. They look like prj_a1b2c3.`)
  process.exit(1)
}

let connectionString: string | undefined

try {
  connectionString = resolveConnectionString()
} catch (cause) {
  console.error(cause instanceof Error ? cause.message : String(cause))
  process.exit(1)
}

if (connectionString === undefined) {
  console.error(
    "signals:key needs DATABASE_URL (or POSTGRES_URL).\n" +
      "A key is a row, and a deployment without a database keeps its buffer in memory,\n" +
      "which is no place to collect a customer's readers."
  )
  process.exit(1)
}

const client = postgres(connectionString, { max: 1 })

try {
  const db = drizzle(client)

  /** The same idempotent DDL `db:push` runs, so a first key is one command. */
  await ensureIngestKeysSchema(db)

  const listed = await postgresApplicationStore(db).list({ closed: "all" })

  if (!listed.ok) {
    console.error(`loom: ${describeApplicationStoreError(listed.error)}`)
    process.exit(1)
  }

  const inside = listed.value.filter((application) => application.projectId === project.data)

  /**
   * Exactly one, or the project is not one this can key. None is a project id
   * this deployment does not have; more than one is a project written before
   * 0296, and which of its applications a key should name is a question for a
   * person rather than for the order a listing came back in.
   */
  const [application, ...others] = inside

  if (application === undefined) {
    console.error(`loom: this deployment has no project ${project.data}.`)
    process.exit(1)
  }

  if (others.length > 0) {
    console.error(
      `loom: ${project.data} holds ${inside.length} applications, and a project holds one (0296).\n` +
        "Close the ones it should not hold, then run this again."
    )
    process.exit(1)
  }

  if (application.closedAt !== undefined) {
    console.error(`loom: ${project.data} is closed, and a closed project takes no signals.`)
    process.exit(1)
  }

  const key = mintIngestKey()
  const written = await postgresIngestKeyStore(db).put(application.applicationId, key, Date.now())

  if (!written.ok) {
    console.error(`loom: ${written.error.detail}`)
    process.exit(1)
  }

  console.log(
    `loom: ${project.data} has a new key, and the one it held before has stopped working.\n\n` +
      `  ${key}\n\n` +
      `Its pages post to /api/reader-signals?${INGEST_KEY_PARAMETER}=${key}\n` +
      "The key is public — it is in every page that sends one — so it is not a secret to keep.\n" +
      (application.host === undefined
        ? "This project names no site, so a delivery is taken from anywhere that has the key."
        : `Deliveries are taken from ${application.host} and nowhere else.`)
  )
} finally {
  await client.end()
}
