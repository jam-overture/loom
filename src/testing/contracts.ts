/**
 * The suites a host runs against its own implementation, published as
 * `@jam-overture/loom/testing/contracts`.
 *
 * A `TreeStore`, a `HoldStore`, a `TelemetryJournal` and a `PolicyLog` are seams:
 * Loom ships an in-memory implementation of each and a Postgres one, and a host
 * is expected to be able to write a third. A `ModelClient` is the same kind of
 * thing one step further out — Loom ships *one* implementation of it, and 0005
 * made even that one opt-in so a host could bring its own. What it cannot do from
 * outside this repository is find out whether the third one is *right*. The
 * promises are not in the type — an append is ordered, a hold is exclusive, a
 * journal is append-only, a policy's revisions are dense and attributed — and a
 * host discovering each of them from a production incident is the seam being
 * offered without the thing that makes it safe to take.
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

export {
  CONTRACT_REPLY,
  CONTRACT_SERVED_BY,
  contractRequest,
  describeModelClientContract,
  MODEL_SITUATIONS,
  type ModelClientContract,
  type ModelSituation,
  type ModelSituationClient,
} from "./model-contract.js"

export { describeTelemetryJournalContract, sampleEpisode } from "./journal-contract.js"

export { describePolicyLogContract, policyNamed, recordingOf } from "./policy-log-contract.js"

export { rowSecurityOn } from "./row-security.js"

export {
  appendOf,
  describeTreeStoreContract,
  removalOf,
  treeNamed,
} from "./store-contract.js"
