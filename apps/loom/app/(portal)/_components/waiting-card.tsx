import Link from "next/link"

import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import type { WaitingChange } from "@/app/(portal)/_lib/waiting"

/**
 * One change waiting on somebody, on a screen that cannot show them the page.
 *
 * This is deliberately **not** the review card with the buttons taken off. The
 * page screen's `HeldProposalCard` can say what a proposal would replace,
 * because that screen has read the tree and the reader is looking at it; this
 * one is drawn from a list of holds across every page and has read no trees at
 * all. A "before" that is not on the reader's screen is worse than no before,
 * so what this card does is triage — what was asked, why it stopped, what
 * either answer would do — and then hand the reader to the one place the
 * question can be answered properly.
 *
 * That is why the primary action is a link and not a form. It is not a missing
 * feature: answering a change from a screen that cannot show you the change is
 * exactly the sort of quick approval this whole surface exists to prevent
 * (0019).
 */
export const WaitingCard = ({ change }: { readonly change: WaitingChange }) => (
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
        <span className="font-mono">{change.treeId}</span> ·{" "}
        <time dateTime={change.sinceIso}>waiting since {change.since}</time>
      </p>
    </header>

    <div className="bg-awaiting text-awaiting-ink flex flex-col gap-1 rounded-sm p-2 text-xs">
      <strong className="font-medium">Why it stopped</strong>
      <p>{change.why}</p>
    </div>

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
