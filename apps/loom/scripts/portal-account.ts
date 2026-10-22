/*
 * Imports come from `@jam-overture/loom`'s **built** output, so this script is
 * only ever as current as `dist/` — which is why the package script builds the
 * package before running it. `db-push.ts` carries the full version of this
 * note and the incident behind it.
 */
import nextEnv from "@next/env"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import { projectIdSchema } from "@jam-overture/loom/store"

import { actorSchema, digestOf, mintKey } from "../app/(portal)/_lib/auth/accounts"
import {
  ensurePortalAccountsSchema,
  postgresAccountStore,
  postgresMembershipStore,
} from "../app/(portal)/_lib/auth/accounts-postgres"
import { roleSchema } from "../app/(portal)/_lib/auth/roles"
import { resolveConnectionString } from "../app/_lib/app/connection"

/**
 * Mints an account, and optionally a role in a project.
 *
 * **It was the only way into a deployment**
 * ([0285](../../../decisions/0285-an-account-is-a-row-with-a-minted-key-and-a-role-is-a-ceiling-on-the-gates-own-scale.md)),
 * and it is still the way to grant a role. A deployment that configures
 * passwords also has a sign-up page for the addresses it lists
 * ([0304](../../../decisions/0304-a-person-signs-in-with-an-email-and-a-password-the-provider-holds-and-the-deployment-names-who-may.md));
 * an address that signs up there is granted its roles here.
 *
 * Whoever runs this has the database, and somebody with the database already
 * has every authority this grants. So the command asserts no permission of its
 * own: it is the bootstrap, and the bootstrap's security is the connection
 * string's.
 *
 * ## The key is printed once
 *
 * The row holds a digest, so there is nowhere to read the key back from. A
 * person who loses one is given another, and the one they lost stops working —
 * that is the whole of what rotation is here.
 *
 *     pnpm portal:account ana@example.com
 *     pnpm portal:account ana@example.com prj_a1b2c3 owner
 */

/** `@next/env` is CommonJS, so the named export is only reachable off the default. */
const { loadEnvConfig } = nextEnv

loadEnvConfig(process.cwd())

const usage =
  "usage: pnpm portal:account <actor> [project-id] [viewer|approver|owner]\n" +
  "  pnpm portal:account ana@example.com\n" +
  "  pnpm portal:account ana@example.com prj_a1b2c3 owner"

const [actorArgument, projectArgument, roleArgument] = process.argv.slice(2)

if (actorArgument === undefined) {
  console.error(usage)
  process.exit(1)
}

const actor = actorSchema.safeParse(actorArgument)

if (!actor.success) {
  console.error(
    `"${actorArgument}" is not a usable actor id. Use letters, digits, and . _ @ + -\n` +
      "It is stored in provenance and rendered in the portal, so it is kept to " +
      "characters that survive both without escaping."
  )
  process.exit(1)
}

/**
 * A project and a role travel together or not at all. One without the other is
 * a mistake rather than a shorthand: a project with no role grants nothing, and
 * a role with no project has nowhere to be held (0285 clause 4).
 */
if ((projectArgument === undefined) !== (roleArgument === undefined)) {
  console.error(`A project and a role are given together.\n\n${usage}`)
  process.exit(1)
}

const project = projectArgument === undefined ? undefined : projectIdSchema.safeParse(projectArgument)

if (project !== undefined && !project.success) {
  console.error(`"${projectArgument}" is not a project id. They look like prj_a1b2c3.`)
  process.exit(1)
}

const role = roleArgument === undefined ? undefined : roleSchema.safeParse(roleArgument)

if (role !== undefined && !role.success) {
  console.error(`"${roleArgument}" is not a role. One of: viewer, approver, owner.`)
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
    "portal:account needs DATABASE_URL (or POSTGRES_URL).\n" +
      "An account is a row, so there is nowhere to put one without a database.\n" +
      "  DATABASE_URL='postgresql://…:6543/postgres' pnpm portal:account ana@example.com"
  )
  process.exit(1)
}

const client = postgres(connectionString, { max: 1 })

try {
  const db = drizzle(client)

  /**
   * Create the tables if they are absent, so minting the first account on a
   * fresh database is one command rather than two in the right order. It is the
   * same idempotent DDL `db:push` runs.
   */
  await ensurePortalAccountsSchema(db)

  const key = mintKey()
  const written = await postgresAccountStore(db).put(actor.data, await digestOf(key), Date.now())

  if (!written.ok) {
    console.error(`loom: ${written.error.detail}`)
    process.exit(1)
  }

  if (project?.success && role?.success) {
    const granted = await postgresMembershipStore(db).put({
      actor: actor.data,
      projectId: project.data,
      role: role.data,
    })

    if (!granted.ok) {
      /**
       * The account exists and the role does not, which is a state worth saying
       * out loud rather than exiting quietly on: the key below works, and the
       * person it belongs to will see an empty workspace until somebody runs
       * this again.
       */
      console.error(
        `loom: the account was created and the role was not — ${granted.error.detail}\n` +
          "Run the command again with the same actor to try the role; the key below is still theirs."
      )
    }
  }

  console.log(
    `loom: ${actor.data} can sign in${
      project?.success && role?.success ? ` as ${role.data} of ${project.data}` : ""
    }.\n\n` +
      `  ${key}\n\n` +
      "This is the only time that key is shown. It is stored as a digest, so it " +
      "cannot be read back — run this again to replace it, which ends the old one."
  )
} finally {
  await client.end()
}
