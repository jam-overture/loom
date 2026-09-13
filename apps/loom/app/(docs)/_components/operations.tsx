import {
  produceAudits,
  produceBoundedRead,
  producePlacements,
  produceWaitingTooLong,
  type AuditCase,
  type Placement,
} from "@/app/(docs)/_lib/operations/checks"

/**
 * The three blocks on the operations page, each printing what the runtime
 * actually said.
 *
 * Async for the reason `WriteEndings` is: the answers are produced as the page
 * builds — one store opened, five asks sent, three audits run — and a producer
 * that stops reaching its outcome throws rather than letting the page print a
 * confident lie. Nothing here is cached and nothing here is typed.
 *
 * The blocks are furniture in 0067's sense, like every other generated table on
 * this site: they present something the repository knows, and they are not a
 * component library growing beside the primitives. What a reader is *shown as
 * a page* on this site is a `LoomTree` through the runtime, and that is still
 * true — the example frame two sections above these blocks is one.
 */

/** The sentence a row's outcome is worth, in words a reader could repeat. */
const PLACEMENT_STORY: Record<Placement["outcome"], string> = {
  placed: "put here by a change in the log",
  seeded: "was on the page before the log starts",
  undetermined: "the read stopped before it found out",
}

const Touches = ({ placement }: { readonly placement: Placement }) =>
  placement.since.length === 0 ? (
    <span className="text-ink-faint">nothing since</span>
  ) : (
    <>
      {placement.since.map((touch) => (
        <span key={`${touch.revision}-${touch.effect}`} className="block">
          {touch.effect} by {touch.actor} at {`r${touch.revision}`}
        </span>
      ))}
    </>
  )

/**
 * One row per node of a real page, and the row a reader should look at twice is
 * the second one: the sentence inside the card, placed by the same revision as
 * the card and never asked for.
 */
