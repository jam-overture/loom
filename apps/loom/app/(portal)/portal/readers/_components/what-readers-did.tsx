import { ACTION_STANDINGS, describeActionStanding } from "@jam-overture/loom/signals"

import { PartName } from "@/app/(portal)/_components/part-name"
import { PlainSentence } from "@/app/(portal)/_components/plain-sentence"
import { StateNotice } from "@/app/(portal)/_components/state-notice"
import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import type { PageArrivals } from "@/app/(portal)/_lib/arrivals"
import {
  actionsHaveNowhereToGo,
  didAnything,
  mostOpenedLine,
  mostPressedLine,
  nothingPressed,
  nothingWasIgnored,
  whatTheyIgnored,
  whereTheSharesWent,
  whereTheyActed,
  type PageDoing,
} from "@/app/(portal)/_lib/doing"
import { versionOnTheRecord } from "@/app/(portal)/_lib/version"

/**
 * What readers did on the page, as against what they saw.
 *
 * ## Why it is one section and used to be three lines in somebody else's list
 *
 * Everything this card said about doing was scattered through the attention
 * list: *twelve of the forty visits did something on this page*, *the part that
 * saw the most of that was the pricing band*, *the sign-up was clicked nine
 * times*, *nobody clicked or opened anything*, and a note about presses that
 * arrived with nowhere to put them. Five sentences, three readings, one
 * question — and between two of them sat *people stayed longest on the
 * introduction*, which is a different question entirely.
 *
 * A reader working out whether anybody uses their page had to assemble the
 * answer out of a list sorted by nothing. So the question gets a heading, in the
 * words somebody would ask it in, and the attention list keeps attention.
 * Nothing is removed: every one of those five sentences is below, and two more
 * are new.
 *
 * ## The order, which is the argument
 *
 * **Readers first, occurrences second, and never mixed.** *About 95 of the 320
 * readers did something* is a headcount off one row. *The sign-up was pressed
 * nine times* is nine events and possibly one enthusiastic person. Both are
 * worth having and a card that interleaves them invites a reader to add them
 * up, so the two headcount sentences lead, the two event sentences follow, and
 * the label on an intensity says *per reader* rather than `%`.
 *
 * **And the ignored part comes before either.** It is the only line here a
 * person can act on this afternoon, and it is the sentence this screen could not
 * say at all: a band readers reach in numbers and never touch looked exactly
 * like the heading above it, because both reported zero. What tells them apart
 * is structural — an action is filed against a control and credited to the
 * regions it happened inside, so a part with nothing inside it has a nought
 * that is a filing rule and not a finding about anybody.
 *
 * ## What is a notice, and it is about the deployment rather than the page
 *
 * **Actions with nowhere to go.** The page holds presses and credits a reader
 * inside nothing, so every share here would be a nought and every region would
 * read as untouched while the counters look perfectly healthy. The symptom is
 * *my readers use nothing* and the cause is in the sending. That is the one
 * state here worth interrupting for, it gets the tone this portal reserves for a
 * condition worth knowing that is not a failure, and **no share is drawn beside
 * it** — a page under it has nothing to say about its readers, and saying it
 * anyway is the failure this section is built to refuse.
 *
 * A page where every region readers reached was used by somebody gets a
 * `settled` notice and not a missing line, for the reason that tone exists: it
 * is the answer somebody who came here worried about a dead section wants, and
 * it must not arrive as a blank.
 *
 * ## What goes one click down
 *
 * Every part of the page, its standing, its reach, the readers who acted inside
 * it, the four occurrence counters apart, the intensity per reader, and how
 * often what was opened was shut again. The runtime's own sentence for each of
 * the three standings. And the count of parts whose share is withheld
 * structurally, because what is withheld is still reported as a total.
 */
