import { contractSuites } from "@/app/(docs)/_lib/proving/contracts"

/**
 * The ready-made test suites, rendered from the door that publishes them.
 *
 * A list rather than a table, because the thing a reader has come for is the
 * **call** — and a signature in a table cell is a column 70 characters wide
 * next to one holding two words, which is a horizontal scrollbar on a phone.
 * Each suite gets its own block: the name, the seam it holds, then the call
 * under both.
 *
 * `_lib/proving/contracts.ts` is where the list comes from and why it is read
 * rather than typed.
 */
export const ContractSuites = () => (
  <ul data-contract-suites className="not-prose my-6 flex list-none flex-col gap-4 p-0">
    {contractSuites().map((suite) => (
      <li key={suite.name} className="border-edge rounded-lg border p-4">
        <p className="text-ink font-mono text-sm font-medium break-words">{suite.name}</p>

        <p className="text-ink-muted mt-1 text-sm">
          holds a <code className="text-ink font-mono text-xs">{suite.seam}</code> you wrote
          yourself
        </p>

        <pre className="border-edge bg-code-surface text-code-ink mt-3 overflow-x-auto rounded-lg border p-3 font-mono text-[0.8125rem] leading-relaxed">
          {suite.call}
        </pre>
      </li>
    ))}
  </ul>
)
