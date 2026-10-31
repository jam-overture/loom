import { publishedNamesIn } from "./api/mentions"
import { outsideFences } from "./fences/spans"
import { DOCS_LANDING_SLUG, docsHref, docsSections, writtenDocsSections } from "./nav"
import { readPageSource } from "./search/headings"

/**
 * **The plain-language version comes first, and the precise version is one
 * scroll later — never the reverse.**
 *
 * That is the maintainer's standing direction for this surface, and it is the
 * one rule here that is about a reader rather than about a file: *"it should be
 * very intuitive, such that a high schooler can easily follow what is going
 * on."* The brief spells out the failure it is aimed at, and the spelling is
 * what makes it checkable — *a page that opens with `TreeDelta`,
 * `baseRevision` and `disposition` has lost the reader before it has said what
 * any of them are for.*
 *
 * ## Why this is a test and not a convention
 *
 * **Because the site already keeps it, everywhere, and nothing was holding
 * it.** On the morning this was written, across the thirty-five written pages:
 *
 * | where a reader meets a page | how many | naming a published export |
 * | --- | --- | --- |
 * | the one-line summary the rail and the pager carry | 35 | **0** |
 * | the page's opening, above its first `##` | 35 | **0** |
 * | its `##` and `###` headings | 216 | **0** |
 *
 * Seventy published names appear in this site's prose. **Not one of them
 * appears in a summary or an opening.** That is a discipline held two hundred
 * and eighty-six times by whoever happened to be writing, with no check
 * anywhere in this repository that would notice the first page to break it.
 *
 * `voice.ts` made this argument first and it is the same one: *a site edited by
 * routines with no memory of each other cannot hold a convention that is only
 * written down. It can hold one that goes red.* Spelling was the first claim
 * over that reader. This is the second, and it is the one the brief shouts.
 *
 * ## What counts as naming something
 *
 * **A name is a name when it is in backticks**, which is the convention this
 * whole surface already runs on — `api/mentions.ts` says why (*"prose is where
 * a page says 'the registry' and means the idea rather than
 * `createPrimitiveRegistry`"*), `search/prose.ts` strips exactly those spans
 * out of the body index, and `fences/lent.ts` and `fences/landing.ts` both ask
 * their question of them. A fifth reader with a fifth opinion is the thing this
 * lane has paid for twice.
 *
 * It draws the boundary honestly in one direction: **a summary that writes a
 * name with no backticks is outside what this can see.** The alternative was
 * measured and rejected — matching bare words against the published set fails a
 * sentence containing *ok*, *unavailable* or *result*, all three of which this
 * package exports and all three of which are ordinary English. A rule that
 * flags the word *ok* in a summary is a rule somebody turns off.
 *
 * ## The third place, measured and deliberately not enforced
 *
 * **A heading may name an export, and two hundred and sixteen of them do not.**
 * The number is here because it was measured and it belongs with the other two;
 * the rule is not, and the reason is the half of yesterday's lesson this would
 * otherwise contradict. A heading is an **address** — it is what the search box
 * and the contents rail hand out, and what a reader lands on. Somebody who
 * typed `renderLoomTree` and is sent to a heading called *`renderLoomTree`* has
 * been answered exactly. Forbidding a name there would forbid the one case
 * where the name is the right title, so what the site does today is recorded
 * rather than required.
 *
 * The generated reference is not read at all. Its sixteen pages have no file,
 * their headings *are* export names by construction, and `search/generated.ts`
 * already carries the argument for why that section answers every question
 * differently from a written one.
 */

/** Where a reader meets a page before the page has shown them anything. */
export type PlainPlace = "summary" | "opening"

/** One place that names an export where a reader has not met one yet. */
export type PlainFault = {
  /** `getting-started/installation`, so a failure names the file to open. */
  readonly where: string
  readonly href: string
  readonly place: PlainPlace
  /** The names, in the order the text names them. */
  readonly names: readonly string[]
  /** What the reader would have read, for a failure worth reading. */
  readonly text: string
}

/** `##` and `###` close a page's opening. An `####` is a label inside one. */
const OPENING_ENDS_AT = /^#{2,3}\s/

/** `import …` and `export const metadata = …`: an MDX page's machinery. */
const MDX_STATEMENT = /^(?:import|export)\s/

/** One span between backticks, which is how this site marks a name. */
const INLINE_CODE = /`([^`]+)`/g

/**
 * A page's opening: everything a reader reads before the first heading they
 * could have been sent to.
 *
 * The page's own `#` title is part of it, because a page titled after an export
 * has the same problem one paragraph down and there is no reason to hold the
 * title to a weaker rule than the sentence under it.
 *
 * Fenced code is already gone — `outsideFences` blanks it — and that is the
 * right boundary rather than a convenient one: **a block in an opening is the
 * precise version arriving on cue**, which is what the rule asks for, not what
 * it forbids. *Quickstart* opens with the file you are about to save.
 *
 * Pure, and separated from the file read the way `headingsIn` and
 * `proseSectionsIn` are, so the rules with a wrong answer are held against
 * markdown written to exercise them rather than against whichever page happens
 * to exercise them this week.
 */
export const openingOf = (source: string): string => {
  const lines: string[] = []

  for (const line of outsideFences(source)) {
    if (MDX_STATEMENT.test(line)) continue
    if (OPENING_ENDS_AT.test(line)) break

    lines.push(line)
  }

  return lines.join("\n")
}

/**
 * The published names a piece of prose names, in order, reading backticks alone.
 *
 * The span is handed to `publishedNamesIn` rather than compared to the
 * published set directly, so `result.ok` in a sentence is the property read and
 * not the export — the one rule here with a wrong answer, and `api/mentions.ts`
 * owns it.
 */
