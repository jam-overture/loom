import {
  produceAnswers,
  produceQueue,
  produceSecondLook,
  type AnsweredChange,
  type QueuedChange,
} from "@/app/(docs)/_lib/holds/queue"

/**
 * The three blocks on *Answering a held change*, each printing what a real
 * queue did.
 *
 * Async for the reason the operations blocks are: the rows are produced as the
 * page builds — one store opened, four asks sent, three answers given — and a
 * producer that stops reaching its outcome throws rather than letting the page
 * print a confident lie.
 *
 * Furniture in 0067's sense, like every other generated table here: it presents
 * something the repository knows and is not a component library growing beside
 * the primitives. What a reader is shown *as a page* on this site is still a
 * `LoomTree` through the runtime, and the example above these blocks is one.
 */

/** What a hold's reason code means to somebody who has never seen it. */
const WHY_HELD: Record<QueuedChange["reason"], string> = {
  "stakes-above-ceiling": "More than an instruction may apply on its own",
  "confidence-below-minimum": "The planner was not sure enough",
  irreversible: "Undoing it would not undo what it did",
  "discards-later-work": "It would write over work already in the log",
  "redirected-submission": "It would send a form somewhere else",
  "confidence-below-floor": "The planner was barely guessing",
  "stakes-at-refusal-floor": "Past what this deployment will offer at all",
  "within-policy": "Nothing in the policy stood in the way",
}

const Waiting = ({ row }: { readonly row: QueuedChange }) => (
  <li
    className="border-edge bg-surface m-0 rounded-lg border p-0"
    data-answerable={row.stillAnswerable}
  >
    <div className="border-edge flex flex-wrap items-baseline justify-between gap-2 border-b px-4 py-3">
      <p className="text-ink m-0 text-base font-semibold">
        &ldquo;{row.asked}&rdquo;{" "}
        <span className="text-ink-faint text-sm font-normal">— {row.askedBy}</span>
      </p>
      <p
        className={`m-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
          row.stillAnswerable ? "bg-surface-sunken text-ink" : "bg-surface-sunken text-ink-faint"
        }`}
      >
        {row.stillAnswerable ? "can still be applied" : "cannot be applied"}
      </p>
    </div>

    <div className="flex flex-col gap-2 px-4 py-3">
      <p className="text-ink-muted m-0 text-sm">
        <span className="text-ink font-semibold">The plan. </span>
        {row.rationale}
      </p>
      <p className="text-ink-muted m-0 text-sm">
        <span className="text-ink font-semibold">Why it is waiting. </span>
        {WHY_HELD[row.reason]} — <span className="font-mono text-xs">{row.detail}</span>
      </p>
      <p className="text-ink-faint m-0 font-mono text-xs">
        {row.reason} · stakes {row.stakes} · confidence {row.confidence} · judged against revision{" "}
        <span data-held-against>{row.heldAgainst}</span>
      </p>
    </div>
  </li>
)

/**
 * Two changes waiting, and the only difference that decides whether answering
 * one is worth a reviewer's time.
 *
 * The badge is not a field on a hold. It is `baseRevision` against the page's
 * current revision, computed here exactly as a host would have to compute it.
 */
export const WhatIsWaiting = async () => {
  const queue = await produceQueue()

  return (
    <div className="not-prose my-6">
      <p className="text-ink-faint m-0 mb-2 text-xs">
        The page is at revision{" "}
        <span className="text-ink font-mono" data-head>
          {queue.head}
        </span>
        . <span data-answerable-count>{queue.answerable}</span> of these{" "}
        {queue.waiting.length === 1 ? "change" : "changes"} can still be applied;{" "}
        <span data-dead-count>{queue.dead}</span> cannot.
      </p>
      <ul className="flex list-none flex-col gap-3 pl-0">
        {queue.waiting.map((row) => (
          <Waiting key={`${row.asked}-${row.heldAgainst}`} row={row} />
        ))}
      </ul>
    </div>
  )
}

