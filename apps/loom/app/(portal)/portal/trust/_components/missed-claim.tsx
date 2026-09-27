import { PageName } from "@/app/(portal)/_components/page-name"
import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import type { MissedClaim } from "@/app/(portal)/_lib/calibration-misses"
import { describePolicy, formatRate } from "@/app/(portal)/_lib/calibration-view"
import { toneClasses } from "@/app/(portal)/_lib/outcome"
import type { PageName as PageNameValue } from "@/app/(portal)/_lib/page-name"

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
 *
 * ## The two things this row used to do backwards
 *
 * Both are the governing principle, once in each direction, and neither had a
 * test because the lane's sweep reads text a component writes and this row wrote
 * none of it.
 *
 * **It dropped facts rather than demoting them.** `proposalId`, `intentId`,
 * `policyId` and the cause's own code were all computed, all carried on the
 * claim, and all thrown away — on the one screen where the useful next move is
 * to go and read this change on `/portal/activity`, which is a screen you find a
 * change on by its id. *Nothing is ever removed* is the half of the rule a row
 * with no disclosure at all cannot keep, and this row had none.
 *
 * **It put the Gate's own sentence on the surface.** `claim.detail` is the
 * runtime's account of a refusal, verbatim and rightly so — with its type names,
 * its node ids and the value a schema rejected in it. It was rendered in italics
 * under the rationale, unasked, which is the technical record on the surface
 * while the plain fact a reader wanted was missing. It is one click down now.
 *
 * ## Why the page is on the surface and not in the disclosure
 *
 * Because it is identity, and 22 August settled that identity is not technical
 * detail. A claim that was wrong about *your pricing page* is a different fact
 * from a claim that was wrong, and a reader who cannot see which page a row is
 * about cannot act on the row.
 *
 * It sits in the line of metadata with the outcome and the time, which is where
 * the front door's waiting card puts the same fact for the same reason: a page is
 * one fact among several on a row whose subject is the sentence underneath.
 *
 * **It is not a link, and that is a decision a screenshot made.** The first
 * version of this row linked the name to this screen scoped to that page — and
 * the picture came back with the only pressable thing on the row looking exactly
 * like the text beside it, because Tailwind's preflight sets
 * `a { text-decoration: inherit }` and this lane's convention for an affordance
 * is a bordered row or a trailing arrow rather than an underline. A repeated
 * inline link on every row of a group would also be three presses to one
 * destination. `wrong-pages.tsx` below is that destination, once per page.
 */
export const MissedClaimRow = ({
  claim,
  page,
}: {
  readonly claim: MissedClaim
  /**
   * Which page this claim was made against, named — or absent, when the screen
   * is already scoped to one page and every row would name it.
   *
   * A row that repeated the page on a screen whose heading, lead sentence and
   * strip all name it would be three copies of one fact competing with the
   * sentence the row exists to show. The id is still one click down either way,
   * which is what keeps the omission a layout decision rather than a dropped
   * fact.
   */
  readonly page?: PageNameValue
}) => (
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

      {page !== undefined && (
        <span className="text-ink-muted min-w-0 text-2xs">
          <PageName page={page} layout="inline" />
        </span>
      )}

      {claim.answeredBy !== undefined && (
        <span className="text-ink-muted text-2xs">answered by {claim.answeredBy}</span>
      )}

      <time className="text-ink-muted ml-auto font-mono text-2xs" dateTime={claim.proposedAt}>
        {claim.proposedAt.slice(0, 16).replace("T", " ")}
      </time>
    </div>

    <p className="text-ink-secondary text-xs">{claim.rationale}</p>

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

    <TechnicalDetail summary="What the record says about this one">
      <dl className="flex flex-wrap gap-x-4 gap-y-1">
        <div className="flex gap-1">
          <dt className="text-ink-muted">confidence</dt>
          <dd className="font-mono">{claim.confidence.toFixed(2)}</dd>
        </div>
        <div className="flex gap-1">
          <dt className="text-ink-muted">verdict</dt>
          <dd className="font-mono">{claim.verdict}</dd>
        </div>
        <div className="flex gap-1">
          <dt className="text-ink-muted">surprise</dt>
          <dd className="font-mono">{claim.surprise.toFixed(2)}</dd>
        </div>
        <div className="flex gap-1">
          <dt className="text-ink-muted">cause</dt>
          <dd className="font-mono">{claim.cause}</dd>
        </div>
        <div className="flex gap-1">
          <dt className="text-ink-muted">tree</dt>
          <dd className="font-mono">{claim.treeId}</dd>
        </div>
        {/*
          * Both ids, because they answer different questions on two different
          * screens: an intent is the ask `/portal/activity` groups by, and a
          * proposal is the one change inside it this row is about. A reader given
          * only the second cannot find the first, and the record is keyed on
          * both.
          */}
        <div className="flex gap-1">
          <dt className="text-ink-muted">intent</dt>
          <dd className="font-mono">{claim.intentId}</dd>
        </div>
        <div className="flex gap-1">
          <dt className="text-ink-muted">proposal</dt>
          <dd className="font-mono">{claim.proposalId}</dd>
        </div>
        <div className="flex gap-1">
          <dt className="text-ink-muted">policy</dt>
          <dd className="font-mono">{describePolicy(claim.policyId)}</dd>
        </div>
        {claim.repairOf !== undefined && (
          <div className="flex gap-1">
            <dt className="text-ink-muted">repair of</dt>
            <dd className="font-mono">{claim.repairOf}</dd>
          </div>
        )}
        {claim.repairedBy !== undefined && (
          <div className="flex gap-1">
            <dt className="text-ink-muted">repaired by</dt>
            <dd className="font-mono">{claim.repairedBy}</dd>
          </div>
        )}
      </dl>

      {/*
        * The Gate's own sentence, verbatim and where it belongs. It is the only
        * string on this row the runtime wrote, and it is kept rather than
        * paraphrased because it carries what nothing else here can — the node it
        * was about, and the value a schema turned down.
        */}
      {claim.detail !== undefined && <p className="font-mono">{claim.detail}</p>}

      <p>
        A confidence is a stated probability of surviving, so the surprise is the
        claim&rsquo;s own error: a 0.95 that was refused was 0.95 wrong, and a 0.2 that
        survived was 0.8 wrong. Anything over 0.5 is on this page, because half is where a
        claim stops predicting the outcome and starts contradicting it.
      </p>
    </TechnicalDetail>
  </li>
)
