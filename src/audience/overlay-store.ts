/**
 * Custody of the two things a deployment needs to serve one page to more than
 * one audience: the **rules** that sort readers, and the **form** each audience
 * earns.
 *
 * [0359](../../decisions/0359-an-audience-rule-is-a-conjunction-of-scalar-clauses-and-a-composed-page-is-a-projection-of-a-revision.md)
 * clause 6 left this out on purpose — *`composingTreeSourceFromStore` takes an
 * `AudienceOverlaySource`, a seam and not a table* — so the composition could
 * be built, tested and reviewed without a schema change under it. This is the
 * table the seam was waiting for, and it is 0263's store dimension.
 *
 * **The rules are a log and the forms are rows, and the asymmetry is the
 * decision in this file.** A rule decides which readers get which form, so
 * editing one changes what every reader in that audience sees — without
 * touching the page, its delta, or its log. Kept as a mutable row, that change
 * would leave **no record anywhere**: the one thing Loom exists to make
 * impossible. So a rule list is appended to, attributed and dense, exactly as
 * the policy log is and for the same reason (0200). A form is a document being
 * worked on; its history is the proposal that produced it, and a second log of
 * every keystroke on it would be a record of drafting rather than of deciding.
 *
 * Nothing here evaluates a rule. `rule.ts` does that, in the customer's own
 * process, over a context that never leaves it (0262) — this module only keeps
 * what that evaluation is handed.
 */

import { z } from "zod"

import { treeIdSchema, type TreeId } from "../ids.js"
import { clampLimit } from "../paging.js"
import { err, mapResult, ok, type Result } from "../result.js"
import { treeDeltaSchema, type TreeDelta } from "../tree/delta.js"

import { audienceIdSchema, type AudienceId } from "./audience.js"
import type { AudienceForm, AudienceOverlay } from "./compose.js"
import { audienceRuleSchema, type AudienceRule } from "./rule.js"

/**
 * One recorded state of a page's audience rules.
 *
 * `rules` is an **array and not a set of rows with a position**, which is the
 * whole reason this record exists rather than a table of clauses. 0359 clause 3
 * makes the order load-bearing — the last matching rule wins a contested node —
 * and an order expressed as a column is an order two writers can half-apply: a
 * reorder becomes several row updates, and a reader arriving between two of them
 * is served a precedence nobody authored. An array is one value, written once.
 *
 * `revision` starts at 1 and is dense, so it is also the number of times this
 * page's rules have been edited.
 */
export type AudienceRuleRevision = {
  readonly treeId: TreeId
  readonly revision: number
  readonly rules: readonly AudienceRule[]
  /** Who made these the rules (0200). Never absent: a rule nobody can be named for is not a decision. */
  readonly actor: string
  readonly recordedAt: string
}

const audienceRuleRevisionSchema = z.object({
  treeId: treeIdSchema,
  revision: z.number().int().positive(),
  /**
   * Empty is a real state and the one a page reaches by having its last rule
   * removed: *this page is served to everybody the same way, and somebody
   * decided that*. The alternative spelling — delete the row — is the spelling
   * that cannot be attributed.
   */
  rules: z.array(audienceRuleSchema),
  actor: z.string().min(1),
  recordedAt: z.string().datetime(),
})

/** One audience's delta, as the store keeps it. */
export type StoredAudienceForm = {
  readonly treeId: TreeId
  readonly audienceId: AudienceId
  readonly delta: TreeDelta
  readonly actor: string
  readonly authoredAt: string
}

const storedAudienceFormSchema = z.object({
  treeId: treeIdSchema,
  audienceId: audienceIdSchema,
  delta: treeDeltaSchema,
  actor: z.string().min(1),
  authoredAt: z.string().datetime(),
})

/**
 * What a screen listing a page's audiences needs, **without the deltas**.
 *
 * The reading 0359's consequences name: *a base edit stales every audience
 * delta*, so the first question anybody asks of a page with audiences is which
 * of its forms are behind. Answering that from `overlay` means loading every
 * delta to read one number off each — on a screen whose job is to say which of
 * them is unusable.
 *
 * It says `baseRevision` and not *stale*, because staleness is a comparison
 * against the page's head and this store holds no pages. The caller holding
 * both numbers is the one that can say it.
 */
export type AudienceFormListing = {
  readonly audienceId: AudienceId
  readonly baseRevision: number
  readonly actor: string
  readonly authoredAt: string
}

export type AudienceOverlayError =
  /**
   * Somebody else recorded rules for this page while this caller was editing
   * the ones they read. Nothing was written.
   */
  | {
      readonly code: "out-of-date"
      readonly treeId: TreeId
      readonly expected: number
      readonly current: number
    }
  /**
   * The delta is for another page.
   *
   * Refused at the write rather than stored, because `composeTreeForContext`
   * refuses it at every render: a form under one page carrying a delta for
   * another is a row that can never be served to anybody, and accepting it
   * trades a fault a person sees now for a page that is quietly unavailable
   * later.
   */
  | { readonly code: "tree-mismatch"; readonly treeId: TreeId; readonly delta: string }
  /** A row the current code cannot parse, which is a row an older one wrote. */
  | { readonly code: "unreadable"; readonly treeId: TreeId; readonly detail: string }
  | { readonly code: "unavailable"; readonly detail: string }

