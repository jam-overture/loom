import { describeFault, faultsIn, MOST_ONE_VISUAL_WEIGHS, uncitedIn } from "./visuals.js"
import { surveyReports } from "./survey.js"

/**
 * `pnpm reports:check` — what the pictures in `reports/` weigh, and whether
 * anything still points at them.
 *
 * It runs inside `pnpm verify` rather than beside it for the same reason
 * `findings:check` does: the damage is done by merging. A 5MB screenshot is
 * nobody's idea of a controversial diff, review does not weigh it, and by the
 * time the number is large enough to notice it is spread across a year of
 * history where removing it is a rewrite rather than a delete. The weight is
 * checked at the one moment it is still one commit's worth.
 *
 * A pass prints the count and the total. Twelve hundred visuals inside budget
 * is a different fact from a directory that failed to open, and the exit code
 * says the same thing for both.
 */

const REPORTS = "reports"

const survey = await surveyReports(process.cwd(), REPORTS)

if (!survey.ok) {
  process.stderr.write(`${REPORTS} could not be surveyed: ${survey.error.reason}\n`)
  process.exit(1)
}

const faults = faultsIn(survey.value)

/**
 * Capped, because the first run of this check had two thousand faults and a
 * gate whose output you scroll past is a gate nobody reads. The count below is
 * the whole number either way.
 */
const MOST_FAULTS_SHOWN = 20

for (const fault of faults.slice(0, MOST_FAULTS_SHOWN)) {
  process.stderr.write(`${describeFault(fault)}\n`)
}
if (faults.length > MOST_FAULTS_SHOWN) {
  process.stderr.write(`  … and ${faults.length - MOST_FAULTS_SHOWN} more\n`)
}

const mb = (bytes: number): string => `${(bytes / 1_048_576).toFixed(1)}MB`
const total = survey.value.visuals.reduce((sum, visual) => sum + visual.bytes, 0)

if (faults.length > 0) {
  process.stderr.write(
    `\n${faults.length} fault${faults.length === 1 ? "" : "s"} across ${survey.value.visuals.length} visuals in ${REPORTS}/ (${mb(total)})\n`
  )
  process.exit(1)
}

const uncited = uncitedIn(survey.value)

process.stdout.write(
  `${survey.value.visuals.length} visuals in ${REPORTS}/, ${mb(total)}, none over ${mb(MOST_ONE_VISUAL_WEIGHS)}` +
    `${uncited.length === 0 ? "" : `, ${uncited.length} cited by no file`}\n`
)