/** What each of the three answers did, in the order a reviewer gave them. */
const ANSWER_STORY: Record<AnsweredChange["ending"], string> = {
  committed: "applied, and the page moved",
  "not-written": "nothing applied, and the change is gone from the queue",
  released: "nothing applied, and nothing was recorded against the page",
  held: "held again",
  refused: "refused on the second look",
  "not-interpreted": "never became a plan",
  "not-applicable": "the plan no longer fits the page",
  "not-answerable": "there was nothing under that id",
}

/**
 * Three answers on one queue.
 *
 * A table, because the two columns a reader is comparing across rows are what
 * the runtime said and whether the page moved — and the second row is only
 * surprising beside the first.
 */
export const WhatAnsweringDoes = async () => {
  const answers = await produceAnswers()

  return (
    <div className="not-prose border-edge my-6 overflow-x-auto rounded-lg border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-surface-sunken text-ink">
            <th className="border-edge border-b px-3 py-2 text-left font-semibold">
              What the reviewer clicked
            </th>
            <th className="border-edge border-b px-3 py-2 text-left font-semibold">The call</th>
            <th className="border-edge border-b px-3 py-2 text-left font-semibold">
              What happened
            </th>
            <th className="border-edge border-b px-3 py-2 text-left font-semibold">
              What the runtime said
            </th>
          </tr>
        </thead>
        <tbody>
          {answers.map((answer) => (
            <tr
              key={`${answer.call}-${answer.answer}`}
              className="border-edge border-b last:border-b-0"
              data-ending={answer.ending}
            >
              <td className="text-ink px-3 py-2 align-top text-xs">{answer.answer}</td>
              <td className="text-ink-muted px-3 py-2 align-top font-mono text-xs">
                {answer.call}
              </td>
              <td className="text-ink-muted px-3 py-2 align-top text-xs">
                {ANSWER_STORY[answer.ending]}
                <span className="text-ink-faint block">
                  revision {answer.headBefore} → {answer.headAfter}, {answer.waitingAfter} still
                  waiting
                </span>
              </td>
              <td className="text-ink-faint px-3 py-2 align-top font-mono text-xs">{answer.said}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * The same change, judged twice under two policies, with the second verdict
 * produced rather than asserted.
 *
 * Two rows and a sentence: what it was called and what it said, then and now.
 * The detail being identical in both is the part a screen has to work around,
 * and the page says so.
 */
export const TheSecondLook = async () => {
  const look = await produceSecondLook()

  return (
    <div className="not-prose border-edge bg-surface my-6 overflow-hidden rounded-lg border">
      <div className="border-edge flex flex-col gap-1 border-b px-4 py-3">
        <p className="text-ink-faint m-0 text-[0.6875rem] tracking-wide uppercase">
          When it was held
        </p>
        <p className="text-ink m-0 text-sm">
          <span className="font-mono text-xs" data-held-under>
            {look.heldUnder}
          </span>{" "}
          asked a person: <span className="font-mono text-xs">{look.heldReason}</span>
        </p>
        <p className="text-ink-muted m-0 font-mono text-xs">{look.heldDetail}</p>
      </div>
      <div className="flex flex-col gap-1 px-4 py-3">
        <p className="text-ink-faint m-0 text-[0.6875rem] tracking-wide uppercase">
          When somebody said yes
        </p>
        <p className="text-ink m-0 text-sm">
          <span className="font-mono text-xs" data-answered-under>
            {look.answeredUnder}
          </span>{" "}
          refused it outright: <span className="font-mono text-xs">{look.nowReason}</span>
        </p>
        <p className="text-ink-muted m-0 font-mono text-xs">{look.nowDetail}</p>
        <p className="text-ink-muted m-0 text-sm">
          The page stayed at revision{" "}
          <span className="text-ink font-mono text-xs" data-head>
            {look.head}
          </span>
          , and {look.waitingAfter === 0 ? "nothing is left waiting" : "the change is still waiting"}.
        </p>
      </div>
    </div>
  )
}