export const WhoPlacedIt = async () => {
  const placements = await producePlacements()

  return (
    <div className="not-prose border-edge my-6 overflow-x-auto rounded-lg border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-surface-sunken text-ink">
            <th className="border-edge border-b px-3 py-2 text-left font-semibold">On the page</th>
            <th className="border-edge border-b px-3 py-2 text-left font-semibold">How it got there</th>
            <th className="border-edge border-b px-3 py-2 text-left font-semibold">Asked for?</th>
            <th className="border-edge border-b px-3 py-2 text-left font-semibold">Since then</th>
          </tr>
        </thead>
        <tbody>
          {placements.map((placement) => (
            <tr
              key={placement.nodeId}
              className="border-edge border-b last:border-b-0"
              data-node={placement.nodeId}
            >
              <td className="text-ink px-3 py-2 align-top text-xs">{placement.label}</td>
              <td className="text-ink-muted px-3 py-2 align-top text-xs" data-outcome={placement.outcome}>
                {placement.placedBy === undefined
                  ? PLACEMENT_STORY[placement.outcome]
                  : `${placement.placedBy}, at r${placement.placedAt ?? "?"}`}
              </td>
              <td className="text-ink-faint px-3 py-2 align-top text-xs">
                {placement.named === undefined
                  ? "—"
                  : placement.named
                    ? "yes, by name"
                    : "no — it came with something else"}
              </td>
              <td className="text-ink-faint px-3 py-2 align-top text-xs">
                <Touches placement={placement} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * What the same call says when it is given one page of log instead of five.
 *
 * A sentence rather than a table, because there is one number in it that
 * matters and a table would bury it.
 */
export const BoundedRead = async () => {
  const bounded = await produceBoundedRead()

  return (
    <p
      className="not-prose border-edge bg-surface-sunken text-ink-muted my-6 rounded-lg border px-4 py-3 text-sm"
      data-examined-to={bounded.examinedTo ?? "none"}
    >
      Asked for <span className="font-mono text-xs">{"{ pages: 1 }"}</span> against the same page,
      the walk read back as far as revision{" "}
      <span className="text-ink font-mono text-xs">{bounded.examinedTo ?? "none"}</span> and stopped
      with <span className="text-ink font-mono text-xs">{bounded.undetermined}</span> of those rows
      still unanswered. It says so, in that many{" "}
      <span className="font-mono text-xs">undetermined</span> results, rather than calling them
      seeded — the node was placed at or before the revision it names.
    </p>
  )
}

const AUDIT_TITLE: Record<AuditCase["outcome"], string> = {
  agrees: "The page is what its history says",
  diverged: "The page is not what its history says",
  unreplayable: "The history cannot be read",
}

const Differences = ({ audit }: { readonly audit: AuditCase }) => (
  <div className="bg-surface-sunken border-edge rounded-md border px-3 py-2">
    <p className="text-ink-faint m-0 text-[0.6875rem] tracking-wide uppercase">
      What the audit reported
    </p>
    {audit.mismatch === undefined ? (
      audit.differences.length === 0 ? (
        <p className="text-ink m-0 font-mono text-xs" data-said={audit.outcome}>
          {`outcome: "${audit.outcome}", at revision ${audit.revision ?? "none"}`}
        </p>
      ) : (
        <p className="text-ink m-0 font-mono text-xs" data-said={audit.outcome}>
          {audit.differences
            .map((difference) =>
              difference.code === "changed"
                ? `${difference.label} (${difference.nodeId}) differs: ${difference.facets.join(", ")}`
                : `${difference.label} (${difference.nodeId}) is ${difference.code}`
            )
            .join("; ")}
        </p>
      )
    ) : (
      <p className="text-ink m-0 font-mono text-xs" data-said={audit.outcome}>
        {audit.mismatch}
      </p>
    )}
  </div>
)

/**
 * The three things an audit can say, produced by three audits.
 *
 * Cards rather than a table, for the reason the write endings are cards: the
 * two fields that matter — what the runtime reported and what an operator does
 * about it — are the two a table would squeeze thinnest.
 */
export const SnapshotAudits = async () => {
  const audits = await produceAudits()

  return (
    <ul className="not-prose my-6 flex list-none flex-col gap-3 pl-0">
      {audits.map((audit) => (
        <li
          key={audit.outcome}
          className="border-edge bg-surface m-0 rounded-lg border p-0"
          data-audit={audit.outcome}
        >
          <div className="border-edge flex flex-wrap items-baseline justify-between gap-2 border-b px-4 py-3">
            <p className="text-ink m-0 text-base font-semibold">{AUDIT_TITLE[audit.outcome]}</p>
            <p className="text-ink-faint m-0 font-mono text-xs">{audit.outcome}</p>
          </div>

          <div className="flex flex-col gap-3 px-4 py-3">
            <p className="text-ink-muted m-0 text-sm">{audit.story}</p>
            <Differences audit={audit} />
            <p className="text-ink-muted m-0 text-sm">
              <span className="text-ink font-semibold">What you do. </span>
              {audit.yourMove}
            </p>
          </div>
        </li>
      ))}
    </ul>
  )
}

/**
 * The sequence, in the order it happened, with the runtime's own sentence at
 * the end of it.
 *
 * An ordered list rather than a table: this is a story about time, and the one
 * thing a reader has to take away is that the two revision numbers are
 * different.
 */
export const AnswerArrivingLate = async () => {
  const waiting = await produceWaitingTooLong()

  return (
    <ol className="not-prose border-edge bg-surface my-6 flex list-none flex-col gap-0 rounded-lg border pl-0">
      <li className="border-edge text-ink-muted m-0 border-b px-4 py-3 text-sm">
        The Gate holds ravi&rsquo;s change and puts it in the queue.{" "}
        <span className="text-ink-faint">
          {waiting.queuedBefore} waiting, judged against revision{" "}
          <span className="text-ink font-mono text-xs" data-held-against>
            {waiting.heldAgainst}
          </span>
          .
        </span>
      </li>
      <li className="border-edge text-ink-muted m-0 border-b px-4 py-3 text-sm">
        Dana&rsquo;s change lands while it waits.{" "}
        <span className="text-ink-faint">
          The page is now at revision{" "}
          <span className="text-ink font-mono text-xs" data-head-when-answered>
            {waiting.headWhenAnswered}
          </span>
          .
        </span>
      </li>
      <li className="border-edge text-ink-muted m-0 border-b px-4 py-3 text-sm">
        Somebody answers yes.{" "}
        <span className="text-ink-faint">
          The write ends <span className="text-ink font-mono text-xs">{waiting.kind}</span>, and the
          runtime says:
        </span>
        <span className="bg-surface-sunken border-edge text-ink mt-2 block rounded-md border px-3 py-2 font-mono text-xs" data-said>
          {waiting.said}
        </span>
      </li>
      <li className="text-ink-muted m-0 px-4 py-3 text-sm">
        The queue holds{" "}
        <span className="text-ink font-mono text-xs" data-queued-after>
          {waiting.queuedAfter}
        </span>{" "}
        changes.{" "}
        <span className="text-ink-faint">
          Custody ended when it was answered, because a change that can never apply again is not
          left in a queue for somebody to try a second time.
        </span>
      </li>
    </ol>
  )
}
