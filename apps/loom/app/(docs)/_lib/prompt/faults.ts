import {
  describeInterpretationError,
  interpretationFault,
  type InterpretationError,
  type InterpretationFault,
} from "@loom/runtime"

/**
 * The seven ways interpretation fails, and who would have to do something about
 * each one.
 *
 * Read off the runtime rather than typed out. Both columns a reader acts on —
 * the sentence and the actor — are produced by `describeInterpretationError`
 * and `interpretationFault`, so the page cannot describe a code differently
 * from the way a host's own logs will.
 *
 * The one thing here that is the site's is the example `detail`. A detail is
 * written at the point of failure by whatever failed, so there is no true one to
 * read; these are the shape of the thing, and the prose says so.
 *
 * **The exhaustiveness is the point of the `Record`.** Its keys are the error
 * union's own codes, so an eighth code added to the runtime is a documentation
 * build that fails rather than a table that is quietly one row short — which is
 * the same guarantee the generated API reference gives, applied to a union
 * instead of to an entry point.
 */

type InterpretationCode = InterpretationError["code"]

/**
 * Keyed by code *and* carrying it, which looks redundant and is what makes the
 * table checkable from both directions: the key set is held to the union by the
 * compiler, and `faults.test.ts` holds every value to its own key.
 */
export const faultExamples: Record<InterpretationCode, InterpretationError> = {
  "not-understood": {
    code: "not-understood",
    detail: "\"make it pop\" could mean the heading, the accent or the spacing",
  },
  "no-change-needed": {
    code: "no-change-needed",
    detail: "the heading is already the largest thing on the page",
  },
  "malformed-proposal": {
    code: "malformed-proposal",
    detail: "operations.0.parentId: not a node id",
  },
  refused: { code: "refused", detail: "the model's own safety policy declined" },
  "interpreter-unavailable": {
    code: "interpreter-unavailable",
    detail: "the request timed out",
  },
  "interpreter-misconfigured": {
    code: "interpreter-misconfigured",
    detail: "no API key was configured",
  },
  "interpreter-request-rejected": {
    code: "interpreter-request-rejected",
    detail: "the output schema exceeded the grammar budget",
  },
}

export type FaultRow = {
  readonly code: InterpretationCode
  readonly fault: InterpretationFault
  /** The runtime's own sentence, with an example detail in it. */
  readonly sentence: string
}

/**
 * In the order a reader meets them: the two that are answers rather than
 * failures, then the answer that could not be used, then the three about the
 * service, then Loom's own.
 */
export const faultRows: readonly FaultRow[] = Object.values(faultExamples).map((error) => ({
  code: error.code,
  fault: interpretationFault(error),
  sentence: describeInterpretationError(error),
}))

/**
 * What each of the five actors is, in a reader's words.
 *
 * `InterpretationFault`'s own doc comment says why a grouping exists at all: a
 * reader switching on seven codes has to re-derive it and can get it wrong. A
 * reader on a documentation page has the same problem and less context, so the
 * grouping is what this page leads with and the codes are what it lands on.
 */
export const faultActors: Record<InterpretationFault, string> = {
  asker: "Nothing failed except the asking. Say it differently.",
  model: "The answer that came back. The same question may work on a second try.",
  provider: "The service, this time. Waiting is a reasonable response.",
  deployment: "Your deployment, until somebody changes it. Waiting never fixes this one.",
  runtime: "Loom, for what it sent. Neither waiting nor configuration helps.",
}
