import Link from "next/link"

import type { FilterChoice } from "@/app/(portal)/_lib/review-filter"

/**
 * One filter on *For review* as a row of chips, each a link with its count:
 * the goal picker and the standing chips (`docs/portal-wireframes.md`, *2 · For
 * review*). Links rather than a form, so a filtered list is an address and the
 * screen needs no script to filter.
 */
export const FilterChips = ({
  label,
  choices,
}: {
  label: string
  choices: readonly FilterChoice[]
}) => (
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
        {choice.label} <span className="opacity-70">{choice.count}</span>
      </Link>
    ))}
  </nav>
)
