import { PART_STANDINGS } from "@jam-overture/loom/signals"

import { PartName } from "@/app/(portal)/_components/part-name"
import { PlainSentence } from "@/app/(portal)/_components/plain-sentence"
import { StateNotice } from "@/app/(portal)/_components/state-notice"
import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import { readersAt, type PageArrivals } from "@/app/(portal)/_lib/arrivals"
import {
  mismatchedReading,
  nothingSeen,
  nothingSkipped,
  partsCount,
  skippingSummary,
  stopReading,
  type PageSkipping,
} from "@/app/(portal)/_lib/skipped"
import { plainStanding, toneClasses } from "@/app/(portal)/_lib/vocabulary"
import { versionMention } from "@/app/(portal)/_lib/version"

/**
 * Which parts of a page nobody got to, top to bottom.
 *
 * ## Why this is a list and not two numbers
 *
 * Everything else on this card is a handful of sentences, deliberately — a
 * table of every counter is the portal's original defect in a new place. This
 * one earns its rows, because the answer **is** the shape: a page loses people
 * somewhere, and *where* is a position in reading order. Two numbers saying
 * nine read and five missed would throw away the only thing a person can act
 * on.
 *
 * So the rows are the page's own order with its own nesting, and nothing is
 * sorted by how badly a part did. A list ranked worst-first is a different
 * screen that answers a different question, and it is the one that cannot show
 * a drop-off.
 *
 * ## The sentence comes before the list
 *
 * A reader meets *reading stops at the pricing band* first and the rows
 * afterwards. The rows are the evidence for the sentence; a screen that led
 * with them would be asking a person to do the reading the module already did.
 *
 * ## What it refuses to draw
 *
 * A reading whose counters name a part this page does not have. That pair
 * produces a list in which most rows read *nobody got to it* while every number
 * stays plausible — the one failure of this join that nothing else would catch —
 * so the alarm replaces the list rather than sitting under it. Drawing both
 * would be offering a reader a reading and a reason not to believe it, at the
 * same altitude, and the reading would win.
 */
