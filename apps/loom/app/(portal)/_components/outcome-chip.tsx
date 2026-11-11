import type { Outcome } from "@/app/(portal)/_lib/page-history"

const TONE: Readonly<Record<Outcome["tone"], string>> = {
  good: "bg-applied text-applied-ink border-applied-ink/20",
  bad: "bg-refuse text-refuse-ink border-refuse-ink/20",
  plain: "border-edge-subtle text-ink-secondary",
}

/**
 * A version's verdict, or the state that stands in for one, as a small
 * bordered label: green for *Helped*, red for *Hurt*, plain otherwise. The
 * same chip on a page's history and on the list of pages.
 */
export const OutcomeChip = ({ outcome }: { readonly outcome: Pick<Outcome, "label" | "tone"> }) => (
  <span
    className={`inline-block rounded border px-1.5 py-px text-[11px] font-medium ${TONE[outcome.tone]}`}
  >
    {outcome.label}
  </span>
)