export const describeAudienceOverlayError = (error: AudienceOverlayError): string => {
  switch (error.code) {
    case "out-of-date":
      return `${error.treeId}'s rules moved on: this edit is of revision ${error.expected}, the current one is ${error.current}`
    case "tree-mismatch":
      return `a form for ${error.treeId} cannot carry a delta for ${error.delta}`
    case "unreadable":
      return `${error.treeId}'s stored audience overlay did not parse: ${error.detail}`
    case "unavailable":
      return `storage is unavailable: ${error.detail}`
  }
}

/**
 * A row on the way out, checked rather than cast — the boundary every stored
 * shape in this repository crosses the same way. These two outlive the code
 * that wrote them by more than most: a rule is edited rarely and read on every
 * request for as long as the page is published.
 */
export const parseAudienceRuleRevision = (
  row: unknown,
  treeId: TreeId
): Result<AudienceRuleRevision, AudienceOverlayError> => {
  const parsed = audienceRuleRevisionSchema.safeParse(row)

  return parsed.success
    ? ok(parsed.data)
    : err<AudienceOverlayError>({
        code: "unreadable",
        treeId,
        detail: parsed.error.issues[0]?.message ?? "invalid",
      })
}

export const parseStoredAudienceForm = (
  row: unknown,
  treeId: TreeId
): Result<StoredAudienceForm, AudienceOverlayError> => {
  const parsed = storedAudienceFormSchema.safeParse(row)

  return parsed.success
    ? ok(parsed.data)
    : err<AudienceOverlayError>({
        code: "unreadable",
        treeId,
        detail: parsed.error.issues[0]?.message ?? "invalid",
      })
}

export type AudienceRuleHistoryRequest = {
  /** Clamped by the implementation — see `clampAudienceRuleHistoryLimit`. */
  readonly limit?: number
}

export type RecordAudienceRulesRequest = {
  readonly rules: readonly AudienceRule[]
  readonly actor: string
  readonly recordedAt: string
  /**
   * The revision the caller believes is current, or `0` for *this page has no
   * rules yet*.
   *
   * Optional, and the difference is which failure the caller is protected from.
   * Omitted, a concurrent recorder wins and this one appends after it. Named, a
   * recorder that lost the race is told so and nothing is written — which is
   * what a rule editor wants, because the person was reordering a list that is
   * no longer the list.
   */
  readonly expectedRevision?: number
}

/**
 * What recording did, which is not always *appended*.
 *
 * Two outcomes rather than the policy log's three. *First* and *changed* are
 * `revision === 1` and are not worth a case a caller has to handle; *unchanged*
 * is, because without it a screen that saves on blur writes a revision per
 * visit and the log stops meaning *somebody changed who sees what*.
 *
 * Compared against the head alone, never against the whole history: rules
 * edited to B and back to A **is** a change somebody made at a time, and
 * recording it has to append.
 */
export type AudienceRulesRecorded =
  | { readonly outcome: "recorded"; readonly revision: AudienceRuleRevision }
  | { readonly outcome: "unchanged"; readonly revision: AudienceRuleRevision }

export type AuthorAudienceFormRequest = {
  readonly audienceId: AudienceId
  readonly delta: TreeDelta
  readonly actor: string
  readonly authoredAt: string
}

/**
 * How much of a page's rule history one read answers.
 *
 * Bounded, because every read in this store is (0025's rule, as `store.ts`
 * states it: *no caller can ask a store for everything it holds, whether by
 * naming a large limit or by naming none*). Unpaged, which `ProjectStore.list`
 * already is: a page's rules are edited rarely, the newest edits are the ones a
 * screen shows, and a cursor is machinery that would be written now and first
 * exercised by nobody. **Reaching past the limit is not offered** — the rows are
 * there, and the read that walks them is for whoever first needs it.
 */
export const DEFAULT_AUDIENCE_RULE_HISTORY_LIMIT = 25
export const MAX_AUDIENCE_RULE_HISTORY_LIMIT = 100

export const clampAudienceRuleHistoryLimit = (limit: number | undefined): number =>
  clampLimit(limit, {
    fallback: DEFAULT_AUDIENCE_RULE_HISTORY_LIMIT,
    max: MAX_AUDIENCE_RULE_HISTORY_LIMIT,
  })

/**
 * Whether two rule lists say the same thing.
 *
 * **Order-sensitive, and that is the point**: 0359 clause 3 makes the order the
 * precedence, so two lists holding the same rules in a different order are two
 * different deployments and recording the second one is an edit. Compared by
 * `JSON.stringify` rather than field by field because a rule is a closed JSON
 * shape — `audienceRuleSchema` admits nothing a stringify would miss — and the
 * alternative is a deep-equality walk that grows a case every time a clause
 * does.
 */
