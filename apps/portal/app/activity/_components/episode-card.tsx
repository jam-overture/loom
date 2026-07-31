import Link from "next/link"

import type { IntentEpisode } from "@loom/runtime/telemetry"

import { describeIntent, viewOf } from "@/lib/episode-view"
import { toneClasses } from "@/lib/outcome"

import { ProposalLine } from "./proposal-line"

/**
 * One ask, and everything that happened because of it.
 *
 * The resolution leads, because "what became of it" is the question §6 exists to
 * answer. An episode with no proposals says so rather than rendering an empty
 * list: an ask the model never turned into a change is a real outcome, and the
 * commonest one worth noticing.
 */
export const EpisodeCard = ({ episode }: { readonly episode: IntentEpisode }) => {
  const view = viewOf(episode.resolution)

  return (
    <li className="border-edge-subtle bg-surface-base flex flex-col gap-3 rounded-md border p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className={`rounded-sm px-2 py-1 text-2xs ${toneClasses(view.tone)}`}>
          <strong className="font-medium">{view.headline}</strong>
          {view.detail && <> — {view.detail}</>}
        </span>

        <Link href={`/trees/${episode.treeId}`} className="font-mono text-2xs">
          {episode.treeId}
        </Link>
      </div>

      <p className="text-ink-muted font-mono text-2xs">{describeIntent(episode)}</p>

      {episode.proposals.length === 0 ? (
        <p className="text-ink-muted text-xs">No change was proposed for this ask.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {episode.proposals.map((proposal) => (
            <ProposalLine key={proposal.proposalId} proposal={proposal} />
          ))}
        </ul>
      )}

      <time className="text-ink-muted font-mono text-2xs" dateTime={episode.startedAt}>
        {episode.startedAt}
      </time>
    </li>
  )
}
