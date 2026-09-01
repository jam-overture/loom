import { produceWriteEndings, type WriteEnding } from "@/app/(docs)/_lib/write/endings"

/**
 * The seven endings, each one produced by ending that way.
 *
 * Cards rather than a table, and that is a decision a 390px screen made: five
 * fields per row is four columns too many, and the two that matter most — the
 * runtime's own sentence and what a host does about it — are the two a table
 * would squeeze thinnest.
 *
 * `<code>` is avoided for the kind and for the runtime's line, because inline
 * code inside `.not-prose` still picks up the site's pill styling and every
 * line would sit in a grey box that reads as an input field. The other
 * generated blocks on this site reached the same conclusion; `font-mono` on a
 * plain element is how they all say "this is the machine's wording".
 */

const Ending = ({ ending }: { readonly ending: WriteEnding }) => (
  <li className="border-edge bg-surface m-0 rounded-lg border p-0" data-ending={ending.kind}>
    <div className="border-edge flex flex-wrap items-baseline justify-between gap-2 border-b px-4 py-3">
      <p className="text-ink m-0 text-base font-semibold">{ending.title}</p>
      <p className="text-ink-faint m-0 font-mono text-xs">{ending.kind}</p>
    </div>

    <div className="flex flex-col gap-3 px-4 py-3">
      <p className="text-ink-muted m-0 text-sm">{ending.story}</p>

      <div className="bg-surface-sunken border-edge rounded-md border px-3 py-2">
        <p className="text-ink-faint m-0 text-[0.6875rem] tracking-wide uppercase">
          What the runtime says
        </p>
        <p
          className="text-ink m-0 overflow-x-auto font-mono text-xs whitespace-pre-wrap"
          data-said={ending.kind}
        >
          {ending.line}
        </p>
      </div>

      <p className="text-ink-muted m-0 text-sm">
        <span className="text-ink font-semibold">What your app does. </span>
        {ending.yourMove}
      </p>
    </div>
  </li>
)

/**
 * Async because the write path is, and it runs as this page is built — seven
 * stores opened, seven asks sent, nothing cached. If one of them stops reaching
 * its ending, `produceWriteEndings` throws and the build stops rather than the
 * page printing a row that has become fiction.
 */
export const WriteEndings = async () => {
  const endings = await produceWriteEndings()

  return (
    <ul className="not-prose my-6 flex list-none flex-col gap-3 pl-0">
      {endings.map((ending) => (
        <Ending key={ending.kind} ending={ending} />
      ))}
    </ul>
  )
}
