import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import { asPercent } from "@/app/(portal)/_lib/rules-view"
import { factorClause, ruleSentence, STAKES, toneClasses } from "@/app/(portal)/_lib/vocabulary"
import { WOULD_HAPPEN, askedFor, whatHappened } from "@/app/(portal)/_lib/what-if-view"
import type { Movement, Moved } from "@/app/(portal)/_lib/what-if"

/**
 * Every change that would end up in one place, under one heading.
 *
 * ## Grouped by where they land, not by what moved them
 *
 * The obvious arrangement is a row per change with a before and an after
 * column, and it is wrong for the question being asked. A reader turning a dial
 * wants to know *what they are buying*: fewer interruptions, more of them, or
 * fewer changes happening at all. Those are three different answers and a
 * person usually wants exactly one of them, so each is a heading with a count
 * and the changes underneath it.
 *
 * ## Each row carries both worlds
 *
 * A row that only said what would happen would be unverifiable — a reader has
 * no way to tell it from a screen inventing changes. So every row says what was
 * really asked for, what really became of it, and what would become of it
 * instead. The middle one is the anchor: it is the same fact, in the same
 * words, as the rest of this portal already shows about that change.
 *
 * The reason is the rule in the world the reader is asking about rather than
 * the one that fired for real. That is the thing being decided — *which rule
 * would be in charge of this change* — and it reads correctly for a change that
 * nothing objects to any more, because `within-policy` has a sentence of its
 * own saying nothing was involved.
 */
export const MovedGroup = ({
  movement,
  moved,
}: {
  readonly movement: Exclude<Movement, "unchanged">
  readonly moved: readonly Moved[]
}) => {
  if (moved.length === 0) return null

  const words = WOULD_HAPPEN[movement]

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-md tracking-tight">{words.label}</h2>
        <span className={"shrink-0 rounded-sm px-2 py-1 text-2xs " + toneClasses(words.tone)}>
          {moved.length}
        </span>
      </div>

      <p className="text-ink-secondary text-sm">{words.meaning}</p>

      <ul className="flex flex-col gap-3">
        {moved.map(({ change, would }) => (
          <li
            key={change.proposalId}
            className="border-edge-subtle bg-surface-base flex flex-col gap-1 rounded-md border p-4"
          >
            <p className="text-sm">&ldquo;{askedFor(change)}&rdquo;</p>
            <p className="text-ink-secondary text-xs">{whatHappened(change)}</p>
            <p className="text-ink-secondary text-xs">{ruleSentence(would.code)}</p>

            <TechnicalDetail summary="What this was judged on, and what the record calls it">
              <dl className="flex flex-wrap gap-x-5 gap-y-1">
                <div className="flex gap-1">
                  <dt className="text-ink-muted font-mono">proposalId</dt>
                  <dd className="font-mono break-all">{change.proposalId}</dd>
                </div>
                <div className="flex gap-1">
                  <dt className="text-ink-muted font-mono">origin</dt>
                  <dd className="font-mono">{change.origin}</dd>
                </div>
                <div className="flex gap-1">
                  <dt className="text-ink-muted font-mono">confidence</dt>
                  <dd className="font-mono">{change.confidence}</dd>
                </div>
                <div className="flex gap-1">
                  <dt className="text-ink-muted font-mono">stakes</dt>
                  <dd className="font-mono">{change.stakes}</dd>
                </div>
                <div className="flex gap-1">
                  <dt className="text-ink-muted font-mono">reversible</dt>
                  <dd className="font-mono">{String(change.reversible)}</dd>
                </div>
                <div className="flex gap-1">
                  <dt className="text-ink-muted font-mono">was</dt>
                  <dd className="font-mono">
                    {change.recorded.kind} / {change.recorded.code}
                  </dd>
                </div>
                <div className="flex gap-1">
                  <dt className="text-ink-muted font-mono">would be</dt>
                  <dd className="font-mono">
                    {would.kind} / {would.code}
                  </dd>
                </div>
              </dl>

              <p className="text-ink-secondary">
                Weighed at {STAKES[change.stakes].label.toLowerCase()}, with the AI{" "}
                {asPercent(change.confidence)} sure of itself.{" "}
                {change.factors.length === 0
                  ? "Nothing this project watches for was weighed against it."
                  : `What was weighed against it: ${change.factors
                      .map((code) => factorClause(code))
                      .join("; ")}.`}
              </p>

              <p className="text-ink-secondary">
                The stakes above are the ones the runtime measured at the time, replayed as
                recorded. Only the thresholds this screen offers are re-applied to them.
              </p>
            </TechnicalDetail>
          </li>
        ))}
      </ul>
    </section>
  )
}
