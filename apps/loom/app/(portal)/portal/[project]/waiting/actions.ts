"use server"

import { proposalIdSchema } from "@jam-overture/loom"
import { confirmHeld, discardHeld } from "@jam-overture/loom/write"

import { askedReport, mayAsk } from "@/app/(portal)/_lib/asking"
import { mayAccept } from "@/app/(portal)/_lib/auth/roles"
import { reportOf, type WriteReport } from "@/app/(portal)/_lib/outcome"
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
 * permission to skip the check.
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
  const site = await siteFor(form, mayAsk)

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

  if (form.get("answer") !== "accept") {
    const discarded = await discardHeld(write.path, answer)

    await write.finish()

    if (!discarded.ok) return { refusal: ALREADY.meaning }

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

  const outcome = await confirmHeld(write.path, answer)

  await write.finish()

  return {
    report: askedReport(reportOf(outcome, write.weighedAgainst), site.application.applicationId),
  }
}
