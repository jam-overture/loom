import { z } from "zod"

import {
  clampLimit,
  cursorPosition,
  pageEnds,
  type PageDirection,
  type PageEnds,
} from "../paging.js"
import { err, ok, type Result } from "../result.js"

import { policyChangeOf, type PolicyChange } from "./policy-change.js"
import { policyFingerprintOf, policyShapeOf } from "./policy-fingerprint.js"
import { gatePolicySchema, type GatePolicy } from "./policy.js"

/**
 * The policy's own log.
 *
 * Everything else in Loom is built on the premise that a change to a page is
 * logged, judged and reversible — and until this existed, **the policy was the
 * one object in the system that could change silently.** A `Disposition` records
 * `policyId` and `policyFingerprint`, so a reader can learn that two judgments
 * ran under different rules and can learn nothing about what the rules were. A
 * host that nudged a threshold in a config file and forgot left a corpus whose
 * every record claims to have been judged by a name that no longer means what it
 * meant.
 *
 * 0200 decides that a change to policy is a change a person made, recorded as
 * one. This is where it is recorded. The relationship is 0016's, applied to the
 * thing doing the judging rather than to the thing being judged: **the log is the
 * truth and every reading of it is a view.**
 *
 * Three properties are deliberate.
 *
 * **It stores whole policies, never diffs.** `policyChangeOf` derives what moved
 * between two of them, so there is no recorded description free to disagree with
 * the policies it describes — and a reader may ask about a pair nobody
 * anticipated, which a stored diff could not answer.
 *
 * **An actor is required and the runtime never supplies one.** A log whose whole
 * point is *who did this* cannot have that field be optional; a revision nobody
 * can be named for is not a record of a decision. The one unattributable case —
 * judgments written before this log existed — is answered by the absence of a
 * revision rather than by an invented one.
 *
 * **Recording what is already current is not a revision.** A host builds its
 * policy at boot and `fixedPolicy` closes over it, so a deployment that records
 * on start would otherwise append one revision per process. The log answers
 * `unchanged` and hands back the head it already held.
 *
 * It is **not on the decision path.** `policy-source.ts` requires resolution to
 * be synchronous and pure, and these are promises over storage; a host loads its
 * policy, records it here, and closes over the value it already has.
 */

const recordedAtSchema = z.string().datetime()

/**
 * One policy, as it was, with who made it that and when.
 *
 * `fingerprint` is stored rather than derived on read, and it is the only
 * denormalised field here. The reason is the join it exists for: a `Disposition`
 * carries a fingerprint, and finding the revision it names has to be a seek
 * rather than a fold that rehashes every policy the deployment ever held. It is
 * checked against the policy beside it on the way in, so the two cannot drift —
 * see `recordPolicy`.
 *
 * `revision` is 1-based and dense per `policyId`, which is what makes the
 * sequence foldable: `policyHistoryOf` reads adjacent pairs, and a gap would make
 * it describe a change nobody made.
 */
export type PolicyRevision = {
  readonly policyId: string
  readonly revision: number
  readonly fingerprint: string
  readonly policy: GatePolicy
  /**
   * Who made this the policy. Host-declared, like `policyId` itself and like
   * `Provenance.interpreter`: the runtime cannot know what names a person in a
   * host's own directory, and a name the host chose is one it can look up.
   */
  readonly actor: string
  readonly recordedAt: string
  /** Why, when somebody said. Prose for a reader, and never read by anything. */
  readonly note?: string
}

/**
 * The same shape, as something a stored row can be checked against.
 *
 * Held here rather than in a backend for the reason `heldProposalSchema` gives:
 * a revision outlives the process that wrote it, and every implementation has to
 * read one back the same way — a second store that parsed loosely would disagree
 * with the first about what is storable, and a contract suite would not catch it
 * because both would still round-trip their own writes.
 */
export const policyRevisionSchema = z.object({
  policyId: z.string().min(1),
  revision: z.number().int().positive(),
  fingerprint: z.string().min(1),
  policy: gatePolicySchema,
  actor: z.string().min(1),
  recordedAt: recordedAtSchema,
  note: z.string().min(1).optional(),
})