export const WhatReadersDid = ({
  doing,
  arrivals,
}: {
  readonly doing: PageDoing
  /**
   * The denominator, when the card has one. Absent on a version gap, which
   * changes the units these sentences are in and not whether they are said:
   * what readers did is answerable off the counters alone.
   */
  readonly arrivals: PageArrivals | undefined
}) => {
  const lead = didAnything(doing, arrivals)
  const ignored = whatTheyIgnored(doing, arrivals)
  const settled = nothingWasIgnored(doing)
  const acted = whereTheyActed(doing)
  const pressed = mostPressedLine(doing)
  const opened = mostOpenedLine(doing)
  const quiet = nothingPressed(doing)
  const unplaced = actionsHaveNowhereToGo(doing)
  const withheld = whereTheSharesWent(doing)

  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-sm tracking-tight">What did readers do here?</h3>

      {unplaced === undefined ? (
        <>
          <p className="text-ink text-xs">{lead}</p>

          <ul className="flex flex-col gap-2 text-xs">
            {/*
             * First of the parts, because it is the only one of them somebody can
             * act on. The two that follow are news about what is working.
             */}
            {ignored !== undefined && (
              <li className="text-ink">
                <PlainSentence line={ignored} />
              </li>
            )}

            {acted !== undefined && (
              <li className="text-ink">
                <PlainSentence line={acted} />
              </li>
            )}

            {quiet === undefined ? (
              <>
                {pressed !== undefined && (
                  <li className="text-ink">
                    <PlainSentence line={pressed} />
                  </li>
                )}
                {opened !== undefined && (
                  <li className="text-ink">
                    <PlainSentence line={opened} />
                  </li>
                )}
              </>
            ) : (
              <li className="text-ink-muted">{quiet}</li>
            )}
          </ul>

          {settled !== undefined && (
            <StateNotice tone="settled">
              <p>{settled}</p>
            </StateNotice>
          )}
        </>
      ) : (
        <StateNotice
          tone="notice"
          title="Something was used here, and nothing said where."
        >
          <p>{unplaced}</p>
          <TechnicalDetail summary="What is missing, and where to change it">
            <p>
              A press or an opening carries <span className="font-mono">within</span>: the
              addressed parts it happened inside, nearest first, up to and including the whole
              page. A region&rsquo;s <span className="font-mono">engaged</span> is read off that
              and off nothing else, so a batch whose senders did not walk contributes nothing
              rather than a guess — and every share on this page would be a nought that means
              nothing, which is why none is drawn above.
            </p>
            <p>
              The walk is on by default in{" "}
              <span className="font-mono">broadcastReaderSignals</span>. A batch arriving without
              it is usually an older copy of Loom on the site, a host that has turned it off, or
              signals synthesised somewhere that has no page to walk.
            </p>
          </TechnicalDetail>
        </StateNotice>
      )}

      {withheld !== undefined && <p className="text-ink-muted text-xs">{withheld}</p>}

      <TechnicalDetail summary="Every part, and what was counted against it">
        <dl className="flex flex-col gap-2">
          {ACTION_STANDINGS.map((standing) => (
            <div key={standing}>
              <dt className="font-mono">
                {standing} — {doing.standings[standing]}
              </dt>
              <dd>{describeActionStanding(standing)}</dd>
            </div>
          ))}
        </dl>

        <p>
          On {versionOnTheRecord(doing.revision)}, over {doing.parts.length}{" "}
          {doing.parts.length === 1 ? "part" : "parts"}. A share is{" "}
          <span className="font-mono">engaged ÷ reached</span> — two distinct view counts off one
          row, so the over-count a visit spanning two counting windows adds is on both sides of
          the division and very nearly cancels. It is deliberately not divided by the visits
          counted at the door: those are written in a different place, and their ratio can
          honestly exceed 1.
        </p>

        <table className="w-full text-left">
          <thead>
            <tr>
              <th className="font-normal">part</th>
              <th className="font-normal">standing</th>
              <th className="font-normal">reached</th>
              <th className="font-normal">engaged</th>
              <th className="font-normal">share</th>
              <th className="font-normal">uses</th>
              <th className="font-normal">per reader</th>
              <th className="font-normal">shut again</th>
            </tr>
          </thead>
          <tbody>
            {doing.parts.map((part) => (
              <tr key={part.nodeId}>
                <td>
                  <PartName part={part.name} />
                </td>
                <td className="font-mono">{part.standing}</td>
                <td className="font-mono">{part.reached ?? "—"}</td>
                <td className="font-mono">{part.within ?? "—"}</td>
                <td className="font-mono">
                  {part.share === undefined ? "—" : `${(part.share * 100).toFixed(0)}%`}
                </td>
                <td className="font-mono">{part.uses}</td>
                <td className="font-mono">
                  {part.usesPerReader === undefined ? "—" : part.usesPerReader.toFixed(1)}
                </td>
                <td className="font-mono">
                  {part.shutAgain === undefined ? "—" : part.shutAgain.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <p>
          <span className="font-mono">uses</span> adds the four counters a part carries —
          presses, openings, closings and submissions — and they are occurrences rather than
          people: a reader who presses twice is two of them and one person. So{" "}
          <span className="font-mono">per reader</span> is an intensity and not a rate, it may
          exceed 1, and above 1 it says each reader used the part more than once.
        </p>

        <p>
          <span className="font-mono">shut again</span> is{" "}
          <span className="font-mono">closes ÷ opens</span>, and it is uncapped on purpose: above
          1 means closings this page&rsquo;s own openings cannot account for, which is a
          disclosure the page renders already open. A reader shutting something they never opened
          is a real diagnosis, and capping the figure would hide the one thing it can tell you.
        </p>
      </TechnicalDetail>
    </section>
  )
}