export const WhatWasSkipped = ({
  skipping,
  arrivals,
}: {
  readonly skipping: PageSkipping
  /**
   * How many people there were to get anywhere, off the same join.
   *
   * What it changes is the figure at the end of a row. `9 of the 36 visits`
   * divides by the largest visit count any single row of the window reports —
   * a floor, carrying the over-count of every visit still being read when a
   * counting window closed. With this in hand the row says *about 7 of the 320
   * who arrived*, which is a share of people against an exact denominator.
   *
   * **Nothing is removed by that.** The raw reach is the `seen` column of
   * `PartCounters` at the foot of the card, the floor keeps its own paragraph
   * in the record below, and a row whose honest figure cannot be given falls
   * back to the one the card drew before this reading existed.
   */
  readonly arrivals: PageArrivals | undefined
}) => {
  const mismatched = mismatchedReading(skipping)

  if (mismatched !== undefined)
    return (
      <StateNotice tone="failure" title="These counts aren’t about the page we have.">
        <p>{mismatched}</p>
        <TechnicalDetail summary="Which counted parts the page does not have">
          <p>
            {partsCount(skipping.mismatched.length)} counted against{" "}
            {versionMention(skipping.revision)} of this page name nodes that are not in the tree
            at that revision, which <span className="font-mono">pageReadingOf</span> reports as{" "}
            <span className="font-mono">orphaned</span>. The pair is wrong rather than the
            numbers.
          </p>
          <p className="font-mono">{skipping.mismatched.join(" · ")}</p>
        </TechnicalDetail>
      </StateNotice>
    )

  const unseen = nothingSeen(skipping)
  const clean = nothingSkipped(skipping)

  /*
   * Built once for the whole list rather than looked up per row, which is the
   * difference between one pass over the parts and one pass per part. The two
   * lists are the same parts of the same page in the same order — both come off
   * one `pageReadingOf` — so a miss here is impossible and is handled anyway,
   * by falling back to the figure this list has always drawn.
   */
  const readers = new Map<string, string>(
    arrivals === undefined
      ? []
      : arrivals.parts.flatMap((part) => {
          const said = readersAt(part, arrivals)

          return said === undefined ? [] : [[part.nodeId, said] as const]
        })
  )

  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-sm tracking-tight">Which parts did people get to?</h3>

      <p className="text-ink text-xs">{skippingSummary(skipping)}</p>

      {skipping.stops !== undefined && (
        <p className="text-ink text-xs">
          <PlainSentence line={stopReading(skipping.stops)} />
        </p>
      )}

      {clean !== undefined && (
        <StateNotice tone="settled">
          <p>{clean}</p>
        </StateNotice>
      )}

      {unseen !== undefined && (
        <StateNotice tone="notice">
          <p>{unseen}</p>
          <TechnicalDetail summary="Why a part can be on a page and report nothing">
            <p>
              Reach is reported by a <span className="font-mono">viewed</span> signal, which the
              browser raises for an addressed node when it intersects the viewport. A primitive
              that does not spread Loom&rsquo;s identity attributes has no addressed node, so
              nothing about it can ever be reported and it reads as unseen for ever.{" "}
              <span className="font-mono">sdk/conformance.ts</span> is the check that catches
              that in a primitive before it ships.
            </p>
          </TechnicalDetail>
        </StateNotice>
      )}

      <ol className="flex flex-col gap-1 text-xs">
        {skipping.parts.map((part) => {
          const plain = plainStanding(part.standing)

          return (
            <li
              key={part.nodeId}
              /*
               * Indented by the nesting the part was read at, so the list keeps
               * the page's shape — a drop-off inside one band reads as one
               * thing rather than as four unrelated rows. Capped, because a
               * page nested nine deep would otherwise push its own names off a
               * phone, and the full depth is in the table below.
               */
              style={{ paddingInlineStart: `${Math.min(part.depth, 4) * 0.75}rem` }}
              className="flex flex-wrap items-baseline gap-x-2 gap-y-1"
            >
              <span
                className={`${toneClasses(plain.tone)} rounded-sm px-1.5 py-0.5 text-2xs whitespace-nowrap`}
                title={plain.meaning}
              >
                {plain.label}
              </span>
              <span className="text-ink">
                <PartName part={part.name} />
              </span>
              {part.standing === "read" && (
                <span className="text-ink-muted">
                  {/*
                   * The honest figure where there is one, and the figure this
                   * row has always carried where there is not. The fallback is
                   * never a blank: a count against a floor is a true sentence
                   * about a denominator nobody can stand behind, and that is
                   * worth more to a reader than nothing at all — the section
                   * above says which of the two they are looking at.
                   */}
                  {readers.get(part.nodeId) ??
                    `${part.reached} of ${skipping.views} ${skipping.views === 1 ? "visit" : "visits"}`}
                </span>
              )}
            </li>
          )
        })}
      </ol>

      <TechnicalDetail summary="The three answers in the runtime’s own words, and what was dropped">
        <dl className="flex flex-col gap-2">
          {/*
           * Read off the runtime's own vocabulary rather than written out, so a
           * fourth answer added to the join appears in the record on the day it
           * lands instead of being silently absent from it.
           */}
          {PART_STANDINGS.map((standing) => (
            <div key={standing}>
              <dt className="font-mono">
                {standing} — {skipping.counts[standing]}
              </dt>
              <dd>{plainStanding(standing).meaning}</dd>
            </div>
          ))}
        </dl>

        <p>
          A standing is read off the join of this revision&rsquo;s tally rows to this
          revision&rsquo;s tree:{" "}
          <span className="font-mono">read</span> is a row reporting{" "}
          <span className="font-mono">reached &gt; 0</span>,{" "}
          <span className="font-mono">skipped</span> is no row at all on a revision with counted
          page views, and <span className="font-mono">unknown</span> is either no page views or a
          row that reported something other than reach. Element nodes only — a text or slot node
          carries no identity attributes, so no signal can name one.
        </p>

        <p>
          <span className="font-mono">{skipping.views}</span> is the largest{" "}
          <span className="font-mono">views</span> any single row of{" "}
          {versionMention(skipping.revision)} reports, and distinct view counts cannot be added
          across rows — so it is a floor rather than a count.{" "}
          {arrivals === undefined || arrivals.silence !== undefined
            ? "It is what the rows above are measured against, because nothing has counted how many people arrived."
            : `The rows above are measured against the ${arrivals.arrived} readers who arrived instead, which is counted once per visit at the door and cannot be inflated by a window boundary. The raw reach of every part is in the table at the foot of this card.`}
        </p>

        {skipping.foreign > 0 && (
          <p>
            {skipping.foreign} handed-in{" "}
            {skipping.foreign === 1 ? "row was" : "rows were"} filed under another tree or another
            revision and{" "}
            {skipping.foreign === 1 ? "was" : "were"} dropped by the join rather than added in.
          </p>
        )}

        {skipping.duplicated.length > 0 && (
          <p>
            {skipping.duplicated.length === 1 ? "One node was" : "Nodes were"} handed in more than
            once; the first row stands and the rest were dropped, because distinctness cannot be
            summed and a later row is not the truer one.{" "}
            <span className="font-mono">{skipping.duplicated.join(" · ")}</span>
          </p>
        )}
      </TechnicalDetail>
    </section>
  )
}

