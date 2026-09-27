import { readFileSync } from "node:fs"
import { join } from "node:path"

import { REPOSITORY_ROOT } from "../architecture/source"

/**
 * The quickstart, and the one place this site says anything about it.
 *
 * *Quickstart* is the only page on this site whose subject is a file rather
 * than an idea, and that changes what the page is allowed to contain. Every
 * other page shows code the reader is invited to adapt; this one shows a file
 * the reader is invited to **run**, unchanged, and then makes a claim about
 * what happens when they do.
 *
 * A claim like that cannot be typed. A transcript pasted into MDX is a
 * screenshot of a program that worked once — it keeps looking exactly as
 * convincing on the day the runtime stops printing it, and the reader is the
 * one who finds out. So two things are read from the repository instead:
 *
 * - **The file itself**, off disk, so the block on the page and the file the
 *   test runs are the same bytes and cannot be separately edited.
 * - **The transcript**, as the exact standard output the run must produce. It
 *   is written down here because it has to be *asserted* somewhere, and
 *   `quickstart.test.ts` runs the file the way the page tells a reader to and
 *   refuses any difference.
 *
 * So the page is wrong only in the one way a test can catch, and it catches it
 * before a stranger does.
 */

/** Where the file is, from the repository root. Also what the page links to. */
export const QUICKSTART_PATH = ["apps", "loom", "app", "(docs)", "_lib", "quickstart", "quickstart.ts"] as const

/**
 * What the reader saves it as, and the `m` is load-bearing.
 *
 * The file is `.ts` in this repository so that the application's own
 * typechecker reads it — `tsconfig.json` includes `**​/*.ts` and not `.mts`, and
 * an uncompiled quickstart would be the exact failure this whole directory
 * exists to prevent. A reader is told `.mts` because they are standing
 * somewhere else: a project `pnpm add` created has no `"type": "module"` in its
 * package.json, this file has top-level `await`, and `.ts` there fails to
 * transform with an error about output formats that names nothing they did.
 *
 * `quickstart.test.ts` runs it under a package.json shaped like theirs, both
 * ways, so the instruction is checked rather than believed.
 */
export const QUICKSTART_FILENAME = "quickstart.mts"

/** What the run writes, in whatever directory the reader runs it from. */
export const QUICKSTART_OUTPUT_FILE = "quickstart.html"

/**
 * The two lines a reader types, in order.
 *
 * `zod` is in the list and it is the one addition to the install line on
 * *Installation*: the runtime's own dependency is not necessarily resolvable
 * from your project, and this file declares a primitive of its own, which means
 * writing a schema. A reader who leaves it out gets a module-not-found on line
 * three, which is a bad first minute.
 */
export const QUICKSTART_COMMANDS: readonly string[] = [
  "pnpm add @jam-overture/loom react react-dom zod",
  "npx tsx quickstart.mts",
]

/**
 * The packages the install line has to name, and the only list that decides it.
 *
 * `quickstart.test.ts` reads the file's own imports, drops the Node builtins,
 * and holds the remainder against this — so an import added to the file and not
 * to the install line is a failing test rather than a reader's first
 * module-not-found.
 */
export const QUICKSTART_DEPENDENCIES: readonly string[] = [
  "@jam-overture/loom",
  "react",
  "react-dom",
  "zod",
]

/**
 * Exactly what the second command prints, and nothing near it.
 *
 * Every line here is deterministic on purpose: node ids come from a sequential
 * factory, no timestamp or id is printed, and the only interpreter is a lookup
 * table. So an exact comparison is available, and an exact comparison is what
 * makes this a claim rather than an impression.
 */
export const QUICKSTART_TRANSCRIPT: readonly string[] = [
  "Drew the page: revision 0, in quickstart.html",
  "",
  '  "Add a notice to the end of the page."',
  "   committed — the page is now at revision 1",
  "",
  '  "Make the headline smaller."',
  "   held — touches protected loom.heading — nothing has changed yet",
  "   you said yes → committed — the page is now at revision 2",
  "",
  '  "Delete the headline."',
  "   refused — destroys protected loom.heading; touches protected loom.heading; restructures at depth 1",
  "",
  "Drew it again: revision 2, in quickstart.html",
  "",
  "The log — every change that reached the page, and who asked:",
  "   1. insert — asked by you",
  "   2. configure — asked by you",
]

/**
 * The three answers the Gate can give, as the transcript spells them against
 * the three colours this site already uses for them.
 *
 * The runtime's word for a change that landed is `committed` and the site's
 * colour for it is `accepted`; the other two agree. Mapped here rather than in
 * the component because it is a fact about the runtime's vocabulary, and
 * because a colour picked by eye off a string is the sort of thing that quietly
 * stops matching.
 */
export const QUICKSTART_VERDICTS = {
  committed: "accepted",
  held: "held",
  refused: "refused",
} as const satisfies Record<string, string>

export type QuickstartVerdict = (typeof QUICKSTART_VERDICTS)[keyof typeof QUICKSTART_VERDICTS]

export type TranscriptLine = {
  readonly text: string
  /** Present when this line is the Gate answering, which is what gets colour. */
  readonly verdict?: QuickstartVerdict
}

const isOutcomeWord = (word: string): word is keyof typeof QUICKSTART_VERDICTS =>
  Object.hasOwn(QUICKSTART_VERDICTS, word)

/**
 * The transcript, with the answer on each line found rather than assumed.
 *
 * **The last outcome word on the line, not the first**, and the line that
 * settles it is `you said yes → committed`: a held change answered by a person
 * is reported twice on one line, and the verdict a reader is being shown is the
 * one at the end.
 */
export const quickstartTranscriptLines = (): readonly TranscriptLine[] =>
  QUICKSTART_TRANSCRIPT.map((text) => {
    const outcome = text.split(/\s+/u).filter(isOutcomeWord).at(-1)

    return outcome === undefined ? { text } : { text, verdict: QUICKSTART_VERDICTS[outcome] }
  })

/** The file, verbatim. Read at build time; the browser only gets the text. */
export const readQuickstartSource = (): string =>
  readFileSync(join(REPOSITORY_ROOT, ...QUICKSTART_PATH), "utf8")

/**
 * The three sentences somebody asks the running page for, lifted out of the
 * file rather than listed.
 *
 * The page talks about them one at a time — what each is, and why the Gate
 * answers it the way it does — and a list of three quoted strings typed into
 * MDX beside a file that contains the same three strings is the second copy
 * this module exists to avoid.
 */
export const quickstartUtterances = (source: string): readonly string[] =>
  [...source.matchAll(/^await ask\("(?<utterance>[^"]+)"\)$/gmu)].flatMap((match) =>
    match.groups?.utterance === undefined ? [] : [match.groups.utterance]
  )
