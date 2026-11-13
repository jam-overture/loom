import { gzipSync } from "node:zlib"

import { DOCS_LANDING_SLUG, docsHref, docsSections } from "../nav"

import { buildSearchIndex, searchProseFor } from "./build"
import { proseEntriesOf } from "./model"

/**
 * Whether this site has room for another page, in the unit somebody writing one
 * thinks in.
 *
 * **The plain version.** The search box sends a reader the words of every page
 * on this site, and there is a ceiling on how many bytes that may be. The
 * ceiling is nearly reached. So before anybody writes a page, the question
 * *how long may it be?* has an answer, and this module is where it is worked
 * out — in words, because nobody writes a page in compressed bytes.
 *
 * The answer today is **a few hundred words**, and the shortest page already on
 * this site is longer than that. That is the whole reason this module exists:
 * the next run of this lane will otherwise write a page, run the gate, see a
 * number fail that mentions neither pages nor words, and conclude that a
 * shorter page would fit. It would not. What has to change is what the search
 * box sends, and that is a decision about what the box is rather than something
 * a page can be trimmed into.
 *
 * ## Why every number here is measured and none is typed
 *
 * Three figures turn compressed bytes into words, and all three move:
 *
 * - **How well a section's words compress.** Between 2.7× and 7.2× depending on
 *   the section, because sixteen reference pages built from one set of bands
 *   repeat themselves and five hand-written runtime pages do not.
 * - **How many bytes a word of this site's prose costs.** Measured over the
 *   prose itself, so an em-dash and a curly quote are counted as what they
 *   weigh rather than as one character each.
 * - **Which cap fires first.** A page in *The runtime* is held by two numbers —
 *   its own section's file and the bill for all five — and which of them binds
 *   depends on how much has been written in the other four.
 *
 * A typed figure for any of them is a figure that is right on the day it is
 * typed. This lane filed that defect against itself on 2 November and met it
 * again in a comment on 4 November; the remedy both times was to derive the
 * number or delete it.
 *
 * ## What this is not
 *
 * It is not a cap and it does not fail anything. `build.test.ts` holds the caps
 * and this module is what they say when they fire — which is the half of a
 * failing test that gets read by somebody who does not know the code, and the
 * half nothing usually checks.
 */

/** Bytes rather than characters: `"…".length` is 1 and what goes down the wire is 3. */
const bytes = (text: string): number => Buffer.byteLength(text, "utf8")

/**
 * Everything measured here, measured once.
 *
 * **This is a cache and it is not an optimisation.** Weighing a section's words
 * means building the whole index — reading thirty-five MDX files off disk and
 * rendering seventeen reference pages — and then compressing the result. One
 * sentence from `sentenceOf` asks for that about a dozen times, and the caps in
 * `build.test.ts` build the sentence for every one of their ten assertions.
 * Uncached, the gate's own message cost more than the gate: the first run of
 * this module timed two tests out at five seconds each.
 *
 * Safe because every function behind it is a pure function of the repository as
 * it sits on disk, which does not change inside a process. It is `Map`s rather
 * than one memoised function because the two things worth keeping are keyed
 * differently — a section, and a page — and a general memoiser for two call
 * sites is more code than the two caches.
 */
const weighed = new Map<string, { readonly json: string; readonly gz: number }>()
const pageBodies = new Map<string, readonly string[]>()
let allBodies: readonly (readonly [string, string])[] | undefined
let perWord: number | undefined
let shortestPage: WrittenPage | undefined
let shortestAsked = false

/** One section's file, as the string that is served and the bytes it compresses to. */
const fileOf = (sectionSlug: string): { readonly json: string; readonly gz: number } => {
  const known = weighed.get(sectionSlug)

  if (known !== undefined) return known

  const json = JSON.stringify(searchProseFor(sectionSlug))
  const measured = { json, gz: gzipSync(json).length }

  weighed.set(sectionSlug, measured)

  return measured
}

/**
 * Every body on the site, beside the address it sits at.
 *
 * Read off the index rather than out of a prose file, because a prose file
 * stopped carrying addresses on 13 November: its bodies line up with the
 * entries `proseEntriesOf` picks out and the address is the entry's own. This
 * module runs on the server and has the entries in front of it, so it takes
 * them from there instead of reconstructing what the browser reconstructs.
 */
const everyBody = (): readonly (readonly [string, string])[] =>
  (allBodies ??= proseEntriesOf(buildSearchIndex().entries, "")
    .filter((entry) => entry.body !== "")
    .map((entry) => [entry.href, entry.body] as const))

/**
 * The words a reader would count, which is every run of non-space.
 *
 * Deliberately crude. The figure it feeds is *about how many words*, and a
 * tokenizer that argued about hyphens and ellipses would make the answer look
 * more precise than the thing it is converted from.
 */
