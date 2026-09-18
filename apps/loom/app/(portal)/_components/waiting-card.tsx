import Link from "next/link"

import { PageName } from "@/app/(portal)/_components/page-name"
import { PlainSentence } from "@/app/(portal)/_components/plain-sentence"
import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import type { PageName as PageNameValue } from "@/app/(portal)/_lib/page-name"
import type { WaitingChange } from "@/app/(portal)/_lib/waiting"

/**
 * One change waiting on somebody, on a screen that cannot show them the page.
 *
 * This is deliberately **not** the review card with the buttons taken off. The
 * page screen's `HeldProposalCard` can say what a proposal would *replace* —
 * the value a setting holds now, the place in the page, the words arriving and
 * leaving — because that screen has the page on it and the reader is looking at
 * it. A "before" that is not on the reader's screen is worse than no before. So
 * this card is triage, and then it hands the reader to the one place the
 * question can be answered properly.
 *
 * That is why the primary action is a link and not a form. It is not a missing
 * feature: answering a change from a screen that cannot show you the change is
 * exactly the sort of quick approval this whole surface exists to prevent
 * (0019).
 *
 * ## What triage turned out to need, 17 September
 *
 * For a fortnight this card said what was asked, why it stopped, and what
 * either answer would set in motion — and never what the change would *do*. Two
 * of those three are about the machinery around the change rather than about
 * the change, and a queue that lists three waiting items without saying which
 * one deletes a whole section has sorted nothing: the only way to find the big
 * one was to open all three, which is the errand this screen was built to
 * abolish.
 *
 * The forward sentence is not a before and needs nothing beside it. *"Deletes
 * the card “Prices” n_h, and the 12 pieces inside it"* is readable on a row,
 * and it is the fact that decides which row to open. So the first steps are on
 * the surface, the rest of them are one click down in the runtime's own words,
 * and everything that genuinely needs the page in front of you stayed where it
 * was.
 *
 * The other half of the old argument — *"this one has read no trees at all"* —
 * was already untrue when it was written. This screen reads the head of every
 * page it names, a hold's page included, and dropped the tree on the floor once
 * it had the heading off it.
 */
