import Link from "next/link"

import { policyFingerprintOf } from "@jam-overture/loom"
import { describeTelemetryError, episodesOf } from "@jam-overture/loom/telemetry"

import { StateNotice } from "@/app/(portal)/_components/state-notice"
import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import { requireActor } from "@/app/(portal)/_lib/auth/identity"
import { portalPolicy, settingsAreChecked } from "@/app/(portal)/_lib/policy"
import {
  headlineOf,
  NO_RECORD,
  recordFor,
  recordOfRules,
  type RulesRecord,
} from "@/app/(portal)/_lib/rule-record"
import { rulesOf } from "@/app/(portal)/_lib/rules-view"
import { portalTelemetry } from "@/app/(portal)/_lib/telemetry"

import { RuleCard } from "./_components/rule-card"

/**
 * What Loom is allowed to do here, before anybody asks it for anything.
 *
 * Every other screen in this portal answers a question about something that
 * already happened. This one answers the question underneath all of them — the
 * standing arrangement a change is judged against — and it is the only screen
 * that is worth opening on a deployment where nothing has happened yet. A new
 * person's first honest question about a system that lets an AI edit their pages
 * is *"what is it allowed to do?"*, and until now the portal's answer was to
 * make them ask for a change and see.
 *
 * The two halves are deliberately different in kind, and the page is built so
 * that losing one does not cost the other:
 *
 * - **The rules** come from the policy object the write path is constructed with
 *   (`_lib/policy.ts`). They need no database, no journal and no model, so they
 *   render on a deployment with none of the three.
 * - **The record** — what each rule has actually done — comes from the same
 *   journal fold `/portal/activity` and `/portal/trust` read. It is the half no
 *   repository has ever held, and it is the half that can fail to load. When it
 *   does, the rules stay and the page says the counts are missing rather than
 *   printing zeroes, for the reason `/portal/trust` gives about its own table: a
 *   page of zeroes looks like a rule that has never fired, and this would be a
 *   page that could not find out.
 *
 * It reads and never writes, and it offers nothing to press. That is 0031's line
 * held one screen further out: a measurement of the runtime's own judgement may
 * tell a person what it sees and may not act on it. The one recommendation this
 * screen makes — that a rule you have approved four times running may be
 * stricter than you need — ends in a person editing their own policy, which is
 * code, in their repository, where a decision of that size belongs.
 */
const RulesPage = async () => {
  await requireActor("/portal/rules")

  /*
   * The policy, and the one rule that is not in it.
   *
   * Both come from `_lib/policy.ts`, which is what keeps this screen's claim
   * honest: it describes what the write path enforces because it reads the same
   * module the write path is assembled from. See that module on why a floor that
   * is a function rather than a field lives there anyway.
   */
  const rules = rulesOf(portalPolicy, { settingsAreChecked })
  const page = await portalTelemetry.read({ direction: "older" })

  /**
   * `undefined` rather than an empty record. "No count" and "a count of zero"
   * are opposite claims and the screen has to be able to make both.
   */
  const record: RulesRecord | undefined = page.ok
    ? recordOfRules(episodesOf(page.value.records))
    : undefined

  return (
    <div className="flex max-w-3xl flex-col gap-6 p-8">
      {/*
       * The way out comes after the sentence rather than beside the heading.
       * Beside it, `justify-between` puts the two on one line at 1280 and wraps
       * the link *between* the heading and its own sentence on a phone — the
       * reading order becoming "what am I looking at → what else can I do →
       * what this is". Found on a 390px screenshot, which is where the same
       * defect was found on 29 August.
       */}
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl tracking-tight">What Loom is allowed to do here</h1>

        <p className="text-ink-muted text-sm">
          Every change the AI writes is judged against these before it goes anywhere near your
          page. Some of them turn a change down; most of them stop and put it in front of you.
        </p>

        <Link href="/portal/pages" className="w-fit text-xs">
          Ask for a change →
        </Link>
      </header>

      {record !== undefined && <p className="text-sm">{headlineOf(record)}</p>}

      {!page.ok && (
        <StateNotice tone="failure" title="We couldn't load what these rules have done.">
          <p>
            The rules themselves are below and are exactly as they were &mdash; they are your
            project&rsquo;s settings, not something this screen had to go and fetch. What is
            missing is the count of how often each one has decided something, which reads the
            record of what the AI has proposed.
          </p>
          <p>
            No counts are shown rather than zeroes. A rule showing nothing looks like a rule that
            has never come up; this is a screen that could not find out.
          </p>
          <TechnicalDetail>
            <p className="font-mono">{describeTelemetryError(page.error)}</p>
          </TechnicalDetail>
        </StateNotice>
      )}

      <ul className="flex flex-col gap-3">
        {rules.map((rule) => (
          <li key={rule.id}>
            <RuleCard
              rule={rule}
              record={record === undefined ? NO_RECORD : recordFor(record, rule)}
            />
          </li>
        ))}
      </ul>

      <TechnicalDetail summary="Where these come from, and how to change one">
        <p className="text-ink-secondary">
          These are one <span className="font-mono">GatePolicy</span>, resolved for every change
          by the write path this portal is built with. They are set in code rather than in here,
          on purpose: what an AI may do to your site is a decision that belongs in your
          repository, where it is reviewed and versioned like anything else.
        </p>
        <p>
          Where a rule below reads <span className="font-mono">none</span>, that is this
          deployment declaring nothing rather than this page failing to find it: with no pieces
          and no settings marked as consequential, how risky a change is comes down entirely to
          its shape.{" "}
          <Link href="/docs/the-runtime/what-the-gate-decides">What the Gate decides</Link>{" "}
          is where the whole of it is written down.
        </p>
        <p>
          Whether the AI&rsquo;s own confidence has been worth anything is a different question
          and a different screen: <Link href="/portal/trust">can you trust the AI?</Link> Two of
          the rules here are read against a number the model grades itself on, and that page is
          the only thing that says whether the grade has held up.
        </p>
        {/*
         * The fingerprint is what closes the loop between this screen and every
         * decision already written down. A card on Activity carries the
         * fingerprint of the rules that judged it; this is the fingerprint of the
         * rules on this page. Two that differ mean the rules changed in between,
         * and without this the reader has a hash on one screen and nothing to
         * compare it against.
         */}
        <dl className="flex flex-wrap gap-x-5 gap-y-1">
          <div className="flex gap-1">
            <dt className="text-ink-muted font-mono">policyId</dt>
            <dd className="font-mono">{portalPolicy.policyId}</dd>
          </div>
          <div className="flex gap-1">
            <dt className="text-ink-muted font-mono">policyFingerprint</dt>
            <dd className="font-mono break-all">{policyFingerprintOf(portalPolicy)}</dd>
          </div>
        </dl>
        <p>
          A change judged under these rules carries that fingerprint in its own record. One that
          carries a different one was judged before something here changed, which is the only way
          to tell the two apart after the fact.
        </p>
      </TechnicalDetail>
    </div>
  )
}

export default RulesPage
