import { PageName } from "@/app/(portal)/_components/page-name"
import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import type { PageName as PageNameValue } from "@/app/(portal)/_lib/page-name"
import type { UnreadableChange } from "@/app/(portal)/_lib/unreadable-change"

/**
 * One row of the queue that nobody can answer.
 *
 * ## Why it is a card in the list and not a warning above it
 *
 * The obvious build is a notice at the top of the queue: *"1 change couldn't be
 * read."* It is smaller, it is easier, and it throws away the only fact the row
 * carries. An unreadable hold has no utterance, no rule and no effect — every
 * one of those lives inside the shape that would not parse — so **when it
 * stopped** is all there is, and a count at the top of a screen cannot carry
 * it. A row in its place in time can: a reader sees at a glance whether this
 * turned up an hour ago or has been sitting above four answerable changes since
 * July.
 *
 * That is also why it looks like the cards around it rather than like an error
 * box. It is not an error the portal hit while drawing this screen; it is an
 * item in the queue, and its state is *stuck*. Vercel draws a failed deployment
 * as a deployment with an Error badge, in the list, in time order — not as a
 * banner over the list.
 *
 * ## What is on the surface
 *
 * Four things, and the order is what a person asks in:
 *
 * 1. **What is this?** — a change, waiting, that cannot be read. The heading
 *    says so first, because a row with no quote on it is otherwise a card the
 *    reader has to decode.
 * 2. **Since when**, beside the page it is on. Same line, same shape and same
 *    `<time>` as every other row in this queue, because the comparison between
 *    rows is the reason the line exists.
 * 3. **Why there are no buttons.** The reader's next question, and the one a
 *    disabled pair of buttons would leave them guessing at.
 * 4. **Who can do something about it**, which is not them.
 *
 * ## What is one click down
 *
 * The row's own name in the store, the exact instant, and the store's account
 * of which field disagreed — which is the only thing that tells two of these
 * apart and the only thing the person who *can* fix it needs. Nothing is
 * removed to make the surface calm; it is moved.
 */
export const UnreadableChangeCard = ({
  change,
  page,
}: {
  readonly change: UnreadableChange
  /**
   * Which page it is on, named — or `undefined` on the page screen, where the
   * page is the screen and naming it on every row is noise.
   *
   * Passed in rather than read here for the reason `WaitingCard` gives: this is
   * one row of a queue drawn from several pages, and a component that read a
   * store per row would turn one listing into one read per change.
   */
  readonly page?: PageNameValue
}) => (
  <li className="border-edge-subtle bg-surface-base flex flex-col gap-3 rounded-md border border-dashed p-4">
    <header className="flex flex-col gap-1">
      <p className="text-sm font-medium">This change can&rsquo;t be read.</p>
      <p className="text-ink-muted text-xs">
        {page !== undefined && (
          <>
            <PageName page={page} layout="inline" /> ·{" "}
          </>
        )}
        <time dateTime={change.sinceIso}>waiting since {change.since}</time>
      </p>
    </header>

    {/*
      * The two sentences, in the shape the rest of the queue uses for "why it
      * stopped" — a filled block, because on a card with no quote at the top of
      * it this is the first thing with any content in it.
      */}
    <div className="bg-surface-hover text-ink-secondary flex flex-col gap-1 rounded-sm p-2 text-xs">
      <p>{change.why}</p>
      <p>{change.next}</p>
    </div>

    <TechnicalDetail summary="What Loom couldn't read">
      <p>
        <span className="font-mono">{change.proposalId}</span>
        <span className="text-ink-muted mt-1 block font-mono">{change.detail}</span>
      </p>
      {/*
       * The likeliest cause, named where the account is. It is a guess and it
       * is said as one: a row is skipped by 0175 when it can be placed and not
       * parsed, and by far the commonest way that happens is a store written by
       * a build that knows a field this one does not. Putting it on the surface
       * would be this screen asserting something it cannot check; leaving it
       * out entirely would waste the one click the reader who can act on it
       * already made.
       */}
      <p>
        The usual cause is a change written by a newer version of Loom than the one running
        here — the record is intact and this build doesn&rsquo;t recognise part of it. Loom
        skipped this one row rather than failing the whole list, so everything else on this page
        is still answerable.
      </p>
    </TechnicalDetail>
  </li>
)
