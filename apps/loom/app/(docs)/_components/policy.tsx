import {
  KNOB_GROUPS,
  knobsInGroup,
  type KnobGroupNote,
  type PolicyKnob,
} from "@/app/(docs)/_lib/policy/knobs"
import {
  comparisonById,
  type ComparisonId,
  type PolicyVerdict,
  type VerdictColumn,
  type VerdictComparison,
} from "@/app/(docs)/_lib/policy/verdicts"

/**
 * The two things this page shows that it does not say.
 *
 * `PolicyKnobs` is the whole of a Gate policy, read off the type and the
 * defaults rather than typed here. `PolicyComparison` is one ask judged twice,
 * run as the page builds — the pair a reader can look at to check that "change
 * the policy and the answers change" is a fact about this system rather than a
 * sentence about it.
 *
 * Cards rather than a table, for the reason the write endings reached first: the
 * two fields that matter most are the long ones, and a table gives them the
 * least room. A 390px screen settles it.
 *
 * `<code>` is avoided inside these blocks. Inline code within `.not-prose` still
 * picks up the site's pill styling, so every value would sit in a grey box that
 * reads as an input field; `font-mono` on a plain element is how the other
 * generated blocks on this site say "this is the machine's wording".
 */

const Knob = ({ knob }: { readonly knob: PolicyKnob }) => (
  <li className="border-edge bg-surface m-0 rounded-lg border p-0" data-knob={knob.field}>
    <div className="border-edge flex flex-wrap items-baseline justify-between gap-2 border-b px-4 py-3">
      <p className="text-ink m-0 font-mono text-sm font-semibold">{knob.field}</p>
      <p className="text-ink-faint m-0 font-mono text-xs" data-shipped={knob.field}>
        {knob.shipped}
      </p>
    </div>

    <div className="flex flex-col gap-2 px-4 py-3">
      <p className="text-ink-muted m-0 text-sm">{knob.plain}</p>
      <p className="text-ink-muted m-0 text-sm">
        <span className="text-ink font-semibold">What you do about it. </span>
        {knob.yourMove}
      </p>
    </div>
  </li>
)

/**
 * Whether a deployment has to write this group, said once above the cards
 * rather than repeated inside each of them.
 *
 * It is the answer to the question a reader arrives with — *how much of this do
 * I actually have to do?* — and the honest answer is "four fields, and the rest
 * have defaults". A table that did not say so would read as thirteen decisions.
 */
const KnobGroupBlock = ({ group }: { readonly group: KnobGroupNote }) => (
  <section className="my-8" data-knob-group={group.id}>
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h3 className="text-ink m-0 text-lg font-semibold">{group.title}</h3>
      <p className="text-ink-faint m-0 font-mono text-xs" data-yours={String(group.yours)}>
        {group.yours ? "yours to write" : "ships with answers"}
      </p>
    </div>
    <p className="text-ink-muted mt-1 mb-0 text-sm">{group.summary}</p>

    <ul className="mt-4 flex list-none flex-col gap-3 pl-0">
      {knobsInGroup(group.id).map((knob) => (
        <Knob key={knob.field} knob={knob} />
      ))}
    </ul>
  </section>
)

/**
 * Every field of `GatePolicy`, grouped by the question it answers.
 *
 * The grouping is the site's; the field list and every default beside it come
 * from the runtime. A knob added to the policy and not to `knobs.ts` does not
 * reach this component — it stops the file compiling first.
 */
export const PolicyKnobs = () => (
  <div className="not-prose">
    {KNOB_GROUPS.map((group) => (
      <KnobGroupBlock key={group.id} group={group} />
    ))}
  </div>
)

/** What each verdict is called on the page, in a reader's words rather than the enum's. */
const VERDICT_TITLES: Record<PolicyVerdict["kind"], string> = {
  accepted: "Applied",
  "requires-confirmation": "Held for a person",
  rejected: "Refused",
}

const Verdict = ({ column }: { readonly column: VerdictColumn }) => (
  <li
    className="border-edge bg-surface m-0 flex flex-1 flex-col rounded-lg border p-0"
    data-verdict={column.verdict.kind}
  >
    <div className="border-edge border-b px-4 py-3">
      <p className="text-ink m-0 text-base font-semibold">{column.label}</p>
      <p className="text-ink-muted mt-1 mb-0 text-sm">{column.difference}</p>
    </div>

    <div className="flex flex-1 flex-col gap-3 px-4 py-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="text-ink m-0 text-base font-semibold">
          {VERDICT_TITLES[column.verdict.kind]}
        </p>
        <p className="text-ink-faint m-0 font-mono text-xs">
          {column.verdict.kind} · {column.verdict.stakes}
        </p>
      </div>

      <div className="bg-surface-sunken border-edge rounded-md border px-3 py-2">
        <p className="text-ink-faint m-0 text-[0.6875rem] tracking-wide uppercase">
          Why, in the Gate&rsquo;s words
        </p>
        <p
          className="text-ink m-0 overflow-x-auto font-mono text-xs whitespace-pre-wrap"
          data-said={column.verdict.reasonCode}
        >
          {column.verdict.detail}
        </p>
      </div>

      <p className="text-ink-faint m-0 font-mono text-xs">judged by {column.verdict.policyId}</p>
    </div>
  </li>
)

const Comparison = ({ comparison }: { readonly comparison: VerdictComparison }) => (
  <figure className="not-prose my-8 m-0" data-comparison={comparison.id}>
    <figcaption className="mb-3">
      <p className="text-ink m-0 text-base font-semibold">{comparison.question}</p>
      <p className="text-ink-muted mt-1 mb-0 text-sm">
        <span className="text-ink-faint">Asked: </span>
        {comparison.ask}
      </p>
    </figcaption>

    <ul className="m-0 flex list-none flex-col gap-3 pl-0 sm:flex-row">
      {comparison.columns.map((column) => (
        <Verdict key={column.label} column={column} />
      ))}
    </ul>

    <p className="text-ink-muted mt-3 mb-0 text-sm">{comparison.moral}</p>
  </figure>
)

/**
 * Async because judging is, and it runs as this page is built. If a column stops
 * producing the verdict it claims, `produceComparisons` throws and the build
 * stops rather than the page printing a contrast that is no longer there.
 */
export const PolicyComparison = async ({ id }: { readonly id: ComparisonId }) => {
  const comparison = await comparisonById(id)

  return <Comparison comparison={comparison} />
}
