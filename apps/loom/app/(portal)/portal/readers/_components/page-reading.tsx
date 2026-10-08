import Link from "next/link"

import { PageName } from "@/app/(portal)/_components/page-name"
import { PartName } from "@/app/(portal)/_components/part-name"
import { PlainSentence } from "@/app/(portal)/_components/plain-sentence"
import type { PageName as PageNameValue } from "@/app/(portal)/_lib/page-name"
import {
  comparisonOf,
  countingStanding,
  dwellEach,
  highlightsOf,
  outOfVisits,
  pageUse,
  plainDuration,
  unplacedUse,
  visitsHeard,
  type PageReading,
} from "@/app/(portal)/_lib/reading-view"

import { gotThisFar, type PageArrivals } from "@/app/(portal)/_lib/arrivals"
import type { PagePacing } from "@/app/(portal)/_lib/pacing"
import type { PageSkipping } from "@/app/(portal)/_lib/skipped"
import type { PageStopping } from "@/app/(portal)/_lib/stopping"

import { CountedAgainst } from "./counted-against"
import { HadTimeToRead } from "./had-time-to-read"
import { HowManyWereThere } from "./how-many-were-there"
import { PartCounters } from "./part-counters"
import { SinceTheChange } from "./since-the-change"
import { SkippingUnavailable, WhatWasSkipped } from "./what-was-skipped"
import { UnplacedUseNote, WhatWasUsed } from "./what-was-used"
import { WhereTheyStop } from "./where-they-stop"

/**
 * One page, and what people did on it.
 *
 * ## A handful of sentences, not a dashboard
 *
 * The counters hold ten numbers per part and a page has dozens of parts, which
 * is several hundred figures — and a screen that renders them is the portal's
 * original defect in a new place: everything at one altitude, and the reader
 * left to work out which of it matters. Vercel does not open a project on a
 * table of every request.
 *
 * So the surface is a short list, each line naming one part in a person's
 * words: the part fewest people got to, where they stayed longest, how many
 * visits did anything at all and which part saw the most of it, what was
 * clicked most, what was opened most. Every other number is one click down in
 * `PartCounters`, in full, including the ones these sentences rounded.
 *
 * Two of them are the ones worth having. *Fewest people got to the footer* is a
 * fact about a page that its author cannot get from anywhere else and can act
 * on this afternoon; *twelve of the forty visits used something in the pricing
 * band* is the same kind of fact about a **region**, which is the half this
 * card could not say at all until the counter that is about a region was read.
 * `WhatWasUsed` carries that argument.
 *
 * ## Why a sentence can be absent
 *
 * Nothing clicked is a real answer and is said in words. A page whose sections
 * silently disappear when their number is zero leaves a reader unable to tell
 * *Loom looked and there was nothing* from *Loom did not look*, which is the
 * distinction `StateNotice` exists for and the same one that made `settled` a
 * tone rather than an empty box.
 *
 * The comparison block was the one section still breaking that rule, and it was
 * the most valuable one on the card. `SinceTheChange` is now drawn
 * unconditionally and `Comparison` has no empty arm.
 *
 * ## Why the card is told which version is being served
 *
 * Because the sentence at the top of it is only true of one version. Counters
 * are counted a window behind, so the newest counted version is not the page
 * being served for as long as an hour after every change — and for that hour
 * this card was saying *"…have reported back since it was last changed"* over
 * figures gathered before the change. `live` is the revision of the page in the
 * store and is `undefined` when that read did not come back; `countingStanding`
 * turns the pair into the four things that can be true, and `CountedAgainst`
 * says which out loud in every one of them.
 */