export type PolicyLogError =
  /** Nothing has ever been recorded under this name. */
  | { readonly code: "no-such-policy"; readonly policyId: string }
  /**
   * The revision the caller expected to be current is not the one that is, so
   * somebody else recorded in between. The write is refused rather than applied
   * on top, because the caller's edit was made against rules that have moved.
   */
  | {
      readonly code: "out-of-date"
      readonly policyId: string
      readonly expected: number
      readonly current: number
    }
  /** The log did not answer. Nothing is known, and a moment later may succeed. */
  | { readonly code: "unavailable"; readonly detail: string }
  /**
   * The log answered, and something it returned is not a revision this build can
   * read. Separate from `unavailable` for the reason `HoldError` separates them:
   * a store that did not answer is waited out, and a row that did not parse is
   * gone and looked at.
   */
  | { readonly code: "unreadable"; readonly detail: string }

export const describePolicyLogError = (error: PolicyLogError): string => {
  switch (error.code) {
    case "no-such-policy":
      return `no policy has been recorded under ${error.policyId}`
    case "out-of-date":
      return `${error.policyId} is at revision ${error.current}, not ${error.expected}; somebody recorded a change in between`
    case "unavailable":
      return `the policy log is unavailable: ${error.detail}`
    case "unreadable":
      return `the policy log returned something this build cannot read: ${error.detail}`
  }
}

/**
 * Reads a revision back out of storage, or says why it could not.
 *
 * The assertion is about the shape of optionality and never about validity, for
 * the reason `parseHeldProposal` gives: Zod infers an optional field as
 * `T | undefined`, which `exactOptionalPropertyTypes` distinguishes from an
 * absent key, and JSON has no `undefined` at all.
 */
export const parsePolicyRevision = (row: unknown): Result<PolicyRevision, PolicyLogError> => {
  const parsed = policyRevisionSchema.safeParse(row)

  return parsed.success
    ? ok(parsed.data as PolicyRevision)
    : err<PolicyLogError>({
        code: "unreadable",
        detail: `a stored policy revision did not parse: ${parsed.error.issues[0]?.path.join(".") ?? "unknown"}`,
      })
}

export type RecordPolicyRequest = {
  readonly policy: GatePolicy
  readonly actor: string
  readonly recordedAt: string
  readonly note?: string
  /**
   * The revision the caller believes is current, or `0` for *nothing is*.
   *
   * Optional, and the difference is which failure the caller is protected from.
   * Omitted, a concurrent recorder wins and this one appends after it. Named, a
   * recorder that lost the race is told so and nothing is written — which is
   * what a screen editing a policy wants, because the person was editing the
   * text of a revision that is no longer the head.
   */
  readonly expectedRevision?: number
}

/**
 * What recording did, which is not always *appended*.
 *
 * Three outcomes rather than one revision, because the three want different
 * sentences on a screen and a caller that could not tell them apart would
 * report a deployment restart as a policy edit.
 */
export type PolicyRecorded =
  /** Nothing was recorded under this name before. There is no change to describe. */
  | { readonly outcome: "first"; readonly revision: PolicyRevision }
  /**
   * An edit. `from` is the revision it replaced and `change` is what moved,
   * derived here rather than stored — the view, over a log that is the truth.
   */
  | {
      readonly outcome: "changed"
      readonly revision: PolicyRevision
      readonly from: PolicyRevision
      readonly change: PolicyChange
    }
  /**
   * The head already says this, so nothing was appended and the revision
   * returned is the one that was already there.
   *
   * Compared against the head alone, never against the whole log: a policy
   * edited to B and then back to A **is** a change somebody made at a time, and
   * recording it has to append. Idempotence against the head is what stops a
   * boot from writing; idempotence against history would lose a revert.
   */
  | { readonly outcome: "unchanged"; readonly revision: PolicyRevision }

