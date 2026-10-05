import { PartName } from "@/app/(portal)/_components/part-name"
import { PlainSentence } from "@/app/(portal)/_components/plain-sentence"
import { StateNotice } from "@/app/(portal)/_components/state-notice"
import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import {
  arrivedPartWayDown,
  fallSentence,
  heldAllTheWay,
  notReporting,
  placesCount,
  plainShare,
  runsThatLose,
  stoppingSummary,
  whatToLookAt,
  type FallLine,
  type PageStopping,
  type StoppingRun,
} from "@/app/(portal)/_lib/stopping"
import { versionMention } from "@/app/(portal)/_lib/version"

/**
 * Where a page stops holding people.
 *
 * ## Why this is beside `WhatWasSkipped` rather than inside it
 *
 * They answer two questions that look like one. That section is *which parts did
 * anybody get to*, part by part, in reading order — a standing each, and a
 * trailing run of unseen parts at the bottom. This one is *between which two
 * parts do people leave*, which is a comparison and is the only one of the two
 * that can produce a share.
 *
 * The distinction is worth the second section because the answers come apart on
 * an ordinary page. Every part can be `read` — nothing skipped, nothing
 * trailing, that section entirely green — and four in ten readers can still be
 * leaving at the same place every time. A page in that state had nothing on this
 * screen to say so.
 *
 * ## The share leads and the counts are one click down
 *
 * The reverse of every other section on this card, and the reason is in
 * `_lib/stopping.ts`: the reach of a part is generous by every visit that
 * straddled a roll-up boundary, and a ratio between two parts of one page
 * divides that over-count out. So *4 in 10 of the people who got this far*
 * is the figure a person may quote and *38 of 94* is the one they may not,
 * which is exactly backwards from how a dashboard would lay it out.
 *
 * Nothing is removed. The counts, the exact share, every run of the page with
 * every part's reach, and the runtime's own name for the reading are all in the
 * disclosure at the foot of the section.
 *
 * ## The rows are the shape, and only where there is one
 *
 * A fall is a position in reading order, so the evidence for it is the run it
 * happened in, drawn in the order a reader meets it. Runs with no fall in them
 * get a sentence instead of rows: every row would carry the same figure, and a
 * page whose every group is drawn is the table this surface refuses to be.
 */
