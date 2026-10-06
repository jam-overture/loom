import Link from "next/link"

import { PageName } from "@/app/(portal)/_components/page-name"
import { PartName } from "@/app/(portal)/_components/part-name"
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

import type { PagePacing } from "@/app/(portal)/_lib/pacing"
import type { PageSkipping } from "@/app/(portal)/_lib/skipped"
import type { PageStopping } from "@/app/(portal)/_lib/stopping"

import { CountedAgainst } from "./counted-against"
import { HadTimeToRead } from "./had-time-to-read"
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

  return (
    <section className="border-edge-subtle flex flex-col gap-4 rounded-md border p-4">
      <header className="flex flex-col gap-1">
        <h2 className="text-base tracking-tight">
          <PageName page={page} layout="inline" />
        </h2>
        <p className="text-ink-muted text-xs">{visitsHeard(newest, standing)}</p>
      </header>

      <CountedAgainst reading={newest} standing={standing} />

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
        {highlights.fewestSaw === undefined ? (
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
            {highlights.longest.reached} who got there.
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
        <WhatWasSkipped skipping={skipping} />
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
