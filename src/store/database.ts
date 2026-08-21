import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core"

/**
 * The database handle the postgres store and its migration share.
 *
 * One type, in a module of its own, so that neither of the two files that need
 * it has to import the other.
 */

/**
 * The narrowest Drizzle type that both the postgres.js and PGlite drivers
 * satisfy. It lives alone so that `migrate.ts` and `postgres.ts` can share it
 * without importing each other.
 */
export type LoomDatabase = PgDatabase<PgQueryResultHKT>
