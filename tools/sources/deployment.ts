import { codeOnly } from "./code.js"

/**
 * What `docs/deployment.md` claims about this application, read off the
 * application.
 *
 * Three findings in six weeks have the same shape, all three filed by
 * `Loom signals` against the lane that owns the deployment guide: a setting is
 * added, the code that reads it carries the whole argument for it in a doc
 * comment, and **the one file an operator actually reads says nothing**. The
 * guide's own words for it — *"`apps/loom/.env.example` is the full list with
 * the commentary"* — are the claim that goes quietly false. Measured when this
 * module was written: six of the application's settings were documented nowhere
 * an operator reads, three of them about what it counts and keeps about readers.
 *
 * Nothing failed on any of the three branches, and nothing was going to. There
 * is no step in `pnpm verify` that reads the guide, so the drift is only ever
 * found by somebody who already knows the setting exists — which is the one
 * person who does not need the guide.
 *
 * So the claim is checked instead, the way 0360 checks a style rule: on the
 * branch that breaks it, naming the variable and the file that reads it.
 *
 * ## There is no list here that anybody maintains
 *
 * The variables come from the sources, the offers come from `.env.example`, the
 * rows come from the guide's own table. The one hand-written table is
 * `NOT_SET_BY_AN_OPERATOR`, which is five names with a reason each — and a new
 * variable is forced either into the example or into that table, where the
 * reason is the thing a reviewer reads.
 *
 * ## What this deployment runs, and what it prints for somebody else to run
 *
 * A surface may publish part of a file as a stranger's own code, and a file
 * that does says so on a line of its own. Everything after that line is a
 * **specimen**: it is compiled here so that nobody is shown code that does not
 * typecheck, and it is read by a visitor as the file *they* would write. A
 * variable it names is a setting of their deployment and never of this one, so
 * the reading below stops at the marker.
 */

/**
 * The shape of an environment variable's name.
 *
 * Screaming snake case with at least one underscore, which is what every
 * variable this repository reads looks like and what no other string literal in
 * the application happens to be. The underscore is load-bearing: without it the
 * shape also matches the single-word constant names a documentation page prints
 * as text.
 */
const NAME = /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+$/

/** `process.env.SOMETHING`, the spelling with the name written at the read. */
const DIRECT = /process\.env\.([A-Za-z_$][\w$]*)/g

/**
 * A string literal, located in the scanned code and read out of the source.
 *
 * `codeOnly` blanks a literal's body and **keeps its quotes**, so a pair of
 * quotes with nothing but spaces between them is a literal in code — and its
 * body is the slice at the same offsets in the original, because the scan
 * preserves every position. A quote inside a comment is blanked along with the
 * comment, so this cannot read a variable named in prose.
 *
 * That matters more than it sounds: the portal's *Credentials* screen prints
 * `process.env.LOOM_INGEST_KEY` inside a template literal, as a snippet for a
 * customer to paste into their own application. It is not this deployment's
 * setting, and reading the raw text would have made it one.
 */
