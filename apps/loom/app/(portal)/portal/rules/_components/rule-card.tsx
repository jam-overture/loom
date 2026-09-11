import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import {
  looksStricterThanNeeded,
  readingOfRecord,
  type RuleRecord,
} from "@/app/(portal)/_lib/rule-record"
import { WHEN_IT_FIRES, type PlainRule } from "@/app/(portal)/_lib/rules-view"
import { GATE_VERDICTS, ruleSentence, toneClasses } from "@/app/(portal)/_lib/vocabulary"

/**
 * One rule: what it does, what it has done, and the fields it is made of.
 *
 * The reading order is the argument of the whole screen in miniature. What the
 * rule does comes first, because it is true on a deployment nothing has happened
 * on yet and it is what somebody arrived to find out. What it has done comes
 * second, because a count is only meaningful once you know what was being
 * counted. The field names come last and behind a click, because
 * `autoApplyCeiling.user-instruction: medium` is the line somebody comparing
 * this screen against their own configuration needs and the line nobody else
 * does.
 *
 * The suggestion is the only sentence on this screen that recommends anything,
 * and it is deliberately the only one. 0031 settled that a measurement of the
 * runtime's own judgement is a reader: it may tell a person what it sees and it
 * may not act. So this says a rule looks stricter than it needs to be, names the
 * evidence, and leaves the editing of a policy where it belongs — in the host's
 * code, by a human who has read this.
 */
export const RuleCard = ({
  rule,
  record,
}: {
  readonly rule: PlainRule
  readonly record: RuleRecord
}) => {
  const fires = rule.outcome === undefined ? undefined : WHEN_IT_FIRES[rule.outcome]

  return (
    <div className="border-edge-subtle bg-surface-base flex flex-col gap-2 rounded-md border p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="text-md tracking-tight">{rule.title}</h2>
        {fires !== undefined && rule.outcome !== undefined && (
          <span
            title={fires.meaning}
            className={"shrink-0 rounded-sm px-2 py-1 text-2xs " + toneClasses(GATE_VERDICTS[rule.outcome].tone)}
          >
            {fires.label}
          </span>
        )}
      </div>

      <p className="text-ink-secondary text-sm">{rule.reading}</p>

      {rule.rows.length > 0 && (
        <dl className="flex flex-col gap-1 text-xs">
          {rule.rows.map((row) => (
            <div key={row.of} className="flex flex-wrap gap-x-2">
              <dt className="text-ink-secondary">{row.of}</dt>
              <dd className="text-ink-muted">{row.is}</dd>
            </div>
          ))}
        </dl>
      )}

      <p className="text-ink-muted text-xs">{readingOfRecord(rule, record)}</p>

      {looksStricterThanNeeded(rule, record) && (
        <p className="text-ink-secondary text-xs">
          You have said yes every time this one has asked. It may be stricter than you need
          &mdash; loosening it means changing your project&rsquo;s own settings, not anything
          in here.
        </p>
      )}

      <TechnicalDetail
        summary={
          rule.code === undefined
            ? "The numbers behind this one"
            : "The settings behind this rule, and what the record calls it"
        }
      >
        {rule.code === undefined ? (
          <p>
            This one is never recorded as a reason. It decides how risky a change is, and the two
            rules about risk are what act on the answer.
          </p>
        ) : (
          <>
            <p>
              A decision this rule made is written down as{" "}
              <span className="font-mono">{rule.code}</span>, and the record&rsquo;s own sentence
              for it is: {ruleSentence(rule.code)}
            </p>
            <p>
              One reason is kept per decision, so a change that ran into this rule and another one
              is counted under whichever the Gate reached first. That order is the runtime&rsquo;s
              and this screen cannot read it, so the counts above are a lower bound on how often
              this rule would have applied rather than a count of every change it touched.
            </p>
          </>
        )}

        {rule.settings.length === 0 ? (
          <p>
            There is no setting for this one. It is on for every deployment and cannot be turned
            off from a policy.
          </p>
        ) : (
          <dl className="flex flex-wrap gap-x-5 gap-y-1">
            {rule.settings.map((setting) => (
              <div key={setting.name} className="flex gap-1">
                <dt className="text-ink-muted font-mono">{setting.name}</dt>
                <dd className="font-mono">{setting.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </TechnicalDetail>
    </div>
  )
}
