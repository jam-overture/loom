import { describeReachSilence } from "@jam-overture/loom/signals"

import { StateNotice } from "@/app/(portal)/_components/state-notice"
import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import {
  arrivalsSummary,
  cannotBeAShare,
  countsAreExact,
  countsAreGenerous,
  stillArriving,
  type PageArrivals,
} from "@/app/(portal)/_lib/arrivals"
import { plainMoment } from "@/app/(portal)/_lib/when"
import { versionOnTheRecord } from "@/app/(portal)/_lib/version"

/**
 * How many people were there, which is the denominator every other section of
 * this card divides by.
 *
 * ## Why it leads
 *
 * It is first of the four readings, and the order is the argument. Everything
 * below it is a rate, and until today every rate was divided by the largest
 * visit count any single row of the window reported — a floor, inflated by
 * every visit that was still being read when a counting window closed, with
 * nothing on the screen able to say by how much. *9 of the 36 visits* read as a
 * census and was not one.
 *
 * So this section says what the honest denominator is before a reader meets a
 * figure drawn against anything else, and names the other one out loud rather
 * than leaving somebody to notice that two sections of one card do not
 * reconcile. A caveat a reader has to arrive at after the conclusion is a
 * caveat that arrives too late — the same reason `/portal/trust` puts its
 * pass-rate sentence above its disclosure and not in it.
 *
 * ## It says the denominator and leaves the parts to the list
 *
 * *Of those 320, about 40 readers got as far as the small print* is the
 * sentence nothing else in the ecosystem can say — an analytics product
 * measures a URL and has no idea the page is made of parts — and it is **not
 * drawn here.** It is the first line of the card's own highlights, which has
 * named the part fewest people got to since before any of this existed and now
 * names it in people. A section that said it as well would be the two-figure
 * failure this section exists to end, reproduced inside the fix: one card, one
 * part, two numbers, three lines apart. The photograph of the first draft of
 * this file is what found it.
 *
 * ## What is a notice and what is a line
 *
 * One of the four nothings is about the deployment rather than about the page,
 * and it is the one worth interrupting for: **nothing is marking when a visit
 * begins**, which leaves every rate on this screen without a denominator while
 * the counters look perfectly healthy. That gets the tone this portal reserves
 * for a condition worth knowing that is not a failure. The other three are
 * lines, because waiting is the whole of what they ask for.
 *
 * A page whose readers never span a counting window gets a `settled` notice and
 * not a silence, for the reason that tone exists: it is the answer somebody who
 * shortened their window came here to check, and it must not arrive as a blank.
 *
 * ## What goes one click down
 *
 * Both denominators side by side, the straddle between them as a count and as a
 * share, what is still waiting to be counted, the runtime's own sentence for
 * whichever nothing applies, the rows the join dropped, and when the arrival
 * count last moved. Nothing is removed; a reader who wants to check the
 * arithmetic can, and a reader who wants the sentence never has to.
 */
