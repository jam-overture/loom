import { produceDefaults, produceDoors, produceRegions } from "@/app/(docs)/_lib/ceiling/page"

/**
 * The produced blocks on *When nothing comes back*.
 *
 * Both of them are a real await into code that never answers, held to five
 * milliseconds so the build does not spend the real ten seconds. Nothing here is
 * a description of what the runtime would do: the sentences in these tables were
 * written by the runtime, at build time, about promises that are still
 * unresolved as the page is serialized.
 *
 * Furniture in 0067's sense, like every other generated table on this site — it
 * presents something the repository knows. What a reader is shown *as a page* is
 * a `LoomTree` through the runtime, and the one this page is about is the shop
 * from *Where the content comes from*.
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
 * Every door out of Loom and into somebody else's code, with nobody on the other
 * side of it.
 *
 * The two columns a reader should read together are the last two. The default is
 * what a deployment gets and is read from the package; the sentence is what came
 * back here, at a ceiling this site chose so that a documentation build costs
 * milliseconds rather than half a minute. Both numbers are shown because showing
 * only one of them would be the page quietly implying it had waited three
 * minutes.
 */
export const TheThreeDoors = async () => {
  const doors = await produceDoors()
  const defaults = produceDefaults()

  return (
    <Panel
      caption={`${doors.length} awaits into code Loom did not write — each one held open, each one answered at ${defaults.docs}`}
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <Head columns={["What is being waited for", "Your deployment waits", "What came back"]} />
          <tbody>
            {doors.map((door) => (
              <tr key={door.constant} className="border-edge border-b last:border-b-0">
                <Cell>
                  <span className="text-ink">{door.door}</span>
                  <br />
                  <span className="font-mono">{door.call}</span>
                </Cell>
                <td className="text-ink-muted px-3 py-2 align-top text-xs" data-default={door.standard}>
                  <span className="bg-surface-sunken text-ink rounded-full px-2 py-0.5 font-mono">
                    {door.standard}
                  </span>
                  <br />
                  <span className="text-ink-faint font-mono">{door.constant}</span>
                </td>
                <td className="text-ink-muted px-3 py-2 align-top text-xs" data-code={door.code}>
                  <span className="font-mono">{door.code}</span>
                  <br />
                  {door.sentence}
                  <br />
                  <span className="text-ink-faint">the other side heard: {door.abort}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}

/**
 * The shop's own page, resolved with one source that never answers.
 *
 * This is the block the whole decision is about, and the thing to look at is how
 * ordinary the last two rows are. Before the ceiling, one silent integration did
 * not cost its own region: it cost the page, for as long as the socket stayed
 * open, with nothing written down anywhere.
 */
export const OneSilentRegion = async () => {
  const regions = await produceRegions()
  const answered = regions.filter((region) => region.status === "ready")

  return (
    <Panel
      caption={`One page, ${regions.length} bound regions, one source that never replies — ${answered.length} of them still got their answer`}
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <Head columns={["The region", "What it asked", "What it got"]} />
          <tbody>
            {regions.map((region) => (
              <tr
                key={`${region.where}-${region.reads}`}
                className="border-edge border-b last:border-b-0"
                data-status={region.status}
              >
                <Cell>{region.where}</Cell>
                <Cell>
                  <span className="font-mono">{region.source}</span>
                  <br />
                  <span className="text-ink-faint font-mono">{region.reads}</span>
                </Cell>
                <td className="px-3 py-2 align-top text-xs">
                  <span
                    className={`rounded-full px-2 py-0.5 font-mono ${
                      region.status === "ready"
                        ? "bg-surface-sunken text-ink"
                        : "bg-warning-surface text-warning-ink"
                    }`}
                  >
                    {region.status}
                  </span>
                  <br />
                  <span className="text-ink-muted">{region.value}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}
