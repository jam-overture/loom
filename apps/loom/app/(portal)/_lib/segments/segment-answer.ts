import type { WriteReport } from "../outcome"
import { plainState } from "../vocabulary"
import type { SegmentChange } from "./segment-changes"
import type { SegmentFormsError } from "./segment-forms"

/**
 * What *Accept for <segment> only* says back, in the words of *For review*.
 * Pure.
 */

/**
 * A waiting change's answers share one form and one field, so *Accept for
 * <segment> only* carries its segment in the answer itself.
 */
const SEGMENT_ANSWER = "accept-for:"

/** The answer a segment's button sends. Pure. */
export const segmentAnswerFor = (word: string): string => `${SEGMENT_ANSWER}${word}`

/** The segment an answer accepts the change for, or `undefined` for any other answer. Pure. */
export const segmentOfAnswer = (answer: FormDataEntryValue | null): string | undefined =>
  typeof answer === "string" && answer.startsWith(SEGMENT_ANSWER)
    ? answer.slice(SEGMENT_ANSWER.length)
    : undefined

/** Why a change was not accepted for the segment, as one sentence a person can act on. */
export const segmentRefusalOf = (error: SegmentFormsError, word: string): string => {
  switch (error.code) {
    case "full":
      return `This page keeps as many changes for segments as Loom holds for one page, so this one can only be accepted for everyone.`
    case "does-not-fit":
      return `This change does not fit the version of the page ${word} is shown, so it can only be accepted for everyone or turned down.`
    case "answered":
      return plainState("already-answered").meaning
    case "store":
      return `The store did not answer, so this may not have been kept for ${word}. Look at For review again before answering.`
  }
}

/** The answer to a segment nobody has been counted in on this page, which is never offered. */
export const segmentNotOfferedOf = (word: string): string =>
  `Loom has counted no reader in ${word} on this page, so there is nobody to accept it for yet.`

/** What a change accepted for one segment says, in place of *Accept* and *Turn down*. */
export const segmentAcceptedReport = (change: SegmentChange, word: string): WriteReport => ({
  tone: "applied",
  headline: `Accepted for ${word} only`,
  meaning: `Readers your site sorts into ${word} get this change from its next pull. Everyone else keeps the page as it is.`,
  detail: `${change.proposalId}: ${change.operations.length} operation${change.operations.length === 1 ? "" : "s"} on ${change.audienceId}'s form of ${change.pageId}, accepted by ${change.acceptedBy}`,
})
