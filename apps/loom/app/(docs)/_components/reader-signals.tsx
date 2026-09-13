import { produceAddressedMarkup } from "@/app/(docs)/_lib/signals/markup"
import { produceBatch, produceKinds, produceReadBack } from "@/app/(docs)/_lib/signals/page"

/**
 * The produced blocks on *What your readers do*.
 *
 * Three of them, and each prints what the runtime actually did rather than what
 * this file believes it does: the four kinds come from the closed list the
 * schema is built from, the markup comparison is one tree rendered twice, and
 * the read-back is `parseReaderSignalBatch` given five inputs.
 *
 * The fourth block on that page — the live one — is a client component, because
 * a broadcaster with no browser has nothing to report and a table of invented
 * batches is exactly what this site keeps refusing to ship.
 *
 * Furniture in 0067's sense, like every other generated table here: it presents
 * something the repository knows. What a reader is shown *as a page* is still a
 * `LoomTree` through the runtime, and there is one of those at the top of this
 * page and another inside the live block.
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

const Cell = ({ children }: { readonly children: React.ReactNode }) => (
  <td className="text-ink-muted px-3 py-2 align-top text-xs">{children}</td>
)

/**
 * The four kinds, and one real signal of each.
 *
 * The signals are printed beside the sentences because the sentences are the
 * easy half. "A region was opened" is a thing anybody could write; the JSON
 * under it is the runtime's schema having accepted that exact object, with the
 * node id of a node on the page above.
 */
export const TheFourKinds = () => {
  const kinds = produceKinds()

  return (
    <Panel caption={`The whole vocabulary: ${kinds.length} kinds, and nothing else a page may say`}>
      <ul className="m-0 flex list-none flex-col gap-0 p-0">
        {kinds.map((row) => (
          <li key={row.kind} className="border-edge border-b px-3 py-3 last:border-b-0" data-kind={row.kind}>
            <p className="m-0 flex flex-wrap items-baseline gap-2">
              <span className="bg-surface-sunken text-ink rounded-full px-2 py-0.5 font-mono text-xs">
                {row.kind}
              </span>
              <span className="text-ink text-sm">{row.means}</span>
            </p>
            <p className="text-ink-muted m-0 mt-1 text-xs">
              On the page above: {row.here}
            </p>
            <p className="text-ink-faint m-0 mt-1 font-mono text-xs">{row.carries}</p>
            <pre className="text-ink-muted m-0 mt-2 overflow-x-auto font-mono text-xs leading-relaxed">
              {row.example}
            </pre>
          </li>
        ))}
      </ul>
    </Panel>
  )
}

/** One batch, whole, as it leaves the page. */
export const OneBatch = () => {
  const batch = produceBatch()

  return (
    <Panel
      caption={`One delivery: ${batch.signals} signals about ${batch.treeId} at revision ${batch.revision}`}
    >
      <pre
        className="text-ink m-0 overflow-x-auto px-3 py-3 font-mono text-xs leading-relaxed"
        data-signals={batch.signals}
        data-revision={batch.revision}
      >
        {batch.json}
      </pre>
    </Panel>
  )
}

const Attributes = ({ of }: { readonly of: readonly { attribute: string; value: string }[] }) => (
  <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
    {of.map((one) => (
      <li key={one.attribute} className="text-ink m-0 font-mono text-xs">
        {one.attribute}=<span className="text-ink-muted">&quot;{one.value}&quot;</span>
      </li>
    ))}
  </ul>
)

/**
 * What addressing writes, asked of the function that writes it.
 *
 * `nothingElseIsWritten` is the row that matters and it is stated as a pass/fail
 * rather than as prose. The same bag serves edit mode, which means a great deal
 * more than identity — so the question worth asking a published page is not
 * whether the four arrived but whether a fifth ever does.
 */
export const WhatAddressingCosts = () => {
  const markup = produceAddressedMarkup()

  return (
    <Panel caption={`What addressing writes on a page of ${markup.addressedElements} elements`}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <Head columns={["Where", "What it gains"]} />
          <tbody>
            <tr className="border-edge border-b">
              <Cell>
                Every element
                <br />
                <span className="text-ink-faint">
                  here, the <span className="font-mono">{markup.thatElementIs}</span>
                </span>
              </Cell>
              <td className="px-3 py-2 align-top" data-addressed={markup.addressedElements}>
                <Attributes of={[...markup.onAnElement]} />
              </td>
            </tr>
            <tr className="border-edge border-b">
              <Cell>The root, as well</Cell>
              <td className="px-3 py-2 align-top">
                <Attributes of={[...markup.onTheRoot]} />
              </td>
            </tr>
            <tr className="border-edge border-b last:border-b-0">
              <Cell>Everything else on the page</Cell>
              <Cell>
                nothing —{" "}
                <span data-added={markup.bytesAdded}>
                  {markup.bytesAdded.toLocaleString("en-GB")} bytes of attributes in total
                </span>
              </Cell>
            </tr>
          </tbody>
        </table>
      </div>

      <p
        className={`border-edge m-0 border-t px-3 py-2 text-xs ${
          markup.nothingElseIsWritten ? "text-ink-muted" : "bg-warning-surface text-warning-ink"
        }`}
        data-only-four={String(markup.nothingElseIsWritten)}
      >
        {markup.nothingElseIsWritten
          ? "Those four attribute names are the whole of it. Take them back out of the document and you have the unaddressed page, byte for byte — which is checked by rendering it both ways."
          : "Addressing wrote something beyond those four attributes — which would make this page wrong."}
      </p>
    </Panel>
  )
}

/** Five things arriving at one endpoint, and what the parser makes of each. */
export const ReadingABatchBack = () => {
  const rows = produceReadBack()

  return (
    <Panel caption="parseReaderSignalBatch, given one batch a page sent and four things that were not one">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <Head columns={["What arrived", "Taken?", "What the runtime says"]} />
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.what}
                className="border-edge border-b last:border-b-0"
                data-accepted={String(row.accepted)}
              >
                <Cell>{row.what}</Cell>
                <td className="px-3 py-2 align-top text-xs">
                  <span
                    className={`rounded-full px-2 py-0.5 font-mono ${
                      row.accepted ? "bg-surface-sunken text-ink" : "bg-warning-surface text-warning-ink"
                    }`}
                  >
                    {row.accepted ? "yes" : "no"}
                  </span>
                </td>
                <td className="text-ink-muted px-3 py-2 align-top font-mono text-xs">{row.says}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}
