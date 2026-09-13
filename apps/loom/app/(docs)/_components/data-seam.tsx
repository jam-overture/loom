import {
  produceAnswers,
  produceMisdeclared,
  produceMissingAnswers,
  produceQuestions,
} from "@/app/(docs)/_lib/data/answers"
import { produceRepointing } from "@/app/(docs)/_lib/data/repointing"

/**
 * The four blocks on *Where the content comes from*, each printing what a real
 * seam did.
 *
 * Async where the work is: planning a tree is pure and prints immediately,
 * asking is the one step that does IO even when the IO is a literal. A producer
 * that stops reaching its outcome throws rather than letting the page print a
 * confident lie.
 *
 * Furniture in 0067's sense, like every other generated table here: it presents
 * something the repository knows and is not a component library growing beside
 * the primitives. What a reader is shown *as a page* on this site is still a
 * `LoomTree` through the runtime.
 */

const Panel = ({
  caption,
  children,
}: {
  readonly caption: string
  readonly children: React.ReactNode
}) => (
  <div className="not-prose border-edge my-6 overflow-hidden rounded-lg border">
    <p className="border-edge bg-surface-sunken text-ink-muted m-0 border-b px-3 py-2 text-xs">
      {caption}
    </p>
    {children}
  </div>
)

const Cell = ({ children }: { readonly children: React.ReactNode }) => (
  <td className="text-ink-muted px-3 py-2 align-top text-xs">{children}</td>
)

const Mono = ({ children }: { readonly children: React.ReactNode }) => (
  <td className="text-ink px-3 py-2 align-top font-mono text-xs">{children}</td>
)

const Head = ({ columns }: { readonly columns: readonly string[] }) => (
  <thead>
    <tr className="bg-surface-sunken text-ink">
      {columns.map((column) => (
        <th key={column} className="border-edge border-b px-3 py-2 text-left font-semibold">
          {column}
        </th>
      ))}
    </tr>
  </thead>
)

/**
 * The tree read literally, and the questions it comes to.
 *
 * Both halves are printed because the interesting thing is the difference: four
 * declarations, two of which are the same question with their keys in different
 * orders, and three round trips.
 */
export const WhatTheTreeAsks = () => {
  const asked = produceQuestions()

  return (
    <>
      <Panel caption="Every binding written into this page, in the order they appear">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <Head columns={["On", "Read as", "From", "Asked with"]} />
            <tbody>
              {asked.written.map((binding) => (
                <tr
                  key={`${binding.where}-${binding.reads}`}
                  className="border-edge border-b last:border-b-0"
                >
                  <Cell>{binding.where}</Cell>
                  <Mono>{binding.reads}</Mono>
                  <Mono>{binding.source}</Mono>
                  <Mono>{binding.params}</Mono>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel
        caption={`What the planner asks: ${asked.asked} questions for ${asked.written.length} bindings`}
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <Head columns={["Question", "Asked with", "Answers"]} />
            <tbody>
              {asked.questions.map((question) => (
                <tr key={question.source} className="border-edge border-b last:border-b-0">
                  <Mono>{question.source}</Mono>
                  <Mono>{question.params}</Mono>
                  <Cell>
                    <span data-asked-by={question.askedBy.length}>
                      {question.askedBy.join(" · and · ")}
                    </span>
                  </Cell>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  )
}

/** What each bound node's primitive is handed once the asking is done. */
export const WhatComesBack = async () => {
  const answers = await produceAnswers()

  return (
    <Panel caption="What the host answered, read back the way a primitive reads it">
      <ul className="m-0 flex list-none flex-col gap-0 p-0">
        {answers.map((answer) => (
          <li
            key={`${answer.where}-${answer.reads}`}
            className="border-edge flex flex-col gap-1 border-b px-3 py-3 last:border-b-0"
            data-status={answer.status}
          >
            <p className="text-ink-muted m-0 text-xs">
              <span className="text-ink font-mono">{answer.reads}</span> on {answer.where}, from{" "}
              <span className="font-mono">{answer.source}</span>
            </p>
            <p className="m-0 flex flex-wrap items-baseline gap-2 text-xs">
              <span className="bg-surface-sunken text-ink rounded-full px-2 py-0.5 font-mono">
                {answer.status}
              </span>
              {answer.rows !== undefined && (
                <span className="text-ink-faint" data-rows={answer.rows}>
                  {answer.rows === 0 ? "nothing in it" : `${answer.rows} rows`}
                </span>
              )}
            </p>
            {answer.sharedWith === undefined ? (
              <pre className="text-ink-muted m-0 overflow-x-auto font-mono text-xs leading-relaxed">
                {answer.value}
              </pre>
            ) : (
              <p className="text-ink-faint m-0 text-xs" data-shared-with={answer.sharedWith}>
                The same answer {answer.where === answer.sharedWith ? "again" : `as ${answer.sharedWith}`}
                , from the one question both of them asked.
              </p>
            )}
          </li>
        ))}
      </ul>
    </Panel>
  )
}

/** Six bindings, six reasons, one resolve — and the declaration nobody could read. */
export const WhenThereIsNoAnswer = async () => {
  const missing = await produceMissingAnswers()
  const misdeclared = produceMisdeclared()

  return (
    <Panel caption="Six questions on one page, the six ways they went unanswered — and, last, a declaration nobody could read">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <Head columns={["What happened", "Reason", "What the runtime says", "Your code"]} />
          <tbody>
            {missing.map((row) => (
              <tr key={row.reason} className="border-edge border-b" data-reason={row.reason}>
                <Cell>{row.when}</Cell>
                <Mono>{row.reason}</Mono>
                <Cell>{row.sentence}</Cell>
                <Cell>{row.reached}</Cell>
              </tr>
            ))}
            <tr className="border-edge border-b last:border-b-0" data-reason="misdeclared">
              <Cell>The declaration in the tree is not a binding map at all.</Cell>
              <Mono>misdeclared</Mono>
              <Cell>{misdeclared}</Cell>
              <Cell>the adapter was never called</Cell>
            </tr>
          </tbody>
        </table>
      </div>
    </Panel>
  )
}

/** One repointed binding, judged under two policies that differ in one line. */
export const WhoMayRepointIt = async () => {
  const verdicts = await produceRepointing()

  return (
    <Panel caption="The same ask — point the band at somebody's orders — judged twice">
      <div className="flex flex-col sm:flex-row">
        {verdicts.map((verdict) => (
          <div
            key={verdict.label}
            className="border-edge flex flex-1 flex-col gap-1 border-b px-4 py-3 last:border-b-0 sm:border-b-0 sm:not-last:border-r"
            data-kind={verdict.kind}
          >
            <p className="text-ink-faint m-0 text-[0.6875rem] tracking-wide uppercase">
              {verdict.label}
            </p>
            <p className="text-ink-muted m-0 font-mono text-xs">{verdict.difference}</p>
            <p className="text-ink m-0 text-sm font-semibold">
              {verdict.kind === "accepted" ? "Applied, without asking anybody" : "Held for a person"}
            </p>
            <p className="text-ink-muted m-0 font-mono text-xs">
              {verdict.reasonCode} · stakes {verdict.stakes}
            </p>
            <p className="text-ink-muted m-0 text-xs">{verdict.detail}</p>
          </div>
        ))}
      </div>
    </Panel>
  )
}
