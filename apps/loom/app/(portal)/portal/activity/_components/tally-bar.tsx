import { EPISODE_RESOLUTION_KINDS, type EpisodeTally } from "@loom/runtime/telemetry"

import { headlineOfResolution, toneOfResolution } from "@/app/(portal)/_lib/episode-view"
import { toneClasses } from "@/app/(portal)/_lib/outcome"

/**
 * What this page of episodes adds up to.
 *
 * Every resolution is shown, including the ones at zero. "Refused: 0" and no
 * refused count at all are different claims, and only a view that always renders
 * both makes "the Gate refused nothing here" readable as a fact rather than as
 * something that might have been left out.
 */
export const TallyBar = ({ tally }: { readonly tally: EpisodeTally }) => (
  <section className="flex flex-col gap-3">
    <dl className="flex flex-wrap gap-x-5 gap-y-1 text-2xs">
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

    <ul className="flex flex-wrap gap-2">
      {EPISODE_RESOLUTION_KINDS.map((kind) => {
        const count = tally.byResolution[kind]

        return (
          <li
            key={kind}
            className={
              "rounded-sm px-2 py-1 text-2xs " +
              (count === 0
                ? "bg-neutral text-neutral-ink opacity-60"
                : toneClasses(toneOfResolution(kind)))
            }
          >
            <span className="font-mono">{count}</span> {headlineOfResolution(kind)}
          </li>
        )
      })}
    </ul>
  </section>
)
