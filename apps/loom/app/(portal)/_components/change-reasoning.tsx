import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import type { Reasoning } from "@/app/(portal)/_lib/refusal"
import { NOTHING_WEIGHED, WEIGHING } from "@/app/(portal)/_lib/vocabulary"

/**
 * What the Gate weighed, under the verdict it produced.
 *
 * ## The altitude, which is the whole of this component
 *
 * Every string a reader meets unasked here is a clause from `STAKE_FACTORS` or a
 * sentence from `RULE_SENTENCES`, and every string the runtime wrote is inside
 * the disclosure. That is not a style: it is the property
 * `_test/plain-language.ts` asserts, and it is the one this pair of facts was
 * failing hardest. Before this component, the same information reached a person
 * as
 *
 * > `refused: adds a node no primitive is registered for, so it draws nothing:
 * > app.gallery at n_7`
 *
 * printed as body text on `/portal/history` and as the only account of *why*
 * anywhere in the portal.
 *
 * ## One clause per line, and the id stays in the record
 *
 * A bulleted list rather than a joined sentence, because the Gate weighs up to
 * thirteen things and three of them at once is ordinary. Semicolons are what the
 * runtime joins them with and what made the old string unreadable at a glance.
 *
 * The node id does **not** come to the surface with the clause, which is a
 * deliberate exception to the 22 August rule that names belong on the surface.
 * That rule is about *identity* — which page, which part, so a reader knows what
 * a row is about — and it holds on every card in this portal. Here the subject is
 * already identified by the card this sits inside, and `n_7` in the middle of
 * *"it asks for a kind of part this site has nothing to draw it with"* names a
 * part that does not exist yet and never will: it is an id from a change that was
 * refused, so nothing a reader can open has it. It is in the record, one click
 * down, beside the type name that is the actually useful half.
 *
 * ## A disclosure per clause was the first shape and it was wrong
 *
 * Three clauses each with their own `<details>` is three controls to open to read
 * one account, and `TechnicalDetail`'s own note argues against exactly this —
 * a screen with two disclosures should say which is which, and a screen with
 * three saying the same thing is a screen that has lost the thread. One
 * disclosure, with the clause repeated as the label of its own detail line, so a
 * reader who opens it can see which account belongs to which clause.
 */
export const ChangeReasoning = ({ reasoning }: { readonly reasoning: Reasoning }) => (
  <section className="flex flex-col gap-2">
    <h3 className="text-xs font-medium">{WEIGHING[reasoning.kind]}</h3>

    {reasoning.objections.length === 0 ? (
      <p className="text-xs">{NOTHING_WEIGHED[reasoning.kind]}</p>
    ) : (
      <ul className="flex list-disc flex-col gap-1 pl-4 text-xs">
        {reasoning.objections.map((objection) => (
          <li key={objection.code}>{objection.clause}</li>
        ))}
      </ul>
    )}

    {/*
     * The rule, after the reasons rather than before them.
     *
     * It was above the list in the first draft, which is the order the runtime
     * reaches them in and the wrong order for a reader: *"This project does not
     * allow changes this risky at all"* as the first thing under a refusal sends
     * somebody to their settings, and the sentence that tells them settings are
     * not the problem is the one below it. Reasons first, then the line they ran
     * into.
     */}
    <p className="text-ink-secondary text-xs">{reasoning.rule}</p>

    <TechnicalDetail summary="How this was decided">
      <p>
        The rule the record names is{" "}
        <span className="font-mono">{reasoning.ruleCode}</span>.
      </p>

      {reasoning.objections.length === 0 ? (
        <p>
          No stake factor was recorded against this change, so the rule above fired on something
          other than what the change does.
        </p>
      ) : (
        <dl className="flex flex-col gap-2">
          {reasoning.objections.map((objection) => (
            <div key={objection.code} className="flex flex-col gap-0.5">
              <dt className="font-mono">
                {objection.code} · {objection.level}
              </dt>
              {/*
               * The runtime's own sentence, unaltered. It carries the type name,
               * the id, and — for a setting a part refused — the value and the
               * words that part's own description used to refuse it. Quoted
               * rather than reworded, because a refusal rewritten into friendlier
               * words is a claim about a translation of the evidence rather than
               * about the evidence.
               */}
              <dd>{objection.detail}</dd>
            </div>
          ))}
        </dl>
      )}
    </TechnicalDetail>
  </section>
)
