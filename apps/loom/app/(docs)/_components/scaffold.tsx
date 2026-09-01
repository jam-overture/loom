import { Fragment } from "react"

import {
  commandRefusals,
  directoryOptionRun,
  helpOutput,
  refusedInitLeaves,
  scaffoldSession,
  type ScaffoldStep,
} from "@/app/(docs)/_lib/cli/scaffold"

import { CodeBlock } from "./code-block"

/**
 * The scaffolding page's terminal, and it is not a picture of one.
 *
 * Each of these awaits a real `runCli` against an in-memory disk as the page
 * builds (`_lib/cli/scaffold.ts`), so the paths, the closing notes, the file
 * contents and the refusal sentences are the CLI's own output rather than a
 * transcript somebody pasted in and stopped maintaining. They are server
 * components: none of this reaches the browser, and the page still prerenders.
 *
 * **No `<ul>` anywhere below.** `.prose ul` sets `display: flex` and a disc at a
 * specificity a utility class cannot beat, and `.not-prose` is not a cascade
 * barrier — the fourth component in this directory to meet that. A `div` is not
 * a workaround here so much as an admission that these rows are chrome rather
 * than a list a reader would read as one.
 */

const Terminal = ({ step }: { readonly step: ScaffoldStep }) => (
  <div className="border-edge overflow-hidden rounded-lg border">
    <div className="border-edge bg-surface-sunken flex items-center justify-between gap-3 border-b px-3 py-2">
      <span className="text-ink font-mono text-xs">
        <span className="text-ink-faint select-none">$ </span>
        {step.command}
      </span>
      <span className="text-ink-faint font-mono text-[0.65rem] tracking-wide uppercase">
        ran as this page built
      </span>
    </div>

    <div className="bg-code-surface flex flex-col gap-1 px-3 py-3 font-mono text-xs leading-relaxed">
      {step.written.map((path) => (
        <div key={path} className="text-code-ink">
          <span className="text-ink-faint select-none">wrote </span>
          {path}
        </div>
      ))}
      {step.notes.map((note) => (
        <div key={note} className="text-ink-muted mt-1 first:mt-0">
          {note}
        </div>
      ))}
    </div>
  </div>
)

/**
 * One command out of the session, named by the line a reader would type.
 *
 * Named rather than indexed so the page reads as what it shows, and so a page
 * that asks for a command the session does not run fails the build — the same
 * bargain `<Example id="…">` makes.
 */
export const ScaffoldTranscript = async ({ command }: { readonly command: string }) => {
  const session = await scaffoldSession()
  const step = session.steps.find((candidate) => candidate.command === command)

  if (step === undefined) {
    throw new Error(`loom: the documented scaffold does not run "${command}"`)
  }

  return (
    <div className="not-prose my-6">
      <Terminal step={step} />
    </div>
  )
}

/** `loom init --dir src/loom`, on a directory of its own. */
export const DirectoryOption = async () => {
  const step = await directoryOptionRun()

  return (
    <div className="not-prose my-6">
      <Terminal step={step} />
    </div>
  )
}

/**
 * A file the scaffold wrote, printed byte for byte.
 *
 * Through `CodeBlock`, which is what every fenced block on this site becomes —
 * a generated block that could not be copied would be the one snippet on the
 * page a reader has to retype, and it is the longest.
 */
export const ScaffoldedFile = async ({ path }: { readonly path: string }) => {
  const session = await scaffoldSession()
  const contents = session.files.get(path)

  if (contents === undefined) {
    throw new Error(`loom: the scaffold did not write "${path}"`)
  }

  return (
    <figure className="not-prose my-6">
      <figcaption className="text-ink-muted mb-1 font-mono text-xs">{path}</figcaption>
      <CodeBlock>{contents}</CodeBlock>
    </figure>
  )
}

/** What `loom --help` prints, obtained by running it. */
export const CliUsage = async () => {
  const usage = await helpOutput()

  return (
    <div className="not-prose my-6">
      <CodeBlock>{usage}</CodeBlock>
    </div>
  )
}

/**
 * Every way the command says no, with the sentence it really prints.
 *
 * A table rather than prose because the interesting comparison is down the
 * column: four of these protect something the reader wrote and four are
 * ordinary argument mistakes, and that only reads as a pattern when they are
 * next to each other.
 */
export const CommandRefusals = async () => {
  const refusals = await commandRefusals()
  const left = await refusedInitLeaves()

  return (
    <div className="not-prose my-6 flex flex-col gap-2">
      <div className="border-edge overflow-x-auto rounded-lg border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-surface-sunken text-ink">
              <th className="border-edge border-b px-3 py-2 text-left font-semibold">You ran</th>
              <th className="border-edge border-b px-3 py-2 text-left font-semibold">It said</th>
              <th className="border-edge border-b px-3 py-2 text-left font-semibold">
                What that protects
              </th>
            </tr>
          </thead>
          <tbody>
            {refusals.map((refusal) => (
              <tr key={refusal.code} className="border-edge border-b last:border-b-0">
                <td className="text-ink px-3 py-2 align-top font-mono text-xs whitespace-nowrap">
                  {refusal.command}
                </td>
                <td
                  data-refusal={refusal.code}
                  className="text-verdict-refused-ink px-3 py-2 align-top font-mono text-xs"
                >
                  {/*
                   * One `nowrap` span per word, with the separating spaces left
                   * outside them. A browser may break a line after a hyphen, so
                   * `run loom --help` wrapped as `run loom -` / `-help` — which
                   * reads as a typo, in the one column whose whole job is to
                   * quote the command exactly. Lines still wrap between words,
                   * because the space between two spans is an ordinary text
                   * node; no word is ever cut in half.
                   */}
                  {refusal.message.split(" ").map((word, index) => (
                    <Fragment key={`${word}-${index}`}>
                      {index > 0 ? " " : null}
                      <span className="whitespace-nowrap">{word}</span>
                    </Fragment>
                  ))}
                </td>
                <td className="text-ink-muted px-3 py-2 align-top">{refusal.protects}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-ink-muted text-sm">
        After the refused <code className="font-mono text-xs">loom init</code> above, the directory
        still holds the {left.size} file{left.size === 1 ? "" : "s"} it held before and nothing else
        — counted from the disk the run was given, not asserted.
      </p>
    </div>
  )
}
