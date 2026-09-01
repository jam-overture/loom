import { plainEffect, type PlainOperation } from "@/app/(portal)/_lib/effect-view"
import type { ProposalEffect, ValueChange } from "@/app/(portal)/_lib/proposal-effect"

import { TechnicalDetail } from "./technical-detail"

/**
 * What a proposal would do to the page, on screen.
 *
 * 0019 makes the proposal the primary object and says the portal's job is to
 * make a change reviewable. A verb list — "reconfigure, add" — is not that: it
 * describes the delta's shape and says nothing about the page the reviewer is
 * looking at. This is the other half, and it is the half only the portal can
 * assemble, because it is the only place where the held proposal and the
 * current tree are both in hand.
 *
 * It was still the delta's own account of itself. `reconfigure` in a monospace
 * chip, `2 values, 1 already set this way`, `within loom.band, position 0 → 2`,
 * `not in this tree`, `its words:`, and — on the line that decides whether a
 * reviewer presses a button — `The tree has moved on: judged against revision 4,
 * now at 6`. Every one of those is a sentence the runtime would say to itself,
 * printed at a person who is being asked to approve something.
 *
 * So the reader's sentence leads and the delta's account is one click down,
 * whole. `effect-view` composes the sentences; nothing here decides what
 * anything is called. Everything that was on this surface before is still
 * rendered — the verbs, the composed detail, the path, the obstacle, both
 * revision numbers — under "What the change record says".
 *
 * Presentational and serialisable-in: the effect is computed on the server by
 * `describeProposalEffect` and arrives here as plain data, so this renders in a
 * Client Component boundary without dragging the store across it.
 */

/**
 * Absence has to look different from a value, or `""` and "not set" read the
 * same. The em dash is the only thing on this surface that means "there is
 * nothing here", and it is deliberately not in the mono column's voice.
 */
const Absent = ({ what }: { readonly what: string }) => (
  <span className="text-ink-placeholder font-sans italic">{what}</span>
)

/**
 * Before and after, per setting — the one part of the old rendering that was
 * already a reader's and stays exactly as it was. `"Old" → "New"` with the old
 * value struck through is not the delta's vocabulary; it is what a person means
 * by a change, and there is no plainer way to say it than to show both.
 */
const ValueRow = ({ change }: { readonly change: ValueChange }) => (
  <div className="grid grid-cols-[auto_1fr] items-baseline gap-x-2 gap-y-0.5 sm:grid-cols-[8rem_1fr]">
    <dt className="text-ink-muted truncate font-mono">{change.key}</dt>
    <dd className="flex min-w-0 flex-wrap items-baseline gap-1.5 font-mono break-words">
      {change.before === null ? <Absent what="nothing set" /> : <span className="text-ink-secondary line-through decoration-1">{change.before}</span>}
      <span aria-label="becomes" className="text-ink-placeholder">→</span>
      {change.after === null ? <Absent what="taken away" /> : <span className="text-ink">{change.after}</span>}
      {change.inert && <span className="text-ink-placeholder font-sans italic">already this</span>}
    </dd>
  </div>
)

const OperationRow = ({ operation }: { readonly operation: PlainOperation }) => (
  <li className="border-edge-subtle flex flex-col gap-1 border-l-2 pl-2.5">
    <p className="flex flex-wrap items-baseline gap-x-1.5">
      {/*
        * One sentence, held as three pieces because the part's name in the
        * middle of it is monospace and the sentence around it is not. `PlainLine`
        * is why the spaces and the full stop belong to the sentence rather than
        * to whichever span happens to sit next to them.
        */}
      <span>
        {operation.reading.before}
        <span className="font-mono">{operation.reading.subject}</span>
        {operation.reading.after}
      </span>

      {operation.standing !== null && (
        <span
          className={`rounded-sm px-1 py-0.5 ${
            operation.standing.technical === "missing"
              ? "bg-inapplicable text-inapplicable-ink"
              : "bg-surface-hover text-ink-muted"
          }`}
        >
          {operation.standing.label}
        </span>
      )}
    </p>

    {/*
      * The badge's sentence, on the surface rather than in a `title`. Both of
      * these say something a reviewer would act on — one that a step cannot
      * happen, one that a step would achieve nothing — and a tooltip is not
      * something a phone has.
      */}
    {operation.standing !== null && (
      <p className="text-ink-secondary">{operation.standing.meaning}</p>
    )}

    {/*
      * Where it sits, in the labels a reader recognises rather than the ids the
      * delta names. An id addresses a part; it does not tell anyone where the
      * part is, and "inside loom.page › loom.band" is a position a person can
      * picture. The lead-in is there because a bare breadcrumb is a path and a
      * reader has to be told what it is a path to.
      */}
    {operation.place.length > 0 && (
      <p className="text-ink-muted">
        Inside <span className="font-mono">{operation.place.join(" › ")}</span>
      </p>
    )}

    {operation.changes.length > 0 && (
      <dl className="flex flex-col gap-0.5">
        {operation.changes.map((change) => (
          <ValueRow key={change.key} change={change} />
        ))}
      </dl>
    )}

    {operation.words !== null && <p className="text-ink-muted">{operation.words}</p>}
  </li>
)

export const ProposalEffectView = ({ effect }: { readonly effect: ProposalEffect }) => {
  const plain = plainEffect(effect)

  return (
    <section className="text-2xs flex flex-col gap-2">
      {/*
        * A heading, not a label. `what this would change` named the section in
        * the third person about a thing; this asks the reader's own question
        * back at them, which is what every other heading in the portal now does.
        */}
      <h4 className="text-ink-secondary text-xs">What this would do to your page</h4>

      {/*
        * The obstacle goes above the operations, not below them. A proposal that
        * would be refused on arrival is not a change to weigh — reading the
        * operations first and the refusal afterwards spends the reviewer's
        * attention in the wrong order.
        */}
      {plain.obstacle !== null && (
        <div role="status" className="bg-inapplicable text-inapplicable-ink flex flex-col gap-1 rounded-sm p-2">
          <strong className="font-medium">{plain.obstacle.label}</strong>
          <p>{plain.obstacle.meaning}</p>
        </div>
      )}

      <ol className="flex flex-col gap-2">
        {plain.operations.map((operation, position) => (
          <OperationRow
            key={`${operation.reading.subject}-${position}`}
            operation={operation}
          />
        ))}
      </ol>

      {/*
        * Worth saying once, at the end: a proposal made of operations that write
        * what is already there looks like a change and is not one, and no other
        * field on the card would give that away.
        */}
      {plain.note !== null && <p className="text-ink-muted">{plain.note}</p>}

      {/*
        * Everything this section used to lead with, in the delta's own words and
        * with nothing dropped: the runtime verb, the composed detail, the path,
        * the reason it would not apply, and both revision numbers — which are
        * printed whether or not they are the reason, because "judged against 6,
        * page is at 6" is the sentence that says a proposal is current.
        */}
      <TechnicalDetail summary="What the change record says">
        <ol className="flex flex-col gap-1">
          {plain.operations.map((operation, position) => (
            <li key={`record-${operation.reading.subject}-${position}`} className="flex flex-col">
              <span className="font-mono">{operation.technical}</span>
              {operation.place.length > 0 && (
                <span className="text-ink-muted font-mono">{operation.place.join(" › ")}</span>
              )}
            </li>
          ))}
        </ol>

        {plain.obstacle !== null && <p className="font-mono">{plain.obstacle.technical}</p>}

        <p className="text-ink-muted font-mono">{plain.revisions}</p>
      </TechnicalDetail>
    </section>
  )
}
