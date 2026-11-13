import { goalStaySentence, type GoalStay } from "@/app/(portal)/_lib/goals/goal-stay"
import { plainPace } from "@/app/(portal)/_lib/vocabulary"

/**
 * How long readers who reached a goal's part kept it on screen, and what that
 * time means against the part's words (0230, 0381). `undefined` is counters
 * that did not answer, said as such rather than drawn as nothing.
 */
export const TimeOnIt = ({ stay }: { stay: GoalStay | undefined }) => {
  if (stay === undefined) {
    return (
      <span className="text-ink-muted mt-1 block text-[11px]">
        Time on screen could not be read just now.
      </span>
    )
  }

  const verdict =
    stay.kind === "read" && stay.standing !== "unknown" ? plainPace(stay.standing) : undefined

  return (
    <span className="text-ink-muted mt-1 block text-[11px]">
      {goalStaySentence(stay)}
      {verdict !== undefined && (
        <span className="block" title={verdict.meaning}>
          {verdict.label}
        </span>
      )}
    </span>
  )
}