export const namesNamedIn = (prose: string): readonly string[] =>
  [...prose.matchAll(INLINE_CODE)].flatMap((span) => publishedNamesIn(span[1] ?? ""))

/**
 * The first sentence of a piece of prose, for a fault that quotes what the
 * reader would have met rather than the whole opening.
 *
 * Markdown is reduced the way `search/prose.ts` reduces it — tags out, a link's
 * words kept and its href dropped — because the sentence a fault prints should
 * be the sentence on the screen.
 */
const openingSentence = (prose: string): string => {
  const text = prose
    .replace(/<[^>]*>/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^\s*(?:[-*+]|\d+\.)\s+/gm, " ")
    .replace(/^\s*>+/gm, " ")
    .replace(/^#\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim()

  return (text.split(/(?<=[.!?])\s+/)[0] ?? "").trim()
}

/**
 * The summaries this surface writes, which is not all of them.
 *
 * A summary is one hand-written line whichever way the page under it is built,
 * so the written/generated split that decides whether a page has an *opening*
 * is the wrong split for this one — and a mutation is what said so. The API
 * reference's landing page has a summary somebody wrote in `nav.ts`, and a name
 * put into it was missed by a check reading written sections alone.
 *
 * **What is still excluded is the sixteen doors, and excluding them is the
 * point.** Their summaries are `entry.summary` — the runtime's own text,
 * arriving from its declaration files — so a rule over them would be this
 * lane's test going red because another lane wrote a sentence. That is the
 * shape `search/build.test.ts` already names as the mistake worth avoiding
 * (*"this lane's number about somebody else's growth"*), and it is the same
 * landing-page exclusion `search/build.ts` makes for `family`, for the same
 * reason: `/docs/api-reference` is the section rather than one of the doors
 * inside it.
 */
export const summariesRead = (): readonly { where: string; href: string; summary: string }[] =>
  docsSections.flatMap((section) =>
    section.pages.flatMap((page) =>
      section.source === "written" || page.slug === DOCS_LANDING_SLUG
        ? [
            {
              where: `${section.slug}/${page.slug}`,
              href: docsHref(section.slug, page.slug),
              summary: page.summary,
            },
          ]
        : []
    )
  )

/** One place, as a fault where it names an export and as nothing where it does not. */
const fault = (
  where: string,
  href: string,
  place: PlainPlace,
  text: string
): readonly PlainFault[] => {
  const names = namesNamedIn(text)

  return names.length === 0
    ? []
    : [{ where, href, place, names, text: place === "summary" ? text : openingSentence(text) }]
}

/**
 * Every place on this site where a reader is handed an export's name before the
 * page has said what it is for.
 *
 * Empty today, and the test is what insists it stays that way. Returned as a
 * list rather than thrown on, for the reason `fences/landing.ts` gives: nothing
 * renders an orientation, so there is no page for a throw to fail, and a check
 * over the whole site reads better as a count than as the first thing it met.
 */
export const plainFaults = (): readonly PlainFault[] => [
  ...summariesRead().flatMap(({ where, href, summary }) => fault(where, href, "summary", summary)),
  ...writtenDocsSections.flatMap((section) =>
    section.pages.flatMap((page) =>
      fault(
        `${section.slug}/${page.slug}`,
        docsHref(section.slug, page.slug),
        "opening",
        openingOf(readPageSource(section.slug, page.slug))
      )
    )
  ),
]

/**
 * The sentence a fault prints.
 *
 * One line, naming the file, the names and what a reader would have read —
 * because the author who broke this rule is reading a test failure and needs to
 * know which of a page's two openings it was about.
 */
export const plainFaultSentence = (fault: PlainFault): string =>
  `loom: ${fault.where} — the ${
    fault.place === "summary" ? "summary the rail carries" : "opening, above the first heading"
  } names ${fault.names.map((name) => `\`${name}\``).join(", ")} before the page has said what ${
    fault.names.length === 1 ? "it is" : "they are"
  } for: "${fault.text}"`

/**
 * Every written page's orientation, for the other half of the rule.
 *
 * A page that says nothing before its first heading has not led with the plain
 * version; it has no plain version. Counted rather than asserted here so the
 * test can say which page, and so the headroom is a number a report can quote:
 * the shortest opening on the site is the Architecture landing's two sentences.
 */
export const pagesWithoutAnOpening = (): readonly string[] =>
  writtenDocsSections.flatMap((section) =>
    section.pages.flatMap((page) =>
      openingSentence(openingOf(readPageSource(section.slug, page.slug))) === ""
        ? [`${section.slug}/${page.slug}`]
        : []
    )
  )

/**
 * The `##` and `###` headings of every written page, for the measurement this
 * module records and does not enforce.
 *
 * Read here rather than in the test so the number in the doc comment above and
 * the number the test prints cannot drift apart.
 */
export const writtenHeadings = (): readonly string[] =>
  writtenDocsSections.flatMap((section) =>
    section.pages.flatMap((page) =>
      outsideFences(readPageSource(section.slug, page.slug)).flatMap((line) => {
        const heading = /^#{2,3}\s+(.+?)\s*$/.exec(line)

        return heading === null ? [] : [heading[1] ?? ""]
      })
    )
  )

/** Every page a reader can be handed on this site, written or generated. */
export const everyDocsPage = (): readonly string[] =>
  docsSections.flatMap((section) => section.pages.map((page) => docsHref(section.slug, page.slug)))