const sameRules = (held: readonly AudienceRule[], offered: readonly AudienceRule[]): boolean =>
  JSON.stringify(held) === JSON.stringify(offered)

/**
 * What a `record` call should do, given the head it would append after.
 *
 * Shared rather than written per backend, for the reason `recordOutcomeOf` is:
 * the staleness check and *what counts as unchanged* are the contract, not an
 * implementation detail, so two backends cannot disagree about whether a save
 * with nothing in it is an edit.
 */
export const audienceRulesOutcomeOf = (
  treeId: TreeId,
  request: RecordAudienceRulesRequest,
  head: AudienceRuleRevision | undefined
): Result<AudienceRulesRecorded, AudienceOverlayError> => {
  const current = head?.revision ?? 0

  if (request.expectedRevision !== undefined && request.expectedRevision !== current) {
    return err<AudienceOverlayError>({
      code: "out-of-date",
      treeId,
      expected: request.expectedRevision,
      current,
    })
  }

  if (head !== undefined && sameRules(head.rules, request.rules)) {
    return ok<AudienceRulesRecorded>({ outcome: "unchanged", revision: head })
  }

  /**
   * Parsed rather than assembled, so a revision this store would accept and the
   * database would refuse cannot be told apart by which one you used. It is also
   * where an actor nobody named and a stamp that is not an instant are refused —
   * both are caller-supplied strings, and both are load-bearing on a record of
   * who changed who sees what.
   */
  return mapResult(
    parseAudienceRuleRevision(
      {
        treeId,
        revision: current + 1,
        rules: request.rules,
        actor: request.actor,
        recordedAt: request.recordedAt,
      },
      treeId
    ),
    (revision): AudienceRulesRecorded => ({ outcome: "recorded", revision })
  )
}

/**
 * The read half, for the render path.
 *
 * `overlay` is what `audienceOverlaySourceFromStore` hands the composition, and
 * it is answered **whole** — rules and forms in one call — because both halves
 * are cacheable beside the base (0263 clause 3) and a host re-fetching the
 * rules per request has paid for the call this whole design exists to avoid.
 *
 * **A page with no rules is not a missing page.** It answers an empty overlay,
 * which composes to the base, which is what every deployment that has never
 * heard of an audience is already being served. There is no `not-found` here
 * for that reason: this store does not know which pages exist, only which of
 * them somebody has written rules for.
 */
export interface AudienceOverlayReader {
  readonly overlay: (treeId: TreeId) => Promise<Result<AudienceOverlay, AudienceOverlayError>>
  /** The current rules with their revision and author, for a screen editing them. */
  readonly rules: (
    treeId: TreeId
  ) => Promise<Result<AudienceRuleRevision | undefined, AudienceOverlayError>>
  /**
   * The edits this page's rules have had, **newest first**.
   *
   * The read that makes the log a record rather than an accumulation. Without
   * it, keeping every revision is unobservable from outside — a planted
   * mutation that overwrote the log instead of appending to it changed nothing
   * any caller could see, which is the same emptiness the composition's removed
   * invariant check had. A record of who changed who sees what that nobody can
   * read is not a record.
   */
  readonly history: (
    treeId: TreeId,
    request?: AudienceRuleHistoryRequest
  ) => Promise<Result<readonly AudienceRuleRevision[], AudienceOverlayError>>
  readonly forms: (
    treeId: TreeId
  ) => Promise<Result<readonly AudienceFormListing[], AudienceOverlayError>>
}

/**
 * Three reads and two writes, and **no delete**, which this store shares with
 * every other one here for a reason of its own: an audience stops being served
 * by leaving the rules, not by having its form removed. The form then matches
 * nobody and costs a row — and the day the rule comes back, the work is still
 * there. A delete would make *we stopped serving this* and *we threw the work
 * away* one button.
 */
export interface AudienceOverlayStore extends AudienceOverlayReader {
  readonly recordRules: (
    treeId: TreeId,
    request: RecordAudienceRulesRequest
  ) => Promise<Result<AudienceRulesRecorded, AudienceOverlayError>>
  /**
   * The form this audience earns, replacing whatever it had.
   *
   * An upsert rather than an append: a form is a document being worked on, and
   * rebasing it onto a moved base is the ordinary thing that happens to it.
   */
  readonly setForm: (
    treeId: TreeId,
    request: AuthorAudienceFormRequest
  ) => Promise<Result<StoredAudienceForm, AudienceOverlayError>>
}

/**
 * The overlay a reader of the two halves assembles, shared so the backends
 * cannot disagree about what *whole* means.
 */
export const audienceOverlayOf = (
  head: AudienceRuleRevision | undefined,
  forms: readonly AudienceForm[]
): AudienceOverlay => ({ rules: head?.rules ?? [], forms })
