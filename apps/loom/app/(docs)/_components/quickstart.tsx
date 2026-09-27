import {
  QUICKSTART_COMMANDS,
  QUICKSTART_FILENAME,
  QUICKSTART_OUTPUT_FILE,
  quickstartTranscriptLines,
  readQuickstartSource,
} from "@/app/(docs)/_lib/quickstart/program"

import { CodeBlock } from "./code-block"

/**
 * Written out rather than composed.
 *
 * Tailwind reads source text, so a class name built as `text-verdict-${kind}`
 * is a class nothing generates and a line that silently loses its colour. The
 * three are spelled here in full, once.
 */
const VERDICT_INK = {
  accepted: "text-verdict-accepted-ink",
  held: "text-verdict-held-ink",
  refused: "text-verdict-refused-ink",
} as const

/**
 * The quickstart's two blocks: the file, and what it prints.
 *
 * Both are server components and neither is typed into the page. The file is
 * read off disk as the page builds, so the block a reader copies is the file
 * `quickstart.test.ts` runs; the transcript is the standard output that same
 * test compares, in full, against a real run. Nothing here reaches the browser
 * except the text.
 *
 * `_lib/quickstart/program.ts` is where the argument for doing it this way is
 * written down.
 */

/** The whole file, in one copyable block, named the way the page says to save it. */
export const QuickstartFile = () => (
  /*
   * `CodeBlock` owns its own margin and rounding — it was written for a fenced
   * block standing alone, and here it is the bottom half of a labelled panel.
   * Neither is a prop it takes (`className` reaches the `pre` inside it, not the
   * frame), so the two are cancelled from the parent on the one child, and the
   * panel keeps the block's copy button, which is the whole reason to use it.
   */
  <div className="my-6 [&>div]:my-0 [&>div]:rounded-t-none">
    <div className="border-edge bg-surface-sunken text-ink-faint flex items-center justify-between gap-3 rounded-t-lg border border-b-0 px-3 py-2 font-mono text-xs">
      <span className="text-ink">{QUICKSTART_FILENAME}</span>
      <span className="tracking-wide uppercase">read from the repository as this page built</span>
    </div>

    <CodeBlock>{readQuickstartSource()}</CodeBlock>
  </div>
)

/**
 * The install line, from the one list that decides it.
 *
 * It was typed into the page as a fenced block, and that block was a **third**
 * copy of a command stated in `program.ts` and again in the quickstart file's
 * own header comment. On 27 September the library became its own package, two
 * of the three copies were updated, and the page went on showing the one a
 * reader reads — which is the failure mode a second copy always has, arriving
 * here as a screenshot that came back byte-identical to the one before the
 * change.
 *
 * `QUICKSTART_DEPENDENCIES` is what `quickstart.test.ts` holds the file's own
 * imports against, and this renders the command built from it, so the block a
 * reader copies and the list the test checks cannot be different lists.
 */
export const QuickstartInstall = () => (
  <div className="border-edge bg-surface-sunken my-6 rounded-lg border px-3 py-3">
    <span className="text-ink font-mono text-xs">
      <span className="text-ink-faint select-none">$ </span>
      {QUICKSTART_COMMANDS[0]}
    </span>
  </div>
)

/**
 * The run, as a terminal.
 *
 * The three answers carry the same three colours the propose-a-change box uses
 * under every example on this site, because they are the same three answers —
 * a reader who has pressed a chip should recognise them without being told.
 */
export const QuickstartOutput = () => (
  <div className="border-edge my-6 overflow-hidden rounded-lg border">
    <div className="border-edge bg-surface-sunken flex flex-col gap-1 border-b px-3 py-2">
      {QUICKSTART_COMMANDS.map((command) => (
        <span key={command} className="text-ink font-mono text-xs">
          <span className="text-ink-faint select-none">$ </span>
          {command}
        </span>
      ))}
    </div>

    <div className="bg-code-surface overflow-x-auto px-3 py-3 font-mono text-xs leading-relaxed">
      {quickstartTranscriptLines().map((line, index) => (
        <div
          key={`${index}-${line.text}`}
          {...(line.verdict === undefined ? {} : { "data-verdict": line.verdict })}
          className={
            line.verdict === undefined
              ? "text-code-ink whitespace-pre"
              : `whitespace-pre ${VERDICT_INK[line.verdict]}`
          }
        >
          {/* A blank line is a blank line, not a collapsed one. */}
          {line.text === "" ? " " : line.text}
        </div>
      ))}
    </div>

    <div className="border-edge text-ink-muted border-t px-3 py-2 text-sm">
      It also writes <code className="font-mono text-xs">{QUICKSTART_OUTPUT_FILE}</code> beside the
      file you ran. Open it — that is the page, drawn from the tree, twice.
    </div>
  </div>
)
