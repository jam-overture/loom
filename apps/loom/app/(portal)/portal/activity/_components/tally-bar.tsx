import { EPISODE_RESOLUTION_KINDS, type EpisodeTally } from "@jam-overture/loom/telemetry"

import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import { askOutcome, tallySummary } from "@/app/(portal)/_lib/episode-view"
import { toneClasses } from "@/app/(portal)/_lib/vocabulary"

/**
 * What this page of episodes adds up to.
 *
 * The sentence leads. It is the only line on this screen that answers "is any of
 * this mine to deal with", and it used to be something a reader had to work out
 * for themselves from a count labelled `held`.
 *
 * Every resolution is still shown, including the ones at zero. "Not allowed: 0"
 * and no refused count at all are different claims, and only a view that always
 * renders both makes "nothing was blocked here" readable as a fact rather than
 * as something that might have been left out.
 *
 * The four raw counts moved under the disclosure rather than out of the page.
 * `held` and `repairs` in particular are the numbers somebody comparing this
 * screen against the journal needs, and they are still spelled exactly as the
 * fold spells them.
 */
export const TallyBar = ({ tally }: { readonly tally: EpisodeTally }) => (
  <section className="flex flex-col gap-3">
    <p className="text-sm">{tallySummary(tally)}</p>

    <ul className="flex flex-wrap gap-2">
      {EPISODE_RESOLUTION_KINDS.map((kind) => {
        const count = tally.byResolution[kind]
        const outcome = askOutcome(kind)

        return (
          <li
            key={kind}
            title={outcome.meaning}
            className={
              "rounded-sm px-2 py-1 text-2xs " +
              (count === 0
                ? "bg-neutral text-neutral-ink opacity-60"
                : toneClasses(outcome.tone))
            }
          >
            <span className="font-mono">{count}</span> {outcome.label}
          </li>
        )
      })}
    </ul>

    <TechnicalDetail summary="The counts as the journal keeps them">
      <dl className="flex flex-wrap gap-x-5 gap-y-1">
        <div className="flex gap-1">
          <dt className="text-ink-muted">asks</dt>
          <dd className="font-mono">{tally.episodes}</dd>
        </div>
        <div className="flex gap-1">
          <dt className="text-ink-muted">proposals</dt>
          <dd className="font-mono">{tally.proposals}</dd>
        </div>
        <div className="flex gap-1">
          <dt className="text-ink-muted">held</dt>
          <dd className="font-mono">{tally.held}</dd>
        </div>
        <div className="flex gap-1">
          <dt className="text-ink-muted">repairs</dt>
          <dd className="font-mono">{tally.repairs}</dd>
        </div>
      </dl>

      <p className="text-ink-secondary">
        <span className="font-mono">held</span> counts the changes the Gate would not apply on its
        own, and <span className="font-mono">repairs</span> counts second attempts written after a
        refusal. A change can be counted in both.
      </p>
    </TechnicalDetail>
  </section>
)
