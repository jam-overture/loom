import { PlainSentence } from "@/app/(portal)/_components/plain-sentence"
import type { Reversal } from "@/app/(portal)/_lib/reversal"
import { readingOf } from "@/app/(portal)/_lib/vocabulary"

/**
 * What undoing a revision would put back, and what it would cost, shown beside
 * the change itself.
 *
 * The row above already says what the revision *did*. This is the half the delta
 * cannot show: the value a reconfigure wrote over, the subtree a removal
 * destroyed, the place a move came from — recoverable only by inverting the log
 * (see `lib/reversal`). It sits above the undo button because it is the reading
 * that lets a reviewer decide whether to press it: a contested undo writes over
 * later work, and finding that out after the click is finding it out too late.
 *
 * **This is the one thing on the portal that exists nowhere else.** A repository
 * keeps both sides of every change for free; Loom's delta model deliberately
 * keeps only the forward one (0016), so "what did this replace" is a question
 * only a replay can answer. That is why the heading is a sentence rather than
 * the label `undoing this would` — a reader who skims past it has skipped the
 * answer to the question they came with.
 *
 * A blocked reversal renders its reason and nothing else — the row hides the
 * button in that case, because a control that could not do the thing it names
 * would be lying (0019).
 */
export const ReversalNote = ({ reversal }: { readonly reversal: Reversal }) => {
  if (reversal.kind === "blocked") {
    return <p className="text-ink-muted text-2xs">{reversal.reason}</p>
  }

  return (
    <section className="flex flex-col gap-1.5">
      <h4 className="text-ink-secondary text-xs">If you undo this, Loom puts back:</h4>

      {reversal.restores.length === 0 ? (
        <p className="text-ink-muted text-2xs">
          Nothing — this change moved nothing and set no settings, so undoing it leaves the page
          exactly as it is now.
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {reversal.restores.map((restoration, index) => (
            <li
              key={`${readingOf(restoration)}-${index}`}
              className="border-edge-subtle text-2xs border-l-2 pl-3"
            >
              <PlainSentence line={restoration} />
            </li>
          ))}
        </ul>
      )}

      {reversal.discards.length > 0 && (
        <p className="bg-awaiting text-awaiting-ink text-2xs rounded-sm px-2 py-1">
          Somebody will have to say yes to this one. Undoing it now would wipe out what version
          {reversal.discards.length === 1 ? " " : "s "}
          <span className="font-mono">
            {reversal.discards.map((discarded) => discarded.revision).join(", ")}
          </span>{" "}
          did to the same parts of the page, so Loom will not do it on your say-so alone.
        </p>
      )}
    </section>
  )
}
