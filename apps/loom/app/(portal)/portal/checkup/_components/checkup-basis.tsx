import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import type { AuditReport } from "@/app/(portal)/_lib/audit-view"
import { checkupBasis } from "@/app/(portal)/_lib/checkup-basis"

/**
 * What the verdict above was made of.
 *
 * The verdict answers the question the reader arrived with, and it is the only
 * thing on this screen that needed to be above the fold. This is the part
 * nothing on the screen used to say at all: **three** things went into that
 * answer, and both plain verdicts were written as though there were two.
 *
 * It sits below the verdict and below the differences on purpose. The reading
 * order is the answer, then what to do, then the parts that disagree, then what
 * the check was made of — a basis is context and never an action, and a screen
 * that led with its own methodology would be the runtime talking about itself
 * again.
 *
 * The numbers are the reason it earns surface rather than a disclosure. "10
 * parts" and "3 changes" are the size of the thing that was checked, and a
 * reader who has just been told their page adds up has no other way to find out
 * whether that verdict weighed a whole history or an empty one.
 *
 * The assumption is on the surface too, and it is the sentence this component
 * exists for. `TechnicalDetail` holds the runtime's reading of all four —
 * nothing is removed, and the reader who wants to know why a seed cannot be
 * inferred is one click from it.
 */
export const CheckupBasis = ({
  report,
  startingParts,
}: {
  readonly report: AuditReport
  /** Nodes in the seed the check began from, root included. */
  readonly startingParts: number
}) => {
  /**
   * A fold that stopped part-way replayed no number of changes anybody can
   * print, so an unreplayable verdict gets no basis rather than a basis with a
   * guess in it. The two guards are one fact stated at both ends: the tone that
   * compared nothing is exactly the tone that carries no revision.
   */
  if (report.tone === "unreplayable" || report.revision === null) return null

  const basis = checkupBasis({
    tone: report.tone,
    startingParts,
    changeCount: report.revision,
  })

  return (
    <section className="border-edge-subtle bg-surface-base flex flex-col gap-3 rounded-md border p-4">
      <h2 className="text-sm">What this check compared</h2>

      <dl className="flex flex-col gap-2">
        {basis.steps.map((step) => (
          <div key={step.key} className="flex flex-col gap-0.5">
            <dt className="text-ink-secondary text-xs">{step.heading}</dt>
            <dd className="text-ink-muted text-xs">{step.plain}</dd>
          </div>
        ))}
      </dl>

      {/*
       * Ruled off from the three above it. In the first build it was the same
       * size and colour as a `dd` with the same gap above it, so it read as a
       * fourth input to the check rather than as the thing the check took on
       * trust — which is the one sentence this component exists to say.
       */}
      <p className="border-edge-subtle text-ink-muted border-t pt-3 text-xs">
        {basis.assumption.plain}
      </p>

      <TechnicalDetail summary="The same three in the runtime's words, and what it assumed">
        <dl className="flex flex-col gap-2">
          {basis.steps.map((step) => (
            <div key={step.key} className="flex flex-col gap-0.5">
              <dt className="text-ink-secondary">{step.heading}</dt>
              <dd className="text-ink-muted">{step.technical}</dd>
            </div>
          ))}
          <div className="flex flex-col gap-0.5">
            <dt className="text-ink-secondary">What it assumed</dt>
            <dd className="text-ink-muted">{basis.assumption.technical}</dd>
          </div>
        </dl>
      </TechnicalDetail>
    </section>
  )
}