/**
 * Which recorded revision a judgment ran under.
 *
 * The join the finding asked for, and the reason `fingerprint` is a column: a
 * `Disposition` carries one, and this turns it into the policy text it was made
 * under. Three outcomes, and the second is the one a single-answer signature
 * would have got wrong.
 */
export type PolicyProvenance =
  | { readonly outcome: "recorded"; readonly revision: PolicyRevision }
  /**
   * Several revisions carry this fingerprint, so the judgment ran under one of
   * them and nothing can say which.
   *
   * A policy edited to B and back to A has two revisions with one fingerprint,
   * which is correct — they are the same rules — and a reader asking *when* has
   * no answer. Returning the oldest, or the newest, would be a confident wrong
   * one. Oldest first, so a caller showing a range shows it in order.
   */
  | { readonly outcome: "ambiguous"; readonly revisions: readonly PolicyRevision[] }
  /**
   * No recorded revision carries it. `heldShapes` is what the log does hold, so
   * a reader can tell *nothing was ever recorded under this name* from *every
   * revision recorded here came from a different build of Loom* — which
   * `policyShapeOf` makes a fact rather than a guess, and which is the difference
   * between a gap in the log and a gap in the comparison.
   */
  | {
      readonly outcome: "unrecorded"
      readonly policyId: string
      readonly fingerprint: string
      readonly heldShapes: readonly string[]
    }

/**
 * Smaller than a tree revision page. A policy has tens of revisions over a
 * deployment's life rather than thousands, and each one carries a whole policy;
 * a page is sized for a screen showing a history, which is what reads this.
 */
export const DEFAULT_POLICY_REVISION_LIMIT = 25
export const MAX_POLICY_REVISION_LIMIT = 100

export const clampPolicyRevisionLimit = (limit: number | undefined): number =>
  clampLimit(limit, {
    fallback: DEFAULT_POLICY_REVISION_LIMIT,
    max: MAX_POLICY_REVISION_LIMIT,
  })

export type PolicyRevisionReadRequest = {
  /** A cursor from a previous page's `older`/`newer`, passed back unread. */
  readonly cursor?: string
  /**
   * Default `newer`, which with no cursor is the oldest page — the read
   * `policyHistoryOf` wants, because a history is folded in the order the edits
   * were made. `older` with no cursor is the newest page, which is what a screen
   * showing *what changed recently* asks for.
   */
  readonly direction?: PageDirection
  readonly limit?: number
}

export type PolicyRevisionPage = PageEnds & {
  /**
   * Always ascending by `revision`, whichever end the page was taken from — the
   * rule `RevisionPage` keeps, and for the same reason: a page that sometimes
   * came back reversed would make every consumer responsible for knowing which,
   * and silently wrong when it guessed.
   */
  readonly revisions: readonly PolicyRevision[]
}

/**
 * One write and three reads.
 *
 * `record` is the only way the log ever grows, so a policy cannot change without
 * leaving a record of who changed it. `current` is the O(1) read a host takes at
 * boot. `revisions` is the paged read a history screen takes. `judgedUnder` is
 * the fingerprint join, on the interface rather than derived from a page because
 * a backend can index it — folding a page to find it would be correct and would
 * only work for the revisions that happened to be on that page.
 *
 * Every read is bounded. `current` is one revision, `judgedUnder` is the
 * revisions matching one digest, and `revisions` is a page with a clamped limit.
 *
 * A log handle **is** the scope it can see, as a store handle is: there is no
 * `list` of policy names, because a deployment knows the names of its own
 * policies and a reader that could enumerate them could reach past the handle
 * it was given.
 */
export interface PolicyLog {
  readonly record: (
    request: RecordPolicyRequest
  ) => Promise<Result<PolicyRecorded, PolicyLogError>>
  readonly current: (policyId: string) => Promise<Result<PolicyRevision, PolicyLogError>>
  readonly revisions: (
    policyId: string,
    request?: PolicyRevisionReadRequest
  ) => Promise<Result<PolicyRevisionPage, PolicyLogError>>
  readonly judgedUnder: (
    policyId: string,
    fingerprint: string
  ) => Promise<Result<PolicyProvenance, PolicyLogError>>
}

