/**
 * The suites a host runs against its own implementation, published as
 * `@jam-overture/loom/testing/contracts`.
 *
 * A `TreeStore`, a `HoldStore` and a `TelemetryJournal` are seams: Loom ships
 * an in-memory implementation of each and a Postgres one, and a host is
 * expected to be able to write a third. What it cannot do from outside this
 * repository is find out whether the third one is *right*. The promises are not
 * in the type — an append is ordered, a hold is exclusive, a journal is
 * append-only — and a host discovering each of them from a production incident
 * is the seam being offered without the thing that makes it safe to take.
 *
 * So the suite this package runs against its own two implementations is the
 * suite it hands anybody writing a third. It is the same code, not a
 * description of it, which is the whole point: a promise checked two different
 * ways is a promise one of them will stop checking.
 *
 * **These import `vitest`, and that is why they are not in
 * [`index.js`](./index.ts).** A test framework in the fixtures' import graph
 * would reach every consumer of `sampleTree`, including the course's in-page
 * runner, which needs to load the fixtures in a browser and has no business
 * loading a test runner to do it. `vitest` is therefore an optional peer
 * dependency: present for anyone importing this module, absent and unmissed for
 * everyone importing the other one.
 *
 * `rowSecurityOn` is here rather than beside the fixtures for the same kind of
 * reason — it asks a live Postgres about a table, so it needs `drizzle-orm`,
 * which the Postgres suites already do.
 */

export { describeHoldStoreContract, heldProposalFixture } from "./hold-contract.js"

export { describeTelemetryJournalContract, sampleEpisode } from "./journal-contract.js"

export { rowSecurityOn } from "./row-security.js"

export {
  appendOf,
  describeTreeStoreContract,
  removalOf,
  treeNamed,
} from "./store-contract.js"
