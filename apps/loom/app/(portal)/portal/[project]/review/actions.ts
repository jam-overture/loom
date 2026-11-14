"use server"

import { proposalIdSchema, type LoomTree } from "@jam-overture/loom"
import type { ApplicationId } from "@jam-overture/loom/store"
import { confirmHeld, discardHeld, type HeldProposal } from "@jam-overture/loom/write"

import { mayAccept } from "@/app/(portal)/_lib/auth/roles"
import { reportOf, type WriteReport } from "@/app/(portal)/_lib/outcome"
import { pageOfCopy, type PageCopy } from "@/app/(portal)/_lib/proposing/copies"
import { holdStandingOf } from "@/app/(portal)/_lib/proposing/following"
import { madeFromOf } from "@/app/(portal)/_lib/proposing/made-from"
import { mayPropose, siteReport } from "@/app/(portal)/_lib/proposing/report"
import { madeFromFor, pageCopiesFor, turnedDownFor } from "@/app/(portal)/_lib/proposing/stores"
import { reasonFrom } from "@/app/(portal)/_lib/proposing/turned-down"
import { rebuildSegmentFormsFor, segmentFormsGivenFor } from "@/app/(portal)/_lib/segments/kept"
import { readOfferedSegments } from "@/app/(portal)/_lib/segments/offered"
import { audienceRulesFor } from "@/app/(portal)/_lib/segments/rules"
import { audienceOfSegment, segmentWordSchema } from "@/app/(portal)/_lib/segments/segment"
import {
  segmentAcceptedReport,
  segmentNotOfferedOf,
  segmentOfAnswer,
  segmentRefusalOf,
} from "@/app/(portal)/_lib/segments/segment-answer"
import { acceptForSegment } from "@/app/(portal)/_lib/segments/segment-forms"
import { plainState } from "@/app/(portal)/_lib/vocabulary"
import { beginWrite, type PortalWrite } from "@/app/(portal)/_lib/write"
import { boundedReaderTallyStore } from "@/app/_lib/app/bounded-store"
import { publishedPagesFor } from "@/app/_lib/pages/store"
import { readingsFor } from "@/app/_lib/reader-signals/intake"

import { siteFor } from "../_lib/owned-site"

/** What answering says back: what became of the change, or why it was not answered. */
export type AnswerReport = {
  readonly refusal?: string
  readonly report?: WriteReport
  /** Where an accepted change is followed to live and on to its result (0358). */
  readonly followAt?: string
}

const ALREADY = plainState("already-answered")

/**
 * *Accept for <segment> only* (0386): the change narrowed to one segment the
 * page's rules name and has readers counted in, checked against that
 * segment's form of the page as it is live, and written to it. The page
 * itself does not move, so no other form is touched.
 */
const acceptedForSegment = async (
  write: PortalWrite,
  given: {
    readonly application: ApplicationId
    readonly copies: readonly PageCopy[]
    readonly held: HeldProposal
    readonly page: LoomTree | undefined
    readonly word: string
    readonly actor: string
  }
): Promise<AnswerReport> => {
  const word = segmentWordSchema.safeParse(given.word)

  if (!word.success || given.page === undefined) {
    await write.finish()

    return { refusal: "That is not a segment of a page this project's site has published." }
  }

  const audienceId = audienceOfSegment(word.data)
  const offered = await readOfferedSegments(
    {
      rules: audienceRulesFor(given.application),
      tallies: boundedReaderTallyStore(readingsFor(given.application).tallies),
    },
    given.page.treeId
  )

  if (!offered.includes(audienceId)) {
    await write.finish()

    return { refusal: segmentNotOfferedOf(word.data) }
  }

  const accepted = await acceptForSegment(
    { ...segmentFormsGivenFor(given.application, given.copies), holds: write.path.holds },
    { held: given.held, published: given.page, audienceId, actor: given.actor }
  )

  await write.finish()

  if (!accepted.ok) return { refusal: segmentRefusalOf(accepted.error, word.data) }

  await madeFromFor(given.application).record({
    proposalId: given.held.proposalId,
    intentId: given.held.proposal.intentId,
    stakes: given.held.disposition.stakes,
    at: accepted.value.acceptedAt,
  })

  return { report: segmentAcceptedReport(accepted.value, word.data) }
}

