import {
  alternativeTally,
  unsettledAlternatives,
  type ConsideredAlternative,
} from "@/app/(docs)/_lib/architecture/alternatives"
import { ARCHITECTURE_COSTS, type ArchitectureCost } from "@/app/(docs)/_lib/architecture/costs"

/**
 * Eight costs, each with the roads the ruling did not take.
 *
 * The plain sentence and the *what you do instead* are written; everything
 * under **Turned down with it** is read out of the record as the site builds.
 * That split is what stops this page becoming a third copy of an argument: the
 * alternatives are named and never explained here, so the reasoning has exactly
 * one home and a reader who wants it is one link from the day it was decided.
 *
 * A record's number is not shown, for the reason the rest of this section
 * withholds it — four digits are a footnote to a document the reader has not
 * opened, and the ruling's title is a thing they can decide about.
 */

const Cost = ({ cost }: { readonly cost: ArchitectureCost }) => (
  <section
    aria-labelledby={cost.id}
    className="border-edge border-t pt-6 first:border-t-0 first:pt-0"
  >
    <h3 id={cost.id} className="text-ink text-lg font-semibold tracking-tight">
      {cost.title}
    </h3>

    <p className="text-ink-muted mt-2 leading-relaxed">{cost.plain}</p>

    <p className="text-ink-muted mt-3 leading-relaxed">
      <strong className="text-ink font-semibold">What you do instead.</strong> {cost.instead}
      {cost.shownAt !== undefined && (
        <>
          {" "}
          <a
            href={cost.shownAt.href}
            className="text-accent-strong font-medium underline underline-offset-2"
          >
            {cost.shownAt.title}
          </a>{" "}
          shows it happening.
        </>
      )}
    </p>

    <div className="border-edge bg-surface-sunken mt-4 rounded-lg border px-4 py-3">
      <p className="text-ink-faint text-xs font-semibold tracking-wide uppercase">The ruling</p>
      <p className="mt-1 text-sm">
        <a
          href={cost.record.href}
          className="text-accent-strong font-medium underline underline-offset-2"
        >
          {cost.record.title}
        </a>
        {cost.record.standing === "in force" ? null : (
          <span className="text-ink-faint"> — {cost.record.standing}</span>
        )}
      </p>

      <p className="text-ink-faint mt-3 text-xs font-semibold tracking-wide uppercase">
        Turned down with it
      </p>
      <ul className="text-ink-muted mt-1 space-y-1 text-sm">
        {cost.turnedDown.map((alternative) => (
          <li key={alternative.lead} className="flex gap-2">
            <span aria-hidden="true" className="text-ink-faint select-none">
              —
            </span>
            <span>
              {alternative.lead}
              {alternative.settled ? null : (
                <span className="text-ink-faint italic"> (not closed)</span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  </section>
)

export const ArchitectureCosts = () => (
  <div className="not-prose my-8 flex flex-col gap-6">
    {ARCHITECTURE_COSTS.map((cost) => (
      <Cost key={cost.id} cost={cost} />
    ))}
  </div>
)

const StillOpen = ({ alternative }: { readonly alternative: ConsideredAlternative }) => (
  <li className="border-edge border-t py-3 first:border-t-0">
    <p className="text-ink text-sm font-medium">{alternative.lead}</p>
    {alternative.note !== undefined && (
      <p className="text-ink-muted mt-1 text-sm leading-relaxed italic">“{alternative.note}”</p>
    )}
    <p className="mt-1 text-sm">
      <a
        href={alternative.href}
        className="text-accent-strong font-medium underline underline-offset-2"
      >
        {alternative.recordTitle}
      </a>
    </p>
  </li>
)

/**
 * The constraints that might lift, and the count they were drawn from.
 *
 * Everything above is settled and will read the same next year. These are the
 * ones a record itself declines to close — *deferred*, *for now*, *worth
 * revisiting* — and they are the honest answer to "is this the shape it will
 * keep". Each carries the record's own sentence, so nobody has to take the
 * reading on trust: the classification is a rule about words, and the evidence
 * for it is printed beside the row.
 */
export const AlternativesLeftOpen = () => {
  const tally = alternativeTally()
  const open = unsettledAlternatives()

  return (
    <div className="not-prose my-8">
      <p className="text-ink-muted text-sm">
        <strong className="text-ink font-semibold">
          {tally.alternatives} alternatives, across {tally.records} rulings.
        </strong>{" "}
        Every one of them is an approach somebody could reasonably have taken, written down on the
        day it was turned down. {tally.unsettled} of them are not closed:
      </p>

      <ul className="border-edge mt-4 rounded-lg border px-4 py-1">
        {open.map((alternative) => (
          <StillOpen key={`${alternative.recordId}-${alternative.lead}`} alternative={alternative} />
        ))}
      </ul>
    </div>
  )
}
