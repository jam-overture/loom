import { sql } from "drizzle-orm"

import type { LoomDatabase } from "../store/database.js"

/**
 * Asking Postgres whether a table really is protected.
 *
 * A test helper, shared so that the store's suite and the journal's check the
 * same promise the same way.
 */

/**
 * Whether Postgres has row level security on a table, read from the catalogue
 * rather than inferred from having run the statement.
 *
 * Shared because the store's DDL and the journal's both make the same promise,
 * and a promise checked two different ways is a promise one of them will stop
 * checking. `db.execute` hands back `{ rows }` on both drivers Loom runs on.
 */
export const rowSecurityOn = async (db: LoomDatabase, table: string): Promise<boolean> => {
  const result = await db.execute(
    sql`SELECT relrowsecurity FROM pg_class WHERE relname = ${table}`
  )

  const rows = (result as unknown as { readonly rows?: readonly { relrowsecurity?: unknown }[] }).rows

  return rows?.[0]?.relrowsecurity === true
}
