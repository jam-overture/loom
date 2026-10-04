import Link from "next/link"

import { policyFingerprintOf } from "@jam-overture/loom"
import { describeTelemetryError, episodesOf } from "@jam-overture/loom/telemetry"

import { Measured, Screen } from "@/app/(portal)/_components/screen"
import { StateNotice } from "@/app/(portal)/_components/state-notice"
import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import { requireActor } from "@/app/(portal)/_lib/auth/identity"
import {
  leversFor,
  movedLevers,
  policyFrom,
  WHAT_IF_NAME,
  WHAT_IF_PATH,
  type Addressed,
} from "@/app/(portal)/_lib/levers"
import { portalPolicy } from "@/app/(portal)/_lib/policy"
import { portalTelemetry } from "@/app/(portal)/_lib/telemetry"
import { gameplanOf, replayFrom } from "@/app/(portal)/_lib/what-if"
import {
  basisOf,
  costOf,
  leftOut,
  MOVEMENTS,
  movedIn,
  readsTheRulesWrong,
  restOf,
  verdictOf,
} from "@/app/(portal)/_lib/what-if-view"

import { LeverDial } from "./_components/lever-dial"
import { MovedGroup } from "./_components/moved-group"
import { PolicyPatch } from "./_components/policy-patch"

/**
 * What a different set of rules would have decided about the changes that
 * really happened.
 *
 * ## The thing no repository has
 *
 * Every other screen in this portal reports something that happened. This one
 * reports something that did not, and could not have been found out any other
 * way. A repository holds the policy; a server log holds what was served;
 * `git log` holds what was committed. **None of them holds the changes that
 * were refused**, because a refusal produces no commit, no deployment and no
 * file — and the question *"what would a looser rule have let through?"* is a
 * question about exactly those.
 *
 * ## Reading order, which is the argument
 *
 * What you have, then what you are asking, then the answer, then what to do.
 * The dials come before the result because on arrival there is no result: the
 * screen's own first sentence under them is an instruction to move one. Putting
 * the answer first would mean opening on an empty box, which this lane has
 * repeatedly found reads as a screen that failed to load.
 *
 * The three thresholds come before the four ceilings, and that order is a
 * guess worth writing down rather than a measurement: a person arriving from
 * `/portal/rules` has most likely just read a count against *"how sure the AI
 * has to be"*, and the ceilings are a table of four where the thresholds are
 * one number each.
 *
 * ## What it refuses to do
 *
 * It writes nothing. Not the policy, not a saved scenario, not a record that
 * somebody looked. 0200 would allow a lever here and this screen still ends in
 * a block of code, because a policy lives in the host's repository and the
 * argument for changing one belongs where changes are reviewed. The sentence
 * under every moved dial says so in those words, so a reader cannot mistake a
 * question for a setting.
 */