export const HowManyWereThere = ({ arrivals }: { readonly arrivals: PageArrivals }) => {
  const summary = arrivalsSummary(arrivals)
  const exact = countsAreExact(arrivals)
  const generous = countsAreGenerous(arrivals)
  const waiting = stillArriving(arrivals)
  const stuck = cannotBeAShare(arrivals)

  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-sm tracking-tight">How many people were there?</h3>

      {arrivals.silence === "unopened" ? (
        <StateNotice tone="notice" title="Nothing is saying when a visit to this page begins.">
          <p>{summary}</p>
          <TechnicalDetail summary="Why every rate here has no denominator">
            <p>
              A visit is counted once as it begins, from the same broadcast that carries
              everything else this screen reads. Reading has been counted for this page and that
              opening mark has not arrived, which is usually an older copy of Loom on the site or
              a host that has switched the mark off — and it is the one fault in this subsystem
              whose symptom is that the counters look completely healthy.
            </p>
            <p className="font-mono">{describeReachSilence("unopened")}</p>
          </TechnicalDetail>
        </StateNotice>
      ) : (
        <p className="text-ink text-xs">{summary}</p>
      )}

      {exact !== undefined && (
        <StateNotice tone="settled">
          <p>{exact}</p>
        </StateNotice>
      )}

      {generous !== undefined && <p className="text-ink-muted text-xs">{generous}</p>}

      {waiting !== undefined && <p className="text-ink-muted text-xs">{waiting}</p>}

      {stuck !== undefined && (
        <StateNotice tone="notice">
          <p>{stuck}</p>
          <TechnicalDetail summary="Which parts, and why it clears itself">
            <p>
              Reach is counted out of the same windows as the appearances it is divided by, and a
              visit that reached a part in a window is a visit that appeared in it — so rows
              written by the same roll-ups cannot produce this. What can is per-part counters kept
              from before the arrival count existed, added up over windows whose appearances
              nobody kept.
            </p>
            <p className="font-mono">{arrivals.unreconciled.join(" · ")}</p>
          </TechnicalDetail>
        </StateNotice>
      )}

      <TechnicalDetail summary="The two denominators, and the straddle between them">
        <dl className="flex flex-col gap-2">
          <div>
            <dt className="font-mono">opened — {arrivals.arrived}</dt>
            <dd>
              Visits counted once each as they began, on {versionOnTheRecord(arrivals.revision)}.
              Exact, and addable across windows, versions and months.
            </dd>
          </div>
          <div>
            <dt className="font-mono">appearances — {arrivals.counted}</dt>
            <dd>
              The same visits as the roll-ups counted them: once per window each one appeared in.
              Every share of your readers on this card is a reach divided by this, which is what
              puts the over-count on both sides of the division and very nearly cancels it.
            </dd>
          </div>
          <div>
            <dt className="font-mono">drift — {arrivals.drift}</dt>
            <dd>
              Appearances in excess of openings. This is the straddle, measured rather than
              argued: the one error in these counters a deployment can act on, by setting a
              counting window longer than its readers stay.
            </dd>
          </div>
          <div>
            <dt className="font-mono">pending — {arrivals.pending}</dt>
            <dd>
              Openings no window of reading has been counted for yet. While this is above nought,
              a share has no number of people put on it.
            </dd>
          </div>
          <div>
            <dt className="font-mono">views — {arrivals.floor}</dt>
            <dd>
              The largest <span className="font-mono">views</span> any single row of this window
              reports. It cannot be added across rows, which is why it is a floor and not a count
              — and it is what every figure on this card was divided by until the arrivals above
              were joined to them.
            </dd>
          </div>
        </dl>

        {arrivals.inflation !== undefined && (
          <p>
            <span className="font-mono">
              inflation — {(arrivals.inflation * 100).toFixed(1)}%
            </span>{" "}
            is <span className="font-mono">drift ÷ opened</span>: how generous every raw count
            here is. The gap between a part&rsquo;s estimated share and its ceiling is the same
            fact seen per part.
          </p>
        )}

        {arrivals.silence !== undefined && (
          <p className="font-mono">{describeReachSilence(arrivals.silence)}</p>
        )}

        {arrivals.foreign > 0 && (
          <p>
            {arrivals.foreign} handed-in {arrivals.foreign === 1 ? "row was" : "rows were"} filed
            under another version of this page and{" "}
            {arrivals.foreign === 1 ? "was" : "were"} dropped by the join rather than divided in.
            Dividing one version&rsquo;s counters by another version&rsquo;s readers is the one
            mistake here that would make every rate quietly wrong.
          </p>
        )}

        {arrivals.duplicated > 0 && (
          <p>
            {arrivals.duplicated} further{" "}
            {arrivals.duplicated === 1 ? "row was" : "rows were"} handed in for this same version;
            the first stands and the rest were dropped. Openings are already a total, so adding
            them would double the denominator, and a later row is not the truer one.
          </p>
        )}

        {arrivals.countedAt === undefined ? (
          <p>
            There is no arrival row for this version of the page, so there is no instant to
            report against it.
          </p>
        ) : (
          <p>
            The arrival count last moved at{" "}
            <time dateTime={arrivals.countedAt}>{plainMoment(arrivals.countedAt)}</time> (
            <span className="font-mono">{arrivals.countedAt}</span>).
          </p>
        )}
      </TechnicalDetail>
    </section>
  )
}
