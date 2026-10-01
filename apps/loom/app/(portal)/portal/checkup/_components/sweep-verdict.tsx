import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import type { SweepReading } from "@/app/(portal)/_lib/checkup-sweep"
import { toneClasses } from "@/app/(portal)/_lib/outcome"

/**
 * The answer over every page, then the tally it rests on, then the runtime's
 * own account of what was run.
 *
 * The same three-line shape as the single page's verdict — the answer, why that
 * is the answer, and what to do now — because they are the same question asked
 * over a different subject, and a reviewer who has read one should not have to
 * learn a second layout to read the other.
 *
 * Color is a second channel and never the only one: the verdict says in words
 * which of the five results this is, so a reader who cannot tell the palette
 * apart reads the same answer.
 *
 * The tally is on the surface rather than behind the disclosure, and that is a
 * deliberate exception to "the record is one click down". It is not the record;
 * it is the headline's own evidence. *"2 of your 9 pages don't add up"* is a
 * claim a reader can only check against a count of nine, and a claim whose
 * evidence is hidden is an assertion.
 */
export const SweepVerdict = ({ reading }: { readonly reading: SweepReading }) => (
  <section className="flex flex-col gap-3">
    <div className={"flex flex-col gap-1 rounded-md px-4 py-3 " + toneClasses(reading.tone)}>
      <span className="text-base">{reading.label}</span>
      <span className="text-xs opacity-90">{reading.meaning}</span>
      <span className="mt-1 text-xs opacity-80">{reading.next}</span>
    </div>

    <dl className="text-ink-secondary flex flex-wrap gap-x-6 gap-y-1 text-xs">
      <div className="flex gap-1.5">
        <dt className="text-ink-muted">Pages found</dt>
        <dd>{reading.total}</dd>
      </div>
      <div className="flex gap-1.5">
        <dt className="text-ink-muted">Checked just now</dt>
        <dd>{reading.checked}</dd>
      </div>
      <div className="flex gap-1.5">
        <dt className="text-ink-muted">Add up</dt>
        <dd>{reading.addUp}</dd>
      </div>
      {/*
       * The three that are not a pass are drawn whenever they are non-zero and
       * never folded into one "other" figure. A reader counting the row above
       * against the row below has to be able to see where every page went — and
       * the three of them fail for reasons a person would act on differently.
       */}
      {reading.problems === 0 ? null : (
        <div className="flex gap-1.5">
          <dt className="text-ink-muted">Don&rsquo;t add up</dt>
          <dd>{reading.problems}</dd>
        </div>
      )}
      {reading.unanswered === 0 ? null : (
        <div className="flex gap-1.5">
          <dt className="text-ink-muted">Reached no answer</dt>
          <dd>{reading.unanswered}</dd>
        </div>
      )}
      {reading.skipped === 0 ? null : (
        <div className="flex gap-1.5">
          <dt className="text-ink-muted">Nothing to check against</dt>
          <dd>{reading.skipped}</dd>
        </div>
      )}
    </dl>

    <TechnicalDetail summary="What was actually run">
      <p className="text-ink-muted">
        One <span className="font-mono">auditSnapshot</span> per page, each folding that
        tree&rsquo;s log forward from the seed this deployment holds for it and comparing the
        result with the stored snapshot (0016). {reading.changesReplayed} accepted{" "}
        {reading.changesReplayed === 1 ? "delta was" : "deltas were"} replayed across{" "}
        {reading.checked} {reading.checked === 1 ? "tree" : "trees"}.
      </p>
      <p className="text-ink-muted">
        A tree with no registered seed is reported rather than folded from its own snapshot: a
        fold that started from the answer being checked would agree with itself every time, which
        is a green tick that means nothing (0028).
      </p>
    </TechnicalDetail>
  </section>
)