export const wordsIn = (text: string): number => text.split(/\s+/u).filter((word) => word !== "").length

/**
 * What a cap is, as this module needs it: a ceiling, what is under it today,
 * and what the measurement is of.
 *
 * `section` is the section whose file the cap is about, or absent where the cap
 * is the bill for all of them. That is the field that decides whether a cap
 * applies to a page being written in some *other* section.
 */
export type ProseCap = {
  /** One short phrase, for the sentence the cap prints. */
  readonly what: string
  readonly spent: number
  readonly cap: number
  readonly measure: "gzipped" | "raw"
  readonly section?: string
}

/**
 * The ceilings, stated once.
 *
 * They were literals in `build.test.ts` until this module existed, which was
 * right while nothing but that test asked what they were. The sentence a failing
 * cap prints has to name the number it failed against, so the number is now in
 * one place and the test reads it from here — the same move `api/extract.ts`
 * made with `SIGNATURE_CAP`.
 *
 * **Raising one of these is not a remedy** and never has been. The rule is
 * older than any of them, written in `build.ts` when the names left the
 * contents file: *the run that hits it should split the index rather than take
 * the number up.* What is new is that splitting has stopped buying anything —
 * the words are already one file per section, and cutting them finer makes the
 * bill below **larger**, because compression works on one file at a time.
 */
export const PROSE_SECTION_GZIP_CAP = 40_000
export const PROSE_SECTION_RAW_CAP = 120_000
export const PROSE_TOTAL_GZIP_CAP = 80_000
export const PROSE_TOTAL_RAW_CAP = 260_000


/**
 * How many raw bytes of prose it takes to move this file one compressed byte.
 *
 * Measured on the file itself rather than assumed, and it is the figure that
 * makes the whole conversion honest: a compressed byte spent on the API
 * reference buys seven raw ones and a compressed byte spent on *The runtime*
 * buys three.
 *
 * It is the *average* ratio and not the marginal one, which overstates the room
 * slightly: prose added to a file that already repeats itself compresses better
 * than the file's average. Overstating is the wrong direction for a figure
 * somebody is about to spend, so the two were measured against each other on
 * the real site when this was written — the gap was under 4% — and the average
 * is used because the marginal one cannot be quoted without naming the page it
 * was measured with.
 */
const compressionOf = (section: string): number => {
  const file = fileOf(section)

  return bytes(file.json) / file.gz
}

/** Every body on a page, which is the page's own entry and its headings'. */
const bodiesOnPage = (href: string): readonly string[] => {
  const known = pageBodies.get(href)

  if (known !== undefined) return known

  const found = everyBody()
    .filter(([at]) => at === href || at.startsWith(`${href}#`))
    .map(([, words]) => words)

  pageBodies.set(href, found)

  return found
}

/**
 * What a word of this site's prose weighs.
 *
 * Over every written page at once rather than per section, because it is a fact
 * about how this lane writes English and not about any one section — and
 * because a section with three pages in it would give a figure that moved every
 * time one of them was edited.
 */
export const bytesPerWord = (): number => {
  if (perWord !== undefined) return perWord

  const written = docsSections
    .filter((section) => section.source === "written")
    .flatMap((section) => section.pages.map((page) => docsHref(section.slug, page.slug)))
    .flatMap(bodiesOnPage)
    .join(" ")

  return (perWord = bytes(written) / wordsIn(written))
}

export type WrittenPage = {
  readonly href: string
  readonly title: string
  readonly words: number
}

/**
 * The shortest page this site has already written, which is the comparison that
 * makes the room figure mean something.
 *
 * *A few hundred words* is an abstraction; *shorter than the shortest page here*
 * is a fact a reader can check. **Landing pages are left out** — a landing page
 * is the section rather than a page in it, it is three sentences by design, and
 * including it would answer this question with a page nobody would call a page.
 */
export const shortestWrittenPage = (): WrittenPage | undefined => {
  if (shortestAsked) return shortestPage

  shortestAsked = true

  return (shortestPage = docsSections
    .filter((section) => section.source === "written")
    .flatMap((section) =>
      section.pages
        .filter((page) => page.slug !== DOCS_LANDING_SLUG)
        .map((page) => {
          const href = docsHref(section.slug, page.slug)

          return { href, title: page.title, words: wordsIn(bodiesOnPage(href).join(" ")) }
        })
    )
    .filter((page) => page.words > 0)
    .reduce<WrittenPage | undefined>(
      (sofar, page) => (sofar === undefined || page.words < sofar.words ? page : sofar),
      undefined
    ))
}

