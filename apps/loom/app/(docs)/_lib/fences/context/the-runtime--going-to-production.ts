import type { LoomDatabase } from "@loom/runtime/postgres"

/**
 * Going to production.
 *
 * This page is written from inside a deployment that is being assembled, and it
 * does one thing on purpose that a program cannot: it **wires three stores to
 * `db` two sections before it says what `db` is.** That is the right order for a
 * reader — the choice between memory and Postgres is the decision, and opening a
 * connection is the plumbing under it — and it means the block that wires the
 * Postgres stores is reaching for something the page has not shown yet.
 *
 * So the story lends it one. The block that actually builds the connection
 * declares its own `db`, and this one stands back: a context name is only
 * imported into a program that does not declare it.
 *
 * Everything else on the page — the six store constructors, the three
 * `ensure…Schema` calls — is the runtime's, and the page imports all of them.
 */

/** Your connection, for the one block that uses it before the page opens it. */
export declare const db: LoomDatabase
