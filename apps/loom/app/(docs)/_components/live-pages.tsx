import {
  baseBandCount,
  produceArrival,
  produceFailures,
  produceFirstReader,
  produceReaders,
  produceTimings,
} from "@/app/(docs)/_lib/live/pulling"

/**
 * The produced blocks on *How a change reaches readers*.
 *
 * Four tables, and every cell in them was written by the published pull client
 * running against a door `_lib/live/pulling.ts` stands up. Nothing here
 * describes what the runtime would do: the five sentences in the failure table
 * were returned by `describeSitePullFailure` about five pulls that really
 * failed, and the refusal in the third reader's row was returned by
 * `describeComposeError` about a form that really was behind its page.
 *
 * Furniture in 0067's sense, like every other generated table on this site: it
 * presents something the repository knows. What a reader is shown *as a page* is
 * a `LoomTree` through the runtime, and the one this page is about is the shop
 * from *What your readers do*.
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

const Mono = ({ children }: { readonly children: React.ReactNode }) => (
  <span className="font-mono">{children}</span>
)

const Pill = ({ children, warn = false }: { readonly children: React.ReactNode; readonly warn?: boolean }) => (
  <span
    className={`rounded-full px-2 py-0.5 font-mono ${
      warn ? "bg-warning-surface text-warning-ink" : "bg-surface-sunken text-ink"
    }`}
  >
    {children}
  </span>
)

/**
 * What one pull asks for, and what comes back.
 *
 * The two rows to read together are the address and the counts. The address
 * carries the project's key in a header and nothing about any reader, which is
 * the whole of why sorting a reader into a segment can happen afterwards and in
 * the host's own process. The counts arrive in one answer so that the rules
 * that sort a page's readers can never belong to a different pull than the page
 * they sort them over.
 */
