"use client"

import { useActionState } from "react"

import { ChangeReasoning } from "@/app/(portal)/_components/change-reasoning"
import { StateNotice } from "@/app/(portal)/_components/state-notice"
import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import { toneClasses, type WriteReport } from "@/app/(portal)/_lib/outcome"
import { scopeNodeIdOf, scopeWords } from "@/app/(portal)/_lib/selection-scope"

import { proposeChange } from "../actions"
import { useSelection } from "./selection-context"

/**
 * Where a change is asked for — and the one obvious thing to do on this screen.
 *
 * It posts a sentence and the revision it was looking at — never a delta (0017).
 * The scope is the node the user selected, not the node the DOM could address:
 * scoping narrows *interpretation*, which happens over the tree, so a text node
 * is a perfectly good subtree to point at even though nothing in the page can be
 * clicked to reach it.
 *
 * Three things here spoke the runtime's language and one of them was a wall.
 * The heading was `ask for a change` beside `scoped to n_shot2`; the button said
 * `propose`, which is the name of the object being created rather than of the
 * thing the person is doing; and the caption under it read `composed on the
 * server, gated, then written` — three verbs of the pipeline, in order, to
 * somebody who has never heard of the Gate. That last one is the most useful
 * sentence on the screen once you know what it means, so it is kept exactly, one
 * click down, under a plain account of the same three steps.
 *
 * The wall was the unconfigured state. With no API key the textarea was simply
 * disabled and its placeholder read `Set LOOM_ANTHROPIC_API_KEY to compose
 * changes.` — an instruction addressed to whoever deployed this, printed at
 * whoever opened it, in a box they cannot type in. It is a notice now, and it
 * says what still works: the rest of this screen, and answering anything already
 * waiting.
 *
 * The report a submission comes back with follows `HeldProposalCard`: the plain
 * headline and sentence on the surface, the runtime's own account of the write
 * behind a disclosure. It used to print `report.detail` — `describeWriteOutcome`,
 * with its error codes — as the body text under the headline.
 *
 * ## What phase 2 changed here, and it is the load-bearing half of it
 *
 * A reader can now pick several parts, and a scope is one subtree. So the box no
 * longer reads the selection: it reads `_lib/selection-scope.ts`, which works
 * out the smallest part holding everything picked — and **this is the screen
 * where that widening is said out loud.**
 *
 * 0019 is explicit that a selection resolving to something other than what was
 * picked is stated rather than performed silently, and the only place a
 * statement of it is worth anything is beside the button that acts on it. Two
 * cards picked at either end of a page means Loom is asked about the page; two
 * bands inside one card means it is asked about the card, and it may change the
 * rest of the card's contents on the way. Both of those are facts a person needs
 * *before* pressing `Ask Loom`, not in the report afterwards.
 *
 * The line is therefore two strings rather than one. The short one sits where
 * `Just this part: …` always sat, and the sentence saying what it costs sits
 * under the box — on the surface and not behind a disclosure, because a
 * consequence a reader has to open something to find is a consequence they meet
 * for the first time in their page's history.
 */
export const PromptBox = ({
  treeId,
  revision,
  configured,
}: {
  readonly treeId: string
  readonly revision: number
  readonly configured: boolean
}) => {
  const { scope } = useSelection()
  const words = scopeWords(scope)
  const [report, submit, pending] = useActionState<WriteReport | null, FormData>(
    proposeChange,
    null
  )

  /**
   * The part a change would be about, when there is one to name. `nothing` and
   * `spread` both come back as no scope at all, and naming a part there would be
   * naming one the reader did not pick.
   */
  const named = scope.kind === "part" || scope.kind === "around" ? scope.row : null

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg tracking-tight">Ask for a change</h2>
        <span className="text-ink-muted text-xs">
          {/*
            * `Just this part: n_shot2` told a reader which part they had
            * scoped the ask to in the one vocabulary they cannot check it
            * against — the whole point of this line is that they recognise the
            * thing before they press a button that changes it. The rail names
            * every part now, so the name leads and the id follows it, quieter,
            * in the order 6 September settled.
            */}
          {words.label}
          {named && (
            <>
              : {named.label} <span className="font-mono">{named.nodeId}</span>
            </>
          )}
        </span>
      </div>

      {/*
        * Under the heading and above the box, which is the one place a reader
        * passes through on the way to typing. `data-scope` is for the shot list
        * and for a test: the sentence is the thing being asserted, and finding
        * it by its words would break the moment somebody improves them.
        */}
      <p className="text-ink-muted text-xs" data-scope={scope.kind}>
        {words.meaning}
      </p>

      {configured ? (
        <form action={submit} className="flex flex-col gap-3">
          <input type="hidden" name="treeId" value={treeId} />
          <input type="hidden" name="baseRevision" value={revision} />
          <input type="hidden" name="scopeNodeId" value={scopeNodeIdOf(scope)} />

          <textarea
            name="utterance"
            rows={3}
            aria-label="What would you like changed?"
            placeholder="Make the heading say something else."
            className="border-edge-subtle bg-surface-base placeholder:text-ink-placeholder resize-y rounded-md border p-3 text-sm"
          />

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={pending}
              className="bg-affirm text-affirm-ink border-affirm-edge rounded-md border px-4 py-2 text-sm disabled:opacity-60"
            >
              {pending ? "Working on it…" : "Ask Loom"}
            </button>
            <span className="text-ink-muted text-xs">
              Loom writes the change, checks it against your rules, then applies it — or stops and
              asks you first.
            </span>
          </div>

          <TechnicalDetail summary="What happens when you press it">
            <p className="font-mono">composed on the server, gated, then written</p>
            <p>
              Your sentence goes to the model, which returns a set of operations over this page —
              never text for the page, and never a change it applies itself. The Gate reads those
              operations against this project&rsquo;s policy and decides whether they may be
              written, must wait for you, or are refused. Only then is anything stored.
            </p>
          </TechnicalDetail>
        </form>
      ) : (
        <StateNotice tone="notice" title="Asking for changes isn't switched on here.">
          <p>
            This deployment has no AI credentials, so there is nothing to turn a sentence into a
            change. Everything else on this screen works — you can look at the page, see who put
            each part there, and answer anything already waiting on you.
          </p>
          <TechnicalDetail summary="What to set">
            <p>
              Set <span className="font-mono">LOOM_ANTHROPIC_API_KEY</span> in this
              deployment&rsquo;s environment and restart it. Nothing else is needed; the model is
              only ever called from the server.
            </p>
          </TechnicalDetail>
        </StateNotice>
      )}

      {report && (
        <div className={`flex flex-col gap-3 rounded-md p-3 text-xs ${toneClasses(report.tone)}`}>
          <div className="flex flex-col gap-1">
            <strong className="font-medium">{report.headline}</strong>
            <p>{report.meaning}</p>
          </div>

          {/*
           * Why, between what happened and the record of it.
           *
           * The panel had two of the three layers a verdict has and the missing
           * one was the middle: a person was told *Not allowed — a rule in this
           * project's settings blocked it* and then handed the runtime's own
           * sentence, so the only account of **what was wrong** was behind the
           * disclosure in the runtime's words. Absent on the four endings that
           * never reached the Gate, which is why this is a condition rather than
           * a component that renders nothing.
           */}
          {report.reasoning && <ChangeReasoning reasoning={report.reasoning} />}

          <TechnicalDetail summary="What the runtime said">
            <p className="font-mono">{report.detail}</p>
          </TechnicalDetail>
        </div>
      )}
    </section>
  )
}
