/**
 * Reader signals: what a published page may say about how it is being read,
 * and what a deployment does with it once it has been said.
 *
 * The vocabulary and its parser are safe to import anywhere. The broadcaster
 * touches the DOM only when it is called, so this entry point also loads on a
 * server that merely parses batches (0136).
 *
 * **In a browser bundle, import the broadcaster from
 * `@jam-overture/loom/signals/broadcast` instead.** This entry also carries the
 * schemas, and a bundler cannot leave the schema library out once it is
 * imported — about 60 KB of it, against a broadcaster of about 5 KB.
 *
 * **Postgres is not re-exported here.** It reaches Drizzle and a database
 * driver, and a route handler that only ingests should not load either;
 * `@jam-overture/loom/signals/postgres` is where a deployment picks it up, exactly
 * as the store and the journal do it.
 */

export * from "./broadcast.js"
export * from "./collect.js"
export * from "./deliver.js"
export * from "./fold.js"
export * from "./ingest.js"
export * from "./intake.js"
export * from "./journal.js"
export * from "./memory.js"
export * from "./parts.js"
export * from "./region.js"
export * from "./rollup.js"
export * from "./signal.js"
export * from "./tally.js"
export * from "./view.js"
