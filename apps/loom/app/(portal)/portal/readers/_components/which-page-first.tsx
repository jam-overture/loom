import Link from "next/link"

import { describeRankStanding } from "@jam-overture/loom/signals"

import { PartName } from "@/app/(portal)/_components/part-name"
import { Measured } from "@/app/(portal)/_components/screen"
import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import {
  fixFirstSummary,
  notYetInTheOrder,
  ONE_PER_PAGE,
  outOfTheOrder,
  RANK_STANDINGS_PLAIN,
  standingsHeld,
  whoItLoses,
  type FixFirst,
  type PageToFix,
} from "@/app/(portal)/_lib/fix-first"
import { versionOnTheRecord } from "@/app/(portal)/_lib/version"

/**
 * Which page to open first — the one thing this screen could not say about
 * itself.
 *
 * ## Why it is above the list and not a screen of its own
 *
 * The list below it **is** this order. Every page in the deployment already has
 * a card here with five readings on it, and the defect was never that the cards
 * were missing something: it was that they arrived in alphabetical order, so a
 * reader with nine pages had to open nine cards to find out which one needed
 * them. A second screen holding a league table would be a tenth thing to read
 * before reading anything.
 *
 * So the order is applied to the list, this says what the order is and names the
 * page at the top of it, and nothing moved anywhere else.
 *
 * ## What is on the surface, and what is one click down
 *
 * On the surface: which page, where on it readers leave, how many of them
 * against how many arrived, and a link to the page. One click down: the
 * counters' own figure for the same fall, the straddle rate that separates the
 * two, and the runtime's own line for every standing a page can be in.
 *
 * The two figures are the care this component exists to take. `readers` is the
 * loss at the door's scale and `lost` is what the counters say, and they are
 * different numbers for a good reason — so they are never in one sentence and
 * never three lines apart. `_lib/fix-first.ts` has the argument.
 */
export const WhichPageFirst = ({ fix }: { readonly fix: FixFirst }) => {
  const out = outOfTheOrder(fix)
  const waiting = notYetInTheOrder(fix)
  const held = standingsHeld(fix)

  return (
    /*
     * Full width, with the prose measured inside it rather than the section
     * measured around it.
     *
     * The first photograph had the whole section at `68ch` above a list of
     * full-width cards, and it read as a sidebar that had drifted to the top
     * rather than as the thing the list is ordered by. Sentences still wrap at a
     * readable measure; the card and the disclosure line up with the cards they
     * are about.
     */
    <section className="flex flex-col gap-3">
      <Measured className="gap-2">
        <h2 className="text-base tracking-tight">Which page should I fix first?</h2>

        <p className="text-ink-secondary text-sm">{fixFirstSummary(fix)}</p>
      </Measured>

      {fix.worst !== undefined && <Worst page={fix.worst} />}

      <Measured className="gap-2">
        {out !== undefined && <p className="text-ink-muted text-xs">{out}</p>}

        {waiting !== undefined && <p className="text-ink-muted text-xs">{waiting}</p>}
      </Measured>

      <TechnicalDetail summary="How this order is worked out, and the counters behind it">
        <p>{ONE_PER_PAGE}</p>

        <p>
          A page is placed by the readers it loses at its sharpest fall, put on the scale the
          arrival count is in: <span className="font-mono">lost ÷ (1 + inflation)</span>, where the
          inflation is that page&rsquo;s own{" "}
          {/*
           * `{" "}` and not a bare space, which the photograph is the only
           * thing that could have found. The space after this element is in the
           * DOM under the test transform and is **not** in the built page, so
           * every rendered assertion passed over a browser that printed
           * `openedoff`. Explicit wherever a word follows an element on the
           * same line; a comma or a full stop needs none and has none.
           */}
          <span className="font-mono">drift ÷ opened</span>{" "}
          off its own page-view row. The raw count is generous by every reader who straddled a
          roll-up window, and the straddle rate is each
          page&rsquo;s own — so two pages&rsquo; raw losses are not the same kind of number and the
          corrected ones are. Read by{" "}
          <span className="font-mono">deploymentReadingOf</span>, which never adds one page&rsquo;s
          loss to another&rsquo;s.
        </p>

        {fix.worst !== undefined && <OnTheRecord page={fix.worst} />}

        <p>
          Readers counted at the doors of the pages in this order:{" "}
          <span className="font-mono">{fix.arrivals}</span>. It is the one figure here that is added,
          and it is addable for the reason none of the others is: a reader arrived at one version of
          one page and was counted once.
        </p>

        <dl className="flex flex-col gap-2">
          {held.map((standing) => (
            <div key={standing} className="flex flex-col gap-0.5">
              <dt className="text-ink-secondary">
                {RANK_STANDINGS_PLAIN[standing].label}{" "}
                <span className="text-ink-muted">·</span>{" "}
                <span className="font-mono">{RANK_STANDINGS_PLAIN[standing].technical}</span>{" "}
                <span className="text-ink-muted">× {fix.standings[standing]}</span>
              </dt>
              <dd>{RANK_STANDINGS_PLAIN[standing].meaning}</dd>
              <dd className="font-mono">{describeRankStanding(standing)}</dd>
            </div>
          ))}
        </dl>
      </TechnicalDetail>
    </section>
  )
}

