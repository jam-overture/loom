import type { MissedClaim } from "@/app/(portal)/_lib/calibration-misses"
import { formatRate } from "@/app/(portal)/_lib/calibration-view"
import { toneClasses } from "@/app/(portal)/_lib/outcome"

/**
 * One claim that was wrong, and what it was trying to do.
 *
 * The rationale is the row's body rather than a detail under a fold, because it
 * is the only thing here that says what *kind* of change this was. A reader
 * scanning six overconfident claims is looking for the pattern between them, and
 * the pattern is in the sentences, not in the ids.
 *
 * `survived` and `rejected` are the runtime's words for the two outcomes and
 * they read as the model's fate rather than the page's. What a person watched
 * happen is that the change went live or that it did not, so that is what the
 * badge says — the same two values, named after the page they landed on.
 */
export const MissedClaimRow = ({ claim }: { readonly claim: MissedClaim }) => (
  <li className="border-edge-subtle flex flex-col gap-1.5 border-t py-3">
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <span
        className={
          "rounded-sm px-1.5 py-0.5 text-2xs " +
          toneClasses(claim.verdict === "survived" ? "applied" : "rejected")
        }
      >
        Said it was {formatRate(claim.confidence)} sure ·{" "}
        {claim.verdict === "survived" ? "went through anyway" : "turned down"}
      </span>

      {/*
        * The surprise is the sortable number and the reason this row is above
        * the next one, so it is shown rather than left as an invisible ordering
        * a reader has to take on faith.
        */}
      <span className="text-ink-muted text-2xs">
        {formatRate(claim.surprise)} wide of the mark
      </span>

      {claim.answeredBy !== undefined && (
        <span className="text-ink-muted text-2xs">answered by {claim.answeredBy}</span>
      )}

      <time className="text-ink-muted ml-auto font-mono text-2xs" dateTime={claim.proposedAt}>
        {claim.proposedAt.slice(0, 16).replace("T", " ")}
      </time>
    </div>

    <p className="text-ink-secondary text-xs">{claim.rationale}</p>

    {claim.detail !== undefined && (
      <p className="text-ink-muted text-2xs italic">{claim.detail}</p>
    )}

    {/*
      * A repair chain is the highest-value pair on this page and 0031 says why:
      * the refusal that prompted a repair is precisely the case where the grade
      * was wrong, and scoring the two separately is what keeps the datapoint. So
      * the link between them is worth naming — a lone refused 0.9 and a refused
      * 0.9 that was immediately retried are different stories about the model.
      */}
    {(claim.repairOf !== undefined || claim.repairedBy !== undefined) && (
      <p className="text-ink-muted text-2xs">
        {claim.repairOf !== undefined && "This was the second attempt, after a refusal. "}
        {claim.repairedBy !== undefined && "The model was handed this back and tried again."}
      </p>
    )}
  </li>
)
