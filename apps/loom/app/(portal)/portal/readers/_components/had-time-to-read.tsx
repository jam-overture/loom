import { PartName } from "@/app/(portal)/_components/part-name"
import { PlainSentence } from "@/app/(portal)/_components/plain-sentence"
import { StateNotice } from "@/app/(portal)/_components/state-notice"
import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import {
  alsoWhereTheyStop,
  everybodyHadTime,
  lingeringQuestion,
  pacingSummary,
  partsThatSkim,
  plainSeconds,
  skimSentence,
  wordsNotCounted,
  worthShortening,
  type PagePacing,
} from "@/app/(portal)/_lib/pacing"
import type { PageStopping } from "@/app/(portal)/_lib/stopping"
import { plainPace, plainPaceSilence, toneClasses } from "@/app/(portal)/_lib/vocabulary"
import { versionMention } from "@/app/(portal)/_lib/version"

/**
 * Whether the people who got to each part of this page had time to read it.
 *
 * ## The third question, and why it is not the other two
 *
 * `WhatWasSkipped` asks whether each part came onto anybody's screen.
 * `WhereTheyStop` asks how far down each person got. Both are built on reach,
 * and reach means *a row says this was on screen* and nothing more. So a page
 * where somebody scrolled from top to bottom at speed is, on those two
 * sections, a page that was entirely read: every part green, no fall anywhere.
 *
 * This section is the one that can disagree with them. It sets the time readers
 * spent against the time the part's own words take, and a page in exactly that
 * state reads *every part was seen, nobody stopped anywhere, and nowhere on it
 * did anybody have time for the words*.
 *
 * ## It leads with a skim because a skim is the only claim
 *
 * Three things bias the comparison and all three bias it the same way — time on
 * screen is not time reading, a word count is a floor wherever a type has not
 * declared its copy, and a reach is generous by every visit that straddled a
 * roll-up window. A skim is what is left when every one of those doubts is
 * resolved in the page's favour.
 *
 * So `paced` never appears above the disclosure. *Readers read this* is not a
 * thing anybody acts on, and a green row per part would be a dashboard telling
 * a person their page is fine on the strength of the three weakest numbers
 * here.
 *
 * ## The one figure that must never be drawn as engagement
 *
 * Dwell is time on screen. A tall part at the foot of a page lingers because
 * nothing ever scrolled past it, and a band lingers for the whole time its own
 * children were being read. *People stayed longest here* would be this surface
 * printing engagement off a number that cannot support it, so lingering is a
 * question in the words of a question, in grey, with both of the things it can
 * mean in the same sentence.
 *
 * ## Nothing is removed
 *
 * Every part, its words, its subtree's words, the time spent and the time
 * needed, the ratio, the runtime's own name for each standing and each silence,
 * the costing rate and the over-count correction that was applied are all in
 * the disclosure at the foot of the section.
 */
