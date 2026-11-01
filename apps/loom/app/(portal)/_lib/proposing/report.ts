import type { Result } from "@jam-overture/loom"
import { DEFAULT_APPLICATION_ID, type ApplicationId } from "@jam-overture/loom/store"

import { ceilingOf, type Role } from "../auth/roles"
import { reportOf, type WeighedAgainst, type WriteReport } from "../outcome"
import type { OutcomeTone } from "../vocabulary"
import { MINIMUM_OPENED, type EvidenceSilence } from "./evidence"
import type { Passed, ProposeError, Proposed } from "./propose"

/**
 * What a run of the AI over a page says to the person who started it, or to
 * the record when the schedule did.
 */

/**
 * Anybody who could accept a change may set the AI looking at a page now; a
 * viewer accepts nothing, so a change it raised for them would wait on
 * somebody else who never chose to spend the project's key on it.
 */
export const mayPropose = (role: Role): boolean => ceilingOf(role) !== null

const silenceSentence = (silence: EvidenceSilence): string => {
  switch (silence.kind) {
    case "too-few":
      return `Only ${silence.opened} page views have been counted on this version. Loom waits for ${MINIMUM_OPENED} before it proposes anything.`
    case "uncounted":
      return "Readers have arrived on this version but have not been added up yet. Try again later."
    case "two-forms":
      return "This page is served in more than one form, and Loom does not yet propose for a page whose readers it would have to split."
    case "unavailable":
      return "The readings could not be read, so nothing was proposed."
  }
}

/** Why nothing was proposed for a page, in one sentence a person can act on. */
export const passedSentence = (passed: Passed): string => {
  switch (passed.kind) {
    case "waiting":
      return "A change to this page is already under Waiting. Loom proposes another once that one is answered."
    case "unshipped":
      return `Loom's copy has a change your site does not serve yet (version ${passed.copy}). Until it does, what readers do says nothing about that change.`
    case "behind":
      return `Your site has published a newer version than Loom's copy (version ${passed.copy}), and Loom does not yet bring its copy up to date.`
    case "silent":
      return silenceSentence(passed.silence)
    case "nothing":
      return `Loom looked and proposes nothing: ${passed.reason}`
  }
}

/**
 * What a change to a page's copy means for the site, in place of the portal's
 * general sentence, which speaks of screens this portal no longer has. Only
 * this deployment's own site serves its copy (0259); every other site keeps
 * serving what it published (0329 clause 7).
 */
const siteMeaning = (tone: OutcomeTone, servesCopy: boolean): string | undefined => {
  switch (tone) {
    case "applied":
      return servesCopy
        ? "Loom's copy of this page has the change, and this deployment's own site serves that copy, so it is live."
        : "Loom's copy of this page has the change. Your site keeps serving what it published."
    case "awaiting":
      return "It is under Waiting until an approver or owner who may accept it says yes or no."
    default:
      return undefined
  }
}

/** A write's report, saying what it means for this project's site. */
export const siteReport = (report: WriteReport, application: ApplicationId): WriteReport => ({
  ...report,
  meaning: siteMeaning(report.tone, application === DEFAULT_APPLICATION_ID) ?? report.meaning,
})

const notice = (headline: string, meaning: string): WriteReport => ({
  tone: "inapplicable",
  headline,
  meaning,
  detail: meaning,
})

/** A run's result, as the report the page screen draws. */
export const proposedReport = (
  run: Result<Proposed, ProposeError>,
  weighedAgainst: WeighedAgainst,
  application: ApplicationId
): WriteReport & { readonly request?: string } => {
  if (!run.ok) {
    return run.error.code === "model"
      ? notice(
          "The model did not answer",
          "Check the project's model key in Settings, then try again. Nothing was proposed."
        )
      : notice("The store did not answer", "Nothing was proposed. Try again in a moment.")
  }

  if (run.value.kind === "passed") {
    return notice("Nothing proposed", passedSentence(run.value.passed))
  }

  return {
    ...siteReport(reportOf(run.value.outcome, weighedAgainst), application),
    request: run.value.request,
  }
}
