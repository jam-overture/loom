"use client"

import {
  describeInterpretationError,
  describeTreeError,
  sequentialIdFactory,
  type LoomTree,
  type StakeLevel,
} from "@loom/runtime"
import { useState, useTransition, type ReactNode } from "react"

import {
  availableDocsPresets,
  DOCS_PRESETS,
  type DocsPreset,
} from "@/app/(docs)/_lib/propose/presets"
import {
  confirmDocsChange,
  heldProposal,
  proposeDocsChange,
  treeAfter,
  type DocsProposal,
} from "@/app/(docs)/_lib/propose/run"

/**
 * The box beside every example, where a reader asks for a change and watches
 * what the runtime does with it.
 *
 * Everything here runs in the reader's browser. The pipeline is a pure function
 * of the tree and the intent, and the interpreter is deterministic (0057), so
 * there is nothing to post to and nothing to wait for — which is also why this
 * works on a preview deployment, in a clone with no API key, and offline.
 *
 * Three things are shown rather than summarised, in the order a reader needs
 * them: **what was asked**, **what the runtime made of it**, and **what the
 * Gate said**. A box that showed only the third would be asking the reader to
 * take the interesting half on trust, and the interesting half is the reason
 * this framework exists.
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
  accepted: "Applied",
  held: "Held for you to decide",
  refused: "Refused",
}

const toneOf = (proposal: DocsProposal): VerdictTone => {
  switch (proposal.outcome.kind) {
    case "applied":
      return "accepted"
    case "awaiting-confirmation":
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
const Delta = ({ proposal }: { readonly proposal: DocsProposal }) => {
  const assessed =
    proposal.outcome.kind === "not-interpreted" || proposal.outcome.kind === "not-applicable"
      ? undefined
      : proposal.outcome.assessment

  if (assessed === undefined) return null

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
        {JSON.stringify(assessed.proposal.delta.operations, null, 2)}
      </pre>
    </Row>
  )
}

const Verdict = ({ proposal }: { readonly proposal: DocsProposal }) => {
  const { outcome } = proposal
  const tone = toneOf(proposal)

  if (outcome.kind === "not-interpreted") {
    return (
      <p className="text-sm">
        The interpreter declined: {describeInterpretationError(outcome.error)}
      </p>
    )
  }

  if (outcome.kind === "not-applicable") {
    return (
      <p className="text-sm">
        The proposal no longer fits this tree: {describeTreeError(outcome.error)}
      </p>
    )
  }

  const { assessment, disposition } = outcome
  const { stakes, reversibility } = assessment

  return (
    <div className="grid gap-3">
      <p className="text-sm font-semibold">{HEADLINE[tone]}</p>

      <dl className="grid gap-3">
        <Row label="Because">
          <span className="font-mono text-xs">{disposition.reason.code}</span> —{" "}
          {disposition.reason.detail}
        </Row>

        <Row label="Stakes">
          {STAKE_WORDS[stakes.level]}
          {stakes.factors.length > 0 && (
            <ul className="mt-1 grid gap-1">
              {stakes.factors.map((factor) => (
                <li key={factor.code}>
                  <span className="font-mono text-xs">{factor.code}</span> — {factor.detail}
                </li>
              ))}
            </ul>
          )}
        </Row>

        <Row label="Reversible">
          {reversibility.reversible
            ? "yes — the runtime computed the delta that would undo it"
            : `no — ${reversibility.reasons.map((reason) => reason.code).join(", ")}`}
        </Row>

        <Row label="Judged by">
          <span className="font-mono text-xs">{disposition.policyId}</span>, and proposed by{" "}
          <span className="font-mono text-xs">
            {assessment.proposal.provenance.interpreter}
          </span>{" "}
          ({assessment.proposal.provenance.authoredBy})
        </Row>
      </dl>
    </div>
  )
}

export type ProposalBoxProps = {
  readonly exampleId: string
  /** The tree as it stands. The parent owns it, because the parent renders it. */
  readonly tree: LoomTree
  readonly onTree: (tree: LoomTree) => void
  /** Whether anything has been applied yet, so "start over" can hide until it means something. */
  readonly changed: boolean
  readonly onReset: () => void
}

export const ProposalBox = ({ exampleId, tree, onTree, changed, onReset }: ProposalBoxProps) => {
  const [proposal, setProposal] = useState<DocsProposal | undefined>(undefined)
  const [step, setStep] = useState(1)
  const [pending, startTransition] = useTransition()

  /**
   * Planned against the tree as it is now, every render. A chip that had
   * something to do a moment ago may not any more — the "delete the heading"
   * chip disappears once there is no heading — and a button that could only
   * fail is worse than no button.
   */
  const offered = availableDocsPresets(tree, sequentialIdFactory("offer"))

  const ask = (preset: DocsPreset) => {
    startTransition(async () => {
      const next = await proposeDocsChange({ exampleId, tree, preset, step })

      setProposal(next)
      setStep((current) => current + 1)
      onTree(treeAfter(tree, next))
    })
  }

  const answerHold = () => {
    if (proposal === undefined) return

    const held = heldProposal(proposal)
    if (held === undefined) return

    const next = confirmDocsChange({ exampleId, tree, proposal, held })

    setProposal(next)
    onTree(treeAfter(tree, next))
  }

  const reset = () => {
    setProposal(undefined)
    setStep(1)
    onReset()
  }

  const held = proposal === undefined ? undefined : heldProposal(proposal)

  return (
    <div className="border-edge bg-surface-sunken grid gap-3 border-x border-b px-3 py-3 sm:px-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-ink-muted text-xs font-medium">Propose a change:</span>
        {DOCS_PRESETS.filter((preset) => offered.includes(preset.id)).map((preset) => (
          <Chip
            key={preset.id}
            preset={preset}
            disabled={pending}
            onClick={() => ask(preset)}
          />
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

      {proposal !== undefined && (
        <div
          className={`grid gap-3 rounded-lg border px-3 py-3 ${TONE[toneOf(proposal)]}`}
          data-verdict={toneOf(proposal)}
        >
          <dl className="grid gap-3">
            <Row label="You asked">“{proposal.intent.utterance}”</Row>
            <Row label="It planned">{proposal.preset.rationale}</Row>
            <Delta proposal={proposal} />
          </dl>

          <Verdict proposal={proposal} />

          {held !== undefined && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={answerHold}
                className="border-edge-strong bg-surface-raised text-ink hover:bg-surface-hover rounded-md border px-3 py-1.5 text-xs font-medium"
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

      <p className="text-ink-faint text-xs leading-relaxed">
        Every one of these goes through the same pipeline a model&rsquo;s answer would:
        interpreted, analysed, weighed, judged, applied. Nothing is stored — reload the page and
        the example is back as it was.
      </p>
    </div>
  )
}
