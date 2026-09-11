import { StateNotice } from "@/app/(portal)/_components/state-notice"
import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import { attemptLogIsDurable, portalAttemptLog } from "@/app/(portal)/_lib/auth/attempt-log"
import { requireActor } from "@/app/(portal)/_lib/auth/identity"
import { readPressure, SURVEY_LIMIT } from "@/app/(portal)/_lib/auth/pressure"
import { DEFAULT_THROTTLE_POLICY, forgetBefore } from "@/app/(portal)/_lib/auth/throttle"
import { describePolicy } from "@/app/(portal)/_lib/signin-view"

import { PressureSummary } from "./_components/pressure-summary"

/**
 * Whether anyone is being turned away at the front door.
 *
 * Day 32 shipped the throttle and left this gap named in its own report: a
 * lockout is *computed* at the moment someone knocks and recorded nowhere, so
 * "somebody has been trying keys against your deployment" was answerable only by
 * opening a psql session while it was still happening. This page answers it from
 * the rows that already exist.
 *
 * Read on demand and never cached: a lockout is a fact about `now`, and a page
 * that answered from a minute ago would say "nobody" through the minute somebody
 * was locked out. The read is an aggregate over a table the sweep keeps small,
 * and it happens because an operator asked, never on a request path.
 *
 * There is nothing here that lifts a lockout, deliberately. Unlocking a caller
 * would mean a way to clear a count from a browser, which is a way to defeat the
 * throttle from a browser; the lever for a stuck reviewer is the key they were
 * issued, and the lever for an attacker is somewhere in front of this app (0034).
 * That is now said on the screen rather than only here — see `nextMove`.
 *
 * This was the last screen in the portal still written in the runtime's voice.
 * It was headed `sign-ins`, which is the route, in lower case; it opened with
 * two paragraphs of caveat before saying anything that had happened; and it put
 * six monospace cells of the record's own field names above the fold. The
 * heading is now the question a person came here with, the caveats are behind
 * the disclosure that keeps them word for word, and what leads is what is
 * happening and what to do about it.
 */
const SignInsPage = async () => {
  await requireActor("/portal/sign-ins")

  const now = Date.now()
  const policy = DEFAULT_THROTTLE_POLICY
  const survey = await portalAttemptLog.survey(forgetBefore(now, policy), SURVEY_LIMIT)

  return (
    <div className="flex max-w-3xl flex-col gap-6 p-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl tracking-tight">Is anybody trying to get in?</h1>
        <p className="text-ink-muted text-sm">
          Sign-ins to this portal that failed recently, and whether anyone is currently locked
          out because of them.
        </p>
      </header>

      {survey.ok ? (
        <PressureSummary pressure={readPressure(survey.value, now, policy)} now={now} />
      ) : (
        /*
         * The detail is shown here and hidden on the sign-in form, and the
         * difference is who is reading. A visitor learns nothing about what is
         * behind this portal; a reviewer who has already signed in is the person
         * who has to fix it, and "unavailable" without a reason is a page that
         * wastes their next hour. It is behind the disclosure rather than in the
         * body now, which is where every other screen in the portal puts the
         * same thing — the sentence a person acts on first, the store's own
         * words one click down and unaltered.
         */
        <StateNotice tone="failure" title="We couldn't tell you whether anyone is being turned away.">
          <p>
            Nobody has been let in because of this. Sign-in itself refuses rather than letting
            attempts through uncounted (0034), so a portal that cannot report on the count is
            still a portal that is keeping it.
          </p>
          <p>
            Read this screen as &ldquo;unknown&rdquo;, never as &ldquo;quiet&rdquo;. Try again in
            a moment.
          </p>
          <TechnicalDetail>
            <p className="font-mono">{survey.error.detail}</p>
          </TechnicalDetail>
        </StateNotice>
      )}

      {/*
       * Both of these were surface paragraphs, and both are answers to questions
       * a reader only has once the screen has told them something. What locks a
       * caller out matters when somebody is locked out; what the count is a
       * count *of* matters when you are about to act on it. Kept word for word —
       * the rule is that nothing is removed to make a screen simpler, and the
       * limits of what this table can say are the part it would be worst to lose.
       */}
      <TechnicalDetail summary="What locks somebody out">
        <p className="text-ink-muted">{describePolicy(policy)}</p>
      </TechnicalDetail>

      <TechnicalDetail summary="What this can and cannot tell you">
        <p className="text-ink-muted">
          Every row behind this page is a keyed digest of an address and nothing else, so this can
          say how many and how recently &mdash; never who, and never from where. That is a
          property of the table rather than of this page.
        </p>
        <p className="text-ink-muted">
          Counting is per address, and an address is what the proxy in front of this app reports. A
          caller with a range of them is counted as a stranger each time, so nothing here is a
          measure of how much guessing is happening &mdash; only of how much of it arrived the same
          way twice.
        </p>
      </TechnicalDetail>

      {attemptLogIsDurable ? null : (
        <StateNotice tone="notice">
          <p>
            No database is configured, so attempts are counted in this server process alone. On a
            deployment with more than one instance that makes this page a report on whichever
            instance answered it. Set <span className="font-mono">DATABASE_URL</span> to count once.
          </p>
        </StateNotice>
      )}
    </div>
  )
}

export default SignInsPage
