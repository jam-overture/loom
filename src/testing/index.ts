/**
 * The fixtures and doubles a host can import, published as `@jam-overture/loom/testing`.
 *
 * Everything in this directory existed already and was reachable only from
 * inside the repository: `src/testing/**` was excluded from the build, so
 * `dist/testing/` did not exist and there was no entry point that could have
 * named it. That was right while the only consumer was this package's own
 * suite. It stopped being right when three consumers outside it appeared —
 * the course, whose seventeen most-imported fences all start with
 * `sampleTree()`; a host implementing a tree store, whose only way to know it
 * is correct is the suite this package already runs against its own; and
 * anybody writing a primitive, who wants a registry to register it in.
 *
 * The alternative each of them faces without this is to reimplement the
 * fixture, which is the worst outcome available: a `sampleTree` that agrees
 * with the lesson and disagrees with Loom. Publishing it is what makes the
 * fixture *the* fixture rather than one of several.
 *
 * **What is here is a promise, and what is not here is not.** A published
 * entry point is API: `sampleTree`'s shape is now something a host may depend
 * on and this package may not silently change. So this file names its exports
 * one module at a time rather than re-exporting the directory, and two modules
 * are deliberately absent — `row-security.ts`, which asks a live Postgres about
 * a table and belongs with the contract suites, and nothing else. A module
 * added to this directory is internal until a line here says otherwise.
 *
 * **Nothing reachable from this file imports a test framework.** The contract
 * suites do — they are `describe` blocks, that is what they are for — and they
 * live at [`contracts.ts`](./contracts.ts) behind a second entry point for
 * exactly that reason. This one is loadable anywhere the runtime is, including
 * a browser, which is the property the course's in-page runner needs and the
 * one `surface.test.ts` holds.
 */

export {
  cardDefinition,
  footerDefinition,
  headerDefinition,
  pageDefinition,
  registryOf,
  testDefinitions,
  testRegistry,
} from "./definitions.js"

export {
  buildIntent,
  buildProposal,
  collectingEventSink,
  failingEventSink,
  fixedClock,
  FIXED_INSTANT,
  hangingModelClient,
  scriptedInterpreter,
  scriptedModelClient,
  scriptedRepairer,
  type CollectingEventSink,
  type HangingModelClient,
  type IntentDraft,
  type ProposalDraft,
  type RecordingInterpreter,
  type RecordingModelClient,
  type RecordingRepairer,
} from "./doubles.js"

export {
  harnessWith,
  proposalScript,
  removalDelta,
  type EpisodeHarness,
} from "./episode-harness.js"

export {
  memoryFileSystem,
  type MemoryFileSystem,
  type MemoryFileSystemOptions,
} from "./filesystem.js"

export { formTree, sampleTree, type FormTree, type SampleTree } from "./fixtures.js"

export {
  CONFIGURE_CARD_REPLY,
  FOREIGN_ID_REPLY,
  INSERT_NOTE_REPLY,
  INSERT_SLOT_REPLY,
  NON_OBJECT_PROPS_REPLY,
  NOT_UNDERSTOOD_REPLY,
  NO_CHANGE_REPLY,
  OFF_SCHEMA_REPLY,
  TRUNCATED_REPLY,
  UNDECODABLE_PROP_REPLY,
} from "./model-replies.js"

export {
  testPrimitiveResolver,
  testPrimitives,
  undecoratedPrimitive,
} from "./primitives.js"
