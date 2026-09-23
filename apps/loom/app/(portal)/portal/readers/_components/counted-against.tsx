import { StateNotice } from "@/app/(portal)/_components/state-notice"
import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import {
  standingAdvice,
  standingNote,
  type CountingStanding,
  type RevisionReading,
} from "@/app/(portal)/_lib/reading-view"
import { plainMoment } from "@/app/(portal)/_lib/when"

/**
 * Which version of the page these numbers are about, and how old they are.
 *
 * ## The screen this exists to stop
 *
 * Somebody changes a page and comes straight here to see what the change did.
 * The counters are kept per version and a version is counted only after its
 * readings have been held for the collection window, so at that moment the
 * newest counted version is **the one before theirs** — and every figure on
 * the card is about a page that is no longer being served.
 *
 * Nothing about that is broken, which is exactly why it needs saying. The card
 * was fully populated, the numbers were real, and the sentence above them read
 * *"…have reported back since it was last changed"*, which was false. A reader
 * either believes the old version's figures are the new one's, or concludes
 * their change broke the measurement and goes looking for a fault that does not
 * exist. `Loom daily build` filed it on 14 September as a screen problem rather
 * than a number problem, and it is: *"only the screen can say it."*
 *
 * ## Why the good case is a sentence too
 *
 * `current` could have rendered nothing — the numbers are fine, there is no
 * news. But *nothing* is what the other three states looked like until today,
 * and a reader cannot act on a blank. **"These are the numbers for the version
 * you are serving right now"** is also the sentence somebody wants when they
 * have *not* just made a change: it is the one that says the screen is live.
 *
 * So the difference is tone rather than presence. Current is a quiet line under
 * the heading; the three that are news are a notice, which is the tone this
 * portal reserves for a condition worth knowing that is not a failure. A failed
 * read of the page is not a failure of this screen — the counters came back and
 * every number on the card stands.
 *
 * ## What stays on the surface, and what goes one click down
 *
 * On the surface: which version, whether it is the one being served, when it
 * was last counted, and what to do — which is usually *nothing, wait*.
 *
 * One click down: the collection window that causes the gap, both version
 * numbers side by side, and the instant as the record holds it. Nothing is
 * removed; a reader who wants to know why a version has no counters yet can
 * find out, and a reader who just wants to know whether to trust the figures
 * never has to.
 */
export const CountedAgainst = ({
  reading,
  standing,
}: {
  readonly reading: RevisionReading
  readonly standing: CountingStanding
}) => {
  const advice = standingAdvice(standing)

  /*
   * `plainMoment` is rendered inside a `<time>` with the instant kept in
   * `dateTime`, which is `when.ts`'s rule for every caller: a machine reads the
   * record and a person does not have to decode it.
   *
   * The explicit `{" "}` is not a formatting accident. A JSX expression that
   * ends a line loses the whitespace before the text on the next one, which
   * this lane shipped twice in one day on 20 September and filed against
   * itself. Every join in this file is written out.
   */
  const countedUpTo = (
    <>
      Counted up to{" "}
      <time dateTime={reading.countedAt}>{plainMoment(reading.countedAt)}</time>.
    </>
  )

  const record = (
    <TechnicalDetail summary="Why a version can have no counters yet">
      <p>
        Readings are not counted as they arrive. A batch is held for the collection window — an
        hour on a default deployment — and counting it and forgetting it are one operation, so a
        version has nothing against it until the first run past that window. Somebody reading the
        page right now is in the buffer and in no counter.
      </p>
      <p>
        Counted version <span className="font-mono">{String(standing.counted)}</span>
        {standing.kind === "current"
          ? ", which is the version being served."
          : standing.kind === "unread"
            ? ". The version being served could not be read."
            : `, against version ${String(standing.live)} being served.`}
      </p>
      <p>
        Last rolled up at <span className="font-mono">{reading.countedAt}</span>.
      </p>
    </TechnicalDetail>
  )

  if (standing.kind === "current") {
    return (
      <div className="text-ink-muted flex flex-col gap-2 text-xs">
        <p>
          {standingNote(standing)}{" "}
          {countedUpTo}
        </p>
        {record}
      </div>
    )
  }

  return (
    <StateNotice tone="notice">
      <p>
        <strong className="text-ink font-medium">{standingNote(standing)}</strong>
      </p>
      {advice !== undefined && <p>{advice}</p>}
      <p>{countedUpTo}</p>
      {record}
    </StateNotice>
  )
}
