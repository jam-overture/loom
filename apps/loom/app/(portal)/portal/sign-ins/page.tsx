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
 * There is nothing here to act on and nothing to click, deliberately. Unlocking
 * a caller would mean a way to clear a count from a browser, which is a way to
 * defeat the throttle from a browser; the lever for a stuck reviewer is the key
 * they were issued, and the lever for an attacker is somewhere in front of this
 * app (0034). **That paragraph used to exist only here**, which is to say it was
 * addressed to whoever edited the file next and not to the operator looking at a
 * number with no button under it. It is on the screen now, in
 * `signin-view.ts`'s `NEXT_STEPS`, and this comment is what is left of it once
 * the citation had to come off the surface.
 *
 * The rest of what this screen said, and why it stopped saying it: the heading
 * was `sign-ins`, lower-case, naming its own route — the same tell every screen
 * on the rename queue turned out to share, on the one screen nobody put on the
 * queue. The lead sentence opened with "Failed sign-ins the throttle is still
 * holding against somebody", which is a sentence about a mechanism addressed to
 * a reader who has to already know the mechanism. The privacy claim underneath
 * it was made in terms of a keyed digest of an address (0039), which is exactly
 * true and is not what a person means when they ask whether this page can tell
 * them who. And a failed read printed the store's own error in monospace at the
 * same altitude as the sentence explaining it.
 *
 * None of it is gone. All of it is one click down.
 */
const SignInsPage = async () => {
  await requireActor("/portal/sign-ins")

  const now = Date.now()
  const policy = DEFAULT_THROTTLE_POLICY
  const survey = await portalAttemptLog.survey(forgetBefore(now, policy), SURVEY_LIMIT)

  return (
    <div className="flex max-w-3xl flex-col gap-6 p-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl tracking-tight">Sign-ins</h1>
        <p className="text-ink-muted text-sm">
          Whether anybody has been trying keys against your portal. Loom counts failed sign-ins
          and makes a caller wait when there have been too many, and this is what that count
          looks like from the inside.
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
         * wastes their next hour. What changed is only the altitude: the plain
         * sentence leads and the store's own words are a click below it.
         */
        <StateNotice tone="failure" title="We couldn't tell you who has been knocking.">
          <p>
            Nothing is wrong with sign-in itself and nothing has been let through uncounted — if
            the count cannot be read, sign-in refuses rather than guessing. Read this page saying
            nothing as &ldquo;unknown&rdquo;, never as &ldquo;quiet&rdquo;.
          </p>
          <TechnicalDetail summary="What went wrong">
            <p className="font-mono">{survey.error.detail}</p>
            <p>
              This is a read that did not answer, not a count of zero. The two look alike on
              screen and are opposites: one is a database to go and look at, the other is a
              deployment nobody has knocked on.
            </p>
          </TechnicalDetail>
        </StateNotice>
      )}

      <div className="flex flex-col gap-2">
        <p className="text-ink-muted text-xs">{describePolicy(policy)}</p>

        <TechnicalDetail summary="What this page can and cannot tell you">
          <p>
            It can say how many people have failed and how recently. It can never say who they
            are, or where they were. Every attempt is stored as a one-way scramble of the
            caller&rsquo;s address and nothing else, so there is no name, no address and no
            reviewer&rsquo;s key anywhere behind this page to look up — by design, and not as a
            limitation of the screen.
          </p>
          <p>
            Counting is per address, and an address is whatever the proxy in front of this app
            reports. Somebody with a range of them is counted as a stranger each time, so nothing
            here measures how much guessing is happening — only how much of it arrived the same
            way twice.
          </p>
        </TechnicalDetail>
      </div>

      {attemptLogIsDurable ? null : (
        <StateNotice tone="notice">
          <p>
            <strong className="font-medium">These numbers only cover one server.</strong> No
            database is set up, so attempts are counted inside whichever instance answered this
            request.
          </p>
          <TechnicalDetail summary="How to make it count once">
            <p>
              On a deployment running more than one instance, each keeps its own count and this
              page reports on whichever one served it — so a burst spread across instances looks
              smaller here than it was. Set <span className="font-mono">DATABASE_URL</span> and
              every instance counts into the same table.
            </p>
          </TechnicalDetail>
        </StateNotice>
      )}
    </div>
  )
}

export default SignInsPage
