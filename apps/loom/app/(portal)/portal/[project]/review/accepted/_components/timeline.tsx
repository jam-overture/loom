import Link from "next/link"

import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import type { StepState, TimelineStep } from "@/app/(portal)/_lib/going-live"
import { plainMoment } from "@/app/(portal)/_lib/when"

/** Done steps green, the current one ringed, the rest grey, and an ending red. */
const MARK: Readonly<Record<StepState, string>> = {
  done: "bg-applied-ink border-applied-ink",
  current: "bg-surface-base border-ink border-2",
  upcoming: "bg-surface-base border-edge",
  ended: "bg-refuse-ink border-refuse-ink",
}

const TITLE: Readonly<Record<StepState, string>> = {
  done: "text-ink",
  current: "text-ink font-medium",
  upcoming: "text-ink-muted",
  ended: "text-refuse-ink font-medium",
}

/**
 * An accepted change from *Accept* to its result, one step a row
 * (`docs/portal-wireframes.md` section 4). The step a person can act on links
 * to where they act.
 */
export const Timeline = ({
  steps,
  projectId,
}: {
  readonly steps: readonly TimelineStep[]
  readonly projectId: string
}) => (
  <ol className="m-0 flex list-none flex-col p-0">
    {steps.map((step, index) => {
      const at = step.at === undefined ? undefined : new Date(step.at).toISOString()

      return (
        <li
          key={step.title}
          className="flex gap-3"
          aria-current={step.state === "current" ? "step" : undefined}
        >
          <div className="flex flex-col items-center">
            <span className={`mt-1 h-3 w-3 shrink-0 rounded-full border ${MARK[step.state]}`} />
            {index === steps.length - 1 ? null : <span className="bg-edge-subtle w-px flex-1" />}
          </div>
          <div className="flex flex-col gap-1 pb-5">
            <p className={`m-0 text-sm ${TITLE[step.state]}`}>{step.title}</p>
            {at === undefined ? null : (
              <time dateTime={at} className="text-ink-muted text-xs">
                {plainMoment(at)}
              </time>
            )}
            {step.lines.map((line) => (
              <p key={line} className="text-ink-secondary m-0 max-w-prose text-xs">
                {line}
              </p>
            ))}
            {step.detail === undefined ? null : (
              <TechnicalDetail summary="How the verdict was reached">
                {step.detail.map((line) => (
                  <p key={line} className="m-0">
                    {line}
                  </p>
                ))}
              </TechnicalDetail>
            )}
            {step.connect === true ? (
              <Link href={`/portal/${projectId}/connect`} className="text-ink text-xs">
                Connect your site
              </Link>
            ) : null}
          </div>
        </li>
      )
    })}
  </ol>
)
