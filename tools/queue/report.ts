import type { QueuePlan } from "./plan.js"

/**
 * The plan as something a person reads and then runs.
 *
 * Two audiences, one text. Whoever is merging wants the sequence; whoever owns
 * a branch that did not make it wants the file and the name of the branch that
 * got there first. Both are lines rather than a table, because the thing that
 * gets pasted into a pull request comment has to survive being pasted into a
 * pull request comment.
 */

/** A path list, shortened where it would otherwise be the whole of the output. */
const listFiles = (files: readonly string[]): string => {
  if (files.length === 0) return "no files reported"

  const shown = files.slice(0, 4).join(", ")

  return files.length > 4 ? `${shown} (+${files.length - 4} more)` : shown
}

const blockedLine = (branch: string, files: readonly string[], collidesWith: readonly string[]): string => {
  const where = listFiles(files)

  return collidesWith.length === 0
    ? `  ${branch} — conflicts with the base itself: ${where}`
    : `  ${branch} — after ${collidesWith.join(", ")}: ${where}`
}

/**
 * Every line the run prints, including the counts.
 *
 * A summary is printed whether or not anything is blocked, and it names the
 * base and both totals. A run that measured nothing and a run that found
 * nothing wrong print different first lines — the same reason
 * `pnpm prerender:check` says how many pages it opened.
 */
export const describePlan = (plan: QueuePlan): readonly string[] => {
  const lines: string[] = [
    `${plan.landed.length} of ${plan.landed.length + plan.blocked.length} branches merge into ${plan.base}, in this order:`,
  ]

  for (const landing of plan.landed) lines.push(`  ${landing.order}. ${landing.branch}`)

  if (plan.landed.length === 0) lines.push("  (none)")

  if (plan.blocked.length > 0) {
    lines.push(`${plan.blocked.length} cannot be taken in this order:`)
    for (const entry of plan.blocked) lines.push(blockedLine(entry.branch, entry.files, entry.collidesWith))
  }

  return lines
}
