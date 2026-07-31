import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core"

/**
 * The narrowest Drizzle type that both the postgres.js and PGlite drivers
 * satisfy. It lives alone so that `migrate.ts` and `postgres.ts` can share it
 * without importing each other.
 */
export type LoomDatabase = PgDatabase<PgQueryResultHKT>