export const PageReadingCard = ({
  reading,
  page,
  live,
  skipping,
  stopping,
  pacing,
  arrivals,
}: {
  readonly reading: PageReading
  readonly page: PageNameValue
  /** The revision of the page being served, or `undefined` if it could not be read. */
  readonly live: number | undefined
  /**
   * Which parts of the page nobody got to, or `undefined` when the counted
   * version is not the one being served — in which case the question cannot be
   * answered at all and the card says so.
   */
  readonly skipping: PageSkipping | undefined
  /**
   * Where reading falls off, or `undefined` for exactly the same reason and from
   * exactly the same pair: both readings are a window joined to the page it was
   * filed against, so neither is answerable without the other's page. One notice
   * covers both rather than two identical ones.
   */
  readonly stopping: PageStopping | undefined
  /**
   * Whether the people who got to each part had time to read it, or `undefined`
   * in the same cases as the two above and from the same join.
   */
  readonly pacing: PagePacing | undefined
  /**
   * How many people were actually there, and how many of them got to each part
   * — or `undefined` in the same cases as the three above and off the same
   * join.
   *
   * It is the denominator the other three are divided by, so when it is here it
   * is drawn **first**: a reader who has already met *9 of the 36 visits* has
   * read a figure against a floor and taken it for a census, and a correction
   * met afterwards is a correction that arrives too late.
   */
  readonly arrivals: PageArrivals | undefined
}) => {
  const newest = reading.revisions[0]!
  const highlights = highlightsOf(newest)
  const standing = countingStanding(reading, live)
  const comparison = comparisonOf(reading)

  /*
   * Read here rather than inside the list, so the card holds one answer to
   * "did anybody use this page" and cannot draw the sentence and its caveat at
   * the same time. `unplacedUse` is undefined whenever `pageUse` is not, and
   * the pair is the only reason a reader can tell an unused page from an
   * unreported one.
   */
  const use = pageUse(newest)
  const unplaced = unplacedUse(newest)

  /*
   * The card's oldest sentence, in people rather than in visits.
   *
   * It has named the part fewest people got to since this card was written, and
   * it named it against the largest visit count any single row of the window
   * reported — a floor, carrying the over-count of every visit still being read
   * when a counting window closed. `gotThisFar` is the same claim divided by
   * the exact number of readers who arrived.
   *
   * It replaces the line rather than joining it, and that is the whole lesson
   * of this branch's first photograph: one card saying *96 of the 384 visits*
   * and *about 80 of the 320 readers* about one part, three lines apart, is
   * worse than either sentence alone. `undefined` falls back to the figure this
   * line has always carried, which the section above says it is falling back
   * to.
   */
  const fewest = arrivals === undefined ? undefined : gotThisFar(arrivals)

  return (
    <section className="border-edge-subtle flex flex-col gap-4 rounded-md border p-4">
      <header className="flex flex-col gap-1">
        <h2 className="text-base tracking-tight">
          <PageName page={page} layout="inline" />
        </h2>
        <p className="text-ink-muted text-xs">{visitsHeard(newest, standing)}</p>
      </header>

      <CountedAgainst reading={newest} standing={standing} />

      {/*
       * **Above everything it is the denominator of, which is everything.**
       *
       * Every figure on this card used to be divided by the largest visit count
       * any single row of the window reported — a floor, inflated by every visit
       * still being read when a counting window closed, with nothing on the
       * screen able to say by how much. *9 of the 36 visits* read as a census
       * and was not one.
       *
       * It sits here rather than beside the readings below it because a
       * correction a reader reaches after the conclusion is a correction that
       * arrives too late. The first draft of this branch put it third, and the
       * photograph showed the card saying *96 of the 384 visits* and *about 80
       * of the 320 readers* about the same part, three lines apart.
       *
       * Absent on a version gap along with the other three readings, which
       * `SkippingUnavailable` below already accounts for in one notice rather
       * than four.
       */}
      {arrivals !== undefined && <HowManyWereThere arrivals={arrivals} />}

      <ul className="flex flex-col gap-2 text-xs">
        {/*
         * **Scoped to the parts people reported on, and it used to claim the
         * page.** Every figure in this list is read off rows, and a part nobody
         * got to has no row — so *fewest people got as far as the opening line*
         * was being printed directly above *nobody got to the other three
         * parts*, which is a contradiction a reader meets before they have
         * finished the card. It was invisible until the section below existed
         * to disagree with it, and a screenshot is what found it.
         *
         * Nothing is removed and no number changes. What changes is that the
         * sentence now says which parts it compared, which is what it always
         * meant.
         */}
        {fewest !== undefined ? (
          <li className="text-ink">
            <PlainSentence line={fewest} />
          </li>
        ) : highlights.fewestSaw === undefined ? (
          <li className="text-ink-muted">
            Every part people reported on was seen by about as many of them as every other.
          </li>
        ) : (
          <li className="text-ink">
            Of the parts people reported on, fewest got as far as{" "}
            <PartName part={highlights.fewestSaw.name} /> —{" "}
            {outOfVisits(highlights.fewestSaw.reached, newest.views)}.
            {/*
             * **The fact stays and the advice that used to end this line is
             * gone.** It read *"If anything on this page is worth moving up, it
             * is what sits above that."* — a claim about reading order drawn
             * from a page-wide minimum, and 0221 is explicit that a minimum does
             * not support one: a part three levels inside the first band comes
             * before the second band in reading order and is reached by fewer
             * visits than either, so the part with the smallest reach is
             * routinely a part nothing stopped at.
             *
             * `WhereTheyStop` asks it between two siblings, which is the only
             * comparison that answers it, and names the part to look at there.
             * Nothing is removed from this screen by that: an unsound inference
             * is not a fact somebody loses, and the number it was drawn from is
             * still the first half of this very sentence.
             */}
          </li>
        )}

        {highlights.longest !== undefined && (
          <li className="text-ink">
            People stayed longest on <PartName part={highlights.longest.name} /> —{" "}
            {plainDuration(dwellEach(highlights.longest))} each, for the{" "}
            {highlights.longest.reached} visits that got there.
          </li>
        )}

        {use !== undefined && <WhatWasUsed use={use} views={newest.views} />}

        {highlights.mostClicked === undefined && highlights.mostOpened === undefined ? (
          <li className="text-ink-muted">
            Nobody clicked or opened anything. Readers are looking at this page rather than
            using it.
          </li>
        ) : (
          <>
            {highlights.mostClicked !== undefined && (
              <li className="text-ink">
                <PartName part={highlights.mostClicked.name} /> was clicked{" "}
                {highlights.mostClicked.activations}{" "}
                {highlights.mostClicked.activations === 1 ? "time" : "times"} — more than
                anything else here.
              </li>
            )}
            {highlights.mostOpened !== undefined && (
              <li className="text-ink">
                <PartName part={highlights.mostOpened.name} /> was opened{" "}
                {highlights.mostOpened.opens}{" "}
                {highlights.mostOpened.opens === 1 ? "time" : "times"}. Something people want is
                tucked away in there.
              </li>
            )}
          </>
        )}

        {unplaced !== undefined && <UnplacedUseNote unplaced={unplaced} />}
      </ul>

      {/*
       * Before the comparison and after the highlights, which is reading order
       * rather than an arrangement: *which parts did people get to* is a
       * question about this version of the page, and *what changed since the
       * last change* is a question about two. A reader who has not yet been
       * told what happened on the page in front of them has nothing to compare.
       */}
      {skipping === undefined ? (
        <SkippingUnavailable counted={newest.revision} live={live} />
      ) : (
        <WhatWasSkipped skipping={skipping} arrivals={arrivals} />
      )}

      {/*
       * After it, because it is the sharper question and it needs the looser one
       * first. *Which parts did people get to* establishes that the page was
       * read at all; *between which two parts do they leave* is only a sentence
       * once a reader has that. They also come apart: a page whose every part is
       * read, with nothing trailing, can still lose four in ten people at one
       * gap, and before this section there was nothing on the screen that could
       * say so.
       */}
      {stopping !== undefined && <WhereTheyStop stopping={stopping} />}

      {/*
       * Last of the three, because it is the only one that can contradict the
       * other two and it needs them in front of a reader first. *Every part was
       * seen* and *nobody stopped anywhere* are both true of a page nobody had
       * time to read, and a reader who meets this section cold has no way to
       * tell it apart from a fourth way of saying the same thing. Met after
       * those two, it is the sentence that tells them the page they just read as
       * healthy is not.
       *
       * It is handed the drop-off reading as well as its own, for one sentence:
       * when the part most words went past unread in is the same part people
       * stop going at, two readings built on different arithmetic have agreed,
       * and that is the strongest thing this card can say.
       */}
      {pacing !== undefined && <HadTimeToRead pacing={pacing} stopping={stopping} />}

      <SinceTheChange comparison={comparison} standing={standing} />

      <PartCounters reading={newest} />

      {/*
       * The way out of this screen and into the page it is about. Every other
       * scoped view of a page is one strip away from there, so this is one link
       * rather than five: a card in a list is not the place to reproduce the
       * strip, and a reader who wants the history of this page wants to be
       * looking at the page first.
       */}
      <p className="text-xs">
        <Link href={`/portal/pages/${encodeURIComponent(reading.treeId)}`}>
          Look at this page →
        </Link>
      </p>
    </section>
  )
}
