"use client"

import Link from "next/link"
import { useActionState } from "react"

import { Submit } from "@/app/(portal)/_components/form"
import { GoalChip } from "@/app/(portal)/_components/goal-chip"
import { toneClasses, type OutcomeTone } from "@/app/(portal)/_lib/outcome"

import { revertAction, type RevertReport } from "../actions"

/** What following a revert from here is called, by where it went. */
const followLabel = (tone: OutcomeTone): string =>
  tone === "awaiting" ? "Answer it under For review" : "Follow it from Accept"

/**
 * *Propose reverting* on a Loom change's card, and what became of the revert.
 * A revert is weighed like any change, so the button says it may wait.
 */
export const RevertForm = ({
  projectId,
  treeId,
  proposalId,
}: {
  readonly projectId: string
  readonly treeId: string
  readonly proposalId: string
}) => {
  const [answer, action] = useActionState<RevertReport | null, FormData>(revertAction, null)

  return (
    <div className="flex flex-col gap-2">
      {answer?.report === undefined ? (
        <form action={action} className="flex flex-col gap-1">
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="treeId" value={treeId} />
          <input type="hidden" name="proposalId" value={proposalId} />
          <div className="self-start">
            <Submit label="Propose reverting" pendingLabel="Weighing the revert…" />
          </div>
          <p className="text-ink-muted m-0 max-w-prose text-xs">
            A revert is a change of its own, so Loom weighs it like any other: within your rules it
            goes live on your site&apos;s next pull, otherwise it waits under For review.
          </p>
          {answer?.refusal === undefined ? null : (
            <p className="text-refuse-ink m-0 text-xs">{answer.refusal}</p>
          )}
        </form>
      ) : (
        <div className={`flex flex-col gap-1 rounded-md p-3 ${toneClasses(answer.report.tone)}`}>
          <span className="text-sm font-medium">{answer.report.headline}</span>
          {answer.report.goal === undefined ? null : <GoalChip goal={answer.report.goal} />}
          <span className="text-xs">{answer.report.meaning}</span>
          {answer.followAt === undefined ? null : (
            <Link href={answer.followAt} className="self-start text-xs">
              {followLabel(answer.report.tone)}
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
