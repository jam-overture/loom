import Link from "next/link"

/**
 * One choice: where it goes, whether it is the one picked, and how many it
 * would show where that is known without reading more than the screen has.
 */
export type Chip = {
  readonly label: string
  readonly count?: number
  readonly href: string
  readonly selected: boolean
}

/**
 * One filter as a row of chips, each a link: the goal picker and the standing
 * chips on *For review*, the kinds on *Signals · Events*
 * (`docs/portal-wireframes.md`). Links rather than a form, so a filtered list
 * is an address and the screen needs no script to filter.
 */
export const FilterChips = ({ label, choices }: { label: string; choices: readonly Chip[] }) => (
  <nav aria-label={label} className="flex flex-wrap items-center gap-1.5">
    <span className="text-ink-muted mr-1 text-xs">{label}</span>
    {choices.map((choice) => (
      <Link
        key={choice.href}
        href={choice.href}
        aria-current={choice.selected ? "true" : undefined}
        className={`rounded-full border px-2.5 py-0.5 text-xs no-underline ${
          choice.selected
            ? "bg-ink text-surface-base border-ink"
            : "border-edge-subtle text-ink-secondary hover:text-ink"
        }`}
      >
        {choice.label}
        {choice.count === undefined ? null : (
          <>
            {" "}
            <span className="opacity-70">{choice.count}</span>
          </>
        )}
      </Link>
    ))}
  </nav>
)
