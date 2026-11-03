"use server"

import { proposalIdSchema } from "@jam-overture/loom"
import { confirmHeld, discardHeld } from "@jam-overture/loom/write"

import { mayAccept } from "@/app/(portal)/_lib/auth/roles"
import { reportOf, type WriteReport } from "@/app/(portal)/_lib/outcome"
import { pageOfCopy } from "@/app/(portal)/_lib/proposing/copies"
import { holdStandingOf } from "@/app/(portal)/_lib/proposing/following"
import { mayPropose, siteReport } from "@/app/(portal)/_lib/proposing/report"
import { pageCopiesFor, turnedDownFor } from "@/app/(portal)/_lib/proposing/stores"
import { reasonFrom } from "@/app/(portal)/_lib/proposing/turned-down"
import { plainState } from "@/app/(portal)/_lib/vocabulary"
import { beginWrite } from "@/app/(portal)/_lib/write"

import { siteFor } from "../_lib/owned-site"

/** What answering says back: what became of the change, or why it was not answered. */
export type AnswerReport = {
  readonly refusal?: string
  readonly report?: WriteReport
}

const ALREADY = plainState("already-answered")

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
 * A *no* is remembered, with the reason when one was given, so the AI weighs
 * its next proposal for the page against it (0341). The change is turned down
 * whether or not the remembering works: a person who said no has said it.
 *
 * Nothing is revalidated. The answer is shown where the change was, and a
 * revalidation re-renders the screen it was given on, which would take the
 * change and its answer off it together. Every screen these change reads
 * per request, so the next visit to *Waiting* or to the page is current.
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

  if (form.get("answer") !== "accept") {
    const discarded = await discardHeld(write.path, answer)

    await write.finish()

    if (!discarded.ok) return { refusal: ALREADY.meaning }

    await turnedDownFor(application).record({
      proposalId: discarded.value.proposalId,
      pageId: pageOfCopy(copies.value, discarded.value.treeId),
      request: discarded.value.intent.utterance,
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

  const outcome = await confirmHeld(write.path, answer)

  await write.finish()

  return { report: siteReport(reportOf(outcome, write.weighedAgainst), application) }
}