const WhatIfPage = async ({ searchParams }: { readonly searchParams: Promise<Addressed> }) => {
  await requireActor(WHAT_IF_PATH)

  const params = await searchParams
  const levers = leversFor(portalPolicy, params)
  const asked = policyFrom(portalPolicy, levers)
  const moved = movedLevers(levers).length > 0

  const page = await portalTelemetry.read({ direction: "older" })

  /*
   * The replay is always run against the deployment's **own** policy, and the
   * gameplan against the one the dials describe. That is what makes the
   * self-check a check: `replayFrom` keeps only the changes whose recorded
   * verdict it can reproduce under the rules that really judged them, so
   * anything the gameplan then says is said about changes this screen has
   * already proved it reads correctly.
   */
  const replay = page.ok
    ? replayFrom(episodesOf(page.value.records), portalPolicy)
    : undefined
  const plan = replay === undefined ? undefined : gameplanOf(replay, asked)
  const cost = plan === undefined ? "" : costOf(plan)

  return (
    <Screen>
      <Measured as="header" className="gap-2">
        <h1 className="text-2xl tracking-tight">{WHAT_IF_NAME}</h1>

        <p className="text-ink-muted text-sm">
          Change a setting here and nothing happens to your site. What happens is that every
          change anyone has asked for is weighed again, as if that setting had been in place all
          along, and this says which ones would have gone differently.
        </p>

        <Link href="/portal/rules" className="w-fit text-xs">
          &larr; What Loom is allowed to do here
        </Link>
      </Measured>

      {!page.ok && (
        <StateNotice tone="failure" title="We couldn't load what has happened here.">
          <p>
            There is nothing to weigh a different setting against without it. Your rules
            themselves are fine and are exactly where they were &mdash; they are your
            project&rsquo;s own settings, not something this screen had to go and fetch.
          </p>
          <TechnicalDetail>
            <p className="font-mono">{describeTelemetryError(page.error)}</p>
          </TechnicalDetail>
        </StateNotice>
      )}

      {replay !== undefined && readsTheRulesWrong(replay) && (
        <StateNotice tone="failure" title="Some of this screen's arithmetic does not add up.">
          <p>
            Before weighing anything, this screen re-ran your own settings over everything on the
            record and checked that it got the same answers that were really given. It did not,
            on {replay.setAside["did-not-reproduce"]} of them.
          </p>
          <p>
            That means this screen has misread one of your rules, not that anything is wrong with
            those changes. They are left out of everything below, and the rest is still worth
            reading &mdash; but treat it as an argument to check rather than a result to act on.
          </p>
        </StateNotice>
      )}

      {replay !== undefined && replay.judged === 0 ? (
        <StateNotice
          tone="empty"
          title="Nothing has been judged under these rules yet."
          action={<Link href="/portal/pages">Ask for a change &rarr;</Link>}
        >
          <p>
            This screen weighs the changes that have really happened against settings you are
            thinking about. Until something has happened there is nothing to weigh, and any
            answer it gave you would be made up.
          </p>
        </StateNotice>
      ) : (
        <>
          {replay !== undefined && <p className="text-sm">{basisOf(replay)}</p>}

          <section className="flex flex-col gap-3">
            <h2 className="text-md tracking-tight">What are you thinking of changing?</h2>

            {levers.slice(0, 3).map((lever) => (
              <LeverDial key={lever.id} lever={lever} levers={levers} />
            ))}

            <h3 className="text-ink-secondary text-sm">
              And how much may Loom do on its own, depending on who asked?
            </h3>

            {levers.slice(3).map((lever) => (
              <LeverDial key={lever.id} lever={lever} levers={levers} />
            ))}
          </section>

          {plan !== undefined && (
            <section className="flex flex-col gap-2">
              <h2 className="text-md tracking-tight">What would have been different</h2>
              <p className="text-sm">{verdictOf(plan, moved)}</p>
              {cost !== "" && <p className="text-ink-secondary text-sm">{cost}</p>}
              {moved && plan.moved.length > 0 && restOf(plan) !== "" && (
                <p className="text-ink-muted text-sm">{restOf(plan)}</p>
              )}
            </section>
          )}

          {plan !== undefined &&
            MOVEMENTS.map((movement) => (
              <MovedGroup key={movement} movement={movement} moved={movedIn(plan, movement)} />
            ))}

          <PolicyPatch levers={levers} />
        </>
      )}

      <TechnicalDetail summary="What this can and cannot work out, and what it left out">
        <p className="text-ink-secondary">
          Seven settings are offered above, and they are the ones the decision is read from
          directly: two confidence thresholds, the refusal floor, and a ceiling per origin. The
          rest of a <span className="font-mono">GatePolicy</span> decides how risky a change is
          measured to be in the first place &mdash;{" "}
          <span className="font-mono">removalThresholds</span>,{" "}
          <span className="font-mono">breadthThreshold</span>,{" "}
          <span className="font-mono">protectedPrimitiveTypes</span> and the others. Re-measuring
          would mean weighing every change against the page as it stood at the time, which this
          screen does not have, so those are deliberately not offered rather than offered and
          quietly ignored.
        </p>
        <p className="text-ink-secondary">
          Every judgment is replayed through the same ladder of rules the runtime uses, in the
          same order, from what the record holds: the stake level, the reversibility, the stake
          factor codes and the interpreter&rsquo;s confidence. A change is only counted once this
          screen has reproduced the verdict that was really recorded for it under your own
          policy.
        </p>

        {replay !== undefined && leftOut(replay).length > 0 && (
          <ul className="text-ink-secondary flex list-disc flex-col gap-1 pl-4">
            {leftOut(replay).map((reading) => (
              <li key={reading}>{reading}</li>
            ))}
          </ul>
        )}

        <dl className="flex flex-wrap gap-x-5 gap-y-1">
          <div className="flex gap-1">
            <dt className="text-ink-muted font-mono">policyId</dt>
            <dd className="font-mono">{portalPolicy.policyId}</dd>
          </div>
          <div className="flex gap-1">
            <dt className="text-ink-muted font-mono">policyFingerprint</dt>
            <dd className="font-mono break-all">{policyFingerprintOf(portalPolicy)}</dd>
          </div>
          <div className="flex gap-1">
            <dt className="text-ink-muted font-mono">asked</dt>
            <dd className="font-mono break-all">{policyFingerprintOf(asked)}</dd>
          </div>
        </dl>
        <p className="text-ink-secondary">
          A judgment carries the fingerprint of the policy that made it. Only judgments carrying
          the first of these are weighed, because what a different policy decided is not evidence
          about this one.
        </p>
      </TechnicalDetail>
    </Screen>
  )
}

export default WhatIfPage
