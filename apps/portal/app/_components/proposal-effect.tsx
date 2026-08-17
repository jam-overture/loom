import type { OperationEffect, ProposalEffect, ValueChange } from "@/lib/proposal-effect"

/**
 * What a proposal would replace, on screen.
 *
 * 0019 makes the proposal the primary object and says the portal's job is to
 * make a change reviewable. A verb list — "reconfigure, add" — is not that: it
 * describes the delta's shape and says nothing about the page the reviewer is
 * looking at. This is the other half, and it is the half only the portal can
 * assemble, because it is the only place where the held proposal and the
 * current tree are both in hand.
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

const ValueRow = ({ change }: { readonly change: ValueChange }) => (
  <div className="grid grid-cols-[auto_1fr] items-baseline gap-x-2 gap-y-0.5 sm:grid-cols-[8rem_1fr]">
    <dt className="text-ink-muted truncate font-mono">{change.key}</dt>
    <dd className="flex min-w-0 flex-wrap items-baseline gap-1.5 font-mono break-words">
      {change.before === null ? <Absent what="not set" /> : <span className="text-ink-secondary line-through decoration-1">{change.before}</span>}
      <span aria-label="becomes" className="text-ink-placeholder">→</span>
      {change.after === null ? <Absent what="cleared" /> : <span className="text-ink">{change.after}</span>}
      {change.inert && <span className="text-ink-placeholder font-sans italic">already this</span>}
    </dd>
  </div>
)

const OperationRow = ({ effect }: { readonly effect: OperationEffect }) => (
  <li className="border-edge-subtle flex flex-col gap-1 border-l-2 pl-2.5">
    <p className="flex flex-wrap items-baseline gap-1.5">
      <span className="bg-surface-hover text-ink-secondary rounded-sm px-1 py-0.5 font-mono">
        {effect.verb}
      </span>
      <span className="font-mono">{effect.subject}</span>
      {effect.missing && (
        <span className="bg-inapplicable text-inapplicable-ink rounded-sm px-1 py-0.5">
          not in this tree
        </span>
      )}
      {effect.inert && !effect.missing && (
        <span className="bg-surface-hover text-ink-muted rounded-sm px-1 py-0.5">changes nothing</span>
      )}
    </p>

    {/*
      * The place, in the labels a reader recognises rather than the ids the
      * delta names. An id addresses a node; it does not tell anyone where the
      * node is, and "before loom.card" is a position a person can picture.
      */}
    {effect.place.length > 0 && (
      <p className="text-ink-muted font-mono">{effect.place.join(" › ")}</p>
    )}

    <p className="text-ink-secondary">{effect.detail}</p>

    {effect.changes.length > 0 && <dl className="flex flex-col gap-0.5">{effect.changes.map((change) => <ValueRow key={change.key} change={change} />)}</dl>}

    {effect.text.length > 0 && (
      <p className="text-ink-muted">
        its words: {effect.text.map((line) => `“${line}”`).join(" · ")}
      </p>
    )}
  </li>
)

export const ProposalEffectView = ({ effect }: { readonly effect: ProposalEffect }) => (
  <section className="text-2xs flex flex-col gap-2">
    <h4 className="text-ink-muted text-2xs tracking-wide uppercase">what it would replace</h4>

    {/*
      * The obstacle goes above the operations, not below them. A proposal that
      * would be refused on arrival is not a change to weigh — reading the
      * operations first and the refusal afterwards spends the reviewer's
      * attention in the wrong order.
      */}
    {!effect.applies && (
      <p role="status" className="bg-inapplicable text-inapplicable-ink rounded-sm p-2">
        <strong className="font-medium">This would not apply.</strong>{" "}
        {/*
          * One sentence, not two. `applyDelta` checks the revision before it
          * looks at an operation, so a stale proposal's obstacle *is* the
          * revision mismatch — printing both would say the same thing twice,
          * once in the runtime's words and once in the portal's. Anything else
          * that would refuse it is named on the operation it belongs to.
          */}
        {effect.stale
          ? `The tree has moved on: judged against revision ${effect.baseRevision}, now at ${effect.treeRevision}.`
          : effect.obstacle}
      </p>
    )}

    <ol className="flex flex-col gap-2">
      {effect.operations.map((operation, position) => (
        <OperationRow key={`${operation.verb}-${operation.subject}-${position}`} effect={operation} />
      ))}
    </ol>

    {/*
      * Worth saying once, at the end: a proposal made of operations that write
      * what is already there looks like a change and is not one, and no other
      * field on the card would give that away.
      */}
    {effect.inertCount > 0 && effect.applies && (
      <p className="text-ink-muted">
        {effect.inertCount === effect.operations.length
          ? "Every operation writes what is already there — applying this leaves the page as it is."
          : `${effect.inertCount} of ${effect.operations.length} operations write what is already there.`}
      </p>
    )}
  </section>
)
