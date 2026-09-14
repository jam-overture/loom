/**
 * The published entry points, and one line each on what you reach through them.
 *
 * The list is not the authority — `package.json` is — and this file will drift
 * the day someone adds an export. `entry-points.test.ts` reads the runtime's
 * `exports` map off disk and fails on any difference in either direction, so
 * the drift is a red test rather than a page that quietly stops being true.
 *
 * The generated API reference §4c plans will describe what is *inside* each of
 * these. This is only the map of doors.
 */

export type EntryPoint = {
  /** Exactly as it is written in an import. */
  readonly specifier: string
  readonly summary: string
  /** Whether an ordinary application is expected to import it. */
  readonly audience: "app" | "host" | "tooling"
}

export const entryPoints: readonly EntryPoint[] = [
  {
    specifier: "@loom/runtime",
    summary: "The tree, the delta, the ids, the builders, the Gate and the pipeline. Start here.",
    audience: "app",
  },
  {
    specifier: "@loom/runtime/react",
    summary: "Rendering: a tree to React elements, theme mounting, addressing, render diagnostics.",
    audience: "app",
  },
  {
    specifier: "@loom/runtime/primitives",
    summary: "The starter library — the primitives every example on this site is built from.",
    audience: "app",
  },
  {
    specifier: "@loom/runtime/sdk",
    summary: "Defining and registering primitives of your own, and the catalogue a model is shown.",
    audience: "host",
  },
  {
    specifier: "@loom/runtime/store",
    summary: "Persisting trees and revisions: the store contract, and an in-memory implementation.",
    audience: "host",
  },
  {
    specifier: "@loom/runtime/postgres",
    summary: "The Postgres store. Same contract, a database behind it.",
    audience: "host",
  },
  {
    specifier: "@loom/runtime/write",
    summary: "The write path: proposing, holding, confirming and applying a change.",
    audience: "host",
  },
  {
    specifier: "@loom/runtime/signals",
    summary: "Reader signals — what a published page reports about how it is read, and the parser a receiver checks them with.",
    audience: "host",
  },
  {
    specifier: "@loom/runtime/signals/broadcast",
    summary: "The reader-signal broadcaster alone, for a browser bundle — about 5 KB, with no schema library.",
    audience: "host",
  },
  {
    specifier: "@loom/runtime/signals/postgres",
    summary: "The Postgres buffer and counters, for a deployment that keeps what its readers did.",
    audience: "host",
  },
  {
    specifier: "@loom/runtime/telemetry",
    summary: "The journal — proposal, provenance, disposition and outcome, recorded as they happen.",
    audience: "host",
  },
  {
    specifier: "@loom/runtime/telemetry/postgres",
    summary: "The Postgres journal, for a deployment that keeps its telemetry.",
    audience: "host",
  },
  {
    specifier: "@loom/runtime/anthropic",
    summary: "The model seam: an interpreter that turns a sentence into a proposal. Optional.",
    audience: "host",
  },
  {
    specifier: "@loom/runtime/cli",
    summary: "Scaffolding and inspection from a terminal.",
    audience: "tooling",
  },
  {
    specifier: "@loom/runtime/testing",
    summary: "Fixtures and doubles: the sample trees, clocks and scripted interpreters Loom tests itself with.",
    audience: "tooling",
  },
  {
    specifier: "@loom/runtime/testing/contracts",
    summary: "The suites that tell you whether your own store, hold store or journal keeps its promises.",
    audience: "tooling",
  },
]
