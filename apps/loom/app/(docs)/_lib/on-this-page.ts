import { ARTICLE_ID } from "./chrome"

/**
 * The sections of the page a reader is on, and which one they are in.
 *
 * ## The plain version
 *
 * Long pages on this site have a lot of sections. *Making it look like yours*
 * has fourteen headings, *A primitive of your own* thirteen, *Where the content
 * comes from* thirteen. The rail on the left says which **page** you are on and
 * nothing at all about what is **in** it, so a reader who wants the part about
 * fonts has to scroll the page looking for it, and a reader who followed a link
 * into the middle of one has no way to see what they landed in the middle of.
 *
 * This is the other half of that navigation: a list of the page's own sections,
 * beside the page, with the one you are reading marked. Every other
 * documentation site a developer has used has one, and the seventeen generated
 * reference pages here have had one since August (`api-reference.tsx`'s
 * `Contents`, a two-column index of three hundred names). The thirty-one
 * **written** pages had none.
 *
 * ## Where the rows come from, and why that is the browser's job
 *
 * **The rows are read off the page itself**, in the browser, rather than
 * compiled from the markdown.
 *
 * Reading the markdown is the obvious implementation and it is incomplete in a
 * way nothing would have reported. Two pages in *Architecture* get most of
 * their headings from a component rather than from their own source:
 * `what-it-costs-you` has five `##` lines in the file and eight more headings
 * that `<ArchitectureCosts />` renders out of the decision records as the page
 * builds, and `how-it-fits-together` is the same shape with eight ideas. A
 * contents list built from `page.mdx` would show five rows for a page with
 * thirteen places to land, and the eight it left out are the eight the page is
 * *about*.
 *
 * Reading the document instead makes the list complete by construction: a row
 * exists for exactly the headings that are on the page, because the headings on
 * the page are where the rows came from. Nothing is declared, so nothing can
 * fall out of step — the day a component starts or stops rendering a heading,
 * the rail says so without anybody adding a line here.
 *
 * It costs one thing, stated rather than discovered: **the rail is not in the
 * server's HTML.** It appears when the page's script runs. That is the right
 * trade for navigation furniture and would be the wrong one for a sentence a
 * reader came to read — the pager and the rail on the left are already client
 * components for the same reason, and no content is in here.
 *
 * ## What counts as a section
 *
 * `h2` and `h3`, **with an `id`**, which is the same rule the search index
 * applies for the same reason: an `id` is what makes a heading
 * [a place you can be sent to](./mdx.ts), and a row linking to a heading that
 * has none would scroll a reader nowhere. `rehype-slug` puts one on every
 * heading a written page compiles, and the two components above put their own
 * on theirs.
 *
 * `h1` is the page's title, which the rail already names and the pager already
 * links; a row for it would be a row saying *the top*. Deeper than `h3` is a
 * level no page on this site uses.
 *
 * It is also why the generated reference pages get no rail and are not missing
 * one. The `id` on one of those pages is on the `<section>` around the heading
 * rather than on the heading, so nothing here matches, and that is the correct
 * outcome twice over: those pages already carry their own contents list, and it
 * is two columns wide because it has to hold sixty module names rather than a
 * dozen sections.
 */

/** The element the sections are inside: the page, rather than the chrome around it. */
export const SECTION_SCOPE_SELECTOR = `#${ARTICLE_ID}`

/** A heading is a section when it is one of these and carries an `id`. */
export const SECTION_SELECTOR = "h2[id], h3[id]"

export type PageSection = {
  /** The heading's `id`, which is what a row links to. */
  readonly id: string
  /** What the heading says, as a reader reads it. */
  readonly text: string
  /** 2 for a section, 3 for one inside it. */
  readonly level: 2 | 3
}

/** One heading as the document hands it over, before anything is decided about it. */
export type HeadingFound = {
  readonly level: number
  readonly id: string
  readonly text: string
}

/**
 * The rows, from the headings a document walk found.
 *
 * Separated from the walk so the rules are a pure function of a list and can be
 * tested against lists written for the purpose — including the ones a real page
 * should never produce.
 *
 * Three things are dropped, and each is a row that would be worse than no row:
 * a level this site does not use, a heading with no `id` (there is nowhere to
 * send the reader), and a heading whose text is empty once trimmed (a row with
 * no words in it is a link a reader cannot aim at). An `id` repeated is dropped
 * after its first appearance for the same reason: two rows pointing at one
 * place would mark both when the reader reached either.
 */