/**
 * Yes or no to a change the Gate held (0329), from a person whose role may
 * accept it.
 *
 * Both answers need the same authority. A *no* is safe for the page, but a
 * role that could turn down what it cannot accept could stop an owner's
 * change by answering first, so the ceiling that decides *yes* decides *no*.
 *
 * A *yes* goes through `confirmHeld`, which checks the Gate's rules once more
 * against the page as it now stands: an answer is permission to proceed, not
 * permission to skip the check. A change that no longer fits the version the
 * site serves cannot be said yes to (0340): its copy is not the page anymore.
 *
 * A *yes* that makes the change keeps what it was made from (its intent and
 * stake), which the page's record does not, so its timeline leads with the
 * goal it serves. The change is made whether or not that is kept, as a *no* is
 * turned down whether or not it is remembered.
 *
 * A *yes* for one segment only goes through `acceptedForSegment` instead,
 * and leaves the page as it is for everyone else.
 *
 * A *no* is remembered, with the reason when one was given, so the AI weighs
 * its next proposal for the page against it (0341). The change is turned down
 * whether or not the remembering works: a person who said no has said it.
 *
 * Nothing is revalidated. The answer is shown where the change was, and a
 * revalidation re-renders the screen it was given on, which would take the
 * change and its answer off it together. Every screen these change reads
 * per request, so the next visit to *For review* or to the page is current.
 */
export const answerAction = async (
  _previous: AnswerReport | null,
  form: FormData
): Promise<AnswerReport> => {
  const site = await siteFor(form, mayPropose)

  if (!site.ok) return { refusal: site.report.detail ?? "That is not a project you can change." }

  const proposalId = proposalIdSchema.safeParse(form.get("proposalId"))

  if (!proposalId.success) return { refusal: ALREADY.meaning }

  const write = beginWrite(site.application.applicationId)
  const held = await write.path.holds.get(proposalId.data)

  if (!held.ok) return { refusal: ALREADY.meaning }

  if (!mayAccept(site.role, held.value.disposition.stakes)) {
    return { refusal: "Only an owner of the project may answer this one." }
  }

  const answer = { proposalId: proposalId.data, actor: site.actor }
  const application = site.application.applicationId
  const copies = await pageCopiesFor(application).list()

  if (!copies.ok) return { refusal: "The store did not answer. Try again in a moment." }

  const choice = form.get("answer")
  const segment = segmentOfAnswer(choice)

  if (choice !== "accept" && segment === undefined) {
    const discarded = await discardHeld(write.path, answer)

    await write.finish()

    if (!discarded.ok) return { refusal: ALREADY.meaning }

    await turnedDownFor(application).record({
      proposalId: discarded.value.proposalId,
      pageId: pageOfCopy(copies.value, discarded.value.treeId),
      request: discarded.value.intent.utterance,
      intentId: discarded.value.intent.intentId,
      reason: reasonFrom(form.get("reason")),
      by: site.actor,
      at: Date.now(),
    })

    const declined = plainState("declined")

    return {
      report: {
        tone: declined.tone,
        headline: declined.label,
        meaning: declined.meaning,
        detail: declined.technical,
      },
    }
  }

  if (holdStandingOf(held.value, copies.value) === "conflicts") {
    return {
      refusal:
        "This change no longer fits the version your site serves, so it can only be turned down.",
    }
  }

  const pageId = pageOfCopy(copies.value, held.value.treeId)
  const published = await publishedPagesFor(application).list()
  const page = published.ok
    ? published.value.find((each) => each.tree.treeId === pageId)?.tree
    : undefined

  if (segment !== undefined) {
    return acceptedForSegment(write, {
      application,
      copies: copies.value,
      held: held.value,
      page,
      word: segment,
      actor: site.actor,
    })
  }

  const outcome = await confirmHeld(write.path, answer)

  await write.finish()

  const made = madeFromOf(outcome, Date.now())

  if (made !== undefined) {
    await madeFromFor(application).record(made)
    /** The page every segment's form stands on moved (0386 clause 6). */
    if (page !== undefined) await rebuildSegmentFormsFor(application, [page])
  }

  const report = siteReport(reportOf(outcome, write.weighedAgainst), application)

  return report.tone === "applied"
    ? { report, followAt: `/portal/${site.projectId}/review/accepted/${proposalId.data}` }
    : { report }
}