export const WaitingCard = ({
  change,
  page,
}: {
  readonly change: WaitingChange
  /**
   * Which page this is waiting on, named.
   *
   * Passed in rather than read here: this card is one row of a queue drawn from
   * several pages, and a component that read a store per row would turn one
   * listing into one read per waiting change.
   */
  readonly page: PageNameValue
}) => (
  <li className="border-edge-subtle bg-surface-base flex flex-col gap-3 rounded-md border p-4">
    <header className="flex flex-col gap-1">
      {/*
        * What somebody typed, first and in their own words. It is the only
        * string on a hold a human wrote, and on a queue drawn from several
        * pages it is what tells one row from the next.
        */}
      <p className="text-sm">&ldquo;{change.asked}&rdquo;</p>
      <p className="text-ink-muted text-xs">
        {change.actor === null ? change.origin.label : `${change.actor} asked for this`} ·{" "}
        <PageName page={page} layout="inline" /> ·{" "}
        <time dateTime={change.sinceIso}>waiting since {change.since}</time>
      </p>
    </header>

    <div className="bg-awaiting text-awaiting-ink flex flex-col gap-1 rounded-sm p-2 text-xs">
      <strong className="font-medium">Why it stopped</strong>
      <p>{change.why}</p>
    </div>

    {/*
      * What it would do, which is the fact that decides which row to open.
      *
      * Above the two answers rather than below them, and the order is the
      * argument: "if you say yes" is about the machinery a press sets in motion
      * and reads the same on every card in the queue, where this is the only
      * thing on the card that differs by how much of a page is at stake. A
      * reader who stops after two lines should have stopped after the two that
      * told them something.
      */}
    <section className="flex flex-col gap-1.5 text-xs">
      <h3 className="font-medium">What it would do</h3>

      {change.effect === undefined ? (
        /*
         * The page could not be read, said rather than shown as a change with
         * no steps in it. Those look identical and are opposite facts, and the
         * row is still worth keeping: everything above this line comes off the
         * held change itself and is unaffected by a store that would not answer.
         */
        <p className="text-ink-muted">
          We couldn&rsquo;t read this page just now, so we can&rsquo;t say what this would do to
          it. Nothing has happened to the change — open it on the page to see it.
        </p>
      ) : (
        <>
          {/*
            * The standing goes above the steps for the reason the page screen
            * puts the obstacle above them: a change that would be refused as it
            * stands is not a change to weigh, and reading the steps first spends
            * the reader's attention in the wrong order.
            */}
          {change.effect.standing !== null && (
            <div className="bg-surface-hover text-ink-secondary flex flex-col gap-0.5 rounded-sm p-2">
              <strong className="text-ink font-medium">{change.effect.standing.label}</strong>
              <p>{change.effect.standing.meaning}</p>
            </div>
          )}

          {change.effect.steps.length > 0 && (
            <ul className="text-ink-muted flex flex-col gap-1">
              {change.effect.steps.map((step, index) => (
                <li key={index}>
                  <PlainSentence line={step} />
                </li>
              ))}
            </ul>
          )}

          {/*
            * The steps the preview does not show, counted out loud. A list of
            * two that is really five is an account with three steps missing and
            * no way for a reader to tell — the same rule the review queue
            * applies to the words a change takes away.
            */}
          {change.effect.more !== null && (
            <p className="text-ink-placeholder">{change.effect.more}</p>
          )}

          {/*
            * Every step, including the ones the preview cut, in the words the
            * change record uses. The cut is a decision about how tall a row is
            * and must not become a decision about what a reader may find out —
            * so the rest is one click down rather than gone.
            *
            * Its own disclosure rather than a paragraph inside "How Loom decided
            * this": that one answers why the change stopped, this one answers
            * what the change says, and a reader opening either should not have
            * to read the other.
            */}
          <TechnicalDetail summary="Every step, as the change record has it">
            <ul className="flex flex-col gap-1">
              {change.effect.technical.map((step, index) => (
                <li key={index} className="font-mono">
                  {step}
                </li>
              ))}
            </ul>
            {change.effect.standing !== null && (
              <p className="font-mono">{change.effect.standing.technical}</p>
            )}
          </TechnicalDetail>
        </>
      )}
    </section>

    {/*
      * The two sentences the portal has never said out loud. A reviewer about
      * to press one of two buttons is entitled to know what each one sets in
      * motion before they arrive at the screen with the buttons on it.
      */}
    <dl className="flex flex-col gap-2 text-xs">
      <div className="flex flex-col gap-0.5">
        <dt className="font-medium">If you say yes</dt>
        <dd className="text-ink-muted">{change.answers.yes}</dd>
      </div>
      <div className="flex flex-col gap-0.5">
        <dt className="font-medium">If you say no</dt>
        <dd className="text-ink-muted">{change.answers.no}</dd>
      </div>
    </dl>

    {/*
      * Outlined, not the filled black button, and this is a correctness point
      * rather than a taste one. The palette's rule is that the single filled
      * shape on a screen *is* the affirmative action, and nothing on this card
      * affirms anything — pressing it navigates. A screenshot of the first
      * draft had two black buttons on one screen, either of which a reader
      * could reasonably have read as "apply", on the one surface whose whole
      * purpose is that nobody approves a change without looking at it.
      */}
    <div>
      <Link
        href={change.href}
        className="bg-neutral text-neutral-ink border-neutral-edge hover:bg-surface-hover inline-block rounded-md border px-3 py-1.5 text-xs no-underline"
      >
        Look at it on the page →
      </Link>
    </div>

    <TechnicalDetail summary="How Loom decided this">
      <p>
        <strong className="font-medium">{change.stakes.label}.</strong> {change.stakes.meaning}{" "}
        {change.confidence}.
      </p>
      <dl className="flex flex-wrap gap-x-4 gap-y-1">
        <div className="flex gap-1">
          <dt className="text-ink-muted">rule</dt>
          <dd className="font-mono">{change.ruleCode}</dd>
        </div>
        <div className="flex gap-1">
          <dt className="text-ink-muted">stakes</dt>
          <dd className="font-mono">{change.stakes.technical}</dd>
        </div>
        <div className="flex gap-1">
          <dt className="text-ink-muted">proposal</dt>
          <dd className="font-mono">{change.proposalId}</dd>
        </div>
        <div className="flex gap-1">
          <dt className="text-ink-muted">origin</dt>
          <dd className="font-mono">{change.origin.technical}</dd>
        </div>
      </dl>
      <p>
        The full judgment — the policy that made it, the AI&rsquo;s own confidence as a number,
        and what the change would replace — is on the page itself, where the tree can be read
        beside it.
      </p>
    </TechnicalDetail>
  </li>
)
