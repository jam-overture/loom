import Link from "next/link"

import { PageName } from "@/app/(portal)/_components/page-name"
import { PlainSentence } from "@/app/(portal)/_components/plain-sentence"
import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import type { PageName as PageNameValue } from "@/app/(portal)/_lib/page-name"
import type { UnattendedChange } from "@/app/(portal)/_lib/unattended"
import { readingOf } from "@/app/(portal)/_lib/vocabulary"

/**
 * One change that reached a page with nobody asked.
 *
 * The mirror of `WaitingCard`, and deliberately the opposite way round. A
 * waiting change leads with **what somebody typed**, because it has not
 * happened yet and the reader is deciding whether it should. This one has
 * already happened, so it leads with **what it did** — the reader is not
 * deciding anything, they are finding out.
 *
 * The two cards share a shape on purpose: the same three-part body, the same
 * colored strip carrying the Gate's own reason, the same disclosure at the
 * foot. A person who has learnt to read one of them can read the other.
 *
 * The strip is `applied` rather than `awaiting`, which is the only visual
 * decision on this card that matters. These changes are *not* a warning and
 * dressing them as one would be the portal crying wolf about its own runtime
 * working correctly. What they are is **news** — and news a person can act on,
 * which is what the link at the foot is for.
 */
export const UnattendedCard = ({
  change,
  page,
}: {
  readonly change: UnattendedChange
  /**
   * Which page this landed on, named. Passed in for the reason `WaitingCard`
   * takes it: this is one row of a list drawn from several pages, and a
   * component that read a store per row would turn one read into one per row.
   */
  readonly page: PageNameValue
}) => (
  <li className="border-edge-subtle bg-surface-base flex flex-col gap-3 rounded-md border p-4">
    {/*
     * What it did, first and in the portal's plain sentences. On a list drawn
     * from several pages this is also what tells one row from the next — the
     * counterpart of the utterance on a waiting change, which a committed one
     * does not carry: the journal records how long somebody's request was and
     * never what it said.
     */}
    <ul className="flex flex-col gap-1 text-sm">
      {change.did.map((line, index) => (
        <li key={`${readingOf(line)}-${index}`}>
          <PlainSentence line={line} />
        </li>
      ))}
    </ul>

    <p className="text-ink-muted text-xs">
      {change.who} <PageName page={page} layout="inline" /> ·{" "}
      <time dateTime={change.whenIso}>{change.when}</time>
    </p>

    {change.why !== undefined && (
      <div className="bg-applied text-applied-ink flex flex-col gap-1 rounded-sm p-2 text-xs">
        <strong className="font-medium">Why you weren&rsquo;t asked</strong>
        <p>{change.why}</p>
      </div>
    )}

    {/*
     * The one thing to do about it. Not an undo button: the portal is a review
     * queue rather than a design tool (0019), and undoing a change from a
     * screen that cannot show you the page is exactly the unlooked-at write
     * this surface exists to prevent. What the link leads to is the change's
     * own inverse, spelled out — what putting it back would restore — which is
     * the thing a person deciding whether to undo actually needs and which
     * only a replay of the log can produce.
     */}
    <div className="flex flex-wrap items-center gap-3 text-xs">
      <Link
        href={change.href}
        className="bg-neutral text-neutral-ink border-neutral-edge hover:bg-surface-hover inline-block rounded-md border px-3 py-1.5 no-underline"
      >
        See what undoing it would put back &rarr;
      </Link>
      {change.undo !== undefined && <span className="text-ink-muted">{change.undo}</span>}
    </div>

    <TechnicalDetail summary="How Loom decided this">
      <p>
        {change.stakes !== undefined && (
          <>
            <strong className="font-medium">{change.stakes.label}.</strong>{" "}
            {change.stakes.meaning}{" "}
          </>
        )}
        {change.sure}
      </p>
      <dl className="flex flex-wrap gap-x-4 gap-y-1">
        <div className="flex gap-1">
          <dt className="text-ink-muted">confidence</dt>
          <dd className="font-mono">{change.technical.confidence.toFixed(2)}</dd>
        </div>
        {change.technical.reason !== undefined && (
          <div className="flex gap-1">
            <dt className="text-ink-muted">rule</dt>
            <dd className="font-mono">{change.technical.reason}</dd>
          </div>
        )}
        {change.technical.policyId !== undefined && (
          <div className="flex gap-1">
            <dt className="text-ink-muted">policy</dt>
            <dd className="font-mono">{change.technical.policyId}</dd>
          </div>
        )}
        <div className="flex gap-1">
          <dt className="text-ink-muted">proposal</dt>
          <dd className="font-mono">{change.proposalId}</dd>
        </div>
        <div className="flex gap-1">
          <dt className="text-ink-muted">revision</dt>
          <dd className="font-mono">{change.revision}</dd>
        </div>
      </dl>

      {/*
       * The delta, as the delta model states it. New here, and it is the half
       * that keeps the sentences above honest: they name a part — *the card* —
       * where they used to spell `a loom.card` at the reader, and the exact
       * type has to stay somewhere. This is that somewhere.
       */}
      <ul className="flex flex-col gap-1">
        {change.record.map((described, index) => (
          <li
            key={`${described.subject}-${index}`}
            className="border-edge-subtle border-l-2 pl-3"
          >
            {described.verb} <span className="font-mono">{described.subject}</span>{" "}
            <span className="text-ink-muted">{described.detail}</span>
          </li>
        ))}
      </ul>
      <p>
        Nobody was asked because the Gate&rsquo;s rules did not require it. That is a property of
        the policy this deployment runs, not of this change &mdash; what Loom may do here without
        asking is on <Link href="/portal/rules">what Loom is allowed to do</Link>.
      </p>
    </TechnicalDetail>
  </li>
)