/** The read half, for consumers that never record. */
export type PolicyLogReader = Pick<PolicyLog, "current" | "revisions" | "judgedUnder">

/**
 * One edit, as a reader of a history sees it.
 *
 * The pair and the change between them, rather than a change alone: a screen
 * showing *what happened on the 14th* needs the actor and the instant, and both
 * are on the revision rather than in the comparison.
 */
export type PolicyEdit = {
  readonly from: PolicyRevision
  readonly to: PolicyRevision
  readonly change: PolicyChange
}

/**
 * A run of revisions, folded into the edits between them.
 *
 * Pure, and over whatever page the caller has: the view that makes a calibration
 * window straddling a policy change legible, which is the thing
 * `rulesetContinuityOf` can report and cannot explain. Pairs are adjacent in the
 * input, so a caller holding a page reads the edits inside it and the edit into
 * the page is the one the previous page ends on.
 *
 * **Non-adjacent revisions are skipped rather than compared.** A page is dense
 * by construction, but a caller may hand this the result of filtering one — and a
 * comparison across a gap would describe a single edit that nobody made, folding
 * several together and attributing the lot to whoever made the last.
 */
export const policyHistoryOf = (revisions: readonly PolicyRevision[]): readonly PolicyEdit[] => {
  const ordered = [...revisions].sort((left, right) => left.revision - right.revision)

  return ordered.flatMap((to, index) => {
    const from = index === 0 ? undefined : ordered[index - 1]

    if (from === undefined || to.revision !== from.revision + 1) return []

    return [{ from, to, change: policyChangeOf(from.policy, to.policy) }]
  })
}

/**
 * The revisions a digest names, as a `PolicyProvenance`.
 *
 * Shared by every implementation, because *what does a set of matches mean* is a
 * property of the join rather than of a backend — and it is the part most likely
 * to drift between two of them. `heldShapes` is only read when nothing matched,
 * so a backend passes what it can cheaply know: the shapes of the revisions it
 * holds for that name.
 */
export const policyProvenanceOf = (
  policyId: string,
  fingerprint: string,
  matches: readonly PolicyRevision[],
  heldShapes: readonly string[]
): PolicyProvenance => {
  const ordered = [...matches].sort((left, right) => left.revision - right.revision)
  const first = ordered.at(0)

  if (first === undefined) {
    return {
      outcome: "unrecorded",
      policyId,
      fingerprint,
      heldShapes: Array.from(new Set(heldShapes)).sort(),
    }
  }

  return ordered.length === 1
    ? { outcome: "recorded", revision: first }
    : { outcome: "ambiguous", revisions: ordered }
}

/**
 * A revision built from a policy and the facts around it.
 *
 * The fingerprint is computed here and never accepted from a caller, which is
 * what keeps the one denormalised column honest: a caller that could supply it
 * could supply a wrong one, and the whole value of the join is that the digest
 * on a revision is the digest *of* that revision.
 */
const revisionOf = (
  request: RecordPolicyRequest,
  revision: number
): Result<PolicyRevision, PolicyLogError> => {
  const parsed = policyRevisionSchema.safeParse({
    policyId: request.policy.policyId,
    revision,
    fingerprint: policyFingerprintOf(request.policy),
    policy: request.policy,
    actor: request.actor,
    recordedAt: request.recordedAt,
    ...(request.note === undefined ? {} : { note: request.note }),
  })

  return parsed.success
    ? ok(parsed.data as PolicyRevision)
    : err<PolicyLogError>({
        code: "unreadable",
        detail: `a policy revision could not be recorded: ${parsed.error.issues[0]?.path.join(".") ?? "unknown"}`,
      })
}

/**
 * What a `record` call should do, given the head it is appending after.
 *
 * Shared rather than written per backend, because the three outcomes and the
 * staleness check are the contract and not an implementation detail. A backend
 * supplies the head and applies the answer; the rules live here, so two of them
 * cannot disagree about whether a boot is an edit.
 */
