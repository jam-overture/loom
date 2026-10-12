import { Example } from "@/app/(docs)/_components/example"
import { docsExamples } from "@/app/(docs)/_lib/examples/catalogue"
import { libraryReaders, readingFaults } from "@/app/(docs)/_lib/data/reading"

/**
 * The reading half of *Where the content comes from*.
 *
 * Three blocks, and the division of labour between them is the point. The
 * example is a real page a reader can change; the two tables are produced from
 * the registry and from real renders. Nothing here is a component library
 * growing beside the primitives (0067) — it is furniture presenting what the
 * repository already knows, and what a reader is shown *as a page* is still a
 * `LoomTree` through the runtime.
 */

const Panel = ({
  caption,
  children,
  name,
}: {
  readonly caption: string
  readonly children: React.ReactNode
  /** What a shot list and a test ask for this block by. */
  readonly name: string
}) => (
  <div data-block={name} className="not-prose border-edge my-6 overflow-hidden rounded-lg border">
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

const Mono = ({ children }: { readonly children: React.ReactNode }) => (
  <td className="text-ink px-3 py-2 align-top font-mono text-xs">{children}</td>
)

/**
 * An example whose tree asks its deployment a question, resolved before it is
 * handed over.
 *
 * **This is the two lines the page recommends, as a component.** The questions
 * are planned and asked here, on a server, where going and getting somebody's
 * data belongs; the answers travel as data; the frame below renders in a
 * browser, because a propose-a-change box produces a new tree and something has
 * to draw it. A reader following this page in their own application does the
 * same thing in whatever already loads the page.
 *
 * An example with no answers to fetch throws rather than rendering a frame that
 * is quietly about nothing — the same way `Example` refuses an id nobody
 * registered.
 */
export const BoundExample = async ({ id }: { readonly id: string }) => {
  const example = docsExamples.get(id)

  if (example === undefined) {
    throw new Error(`loom: no documented example is registered as "${id}"`)
  }

  if (example.answers === undefined) {
    throw new Error(`loom: the example "${id}" asks nothing, so it does not need resolving — render it with <Example />`)
  }

  return <Example id={id} answers={await example.answers()} />
}

/**
 * Every primitive in the starter library that reads an answer, read off the
 * registry.
 *
 * The table exists because the sentence it replaced was a count, written when
 * the count was nought, and a count in prose is the thing on this site most
 * likely to be quietly wrong.
 */
export const LibraryReaders = () => {
  const readers = libraryReaders()

  return (
    <Panel
      name="library-readers"
      caption={`${readers.length} primitives in the starter library read an answer, and these are all of them`}
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <Head columns={["Primitive", "Reads under", "Regions it places", "Says what it dropped"]} />
          <tbody>
            {readers.map((reader) => (
              <tr key={reader.type} className="border-edge border-b last:border-b-0">
                <Mono>{reader.type}</Mono>
                <Cell>{reader.reads.join(", ")}</Cell>
                <Mono>{reader.regions.length === 0 ? "none" : reader.regions.join(" · ")}</Mono>
                <Cell>{reader.reportsWhatItDropped ? "yes" : "no"}</Cell>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}

/**
 * Three bindings that went wrong with nothing wrong with the data, each caused.
 *
 * The sentence in the last column is `describeRenderDiagnostic`'s own. A render
 * that stops reaching the fault it is filed under stops the build, so a row here
 * cannot describe something the runtime no longer reports.
 */
export const ReadingFaults = async () => {
  const faults = await readingFaults()

  return (
    <Panel name="reading-faults" caption="Three ways a binding is wrong when the answer arrived perfectly well">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <Head columns={["Goes wrong in the", "What the author did", "What the render reported"]} />
          <tbody>
            {faults.map((fault) => (
              <tr key={fault.code} className="border-edge border-b last:border-b-0">
                <Cell>{fault.stage}</Cell>
                <Cell>{fault.cause}</Cell>
                <Cell>
                  <span data-fault={fault.code}>{fault.sentence}</span>
                </Cell>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}
