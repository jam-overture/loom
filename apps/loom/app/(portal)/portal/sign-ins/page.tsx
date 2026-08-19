import { StateNotice } from "@/app/(portal)/_components/state-notice"
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
 * There is nothing here to act on and nothing to click, deliberately. Unlocking
 * a caller would mean a way to clear a count from a browser, which is a way to
 * defeat the throttle from a browser; the lever for a stuck reviewer is the key
 * they were issued, and the lever for an attacker is somewhere in front of this
 * app (0034).
 */
const SignInsPage = async () => {
  await requireActor("/portal/sign-ins")

  const now = Date.now()
  const policy = DEFAULT_THROTTLE_POLICY
  const survey = await portalAttemptLog.survey(forgetBefore(now, policy), SURVEY_LIMIT)

  return (
    <div className="flex max-w-3xl flex-col gap-6 p-8">
      <h1 className="text-2xl tracking-tight">sign-ins</h1>

      <p className="text-ink-muted text-sm">
        Failed sign-ins the throttle is still holding against somebody. Every row behind this page
        is a keyed digest of an address and nothing else, so this can say how many and how recently
        — never who, and never from where. That is a property of the table rather than of this
        page.
      </p>

      {survey.ok ? (
        <PressureSummary pressure={readPressure(survey.value, now, policy)} now={now} />
      ) : (
        /*
         * The detail is shown here and hidden on the sign-in form, and the
         * difference is who is reading. A visitor learns nothing about what is
         * behind this portal; a reviewer who has already signed in is the person
         * who has to fix it, and "unavailable" without a reason is a page that
         * wastes their next hour.
         */
        <StateNotice tone="failure" title="The attempt log could not be read.">
          <p>
            The throttle cannot be reported on. This page saying nothing is not the same as
            nobody knocking — read it as &ldquo;unknown&rdquo;, never as &ldquo;quiet&rdquo;.
            Sign-in itself fails closed on the same error rather than letting attempts through
            uncounted (0034).
          </p>
          <p className="font-mono">{survey.error.detail}</p>
        </StateNotice>
      )}

      <p className="text-ink-muted text-xs">{describePolicy(policy)}</p>

      <p className="text-ink-muted text-xs">
        Counting is per address, and an address is what the proxy in front of this app reports. A
        caller with a range of them is counted as a stranger each time, so nothing here is a
        measure of how much guessing is happening — only of how much of it arrived the same way
        twice.
      </p>

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
