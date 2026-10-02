import { produceAddressedMarkup } from "@/app/(docs)/_lib/signals/markup"
import {
  produceApproved,
  produceBatch,
  produceKinds,
  producePlainly,
  produceReadBack,
} from "@/app/(docs)/_lib/signals/page"

/**
 * The produced blocks on *What your readers do*.
 *
 * Each prints what the runtime actually did rather than what this file believes
 * it does: the kinds come from the closed list the schema is built from, the
 * markup comparison is one tree rendered twice, and the read-back is
 * `parseReaderSignalBatch` given five inputs.
 *
 * Two of them exist because the vocabulary is closed and **not finished**. The
 * page may not state its own size — `WhatAPageMaySay` writes the opening
 * sentence's list from the runtime's kinds, and `TheApprovedAddition` prints the
 * kinds this page has prose for that the runtime has not got yet. The second
 * renders nothing once there are none, which is the point of it: the day a kind
 * lands, the announcement of it removes itself.
 *
 * Every row additionally carries the gap between its name and the fact it stands
 * for. That used to be printed only beside a kind the runtime had not got yet,
 * which meant the one row most likely to be misread — a `completed`, named after
 * something no page can observe — lost its caveat on the day it became real.
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
 * The opening sentence's list of what a page may say, in plain words.
 *
 * Inline rather than in a panel, because it is a clause in a sentence a reader
 * is already halfway through. It is produced for the same reason the panel below
 * it is: it is an enumeration, and an enumeration typed into prose is the size
 * of the vocabulary written out in a place nothing checks.
 */
export const WhatAPageMaySay = () => <>{producePlainly()}</>

/**
 * The kinds, what each one means, what it does **not**, and one real signal of
 * each.
 *
 * The signals are printed beside the sentences because the sentences are the
 * easy half. "A region was opened" is a thing anybody could write; the JSON
 * under it is the runtime's schema having accepted that exact object, with the
 * node id of a node on the page above.
 *
 * The *does not mean* line is the one addition a reader of the old panel would
 * notice, and it is here rather than in the prose for the reason the prose
 * cannot do it: a caveat in a paragraph is read once, by somebody who has not
 * yet met the name it is about, while this one sits against the row somebody is
 * looking at when they decide what to count. It is styled as a counterweight to
 * `means` — same size, muted, behind a hairline — because that is what it is.
 * Dimming it further would make it a footnote, and the whole finding behind this
 * block is that it is not one.
 */
export const TheVocabulary = () => {
  const kinds = produceKinds()

  return (
    <Panel caption={`The whole vocabulary: ${kinds.length} kinds, and nothing else a page may say`}>
      <ul className="m-0 flex list-none flex-col gap-0 p-0" data-vocabulary={kinds.length}>
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
            <p
              className="border-edge text-ink-muted m-0 mt-2 border-l-2 pl-2 text-sm"
              data-does-not-mean={row.kind}
            >
              {row.doesNotMean}
            </p>
            <p className="text-ink-faint m-0 mt-2 font-mono text-xs">{row.carries}</p>
            <pre className="text-ink-muted m-0 mt-2 overflow-x-auto font-mono text-xs leading-relaxed">
              {row.example}
            </pre>
          </li>
        ))}
      </ul>
    </Panel>
  )
}

/**
 * The kinds that are agreed on and not built, or nothing at all.
 *
 * Deliberately **not** a heading and not part of the vocabulary panel. A reader
 * counting what a page may say today should count the panel above and stop; this
 * is a note about the future, and it is styled as one — dashed, muted, and
 * clearly outside the list.
 *
 * It returns `null` when there is nothing pending, and that is the whole reason
 * it is a component rather than a paragraph. The prose around it says nothing
 * about a coming addition, so the day the addition arrives there is no sentence
 * left over talking about it in the future tense. That failure — an announcement
 * outliving the thing it announced — is the ordinary way a roadmap note rots,
 * and the only reliable fix is for the note to be unable to survive.
 */
export const TheApprovedAddition = () => {
  const approved = produceApproved()

  if (approved.length === 0) return null

  return (
    <div
      className="not-prose border-edge text-ink-muted my-6 rounded-lg border border-dashed px-4 py-3"
      data-approved={approved.length}
    >
      <p className="text-ink m-0 text-sm font-semibold">
        {approved.length === 1 ? "One more is agreed on, and not built yet." : "More are agreed on, and not built yet."}
      </p>
      <p className="m-0 mt-1 text-xs">
        The runtime does not accept {approved.length === 1 ? "it" : "them"} today, so nothing above this
        line mentions {approved.length === 1 ? "it" : "them"} and no page of yours can send one. This is
        here so that the list you just read is the whole list, rather than the whole list as far as
        anyone got round to saying.
      </p>
      <ul className="m-0 mt-3 flex list-none flex-col gap-3 p-0">
        {approved.map((row) => (
          <li key={row.kind} className="m-0" data-kind={row.kind}>
            <p className="m-0 flex flex-wrap items-baseline gap-2">
              <span className="border-edge text-ink rounded-full border border-dashed px-2 py-0.5 font-mono text-xs">
                {row.kind}
              </span>
              <span className="text-ink text-sm">{row.means}</span>
            </p>
            <p className="text-ink-faint m-0 mt-1 font-mono text-xs">{row.carries}</p>
            <p className="m-0 mt-1 text-xs">{row.doesNotMean}</p>
          </li>
        ))}
      </ul>
    </div>
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
