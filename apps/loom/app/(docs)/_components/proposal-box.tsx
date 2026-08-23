"use client"

import {
  describeInterpretationError,
  describeTreeError,
  sequentialIdFactory,
  type LoomTree,
  type StakeLevel,
} from "@loom/runtime"
import { describeRevertPlan } from "@loom/runtime/store"
import { describeWriteOutcome } from "@loom/runtime/write"
import { useRef, useState, useTransition, type ReactNode } from "react"

import {
  availableDocsPresets,
  DOCS_PRESETS,
  type DocsPreset,
} from "@/app/(docs)/_lib/propose/presets"
import {
  answerDocsHold,
  askDocsChange,
  heldOutcome,
  readDocsLog,
  treeAfter,
  undoDocsRevision,
  type DocsChange,
  type DocsLogEntry,
} from "@/app/(docs)/_lib/propose/run"
import { openDocsSession, type DocsSession } from "@/app/(docs)/_lib/propose/session"

/**
 * The box beside every example, where a reader asks for a change and watches
 * what the runtime does with it.
 *
 * Everything here runs in the reader's browser. The interpreter is
 * deterministic (0057) and the store is memory, so there is nothing to post to
 * and nothing to wait for — which is also why this works on a preview
 * deployment, in a clone with no API key, and offline.
 *
 * Three things are shown rather than summarised, in the order a reader needs
 * them: **what was asked**, **what the runtime made of it**, and **what the
 * Gate said**. A box that showed only the third would be asking the reader to
 * take the interesting half on trust, and the interesting half is the reason
 * this framework exists.
 *
 * Under them is the fourth: **what the log says happened**. It is read back out
 * of the store rather than accumulated here, so a row a reader sees is a row a
 * deployment would have written, and the undo beside it is a proposal against
 * that log rather than a button this component knows how to honour.
 */

type VerdictTone = "accepted" | "held" | "refused"

const TONE: Record<VerdictTone, string> = {
  accepted:
    "border-verdict-accepted-edge bg-verdict-accepted-surface text-verdict-accepted-ink",
  held: "border-verdict-held-edge bg-verdict-held-surface text-verdict-held-ink",
  refused: "border-verdict-refused-edge bg-verdict-refused-surface text-verdict-refused-ink",
}

/**
 * The site's own plain-English lead for each outcome. It never restates the
 * runtime's reason — that is printed verbatim underneath — because a paraphrase
 * of a verdict is a second copy of it, and the two would drift.
 */
const HEADLINE: Record<VerdictTone, string> = {
  accepted: "Applied, and appended to the log",
  held: "Held for you to decide",
  refused: "Refused",
}

const toneOf = (change: DocsChange): VerdictTone => {
  switch (change.outcome.kind) {
    case "committed":
      return "accepted"
    case "held":
      return "held"
    default:
      return "refused"
  }
}

const STAKE_WORDS: Record<StakeLevel, string> = {
  low: "low stakes",
  medium: "medium stakes",
  high: "high stakes",
  critical: "critical stakes",
}

const Row = ({ label, children }: { readonly label: string; readonly children: ReactNode }) => (
  <div className="grid gap-1 sm:grid-cols-[9rem_1fr] sm:gap-3">
    <dt className="text-ink-faint text-xs tracking-wide uppercase">{label}</dt>
    <dd className="text-ink text-sm leading-relaxed">{children}</dd>
  </div>
)

