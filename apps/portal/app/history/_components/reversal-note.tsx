import type { Reversal } from "@/lib/reversal"

/**
 * What undoing a revision would restore, and what it would cost, shown beside
 * the change itself.
 *
 * The row above already lists what the revision *did*. This is the half the
 * delta cannot show: the value a reconfigure wrote over, the subtree a removal
 * destroyed, the place a move came from — recoverable only by inverting the log
 * (see `lib/reversal`). It sits above the undo button because it is the reading
 * that lets a reviewer decide whether to press it: a contested undo writes over
 * later work, and finding that out after the click is finding it out too late.
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
      <h4 className="text-ink-muted text-2xs tracking-wide uppercase">undoing this would</h4>

      {reversal.restores.length === 0 ? (
        <p className="text-ink-muted text-2xs">
          restore nothing — this change moved nothing and set no props.
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {reversal.restores.map((restoration, index) => (
            <li
              key={`${restoration.subject}-${index}`}
              className="border-edge-subtle border-l-2 pl-3 text-2xs"
            >
              {restoration.verb} <span className="font-mono">{restoration.subject}</span>{" "}
              <span className="text-ink-muted">{restoration.detail}</span>
            </li>
          ))}
        </ul>
      )}

      {reversal.discards.length > 0 && (
        <p className="bg-awaiting text-awaiting-ink rounded-sm px-2 py-1 text-2xs">
          It writes over what revision{reversal.discards.length === 1 ? "" : "s"}{" "}
          <span className="font-mono">
            {reversal.discards.map((discarded) => discarded.revision).join(", ")}
          </span>{" "}
          did to nodes it touches, so a person has to confirm it.
        </p>
      )}
    </section>
  )
}