const LITERAL = /(["'])( *)\1/g

/**
 * The line a surface writes above the part of a file it publishes.
 *
 * Three marketing specimens carry it today and each declares it as
 * `SHOWN_MARKER` in the module that prints the region. It is spelled here as
 * well rather than imported, because tooling that reached into a route group
 * for a constant would make this sweep depend on the surface it is checking —
 * and `declaredMarkers` below is how the two spellings are held together
 * instead.
 *
 * **It means something only on a line of its own.** The modules that publish a
 * region also write the marker as a string, to find it, so a reading that took
 * it from anywhere would cut those modules at their own declaration — and
 * everything a publishing module really does read would go unreported. That is
 * the same anchor, for the same reason, as `offered`'s assignment at the start
 * of a line.
 */
export const PUBLISHED_MARKER = "// ── shown on the site ──"

/**
 * Where a source stops being code this deployment runs.
 *
 * The whole length of a file with no published region, which is every file in
 * this repository but four.
 */
export const publishedFrom = (source: string): number => {
  const lines = source.split("\n")
  const at = lines.findIndex((line) => line.trimEnd() === PUBLISHED_MARKER)

  return at === -1
    ? source.length
    : lines.slice(0, at).reduce((total, line) => total + line.length + 1, 0)
}

/** The declaration a surface writes to find its own published region. */
const DECLARED = /\bSHOWN_MARKER = (["'])( *)\1/g

/**
 * Every spelling of the marker a source declares as a constant.
 *
 * The one thing that could make this sweep quietly stop recognising a
 * specimen: a surface respells its own `SHOWN_MARKER` and the files that carry
 * it are read as this deployment's code again. So the spellings are read back
 * off the application and held against the one above, which turns a rename
 * into a failure on the branch that writes it.
 *
 * Read through `codeOnly` by the same trick as `environmentNames` — the scan
 * keeps a literal's quotes and blanks its body, so the value is the slice at
 * those offsets in the original. A sentence in a doc comment that quotes the
 * constant is therefore not a declaration of it.
 *
 * **The stated limit**: a surface whose constant is named something else is
 * invisible here, the same limit and the same reason as a module that exports a
 * key without reading one.
 */
export const declaredMarkers = (source: string): readonly string[] =>
  [...codeOnly(source).matchAll(DECLARED)].map((match) => {
    const body = (match.index ?? 0) + match[0].indexOf(match[1] ?? '"') + 1

    return source.slice(body, body + (match[2] ?? "").length)
  })

/**
 * Every environment variable a source reads.
 *
 * Two spellings, because the application uses both: the name written at the
 * read, and the name exported as a constant and used as a subscript —
 * `env[INTAKE_KEY]`, which is how the reader-signal settings are read.
 * Resolving the second through its declaration would mean following an import;
 * taking every name-shaped literal in the file instead needs no resolution and
 * cannot miss one.
 *
 * **A file that never names `process.env` reads nothing**, and that gate is
 * what keeps a name-shaped literal from being mistaken for a variable. The
 * stated limit it buys: a module that exports a key but reads no environment
 * itself is invisible here. Every key in this application is declared in the
 * file that reads it, and a future one that is not wants a reader who knows
 * that — the same limit, for the same reason, as the git sweep's argvs written
 * as literals.
 *
 * **It reads what this deployment runs, which stops at a published region.**
 * `codeOnly` already hides a snippet a page prints inside a literal; a
 * specimen is the same claim one level up, and it is in code rather than in a
 * literal on purpose, because a snippet in a literal is a snippet nothing
 * typechecks. A file keeps whatever it reads *above* its marker, so a specimen
 * module's own settings are still reported and only the part a visitor would
 * copy is not.
 *
 * **What the exemption cannot hide**, which is why it is a marker rather than a
 * list of names: a real setting moved under a marker and left in
 * `.env.example` fails *offers nothing the application has stopped reading* on
 * the branch that moves it. What it can hide is a real setting read only under
 * a marker and offered nowhere — the same drift this whole module exists for,
 * reachable one more way, and the reason the marker is anchored to a line and
 * its spelling is swept.
 */
export const environmentNames = (source: string): readonly string[] => {
  const own = codeOnly(source).slice(0, publishedFrom(source))

  if (!own.includes("process.env")) return []

  const direct = [...own.matchAll(DIRECT)].map((match) => match[1] ?? "")

  const named = [...own.matchAll(LITERAL)].map((match) =>
    source.slice((match.index ?? 0) + 1, (match.index ?? 0) + 1 + (match[2] ?? "").length)
  )

  return [...new Set([...direct, ...named].filter((name) => NAME.test(name)))].sort()
}

/** A variable the application reads that an operator never types. */
export type NotSetByAnOperator = {
  readonly name: string
  /** Why it is not in `.env.example`. This is the sentence a reviewer reads. */
  readonly why: string
}

/**
 * The five reads that are not settings.
 *
 * Three are the platform's and two are second names for a variable that is in
 * the example under its first. `LOOM_PUBLISH_KEY` was a sixth until 8 November,
 * when the build began publishing the site's pages (0369) and it became a
 * setting a deployment holds. Everything else the application reads is something somebody has to
 * decide, so it belongs in the file the guide calls the full list.
 */
export const NOT_SET_BY_AN_OPERATOR: readonly NotSetByAnOperator[] = [
  { name: "NODE_ENV", why: "the framework's, set by the build" },
  { name: "VERCEL_ENV", why: "the platform's" },
  { name: "VERCEL_URL", why: "the platform's, and a different host on every preview" },
  {
    name: "ANTHROPIC_API_KEY",
    why: "the fallback name for LOOM_ANTHROPIC_API_KEY, which the example offers",
  },
  {
    name: "POSTGRES_URL",
    why: "the second name a platform's Postgres integration sets; DATABASE_URL is the first",
  },
]

/**
 * The variables `.env.example` offers, which is the ones it has a line for.
 *
 * An assignment at the start of a line, because that is the thing somebody
 * copies and fills in. A variable the file only *mentions* is not offered:
 * `LOOM_PORTAL_REVIEWERS` has a paragraph there saying it was retired in 0285,
 * and a reading that counted it would report a setting that no longer exists.
 */
export const offered = (example: string): readonly string[] => [
  ...new Set(
    [...example.matchAll(/^([A-Z][A-Z0-9_]*)=/gm)]
      .map((match) => match[1] ?? "")
      .filter((name) => NAME.test(name))
  ),
]

/** Every environment variable the guide names anywhere, in prose or in a fence. */
export const namedIn = (guide: string): ReadonlySet<string> =>
  new Set(
    [...guide.matchAll(/\b[A-Z][A-Z0-9_]*\b/g)]
      .map((match) => match[0])
      .filter((name) => NAME.test(name))
  )

/** The guide's table of variables, and the count its own prose claims for it. */
export type SettingsTable = {
  /** The number word in front of the table — *Nineteen variables*. */
  readonly claimed: string
  /** The variable each row is about, in the order the table gives them. */
  readonly rows: readonly string[]
}

/**
 * The table under `## Environment`, read as the two things that can disagree.
 *
 * The count is prose and the rows are a list, so they drift apart on different
 * days: when this was written the sentence said eleven and the table had ten
 * rows, which is the reason the count is read at all rather than assumed to
 * follow.
 */
export const settingsTable = (guide: string): SettingsTable | undefined => {
  const opening = guide.indexOf("\n## Environment\n")

  if (opening === -1) return undefined

  const next = guide.indexOf("\n## ", opening + 1)
  const section = guide.slice(opening, next === -1 ? undefined : next)
  const claimed = section.match(/\b([A-Z][a-z]+)\s+variables\b/)

  if (claimed === null) return undefined

  return {
    claimed: claimed[1] ?? "",
    rows: [...section.matchAll(/^\| *`([A-Z][A-Z0-9_]*)` *\|/gm)].map((match) => match[1] ?? ""),
  }
}

/**
 * A count as this repository's prose writes it.
 *
 * The guide counts in words because everything written here does, so a check
 * over its sentence has to be able to say the number the same way. Twenty is
 * the ceiling and nothing is lost by it: a table of settings past twenty wants
 * splitting rather than spelling, and a count this cannot say is reported as
 * such rather than passed.
 */
const WORDS: readonly string[] = [
  "Zero",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
  "Twenty",
]

export const countWord = (count: number): string | undefined => WORDS[count]

/**
 * The field names a type alias declares, read off its source.
 *
 * For the one claim in the guide that is about what the application *answers*
 * rather than what it is configured with: the sample response under *Reader
 * signals* was four fields behind the type it is a sample of, and had been
 * three behind for a fortnight before that. A sample that omits a field is a
 * sample an operator counts fields against.
 *
 * It reads the source rather than the value because the value needs a whole
 * `Intake` to exist — a journal, a store, a gate and a clock — and a fixture of
 * that size, in another lane's shape, to assert ten key names. The two-space
 * indent is what makes the reading safe: a doc comment's own lines inside the
 * alias begin with an asterisk, and a nested object's fields are indented
 * further, so neither is mistaken for a field of the type.
 */
export const fieldsOf = (source: string, type: string): readonly string[] => {
  const opening = source.indexOf(`export type ${type} = {`)

  if (opening === -1) return []

  const closing = source.indexOf("\n}", opening)
  const body = source.slice(opening, closing === -1 ? undefined : closing)

  return [...body.matchAll(/^ {2}readonly ([A-Za-z_$][\w$]*)\??:/gm)].map((match) => match[1] ?? "")
}

/**
 * Every fenced JSON object in a markdown file that parses, as its keys.
 *
 * A fence that does not parse is left out rather than reported: this is a
 * reading of the samples a guide prints, and a `json` fence showing a fragment
 * or an error message is a thing a guide is allowed to contain.
 */
export const fencedObjectKeys = (guide: string): readonly (readonly string[])[] =>
  [...guide.matchAll(/^```json\n([\s\S]*?)^```/gm)].flatMap((match) => {
    try {
      const parsed: unknown = JSON.parse(match[1] ?? "")

      return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
        ? [Object.keys(parsed)]
        : []
    } catch {
      return []
    }
  })