export const recordOutcomeOf = (
  request: RecordPolicyRequest,
  head: PolicyRevision | undefined
): Result<PolicyRecorded, PolicyLogError> => {
  const expected = request.expectedRevision
  const current = head?.revision ?? 0

  if (expected !== undefined && expected !== current) {
    return err<PolicyLogError>({
      code: "out-of-date",
      policyId: request.policy.policyId,
      expected,
      current,
    })
  }

  /**
   * The content test is the fingerprint and not the name: a rename *is* an edit,
   * and `policyFingerprintOf` excludes the name, so the two conditions are both
   * needed and neither is redundant (0033).
   */
  if (
    head !== undefined &&
    head.fingerprint === policyFingerprintOf(request.policy) &&
    head.policyId === request.policy.policyId
  ) {
    return ok<PolicyRecorded>({ outcome: "unchanged", revision: head })
  }

  const built = revisionOf(request, current + 1)
  if (!built.ok) return built

  return ok<PolicyRecorded>(
    head === undefined
      ? { outcome: "first", revision: built.value }
      : {
          outcome: "changed",
          revision: built.value,
          from: head,
          change: policyChangeOf(head.policy, built.value.policy),
        }
  )
}

/**
 * The reference implementation, and the one a host's tests run against.
 *
 * Keyed by `policyId` because that is what every read is scoped by, and the
 * revisions under one name are a dense ascending list — the invariant
 * `policyHistoryOf` folds on, enforced here by construction rather than checked.
 */
export const memoryPolicyLog = (): PolicyLog => {
  const logs = new Map<string, PolicyRevision[]>()

  const entriesFor = (policyId: string): readonly PolicyRevision[] => logs.get(policyId) ?? []

  return {
    record: (request) => {
      const policyId = request.policy.policyId
      const entries = logs.get(policyId) ?? []
      const outcome = recordOutcomeOf(request, entries.at(-1))

      if (!outcome.ok || outcome.value.outcome === "unchanged") return Promise.resolve(outcome)

      logs.set(policyId, [...entries, outcome.value.revision])

      return Promise.resolve(outcome)
    },

    current: (policyId) => {
      const head = entriesFor(policyId).at(-1)

      return Promise.resolve(
        head === undefined ? err<PolicyLogError>({ code: "no-such-policy", policyId }) : ok(head)
      )
    },

    revisions: (policyId, request) => {
      const entries = entriesFor(policyId)
      if (entries.length === 0) {
        return Promise.resolve(err<PolicyLogError>({ code: "no-such-policy", policyId }))
      }

      const direction = request?.direction ?? "newer"
      const limit = clampPolicyRevisionLimit(request?.limit)
      const from = cursorPosition(request?.cursor)

      const remaining = entries.filter((entry) =>
        from === undefined
          ? true
          : direction === "older"
            ? entry.revision < from
            : entry.revision > from
      )

      /**
       * `older` takes from the newest end and `newer` from the oldest, and both
       * hand back an ascending page — so the `older` slice is taken off the tail
       * rather than reversed and reversed back.
       */
      const page =
        direction === "older"
          ? remaining.slice(Math.max(0, remaining.length - limit))
          : remaining.slice(0, limit)

      return Promise.resolve(
        ok<PolicyRevisionPage>({
          revisions: page,
          ...pageEnds(
            page.map((entry) => entry.revision),
            direction,
            { beyond: remaining.length > page.length, resumed: from !== undefined }
          ),
        })
      )
    },

    judgedUnder: (policyId, fingerprint) => {
      const entries = entriesFor(policyId)

      return Promise.resolve(
        ok(
          policyProvenanceOf(
            policyId,
            fingerprint,
            entries.filter((entry) => entry.fingerprint === fingerprint),
            entries.map((entry) => policyShapeOf(entry.fingerprint))
          )
        )
      )
    },
  }
}