export const OnePull = async () => {
  const arrival = await produceArrival()
  const timings = produceTimings()

  const rows: readonly { readonly what: string; readonly value: string; readonly note: string }[] = [
    {
      what: "What was asked",
      value: arrival.url,
      note: `your deployment's address, with ${arrival.path} appended by the client`,
    },
    {
      what: "What came back",
      value: arrival.kind,
      note: "one of three words: fresh, unchanged, or failed",
    },
    {
      what: "Pages",
      value: String(arrival.pages),
      note: "every page the project has published, by id",
    },
    {
      what: "Segment rules",
      value: String(arrival.rules),
      note: "which readers of which page belong to which segment",
    },
    {
      what: "Segment forms",
      value: String(arrival.forms),
      note: "the change each segment's readers are served over the base",
    },
    {
      what: "Tag",
      value: arrival.tag,
      note: "sent back on the next pull, so an unchanged answer costs nothing",
    },
    {
      what: "Drawing on Loom's pages",
      value: arrival.pulling ? "yes" : "no",
      note: `asked again every ${timings.interval}`,
    },
  ]

  return (
    <Panel caption={`One pull against a door answering this site's own page, every ${timings.interval}`}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <Head columns={["", "What it was", "What it is for"]} />
          <tbody>
            {rows.map((row) => (
              <tr key={row.what} className="border-edge border-b last:border-b-0">
                <Cell>
                  <span className="text-ink">{row.what}</span>
                </Cell>
                <Cell>
                  <Mono>{row.value}</Mono>
                </Cell>
                <Cell>{row.note}</Cell>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}

/**
 * Every way a pull can fail, and the page served in all of them.
 *
 * The last column is the one this block exists for. It is the same answer in
 * every row, and it is the answer on a server that has never pulled at all: the
 * page the site was built with. A host writes no error state for any of this.
 */
export const EveryWayAPullFails = async () => {
  const failures = await produceFailures()
  const timings = produceTimings()
  const served = failures.filter((failure) => failure.served).length

  return (
    <Panel
      caption={`${failures.length} pulls, each one really made and really failed — and the reader got the page ${served} times out of ${failures.length}`}
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <Head columns={["What happened", "What Loom called it", "What the reader got"]} />
          <tbody>
            {failures.map((failure) => (
              <tr
                key={failure.reason}
                className="border-edge border-b last:border-b-0"
                data-reason={failure.reason}
              >
                <Cell>
                  <span className="text-ink">{failure.cause}</span>
                  {failure.status === "none" ? null : (
                    <>
                      <br />
                      <span className="text-ink-faint font-mono">answered {failure.status}</span>
                    </>
                  )}
                </Cell>
                <Cell>
                  <Pill warn>{failure.reason}</Pill>
                  <br />
                  {failure.sentence}
                </Cell>
                <Cell>
                  <Pill>{failure.served ? "the page" : "nothing"}</Pill>
                  <br />
                  <span className="text-ink-faint">
                    {failure.held === 0
                      ? "no live pages held, so every page renders as it was built"
                      : `${failure.held} live pages still held`}
                  </span>
                </Cell>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="border-edge text-ink-faint m-0 border-t px-3 py-2 text-xs">
        The third row waited {timings.docs} rather than the {timings.ceiling} a deployment waits, so
        that building this site costs milliseconds. Both numbers are shown because showing one would
        be this page implying it had waited the other.
      </p>
    </Panel>
  )
}

/**
 * One page, one pull, three readers.
 *
 * The third row is the one to read twice. Its form was written when the page was
 * at one revision and the page has moved past it, so the form is not applied —
 * and what the reader loses is their **segment**, not their page. Filing their
 * page views under a segment they were not shown would make every later
 * comparison between two segments a comparison between one segment's form and
 * another segment's name.
 */
export const ThreeReaders = async () => {
  const readers = await produceReaders()
  const base = baseBandCount()

  return (
    <Panel
      caption={`One page of ${base} bands, one segment, and the three answers one call gave`}
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <Head columns={["The reader", "What your server knew", "What they were served"]} />
          <tbody>
            {readers.map((reader) => (
              <tr
                key={reader.who}
                className="border-edge border-b last:border-b-0"
                data-segment={reader.segment}
              >
                <Cell>
                  <span className="text-ink">{reader.who}</span>
                </Cell>
                <Cell>
                  <Mono>{reader.context}</Mono>
                </Cell>
                <Cell>
                  <Pill warn={reader.refusal !== "none"}>
                    {reader.bands} bands{reader.formApplied ? ", with the form" : ""}
                  </Pill>
                  <br />
                  <span className="text-ink-muted">
                    filed under {reader.segment === "none" ? "everybody" : reader.segment}
                  </span>
                  {reader.refusal === "none" ? null : (
                    <>
                      <br />
                      <span className="text-ink-faint">{reader.refusal}</span>
                    </>
                  )}
                </Cell>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}

/**
 * The one wait a reader ever has, and which reader has it.
 *
 * Produced by counting the door's calls either side of two renders on a server
 * that had just started. The first render waits for the first pull, so the first
 * person through the door gets the live page rather than one that changes on
 * their next request. The second render asks the door for nothing.
 */
export const TheOneWait = async () => {
  const first = await produceFirstReader()
  const timings = produceTimings()

  return (
    <Panel caption="Two renders on a server that has just started, and what each one cost the door">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <Head columns={["", "The first render", "Every render after it"]} />
          <tbody>
            <tr className="border-edge border-b">
              <Cell>
                <span className="text-ink">Pulls the door had been asked for</span>
              </Cell>
              <Cell>
                <Mono>{first.pullsAtFirstRender}</Mono>
              </Cell>
              <Cell>
                <Mono>{first.pullsAtSecondRender}</Mono>
              </Cell>
            </tr>
            <tr className="border-edge border-b">
              <Cell>
                <span className="text-ink">Waited on the network</span>
              </Cell>
              <Cell>
                <Pill warn>once, for the first pull</Pill>
              </Cell>
              <Cell>
                <Pill>{first.secondRenderAskedTheDoor ? "yes" : "no"}</Pill>
              </Cell>
            </tr>
            <tr className="border-edge border-b last:border-b-0">
              <Cell>
                <span className="text-ink">Got Loom&rsquo;s page</span>
              </Cell>
              <Cell>
                <Pill>{first.firstRenderWasLive ? "yes" : "no"}</Pill>
              </Cell>
              <Cell>
                <Pill>yes</Pill>
              </Cell>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="border-edge text-ink-faint m-0 border-t px-3 py-2 text-xs">
        A Loom that says nothing ends that wait after {timings.firstWait}, and the render serves the
        page as it was built. One pull is given {timings.ceiling} before it is a failure.
      </p>
    </Panel>
  )
}