/**
 * Why there is no reading, when the counters are about a version other than the
 * one being served.
 *
 * ## It is a sentence rather than a silence, and that is the whole point
 *
 * Every other section of this card survives a version gap, because a count is
 * a count whichever version it is about. This one cannot: the question *which
 * parts did nobody get to* is answered against a page, and the only page a
 * store can hand over is the one it is serving. Laying one version's counters
 * over another's page makes most parts read *nobody got to it* with every
 * number intact, which is the one way this reading can be wrong and look right.
 *
 * So the honest answer is to say what is missing and why, which is also the
 * only way the gap is ever reported to the lane that can close it.
 *
 * ## It speaks for two readings and that is deliberate
 *
 * `WhereTheyStop` is the second reading off the same join and is missing in
 * exactly the same cases, for exactly the same reason. Two notices carrying one
 * sentence twice would read as two separate faults, so this one names both
 * questions and the other section draws nothing at all.
 */
export const SkippingUnavailable = ({
  counted,
  live,
}: {
  readonly counted: number
  /** The version being served, or `undefined` when that read did not come back. */
  readonly live: number | undefined
}) => (
  <StateNotice tone="notice">
    <p>
      <strong className="font-medium">
        We can’t say which parts people got to on this page yet, or where they stop reading.
      </strong>{" "}
      {live === undefined
        ? "Working that out needs the page itself as well as the counts, and the page didn’t come back just now. Everything above is still true."
        : `The counts we have are for ${versionMention(counted)}, and the page you are serving is ${versionMention(live)}. Laying one version’s counts over another version’s page would say people skipped parts that were not there, so nothing is shown instead.`}
    </p>
    <TechnicalDetail summary="What would make this answerable">
      <p>
        The join is keyed by tree and revision, so it needs the tree{" "}
        <em>at that revision</em>. A store answers for exactly one: the snapshot, which is the
        head. An older revision is recovered by replaying the log from the seed, which every
        caller assembles for itself today — so this reading waits on a way to ask a store for the
        tree as it was, rather than reaching into one.
      </p>
      <p>
        Nothing is lost in the meantime. Counts for{" "}
        {live === undefined ? "this version" : versionMention(counted)} stay exactly as they are,
        and this section answers for whichever version is being served once its own window has
        been counted.
      </p>
    </TechnicalDetail>
  </StateNotice>
)