export const HadTimeToRead = ({
  pacing,
  stopping,
}: {
  readonly pacing: PagePacing
  /**
   * The drop-off reading for the same page and the same window, where there is
   * one.
   *
   * Taken only to ask whether its sharpest fall lands on the same part as the
   * worst skim. Nothing here is computed from it, and the sentence is drawn only
   * when the two name the identical part — see `alsoWhereTheyStop`.
   */
  readonly stopping: PageStopping | undefined
}) => {
  const skimming = partsThatSkim(pacing)
  const agreeing = alsoWhereTheyStop(pacing, stopping)
  const staying = lingeringQuestion(pacing)
  const uncounted = wordsNotCounted(pacing)
  const settled = everybodyHadTime(pacing)

  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-sm tracking-tight">Did people have time to read it?</h3>

      {/*
       * The screen says what this is not, which is the move `_lib/screen-names.ts`
       * settled for two screens whose names are synonyms in ordinary English.
       * The same thing happens between these three sections, and the photograph
       * of it is the reason this paragraph exists: *every part of this page came
       * onto somebody's screen* can sit directly above *nowhere on this page did
       * anybody have time for the words*, and both are exactly true. A reader
       * who takes the first as an answer to the second reads the pair as a
       * contradiction, and no rewording of either heading fixes that — the
       * difference between being on screen and being read is the thing that has
       * to be said out loud.
       */}
      <p className="text-ink-muted text-xs">
        The two questions above are about whether a part was{" "}
        <strong className="font-medium">on screen</strong>. This one is about whether the people
        it was on screen for were there long enough to{" "}
        <strong className="font-medium">read</strong> it.
      </p>

      <p className="text-ink text-xs">{pacingSummary(pacing)}</p>

      {agreeing !== undefined && (
        <p className="text-ink text-sm">
          <PlainSentence line={agreeing} />
        </p>
      )}

      {pacing.mostSkimmed !== undefined && (
        <>
          <p className="text-ink text-sm">
            <PlainSentence line={skimSentence(pacing.mostSkimmed)} />
          </p>
          {/*
           * The advice is skipped when the sentence above it has already given
           * it. `alsoWhereTheyStop` ends on *it is the strongest thing this page
           * has to tell you*, and following that with *if one thing is worth
           * shortening* would name the same part twice in three lines.
           */}
          {agreeing === undefined && (
            <p className="text-ink text-xs">
              <PlainSentence line={worthShortening(pacing.mostSkimmed)} />
            </p>
          )}
        </>
      )}

      {skimming.length > 0 && (
        <ol className="border-edge-subtle flex flex-col gap-1 rounded-sm border p-3 text-xs">
          {skimming.map((part) => {
            const plain = plainPace(part.standing)

            return (
              <li key={part.nodeId} className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span
                  className={`${toneClasses(plain.tone)} rounded-sm px-1.5 py-0.5 text-2xs whitespace-nowrap`}
                  title={plain.meaning}
                >
                  {plain.label}
                </span>
                <span className="text-ink">
                  <PartName part={part.name} />
                </span>
                <span className="text-ink-muted">
                  {plainSeconds(part.spentMs ?? 0)} each, for words that take{" "}
                  {plainSeconds(part.needMs)}
                </span>
              </li>
            )
          })}
        </ol>
      )}

      {/*
       * Good news is said rather than shown as an absence, which is the rule
       * that made `settled` a tone. A page nobody raced through is the answer
       * somebody came here hoping for and it must not arrive as a blank space.
       */}
      {settled !== undefined && (
        <StateNotice tone="settled">
          <p>{settled}</p>
        </StateNotice>
      )}

      {staying !== undefined && <p className="text-ink-muted text-xs">{staying}</p>}

      {uncounted !== undefined && (
        <StateNotice tone="notice">
          <p>{uncounted}</p>
          <TechnicalDetail summary="Why a part can have words nothing can count">
            <p>
              A primitive declares which of its properties hold words a reader would read. Where
              a type in this part has declared none, or declared one holding something that is
              not text, its words are a <em>floor</em> — it says at least that much and possibly
              more. More words can only make a part look more hurried, so a skim still stands;
              anything else would be a claim resting on words nobody counted.
            </p>
            <p>
              On the primitives Loom ships this is near zero. On a deployment&rsquo;s own
              primitives it is however many of them have not said what they say, and this count
              is how you find out which.
            </p>
          </TechnicalDetail>
        </StateNotice>
      )}

      <TechnicalDetail summary="Every part, the time against the words, and which of these figures is safe to quote">
        <p>
          Read by <span className="font-mono">readingPaceOf</span> off the same join to{" "}
          {versionMention(pacing.revision)} of this page that the two sections above use. Words
          are costed at <span className="font-mono">{pacing.wordsPerMinute}</span> words a
          minute, and a part is judged against its own words{" "}
          <em>and everything inside it</em>, because the text on screen while a band was up is
          the band&rsquo;s and its children&rsquo;s.
        </p>

        <p>
          <strong className="font-medium">
            A skim is the quotable verdict and the other two are not.
          </strong>{" "}
          Time on screen counts a part that was merely up while its neighbour was being read; a
          word count is a floor wherever a type has not declared its copy; and a reach is a
          distinct-visit count added across roll-up windows, so it is generous by every visit
          that straddled a boundary. All three point the same way, so a skim is what survives
          them and <span className="font-mono">paced</span> is not.
        </p>

        <p>
          The over-count correction applied here is{" "}
          <span className="font-mono">{pacing.inflation.toFixed(3)}</span>, measured from this
          page&rsquo;s own door counts against its roll-ups. Without it the mean time per reader
          is short, which calls marginally more parts hurried than should be — the one direction
          a safe verdict cannot afford to be wrong in.
        </p>

        <p>
          <strong className="font-medium">There is no total.</strong> A band&rsquo;s words are
          inside the page&rsquo;s, so adding a word figure across parts would charge one reader
          once for every level they scrolled through. The page&rsquo;s own figure is taken from
          the top of the page and is kept out of the ranking above for the same reason — it
          contains every part, so it would win every ranking it was entered in.
        </p>

        <dl className="flex flex-col gap-0.5">
          {pacing.parts.map((part) => (
            <div key={part.nodeId} className="flex flex-col">
              <dt className="font-mono">
                {part.nodeId} · {part.type} · depth {part.depth}
                {part.nodeId === pacing.whole?.nodeId ? " · the page itself" : ""}
              </dt>
              <dd className="font-mono">
                {part.standing}
                {part.silence === undefined ? "" : ` (${plainPaceSilence(part.silence).technical})`}{" "}
                · readers {part.readers} · words {part.words} of {part.wordsWithin} within
                {part.floored ? " (a floor)" : ""} · spent{" "}
                {part.spentMs === undefined ? "—" : Math.round(part.spentMs)}ms · needs{" "}
                {Math.round(part.needMs)}ms · pace{" "}
                {part.pace === undefined ? "—" : part.pace.toFixed(3)} · words passed{" "}
                {part.wordsPassed}
              </dd>
            </div>
          ))}
        </dl>
      </TechnicalDetail>
    </section>
  )
}
