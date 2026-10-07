import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import { formatRate, NO_VALUE } from "@/app/(portal)/_lib/calibration-view"
import { plainSpan, type Earlier, type TrendSpan, type TrendReading } from "@/app/(portal)/_lib/trust-trend"
import { toneClasses } from "@/app/(portal)/_lib/vocabulary"

/**
 * Whether the AI is getting better at judging itself — the one thing on this page
 * that can be different tomorrow.
 *
 * It sits directly under the verdict because it qualifies it rather than adding
 * to it: *the AI has been over-sure of itself* reads very differently beside *and
 * it is getting better* than beside *and it is getting worse*. The misses stay
 * below, because they are the part a reader acts on and this is the part that
 * tells them how urgently.
 *
 * The two stretches' own numbers are one disclosure down, both of them, including
 * the pass rates the verdict deliberately does not use. Nothing is withheld; the
 * reader meets a sentence before a table.
 */
export const TrustTrend = ({
  trend,
  now,
  earlier,
  detail,
}: {
  readonly trend: TrendReading
  readonly now: TrendSpan
  readonly earlier: Earlier
  /** The journal's own words, when the read that would have fetched the earlier stretch failed. */
  readonly detail?: string
}) => (
  <section className="flex flex-col gap-3" data-trust-trend={trend.kind}>
    {/*
     * A heading, because the verdict above this is drawn in the same tones and a
     * screen where both readings are bad puts two identical-looking panels one
     * under the other. The first photograph of this section showed exactly that,
     * and without a heading the second panel reads as the first one repeating
     * itself rather than as the answer to a different question. The other two
     * sections on this page are headed for the same reason.
     */}
    <h2 className="text-base tracking-tight">Has it got better?</h2>

    <div className={"flex flex-col gap-1 rounded-md px-4 py-3 " + toneClasses(trend.tone)}>
      <span className="text-base">{trend.label}</span>
      <span className="text-xs opacity-90">{trend.meaning}</span>
      <span className="mt-1 text-xs opacity-80">{trend.next}</span>
    </div>

    {trend.aside !== undefined && (
      <p className="text-ink-secondary text-sm">{trend.aside}</p>
    )}

    {detail !== undefined && (
      <TechnicalDetail summary="Why the earlier stretch is missing">
        <p className="font-mono">{detail}</p>
      </TechnicalDetail>
    )}

    {typeof earlier === "object" && (
      <TechnicalDetail summary="The two stretches, side by side">
        <p className="text-ink-muted">
          A stretch is a page of the record — two hundred entries — and not a week, so these
          two cover different lengths of time. The dates are what each one actually spans.
        </p>

        <table className="w-full border-collapse">
          <thead>
            <tr className="text-ink-muted text-left text-2xs">
              <th className="pb-1 pr-4 font-normal">stretch</th>
              <th className="pb-1 pr-4 text-right font-normal">judged</th>
              <th className="pb-1 pr-4 text-right font-normal">survived</th>
              <th className="pb-1 pr-4 text-right font-normal">mean claim</th>
              <th className="pb-1 pr-4 text-right font-normal">gap</th>
              <th className="pb-1 font-normal">covering</th>
            </tr>
          </thead>
          <tbody>
            <SpanRow label="this one" span={now} />
            <SpanRow label="the one before" span={earlier} />
          </tbody>
        </table>

        {/*
         * The three things that would make the comparison above wrong, named
         * rather than left to be discovered. An episode straddling the boundary
         * is the one nobody would think of: its records are split across two
         * pages, so neither stretch can score it and both say so.
         */}
        <p className="text-ink-muted">
          The verdict compares how far each stretch&rsquo;s claims sat from what happened — the
          gap column, as a distance, ignoring its sign. It does not compare the survival
          rates: how often a change goes through is what your rules and the people here allow,
          so it moves when you edit a rule and the AI has not changed at all.
        </p>

        {(now.unattributed > 0 || earlier.unattributed > 0) && (
          <p className="text-ink-muted">
            {now.unattributed + earlier.unattributed}{" "}
            {now.unattributed + earlier.unattributed === 1 ? "entry" : "entries"} across the two
            belong to an ask that began before the stretch holding them, and are counted in
            neither column.
          </p>
        )}

        <p className="text-ink-muted">
          {rulesetsPhrase(now, earlier)} A comparison is only drawn when both stretches ran on
          one and the same recorded ruleset.
        </p>
      </TechnicalDetail>
    )}
  </section>
)

/**
 * How many distinct rulesets judged the two stretches between them — the union
 * and not the sum, because one ruleset running across both is one ruleset and a
 * sum would print two.
 */
const rulesetsPhrase = (now: TrendSpan, earlier: TrendSpan): string => {
  const distinct = new Set([...now.rulesets, ...earlier.rulesets]).size
  const unrecorded = now.unfingerprinted + earlier.unfingerprinted
  const recorded =
    distinct === 0
      ? "Neither stretch recorded which ruleset judged it."
      : distinct > 1
        ? `${distinct} different recorded rulesets judged these two stretches.`
        : now.rulesets.length === 1 && earlier.rulesets.length === 1
          ? "One recorded ruleset judged both stretches."
          : "One recorded ruleset appears across these two stretches."

  return unrecorded === 0
    ? recorded
    : `${recorded} A further ${unrecorded} ${unrecorded === 1 ? "claim was" : "claims were"} judged before rulesets were recorded, so they could have run on anything.`
}

const SpanRow = ({ label, span }: { readonly label: string; readonly span: TrendSpan }) => (
  <tr className="border-edge-subtle border-t">
    <td className="text-ink-muted py-2 pr-4 text-2xs whitespace-nowrap">{label}</td>
    <td className="py-2 pr-4 text-right font-mono text-2xs">{span.judged || NO_VALUE}</td>
    <td className="py-2 pr-4 text-right font-mono text-2xs">{formatRate(span.observedRate)}</td>
    <td className="py-2 pr-4 text-right font-mono text-2xs">
      {formatRate(span.meanConfidence)}
    </td>
    <td className="py-2 pr-4 text-right font-mono text-2xs">
      {span.gap === null ? NO_VALUE : `${span.gap > 0 ? "+" : ""}${span.gap.toFixed(2)}`}
    </td>
    <td className="text-ink-muted w-full py-2 text-2xs">{plainSpan(span) ?? "no dates recorded"}</td>
  </tr>
)
