import {
  diagnosticsFor,
  produceRenderDiagnostics,
  type ReportedDiagnostic,
} from "@/app/(docs)/_lib/reporting/catalogue"
import {
  DIAGNOSTIC_AUDIENCES,
  type RenderDiagnosticCode,
} from "@/app/(docs)/_lib/reporting/codes"

/**
 * Every diagnostic a render can report, each one produced by a render that
 * reports it.
 *
 * Cards rather than a table, and the reason is one sentence in the output: the
 * unresolved theme's line names every palette the registry holds, which is
 * twenty-one ids and three hundred characters. A table built for that column is
 * a table with one wide column and five thin ones, on a page whose narrowest
 * reader is 390px across. `write-endings.tsx` reached the same conclusion from
 * the same measurement and this follows it, including the reason `<code>` is
 * avoided for the machine's own wording — inline code inside `.not-prose` still
 * picks up the site's pill styling, so every line would sit in a grey box that
 * reads as an input field.
 *
 * The group headings are the one thing here that is not the runtime's: who has
 * to act is the fact a reader wants first and the one the codes do not carry.
 * `codes.ts` holds the three groups and the sentence over each.
 */

const AUDIENCE_LABEL: Readonly<Record<string, string>> = {
  tree: "the tree",
  wiring: "your wiring",
  component: "the component",
}

const Diagnostic = ({ entry }: { readonly entry: ReportedDiagnostic }) => (
  <li className="border-edge bg-surface m-0 rounded-lg border p-0" data-diagnostic={entry.code}>
    <div className="border-edge flex flex-wrap items-baseline justify-between gap-2 border-b px-4 py-3">
      <p className="text-ink m-0 text-base font-semibold">{entry.title}</p>
      <p className="text-ink-faint m-0 font-mono text-xs">{entry.code}</p>
    </div>

    <div className="flex flex-col gap-3 px-4 py-3">
      <p className="text-ink-muted m-0 text-sm">{entry.story}</p>

      <div className="bg-surface-sunken border-edge rounded-md border px-3 py-2">
        <p className="text-ink-faint m-0 text-[0.6875rem] tracking-wide uppercase">
          What the runtime says
        </p>
        <p
          className="text-ink m-0 overflow-x-auto font-mono text-xs whitespace-pre-wrap"
          data-said={entry.code}
        >
          {entry.line}
        </p>
      </div>

      <p className="text-ink-muted m-0 text-sm">
        <span className="text-ink font-semibold">
          Whose problem it is: {AUDIENCE_LABEL[entry.audience] ?? entry.audience}.{" "}
        </span>
        {entry.fix}
      </p>
    </div>
  </li>
)

const Group = ({
  title,
  blurb,
  entries,
}: {
  readonly title: string
  readonly blurb: string
  readonly entries: readonly ReportedDiagnostic[]
}) => (
  <section className="not-prose my-8 flex flex-col gap-3" data-audience-group={entries[0]?.audience}>
    <div className="flex flex-col gap-1">
      <h3 className="text-ink m-0 text-lg font-semibold">{title}</h3>
      <p className="text-ink-muted m-0 text-sm">{blurb}</p>
    </div>

    <ul className="flex list-none flex-col gap-3 pl-0">
      {entries.map((entry) => (
        <Diagnostic key={entry.code} entry={entry} />
      ))}
    </ul>
  </section>
)

/**
 * Async because four of the twenty-four renders resolve a seam first, and it
 * runs as this page is built. If one of them stops reporting the diagnostic it
 * is filed under, `produceRenderDiagnostics` throws and the build stops rather
 * than the page printing a row that has become fiction.
 */
export const RenderDiagnostics = async () => {
  const reported = await produceRenderDiagnostics()

  return (
    <div data-render-diagnostics={reported.length}>
      {DIAGNOSTIC_AUDIENCES.map((group) => (
        <Group
          key={group.audience}
          title={group.title}
          blurb={group.blurb}
          entries={diagnosticsFor(reported, group.audience)}
        />
      ))}
    </div>
  )
}

/**
 * A named few of them, for the page that introduces the idea rather than the
 * page that lists it.
 *
 * *Rendering a tree* carried four of these as a markdown table from the day it
 * was written, which is how the site came to describe four of twenty-four as
 * though they were the set. The rows are the same rows here, read from the same
 * catalogue — so a code that is renamed or retired takes the introduction with
 * it instead of leaving a plausible table behind.
 */
export const NamedDiagnostics = async ({
  codes,
}: {
  readonly codes: readonly RenderDiagnosticCode[]
}) => {
  const reported = await produceRenderDiagnostics()
  const named = codes.map((code) => {
    const found = reported.find((entry) => entry.code === code)

    /**
     * Thrown rather than skipped. A page naming a code the catalogue no longer
     * has should stop the build: silently printing the three that are left is
     * the page quietly becoming wrong, which is the thing this component exists
     * to prevent.
     */
    if (found === undefined) {
      throw new Error(`loom: this page names the "${code}" diagnostic and the catalogue has no such code`)
    }

    return found
  })

  return (
    <ul className="not-prose my-6 flex list-none flex-col gap-3 pl-0" data-named-diagnostics={named.length}>
      {named.map((entry) => (
        <Diagnostic key={entry.code} entry={entry} />
      ))}
    </ul>
  )
}
