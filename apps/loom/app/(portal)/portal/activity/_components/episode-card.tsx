import Link from "next/link"

import type { IntentEpisode } from "@loom/runtime/telemetry"

import { RevisionLink } from "@/app/(portal)/_components/revision-link"
import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import { describeAsk, failureWords, viewOf } from "@/app/(portal)/_lib/episode-view"
import { toneClasses } from "@/app/(portal)/_lib/vocabulary"
import { plainMoment } from "@/app/(portal)/_lib/when"

import { ProposalLine } from "./proposal-line"

/**
 * One ask, and everything that happened because of it.
 *
 * The outcome leads, because "what became of it" is the question §6 exists to
 * answer — and it now leads as a word somebody can read. `not interpreted`,
 * `not written` and `discarded` were the runtime's kinds printed in a badge; the
 * badge says **Not understood**, **Not saved** and **You said no**, and every
 * one of those kinds is still spelled out under the disclosure at the foot of
 * the card.
 *
 * An episode with no proposals says so rather than rendering an empty list: an
 * ask the model never turned into a change is a real outcome, and the commonest
 * one worth noticing.
 *
 * Both revisions an episode names are links (0043): the one the ask was written
 * against, and the one it became. This page says what the runtime was asked to
 * do; `/portal/history` says what the tree did about it, and until now the only
 * way between the two was reading a number off one page and hunting for it on
 * the other.
 */
export const EpisodeCard = ({ episode }: { readonly episode: IntentEpisode }) => {
  const view = viewOf(episode.resolution)
  const ask = describeAsk(episode)
  const failure = failureWords(episode.resolution)

  return (
    <li className="border-edge-subtle bg-surface-base flex flex-col gap-3 rounded-md border p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className={`rounded-sm px-2 py-1 text-xs ${toneClasses(view.tone)}`}>
          <strong className="font-medium">{view.label}</strong>
        </span>

        <Link href={`/portal/pages/${episode.treeId}`} className="font-mono text-2xs">
          {episode.treeId} →
        </Link>
      </div>

      <div className="flex flex-col gap-1 text-xs">
        <p>{view.meaning}</p>
        {failure !== "" && <p className="text-ink-muted">{failure}</p>}
        {view.revision !== null && (
          <p className="text-ink-muted">
            The page is at <RevisionLink treeId={episode.treeId} revision={view.revision} /> because
            of it.
          </p>
        )}
      </div>

      {/*
        * Who asked, second. It is the sentence that makes the outcome mean
        * something — "not allowed" reads very differently when a schedule asked
        * than when a person did — and it was a monospace run of five facts with
        * nothing saying which was which.
        */}
      <p className="text-ink-muted text-xs">
        {ask.who}
        {ask.scope !== "" && ` ${ask.scope}`}
        {ask.revision !== null && (
          <>
            {" "}
            It was written against{" "}
            <RevisionLink treeId={episode.treeId} revision={ask.revision} />.
          </>
        )}
      </p>

      {/*
        * An ask the model never turned into a change is a real outcome and the
        * commonest one worth noticing, so an empty list is said rather than
        * shown. It is dropped only when a failure has already said it more
        * precisely: a screenshot of the real screen read "It never got as far as
        * proposing anything" and then "The AI never got as far as writing a
        * change" one line below, which is the same fact twice and reads as a
        * page repeating itself. Nothing is lost — the more specific sentence is
        * the one that survives.
        */}
      {episode.proposals.length === 0 ? (
        failure === "" && (
          <p className="text-ink-muted text-xs">The AI never got as far as writing a change.</p>
        )
      ) : (
        <ul className="flex flex-col gap-3">
          {episode.proposals.map((proposal) => (
            <ProposalLine key={proposal.proposalId} proposal={proposal} />
          ))}
        </ul>
      )}

      <p className="text-ink-muted text-2xs">
        <time dateTime={episode.startedAt}>{plainMoment(episode.startedAt)}</time>
      </p>

      {/*
        * Everything the card used to print at the top. The ask's own id is the
        * handle somebody grepping the journal searches for, the tree id is what
        * a query groups by, and the resolution's kind is what a bug report
        * quotes — none of them is a word a reader meets unasked any more, and
        * none of them has left the page.
        */}
      <TechnicalDetail summary="What the record says">
        <dl className="flex flex-wrap gap-x-4 gap-y-1">
          <div className="flex gap-1">
            <dt className="text-ink-muted">ask</dt>
            <dd className="font-mono">{episode.intentId}</dd>
          </div>
          <div className="flex gap-1">
            <dt className="text-ink-muted">tree</dt>
            <dd className="font-mono">{episode.treeId}</dd>
          </div>
          <div className="flex gap-1">
            <dt className="text-ink-muted">resolution</dt>
            <dd className="font-mono">{view.technical}</dd>
          </div>
          <div className="flex gap-1">
            <dt className="text-ink-muted">intent</dt>
            <dd className="font-mono">{ask.technical}</dd>
          </div>
          <div className="flex gap-1">
            <dt className="text-ink-muted">started</dt>
            <dd className="font-mono">{episode.startedAt}</dd>
          </div>
          {episode.policyId !== undefined && (
            <div className="flex gap-1">
              <dt className="text-ink-muted">policy</dt>
              <dd className="font-mono">{episode.policyId}</dd>
            </div>
          )}
        </dl>
      </TechnicalDetail>
    </li>
  )
}