/**
 * The page at the top, which is the whole point of the section.
 *
 * Three sentences in the order a person needs them: which page, what happens on
 * it, and how many people that is. The link is last because it is the action,
 * and a reader who has not been told why they are going does not need it
 * sooner.
 */
const Worst = ({ page }: { readonly page: PageToFix }) => {
  const losing = whoItLoses(page)

  return (
    <div className="border-edge-subtle bg-surface-base flex flex-col gap-1.5 rounded-md border p-4">
      <p className="text-ink text-sm">
        Start with <span className="font-medium">{page.page.name}</span>{" "}
        <span className="text-ink-muted font-mono text-xs">{page.page.treeId}</span>.
      </p>

      {page.fall === undefined ? (
        /*
         * A fall whose two parts are not in the names handed over, which is a
         * part removed from the page since the window was counted. The share is
         * sound without any correction, so the row keeps the figure it has
         * rather than going quiet — and it says which part of itself is missing
         * instead of printing an identifier inside a sentence.
         */
        <p className="text-ink-secondary text-xs">
          This page loses more readers partway through than any other here. One of the two parts
          either side of that drop is no longer on the page, so it cannot be named.
        </p>
      ) : (
        <p className="text-ink-secondary text-sm">
          {page.fall.before}
          <PartName part={page.fall.reached} />
          {page.fall.between}
          <PartName part={page.fall.missed} />
          {page.fall.after}
        </p>
      )}

      {losing !== undefined && (
        <p className="text-ink-secondary text-xs">
          That is {losing}. It is the most of any page here.
        </p>
      )}

      <p className="text-xs">
        <Link href={`/portal/pages/${encodeURIComponent(page.treeId)}`}>
          Open {page.page.name} →
        </Link>
      </p>
    </div>
  )
}

/**
 * The counters' own figures for the page at the top, where the two numbers may
 * sit beside each other because a reader has asked for them and the sentence
 * between them says why they differ.
 */
const OnTheRecord = ({ page }: { readonly page: PageToFix }) => (
  <dl className="flex flex-wrap gap-x-5 gap-y-1">
    <Figure name="page" value={page.page.treeId} />
    <Figure name="at" value={versionOnTheRecord(page.revision)} />
    {page.lost !== null && <Figure name="lost" value={String(page.lost)} />}
    {page.inflation !== null && <Figure name="inflation" value={page.inflation.toFixed(3)} />}
    {page.readers !== null && <Figure name="readers" value={page.readers.toFixed(2)} />}
    {page.opened !== null && <Figure name="opened" value={String(page.opened)} />}
    {page.share !== null && <Figure name="share" value={page.share.toFixed(3)} />}
  </dl>
)

const Figure = ({ name, value }: { readonly name: string; readonly value: string }) => (
  <div className="flex gap-1">
    <dt className="text-ink-muted">{name}</dt>
    <dd className="font-mono">{value}</dd>
  </div>
)