export const WhereTheyStop = ({ stopping }: { readonly stopping: PageStopping }) => {
  const losing = runsThatLose(stopping)
  const held = heldAllTheWay(stopping)
  const rising = arrivedPartWayDown(stopping)
  const quiet = notReporting(stopping)

  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-sm tracking-tight">Where do people stop reading?</h3>

      {/*
       * **The screen says what this is not**, which is the move
       * `_lib/screen-names.ts` settled for two screens whose names are synonyms
       * in ordinary English and nearly opposites here. The same thing happens
       * between these two sections and it was found in a photograph: the
       * section above can say *every part of this page came onto somebody's
       * screen* directly over *5 in 10 of the people who got this far stopped
       * here*, and both are exactly true. One asks whether each part reached
       * anybody; this one asks how far each person got. A reader who takes the
       * first as an answer to the second reads the pair as a contradiction, and
       * no amount of rewording either heading fixes that — the distinction is
       * what has to be said.
       */}
      <p className="text-ink-muted text-xs">
        A different question from the one above: that one is about the{" "}
        <strong className="font-medium">parts</strong> — whether anybody at all got to each of
        them — and this one is about the <strong className="font-medium">people</strong>, and how
        far down each of them got.
      </p>

      <p className="text-ink text-xs">{stoppingSummary(stopping)}</p>

      {stopping.steepest !== undefined && (
        <>
          <p className="text-ink text-sm">
            <FallSentence line={fallSentence(stopping.steepest)} />
          </p>
          <p className="text-ink text-xs">
            <PlainSentence line={whatToLookAt(stopping.steepest)} />
          </p>
        </>
      )}

      {/*
       * Good news is said rather than shown as an absence, which is the rule
       * that made `settled` a tone. A page nobody leaves is the answer somebody
       * came here hoping for and it must not arrive as a blank space.
       */}
      {stopping.views > 0 && stopping.runs.length > 0 && stopping.steepest === undefined && (
        <StateNotice tone="settled">
          <p>
            Nobody dropped off between any two parts of this page. Everyone who saw the first of
            a group of parts saw the last of it.
          </p>
        </StateNotice>
      )}

      {losing.map((run) => (
        <RunRows key={run.parentId} run={run} views={stopping.views} />
      ))}

      {held !== undefined && <p className="text-ink-muted text-xs">{held}</p>}

      {rising !== undefined && <p className="text-ink-muted text-xs">{rising}</p>}

      {quiet !== undefined && (
        <StateNotice tone="notice">
          <p>{quiet}</p>
          <TechnicalDetail summary="Why a part can be clicked and never seen">
            <p>
              Reach is reported by a <span className="font-mono">viewed</span> signal. A click
              delegated to a region carries that region&rsquo;s ancestry and not a view of it, so
              a part can be pressed without anything ever reporting that it was on screen — and
              its reach of <span className="font-mono">0</span> is then an absence of evidence
              rather than an absence of readers. <span className="font-mono">readingProgressOf</span>{" "}
              passes those parts over instead of reporting a cliff nobody fell off, and this is
              the count of them.
            </p>
            <p className="font-mono">
              {stopping.unanchored.map((part) => part.nodeId).join(" · ")}
            </p>
          </TechnicalDetail>
        </StateNotice>
      )}

      <TechnicalDetail summary="Every group of parts, every reach, and which of these figures is safe to quote">
        <p>
          Read by <span className="font-mono">readingProgressOf</span> off the same join to{" "}
          {versionMention(stopping.revision)} of this page that the section above uses. A fall is
          a pair of <em>siblings</em> and never two parts at different depths: a part inside the
          first band comes before the second band in reading order and is reached by fewer
          visits than either, so a page-wide sequence of reach counts does not descend and a dip
          in one is not a drop-off.
        </p>

        <p>
          <strong className="font-medium">The share is the quotable figure and the counts are
          not.</strong>{" "}
          A reach is a distinct-visit count added across roll-up windows, so it is generous by
          every visit that straddled a boundary. Two parts of one page are inflated by the same
          straddling visits, so the inflation very nearly divides out of a ratio between them. A
          share is never taken against this page&rsquo;s{" "}
          <span className="font-mono">views</span> floor of{" "}
          <span className="font-mono">{stopping.views}</span> — that is a different counter
          written in a different place, and a ratio across the two can honestly exceed 1.
        </p>

        <p>
          There is no total. One visit that got past two parts is in both pairs&rsquo; figures, so
          adding what was lost at each would double-count the same people;{" "}
          {placesCount(stopping.places)} is a count of positions on the page and the only sum
          this reading permits.
        </p>

        {stopping.runs.length === 0 ? (
          <p>
            No group of parts on this page has two members in it, so there is no pair to compare.
            A part with no sibling has nowhere for reading to stop.
          </p>
        ) : (
          <dl className="flex flex-col gap-3">
            {stopping.runs.map((run) => (
              <div key={run.parentId} className="flex flex-col gap-1">
                <dt>
                  inside <PartName part={run.place} /> — depth{" "}
                  <span className="font-mono">{run.depth}</span>,{" "}
                  {run.falls.length === 0
                    ? "no fall"
                    : `${run.falls.length === 1 ? "1 fall" : `${run.falls.length} falls`}`}
                  {run.gained === 0 ? "" : `, ${run.gained} rising`}
                </dt>
                <dd className="flex flex-col gap-0.5">
                  {run.steps.map((step) => (
                    <span key={step.nodeId} className="font-mono">
                      {step.nodeId} · {step.type} · {step.standing} · reached {step.reached}
                      {step.anchors ? "" : " · cannot anchor"}
                      {run.furthest?.nodeId === step.nodeId ? " · furthest" : ""}
                    </span>
                  ))}
                  {run.falls.map((fall) => (
                    <span key={`${fall.after.nodeId}-${fall.before.nodeId}`} className="font-mono">
                      fall {fall.after.nodeId} → {fall.before.nodeId} · lost {fall.lost} of{" "}
                      {fall.reached} · share {fall.share.toFixed(3)}
                    </span>
                  ))}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </TechnicalDetail>
    </section>
  )
}

/**
 * One run reading falls off in, as the page's own order.
 *
 * Nothing is sorted. A list ranked worst-first is a different screen answering a
 * different question, and it is the one that cannot show a drop-off — the same
 * argument `WhatWasSkipped` makes about its rows, and it holds twice as hard
 * here, because the only thing a fall *is* is a position between two
 * neighbours.
 *
 * The share sits on the gap rather than on either part, which is the whole
 * reading: a figure printed against a part would read as a fact about that part,
 * and what is being measured is what happened between it and the next one.
 */
const RunRows = ({ run, views }: { readonly run: StoppingRun; readonly views: number }) => {
  const lost = new Map(run.falls.map((fall) => [fall.after.nodeId, fall] as const))

  return (
    <div className="border-edge-subtle flex flex-col gap-1 rounded-sm border p-3">
      <p className="text-ink-muted text-2xs">
        inside <PartName part={run.place} />
      </p>

      <ol className="flex flex-col text-xs">
        {run.steps.map((step) => {
          const fall = lost.get(step.nodeId)

          return (
            <li key={step.nodeId} className="flex flex-col">
              <span className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-ink">
                  <PartName part={step.name} />
                </span>
                {step.anchors ? (
                  <span className="text-ink-muted">
                    {step.reached} of {views} {views === 1 ? "visit" : "visits"}
                  </span>
                ) : (
                  <span className="text-ink-muted">never reported being on screen</span>
                )}
              </span>

              {/*
               * The gap, drawn as a gap. The figure belongs to neither of the
               * two parts it sits between, and indenting it under the one above
               * is the only arrangement that says so without a diagram.
               */}
              {fall !== undefined && (
                <span className="text-ink-secondary ps-3 text-2xs">
                  ↓ {plainShare(fall.share)} who got this far stopped here
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}

/**
 * A sentence with two named parts in it, rendered.
 *
 * The same reason `PlainSentence` exists one component up: the line can be
 * correct and a component can still drop the words between the two names, and
 * nothing would fail. So the spread happens once, here, and this component's own
 * test asserts that what it renders reads exactly `fallReading(line)`.
 */
export const FallSentence = ({ line }: { readonly line: FallLine }) => (
  <>
    {line.before}
    <PartName part={line.reached} />
    {line.between}
    <PartName part={line.missed} />
    {line.after}
  </>
)