const Chip = ({
  preset,
  disabled,
  onClick,
}: {
  readonly preset: DocsPreset
  readonly disabled: boolean
  readonly onClick: () => void
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={preset.utterance}
    className="border-edge bg-surface-raised text-ink hover:bg-surface-hover disabled:text-ink-faint rounded-full border px-3 py-1.5 text-xs font-medium disabled:cursor-not-allowed"
  >
    {preset.label}
  </button>
)

/**
 * What the runtime made of the ask, before anyone judged it.
 *
 * The operations are printed as they are rather than described, because the
 * shape *is* the lesson: four verbs, each naming a node by id. A reader who has
 * seen this three times knows what a delta is without a definition.
 */
const Delta = ({ change }: { readonly change: DocsChange }) => {
  if (change.assessment === undefined) return null

  return (
    <Row label="The delta">
      {/*
        Capped, because an `insert` carries the whole node it is inserting and a
        delta that filled the screen would push the verdict — the thing the
        reader clicked for — below the fold. Scrolling shows all of it; the
        alternative, printing a summary, would be the site paraphrasing the one
        artefact it is trying to teach a reader to read.
      */}
      <pre className="bg-code-surface text-code-ink max-h-56 overflow-auto rounded-md p-3 font-mono text-xs leading-relaxed">
        {JSON.stringify(change.assessment.proposal.delta.operations, null, 2)}
      </pre>
    </Row>
  )
}

/**
 * The endings that never reached the Gate, each said in the runtime's own
 * words. `not-written` is the one this site can actually produce — an undo
 * planned against a head another click has moved past — and it is worth a
 * reader seeing rather than a silent no-op.
 */
const Aside = ({ change }: { readonly change: DocsChange }) => {
  const { outcome } = change

  if (outcome.kind === "not-interpreted") {
    return (
      <p className="text-sm">The interpreter declined: {describeInterpretationError(outcome.error)}</p>
    )
  }

  if (outcome.kind === "not-applicable") {
    return (
      <p className="text-sm">The proposal no longer fits this tree: {describeTreeError(outcome.error)}</p>
    )
  }

  if (outcome.kind === "not-revertable") {
    return <p className="text-sm">No undo could be planned: {describeRevertPlan(outcome.plan)}</p>
  }

  if (outcome.kind === "not-written" || outcome.kind === "not-answerable") {
    return <p className="text-sm">{describeWriteOutcome(outcome)}</p>
  }

  return null
}

const Verdict = ({ change }: { readonly change: DocsChange }) => {
  const { outcome, assessment } = change
  const aside = <Aside change={change} />

  if (outcome.kind !== "committed" && outcome.kind !== "held" && outcome.kind !== "refused") {
    return aside
  }

  const disposition = outcome.kind === "held" ? outcome.held.disposition : outcome.disposition
  const tone = toneOf(change)

  return (
    <div className="grid gap-3">
      <p className="text-sm font-semibold">{HEADLINE[tone]}</p>

      <dl className="grid gap-3">
        <Row label="Because">
          <span className="font-mono text-xs">{disposition.reason.code}</span> —{" "}
          {disposition.reason.detail}
        </Row>

        {assessment !== undefined && (
          <>
            <Row label="Stakes">
              {STAKE_WORDS[assessment.stakes.level]}
              {assessment.stakes.factors.length > 0 && (
                <ul className="mt-1 grid gap-1">
                  {assessment.stakes.factors.map((factor) => (
                    <li key={factor.code}>
                      <span className="font-mono text-xs">{factor.code}</span> — {factor.detail}
                    </li>
                  ))}
                </ul>
              )}
            </Row>

            <Row label="Reversible">
              {assessment.reversibility.reversible
                ? "yes — the runtime computed the delta that would undo it"
                : `no — ${assessment.reversibility.reasons.map((reason) => reason.code).join(", ")}`}
            </Row>
          </>
        )}

        <Row label="Judged by">
          <span className="font-mono text-xs">{disposition.policyId}</span>, and proposed by{" "}
          <span className="font-mono text-xs">
            {outcome.kind === "held"
              ? outcome.held.proposal.provenance.interpreter
              : outcome.proposal.provenance.interpreter}
          </span>{" "}
          (
          {outcome.kind === "held"
            ? outcome.held.proposal.provenance.authoredBy
            : outcome.proposal.provenance.authoredBy}
          )
        </Row>
      </dl>
    </div>
  )
}

/**
 * A time, as a reader reads one.
 *
 * The log stores an ISO instant, which is the right thing to store and the
 * wrong thing to print. Locale-free and zone-free on purpose: this renders in
 * the browser after a click, so there is no server render to disagree with.
 */
const clockTime = (iso: string): string => {
  const at = new Date(iso)

  return Number.isNaN(at.getTime())
    ? iso
    : `${String(at.getHours()).padStart(2, "0")}:${String(at.getMinutes()).padStart(2, "0")}:${String(at.getSeconds()).padStart(2, "0")}`
}

/**
 * The log, and the honest undo beside each row.
 *
 * The button is offered only where the plan says the revision can be undone,
 * and where undoing it would write over later work the row says so *before* the
 * reader presses it (0035). The Gate still decides — a contested undo comes back
 * held rather than applied — but a button that hid the cost until afterwards
 * would be teaching the opposite of what this site is for.
 */
const History = ({
  entries,
  disabled,
  onUndo,
}: {
  readonly entries: readonly DocsLogEntry[]
  readonly disabled: boolean
  readonly onUndo: (revision: number) => void
}) => {
  if (entries.length === 0) return null

  return (
    <div className="grid gap-2" data-history>
      <p className="text-ink-muted text-xs font-medium">
        The log — {entries.length} {entries.length === 1 ? "revision" : "revisions"}, newest first:
      </p>

      {/* `list-none` and no padding: the revision number is the marker, and a
          browser's own one beside it would be a second, wrong count. */}
      <ol className="border-edge divide-edge bg-surface-raised divide-y rounded-lg border list-none ps-0">
        {entries.map((entry) => {
          const { provenance } = entry.stored
          const contested = entry.undo.outcome === "revertable" && entry.undo.discards.length > 0

          return (
            <li
              key={entry.revision}
              className="flex flex-wrap items-baseline gap-x-2 gap-y-1 px-3 py-2 text-xs"
              data-revision={entry.revision}
            >
              <span className="text-ink font-mono font-semibold">#{entry.revision}</span>
              <span className="text-ink font-mono">{entry.verbs.join(", ")}</span>
              <span className="text-ink-muted">
                asked by {provenance.actor ?? "nobody named"}, planned by{" "}
                <span className="font-mono">{provenance.interpreter}</span>
              </span>
              {entry.stored.answeredBy !== undefined && (
                <span className="text-ink-muted">allowed by {entry.stored.answeredBy}</span>
              )}
              <span className="text-ink-faint font-mono">{clockTime(entry.stored.appliedAt)}</span>

              {entry.undo.outcome === "revertable" ? (
                <span className="ml-auto flex items-baseline gap-2">
                  {contested && (
                    <span className="text-ink-faint">
                      writes over #{entry.undo.discards.map((work) => work.revision).join(", #")}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => onUndo(entry.revision)}
                    disabled={disabled}
                    className="border-edge bg-surface-sunken text-ink hover:bg-surface-hover disabled:text-ink-faint rounded-md border px-2 py-1 font-medium disabled:cursor-not-allowed"
                  >
                    Undo
                  </button>
                </span>
              ) : (
                <span className="text-ink-faint ml-auto">{describeRevertPlan(entry.undo)}</span>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}

export type ProposalBoxProps = {
  readonly exampleId: string
  /** The tree as it stands. The parent owns it, because the parent renders it. */
  readonly tree: LoomTree
  /** Revision 0. The store is opened on it and the revert planner replays from it. */
  readonly seed: LoomTree
  readonly onTree: (tree: LoomTree) => void
  /** Whether anything has been applied yet, so "start over" can hide until it means something. */
  readonly changed: boolean
  readonly onReset: () => void
}

export const ProposalBox = ({
  exampleId,
  tree,
  seed,
  onTree,
  changed,
  onReset,
}: ProposalBoxProps) => {
  const [change, setChange] = useState<DocsChange | undefined>(undefined)
  const [log, setLog] = useState<readonly DocsLogEntry[]>([])
  const [step, setStep] = useState(1)
  const [pending, startTransition] = useTransition()

  /**
   * The promise, not the session.
   *
   * Opening one is asynchronous — a store `create` is — and storing the
   * resolved value would leave a window in which two clicks each see "not open
   * yet" and open two stores, of which one silently wins. Storing the promise
   * closes it: the assignment is synchronous, so the second click awaits the
   * first click's store.
   */
  const opening = useRef<Promise<DocsSession> | undefined>(undefined)
  const session = () => (opening.current ??= openDocsSession(seed))

  /**
   * Planned against the tree as it is now, every render. A chip that had
   * something to do a moment ago may not any more — the "delete the heading"
   * chip disappears once there is no heading — and a button that could only
   * fail is worse than no button.
   */
  const offered = availableDocsPresets(tree, sequentialIdFactory("offer"))

  const settle = async (open: DocsSession, next: DocsChange) => {
    setChange(next)
    setStep((current) => current + 1)
    setLog(await readDocsLog(open))
    onTree(treeAfter(tree, next))
  }

  const ask = (preset: DocsPreset) => {
    startTransition(async () => {
      const open = await session()

      await settle(open, await askDocsChange({ session: open, exampleId, tree, preset, step }))
    })
  }

  const answerHold = () => {
    if (change === undefined || heldOutcome(change) === undefined) return

    startTransition(async () => {
      const open = await session()

      await settle(open, await answerDocsHold({ session: open, exampleId, change }))
    })
  }

  const undo = (revision: number) => {
    startTransition(async () => {
      const open = await session()

      await settle(open, await undoDocsRevision({ session: open, exampleId, revision, step }))
    })
  }

  const reset = () => {
    opening.current = undefined
    setChange(undefined)
    setLog([])
    setStep(1)
    onReset()
  }

  const held = change === undefined ? undefined : heldOutcome(change)

  return (
    <div className="border-edge bg-surface-sunken grid gap-3 border-x border-b px-3 py-3 sm:px-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-ink-muted text-xs font-medium">Propose a change:</span>
        {DOCS_PRESETS.filter((preset) => offered.includes(preset.id)).map((preset) => (
          <Chip key={preset.id} preset={preset} disabled={pending} onClick={() => ask(preset)} />
        ))}
        {changed && (
          <button
            type="button"
            onClick={reset}
            className="text-ink-muted hover:text-ink ml-auto text-xs underline underline-offset-4"
          >
            start over
          </button>
        )}
      </div>

      {change !== undefined && (
        <div
          className={`grid gap-3 rounded-lg border px-3 py-3 ${TONE[toneOf(change)]}`}
          data-verdict={toneOf(change)}
        >
          <dl className="grid gap-3">
            {change.intent !== undefined && (
              <Row label="You asked">&ldquo;{change.intent.utterance}&rdquo;</Row>
            )}
            {change.assessment !== undefined && (
              <Row label="It planned">{change.assessment.proposal.rationale}</Row>
            )}
            <Delta change={change} />
          </dl>

          <Verdict change={change} />

          {held !== undefined && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={answerHold}
                disabled={pending}
                className="border-edge-strong bg-surface-raised text-ink hover:bg-surface-hover disabled:text-ink-faint rounded-md border px-3 py-1.5 text-xs font-medium disabled:cursor-not-allowed"
              >
                Apply it anyway
              </button>
              <span className="text-xs opacity-80">
                Answering re-judges the change against the page as it stands now. Saying yes is not
                a way past the Gate — a change it would now refuse stays refused.
              </span>
            </div>
          )}
        </div>
      )}

      <History entries={log} disabled={pending} onUndo={undo} />

      <p className="text-ink-faint text-xs leading-relaxed">
        Every one of these goes through the same pipeline a model&rsquo;s answer would:
        interpreted, analysed, weighed, judged, applied, appended. The log is real and it is in
        this tab &mdash; reload the page and the example is back as it was.
      </p>
    </div>
  )
}