/**
 * What the rail calls a section, so a sentence about one reads as English.
 *
 * The slug is what every function here takes, because it is what the caps and
 * the files are keyed by; it is not what a sentence should say. A section
 * nothing in `nav.ts` knows about is named by its slug rather than refused —
 * this is a fault message, and a fault message that throws is a fault message
 * nobody reads.
 */
const titleOf = (sectionSlug: string): string =>
  docsSections.find((section) => section.slug === sectionSlug)?.title ?? sectionSlug

/** Every cap a page written in this section would be held by. */
export const capsOver = (sectionSlug: string): readonly ProseCap[] => {
  const file = fileOf(sectionSlug)
  const files = docsSections.map((section) => fileOf(section.slug))

  return [
    {
      what: `the words of ${titleOf(sectionSlug)}`,
      spent: file.gz,
      cap: PROSE_SECTION_GZIP_CAP,
      measure: "gzipped",
      section: sectionSlug,
    },
    {
      what: `the words of ${titleOf(sectionSlug)}`,
      spent: bytes(file.json),
      cap: PROSE_SECTION_RAW_CAP,
      measure: "raw",
      section: sectionSlug,
    },
    {
      what: "every section's words",
      spent: files.reduce((total, part) => total + part.gz, 0),
      cap: PROSE_TOTAL_GZIP_CAP,
      measure: "gzipped",
    },
    {
      what: "every section's words",
      spent: files.reduce((total, part) => total + bytes(part.json), 0),
      cap: PROSE_TOTAL_RAW_CAP,
      measure: "raw",
    },
  ]
}

/**
 * How many words a cap has room for, in a page written in one section.
 *
 * A compressed cap's headroom is multiplied by how well that section's file
 * compresses, because that is the file the new words would land in — the
 * section's own ratio and not the site's average, which is a different number
 * and the wrong one.
 */
export const wordsUnder = (cap: ProseCap, sectionSlug: string): number => {
  const left = cap.cap - cap.spent
  const raw = cap.measure === "gzipped" ? left * compressionOf(sectionSlug) : left

  return Math.max(0, Math.floor(raw / bytesPerWord()))
}

export type Room = {
  readonly section: string
  /** The cap with the least room, which is the one a page would meet first. */
  readonly binding: ProseCap
  /** About how many words a page written in this section may have. */
  readonly words: number
  readonly shortest: WrittenPage | undefined
  /** Whether a page as short as the shortest one here would fit. */
  readonly fits: boolean
}

/**
 * The room a page written in this section has.
 *
 * `binding` is chosen by converting every cap to words and taking the least,
 * rather than by comparing bytes: two of the four are compressed and two are
 * not, so their headrooms are not numbers of the same kind. Words are.
 */
export const roomIn = (sectionSlug: string): Room => {
  const binding = capsOver(sectionSlug).reduce((tightest, cap) =>
    wordsUnder(cap, sectionSlug) < wordsUnder(tightest, sectionSlug) ? cap : tightest
  )
  const words = wordsUnder(binding, sectionSlug)
  const shortest = shortestWrittenPage()

  return {
    section: sectionSlug,
    binding,
    words,
    shortest,
    fits: shortest !== undefined && shortest.words <= words,
  }
}

const rounded = (value: number): string => value.toLocaleString("en-GB")

/**
 * What a cap says when it fires, and what a run should do about it.
 *
 * Three sentences, in this order, and the order is the point. **What failed and
 * by how much**, because that is the number in the assertion. **How much room
 * is left, in words**, because that is the unit the thing being written is
 * measured in. **And that trimming is not the remedy**, because that is the
 * conclusion a run reaches on its own from the first two and it is wrong.
 *
 * The third sentence is only printed when it is true — when a page as short as
 * the shortest page on this site would not fit. A site with room for two more
 * pages should say so and stop talking.
 */
export const sentenceOf = (room: Room): string => {
  const { binding, shortest } = room
  const measure = binding.measure === "gzipped" ? "gzipped bytes" : "bytes"
  const headline = `loom: ${binding.what} are ${rounded(binding.spent)} ${measure} against a cap of ${rounded(binding.cap)}, so a page in ${titleOf(room.section)} has room for about ${rounded(room.words)} more words.`

  if (shortest === undefined) return headline

  const comparison = `The shortest page already written here is ${shortest.title} at ${rounded(shortest.words)}.`

  return room.fits
    ? `${headline} ${comparison}`
    : `${headline} ${comparison} **A shorter page is not the remedy and nor is a larger cap** — what has to change is how much of this site's prose the search box sends a reader, which is a decision about what the box is rather than about any page. The candidates are measured in decisions/0353, and every saving over the stored words is priced and refused in search/savings.ts.`
}

/** The sentence for the room a section has, which is the pair the caps use. */
export const roomSentence = (sectionSlug: string): string => sentenceOf(roomIn(sectionSlug))
