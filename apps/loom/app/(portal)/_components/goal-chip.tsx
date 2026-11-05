/**
 * The goal a change serves, named beside it in a green tinted chip
 * (`docs/portal-wireframes.md`, *The goal chip*). `null` is a change raised
 * before proposals named their goal (0352), said as such rather than left blank.
 */
export const GoalChip = ({ goal }: { goal: string | null }) =>
  goal === null ? (
    <span className="border-edge-subtle text-ink-muted inline-block self-start rounded border px-1.5 py-px text-[11px]">
      No goal named
    </span>
  ) : (
    <span className="bg-applied text-applied-ink border-applied-ink/20 inline-block self-start rounded border px-1.5 py-px text-[11px]">
      Goal: {goal}
    </span>
  )