export const sectionsIn = (found: readonly HeadingFound[]): readonly PageSection[] => {
  const seen = new Set<string>()

  return found.flatMap((heading) => {
    const text = heading.text.replace(/\s+/g, " ").trim()

    if (heading.level !== 2 && heading.level !== 3) return []
    if (heading.id === "" || text === "") return []
    if (seen.has(heading.id)) return []

    seen.add(heading.id)

    return [{ id: heading.id, text, level: heading.level }]
  })
}

/** Where a section's heading is, measured from the top of the viewport. */
export type SectionTop = {
  readonly id: string
  readonly top: number
}

/**
 * How far down the viewport a heading has to come before the reader is in it.
 *
 * 11.5rem, and the number is **chosen against where a press of a row lands**
 * rather than by eye. The line has to be below that point, or the section a
 * reader just asked for arrives unmarked and the mark sits on the section
 * above it.
 *
 * **Two declarations decide where a press lands, and they add up.** `globals.css`
 * gives `html` a `scroll-padding-top: 5rem`, which insets the top of the
 * scrollport for every in-page scroll, and it gives every prose heading a
 * `scroll-margin-top: 5rem`, which grows the box the browser is scrolling to.
 * A press therefore lands a heading **160 pixels** down the window, not 80.
 *
 * That was measured rather than reasoned, and it had already cost something:
 * this constant was 120 until 16 October, chosen against the heading's 5rem
 * alone, and 120 is *above* 80 and *below* 160 — so pressing a row on the rail
 * marked the section above the one the reader had asked for, on every page.
 * `pnpm shoot`' `measure` printed the landing as `y 160` on a press of a
 * contents row at 390 pixels wide, which is the first time anything in this
 * repository looked. The test beside this now reads **both** declarations and
 * sums them, which is the half that was missing: a test that reads one of two
 * numbers is a test that passes while the thing it guards is wrong.
 *
 * The 24 pixels between 160 and 184 are what makes it hold through a browser's
 * own rounding and a smooth scroll that stops a fraction short.
 *
 * It also has to be near the top of the window. A line halfway down would mean
 * the mark moved on while the heading it names was still being read.
 */
export const READING_LINE_PX = 184

export type Reading = {
  /** Each section's top, in document order, in viewport coordinates. */
  readonly tops: readonly SectionTop[]
  /** {@link READING_LINE_PX}, passed in so the rule is a function of its inputs. */
  readonly line: number
  /** Whether the reader has run out of page to scroll. */
  readonly atEnd: boolean
}

/**
 * Which row is marked, in one sentence a person could repeat: **the last section
 * whose heading has gone past the reading line** — and at the bottom of the
 * page, the last section there is.
 *
 * The second clause is not a nicety. The final section of a page is usually
 * short, so on a tall window its heading never reaches the line at all: without
 * it, *Where to go next* is a row that can never light up, on every page, and
 * the reader scrolls to the end of the page watching the mark sit on the section
 * above. Pages on this site end in that row — a *What to read next*, a *Things
 * worth breaking* — so it is the row a reader is most often actually in.
 *
 * Nothing is marked while the reader is in the page's opening, because the
 * opening is in no section. That is deliberately not rounded up to the first
 * row: the first row is somewhere the reader has not got to yet, and a rail that
 * says otherwise is a rail that is wrong about the only thing it claims to know.
 */
export const sectionBeingRead = ({ tops, line, atEnd }: Reading): string | undefined => {
  if (tops.length === 0) return undefined
  if (atEnd) return tops[tops.length - 1]?.id

  return tops.reduce<string | undefined>((current, section) => (section.top <= line ? section.id : current), undefined)
}

/**
 * Whether the reader can scroll no further, with a pixel of slack.
 *
 * Browsers report these three numbers as fractions on a zoomed or
 * high-density display, and a page sitting 0.4 of a pixel from its own bottom
 * is at the bottom of it. Without the slack the last row would light up on
 * some machines and not others, which is the kind of difference that gets
 * reported as the feature not working.
 */
export const atEndOfPage = (scrollY: number, viewportHeight: number, documentHeight: number): boolean =>
  scrollY + viewportHeight >= documentHeight - 1

/**
 * How many sections a page has, as the words on a closed disclosure.
 *
 * The rail beside the prose shows the rows themselves, so it never has to say
 * how many there are. On a phone there is no room beside the prose and the
 * list starts closed, which means the only thing a reader has to decide
 * whether to press it is this phrase. *Fourteen sections* is a reason to open
 * it; *On this page* on its own is a label with nothing in it.
 *
 * It is a function rather than a template in the component for the one reason
 * a plural ever is: the site has pages with a single section in them, and
 * *1 sections* is the kind of thing a reader notices and nothing reports.
 */
export const sectionsSummary = (count: number): string => `${count} section${count === 1 ? "" : "s"}`
