import type { StoreError } from "@loom/runtime/store"

/**
 * The five ways storing something can fail, in the words a page can use.
 *
 * `StoreError` is a union of object types, which is exactly right for the code
 * that *handles* one — a `switch` over it is exhaustive at compile time. What it
 * cannot do is be walked: there is no exported list of the codes, so anything
 * that wants to describe all five keeps its own copy.
 *
 * This was the fourth place in the repository to want that. Two of the four
 * have since been answered — the runtime publishes `WRITE_OUTCOME_KINDS` and
 * `TELEMETRY_EVENT_TYPES`, and the pages that needed them read those rather
 * than a copy. `StoreError` and `CliError` are still open, so the workaround
 * below is still the workaround:
 *
 * **A `Record` keyed by the union.** It needs no export from the runtime and it
 * fails at compile time — a sixth code makes this file stop building, which is
 * the loudest moment available to a documentation page. A hand-kept array would
 * simply be missing an entry and nothing would say so.
 */

export type StoreFailure = {
  /** What the runtime calls it. */
  readonly code: StoreError["code"]
  /** What has happened, in a sentence that does not need the type in front of you. */
  readonly meaning: string
  /** Whether this is an outage, a race, or a caller asking for something wrong. */
  readonly kind: "outage" | "race" | "bad request"
}

const FAILURES: Record<StoreError["code"], Omit<StoreFailure, "code">> = {
  unavailable: {
    meaning: "The database did not answer. The change was not applied and nothing was recorded.",
    kind: "outage",
  },
  "revision-conflict": {
    meaning:
      "Somebody else changed the page between the plan being written and it being applied, so the plan was refused rather than applied to a page it never saw.",
    kind: "race",
  },
  "not-found": {
    meaning: "There is no page under that id — which is not the same as a page with no history.",
    kind: "bad request",
  },
  "already-exists": {
    meaning: "There is a page under that id already. A page is created once.",
    kind: "bad request",
  },
  "delta-rejected": {
    meaning: "The change did not apply to the page as it stands, and the tree said why.",
    kind: "bad request",
  },
}

/**
 * The order the page reads them in: the one a deployment will actually meet
 * first, then the one that is not a fault at all, then the three that mean a
 * caller asked for something that is not there.
 *
 * Written out rather than derived from `Object.keys`, because the order is a
 * judgement about what a reader needs first and key order is an accident of how
 * the object above was typed.
 */
const ORDER: readonly StoreError["code"][] = [
  "unavailable",
  "revision-conflict",
  "not-found",
  "already-exists",
  "delta-rejected",
]

export const storeFailures: readonly StoreFailure[] = ORDER.map((code) => ({
  code,
  ...FAILURES[code],
}))

/** Every code, for the check that the page still names all of them. */
export const storeFailureCodes: readonly StoreError["code"][] = Object.keys(
  FAILURES
) as readonly StoreError["code"][]
