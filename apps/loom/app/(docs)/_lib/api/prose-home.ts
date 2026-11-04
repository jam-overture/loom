import { docsHref, DOCS_LANDING_SLUG, writtenDocsSections, type DocsSection } from "../nav"

import { prosePagesFor, proseMentions, type ProseMentionIndex } from "./mentions"
import type { ApiEntry } from "./model"

/**
 * Where a sentence about a newly published name goes.
 *
 * **The plain version.** Loom's reference pages are generated: a name the
 * package starts publishing appears on one of them the moment somebody runs
 * `docs:api`, with its signature and whatever sentence its author left on the
 * declaration. What a generated page cannot do is explain the thing in a
 * paragraph — that is prose, prose lives in an MDX file, and somebody has to
 * decide *which* file. This works that out by reading the pages rather than by
 * being told.
 *
 * **Why it exists.** `Loom daily build` filed a finding on 3 October saying
 * that publishing a name looked like a two-lane operation: the framework can
 * add the export and regenerate the reference, and it cannot write a page under
 * `(docs)`. So a run wanting to publish something had three options — leave it
 * unpublished, cross a lane boundary, or file and wait a day — and #501 chose
 * its module boundaries under that constraint rather than on merit. The entry
 * asked this lane for one thing: *say which page takes a new runtime export by
 * default.*
 *
 * **Two answers, and the first one is that the premise was wrong.** Nothing in
 * the gate requires prose. `offered.ts` holds the door against the *generated*
 * page, not against the written ones; `extract.test.ts` asks whether the
 * generated file is current. A framework run may publish a name, run
 * `docs:api`, and be green with no prose anywhere — and the large majority of
 * this package's published names are in exactly that state, which is the normal
 * case rather than a backlog. No number for it is written down here on purpose:
 * it is a count of another lane's growth, it moves every time that lane ships,
 * and each reference page already prints its own door's share of it from the
 * pages themselves. The sentence that said otherwise was a fault message in
 * this directory, and it is fixed in the same change as this file.
 *
 * **The second answer is this module**, for the smaller question that remains:
 * a run that *wants* a sentence, or wants to file one for this lane, needs to
 * know where it would go. The answer is derived from the one piece of evidence
 * that cannot drift — **the written pages already print these names.** The
 * pages that carry a door's prose are the pages that name its exports, so the
 * home of a new name on that door is among them, and for most doors there is
 * only one.
 *
 * It says which of three situations a door is in rather than always naming one
 * page, because naming one page for `@jam-overture/loom` — six hundred exports
 * across nineteen written pages — would be a guess dressed as an answer. A door
 * whose prose is on one page has no judgement left to make; a door with several
 * has one, and the list is the shortlist; a door with none needs a page written,
 * which is this lane's work and not a line somebody else can file.
 */

/** A written page a sentence could be written into. */
export type ProseHomePage = {
  /** `/docs/the-runtime/going-to-production`. */
  readonly href: string
  readonly title: string
  readonly sectionTitle: string
  /** The MDX file itself, from the repository root, so a finding can name it. */
  readonly source: string
  /** How many of this door's exports the page already names. */
  readonly named: number
}

/**
 * How much of a judgement is left once the pages have been read.
 *
 * Stated as a member rather than left to the caller to infer from the length of
 * a list, because the three cases want three different sentences and the
 * difference between them is the whole usefulness of the answer.
 */
export type ProseHomeStanding =
  /** One written page names anything on this door. There is nothing to decide. */
  | "one"
  /** Several do. Which page a name belongs on is a judgement, and these are the candidates. */
  | "several"
  /** None does. A sentence here would be the first, which is a page rather than a line. */
  | "none"

export type ProseHome = {
  readonly specifier: string
  readonly slug: string
  /** The candidates, commonest first — empty when the standing is `none`. */
  readonly pages: readonly ProseHomePage[]
  readonly standing: ProseHomeStanding
  /** One line a run that has just published a name can act on. */
  readonly sentence: string
}

/** Where the written pages live, from the repository root. */
export const DOCS_PAGES_ROOT = "apps/loom/app/(docs)/docs"

/**
 * The MDX file behind a written page's address.
 *
 * A landing page has no segment of its own, so its file sits in the section's
 * own directory — the same asymmetry `docsHref` is the one place to know about,
 * stated here for the one other thing that needs the file rather than the URL.
 */
export const pageSourcePath = (sectionSlug: string, pageSlug: string): string =>
  pageSlug === DOCS_LANDING_SLUG
    ? `${DOCS_PAGES_ROOT}/${sectionSlug}/page.mdx`
    : `${DOCS_PAGES_ROOT}/${sectionSlug}/${pageSlug}/page.mdx`

/**
 * Every written page's address, and the file behind it.
 *
 * Built from the navigation rather than from the filesystem: the navigation is
 * already the one statement of what this site contains, and `content.test.ts`
 * already fails when a page it lists is not on disk. A second walk of the
 * directory tree would be a second statement free to disagree with it.
 */
const sourcesByHref = (
  sections: readonly DocsSection[]
): ReadonlyMap<string, string> =>
  new Map(
    sections.flatMap((section) =>
      section.pages.map((page) => [
        docsHref(section.slug, page.slug),
        pageSourcePath(section.slug, page.slug),
      ] as const)
    )
  )

const sentenceFor = (
  specifier: string,
  standing: ProseHomeStanding,
  pages: readonly ProseHomePage[]
): string => {
  if (standing === "none") {
    return `no written page names anything published by ${specifier}, so a sentence about a new name on it would be the first on this site. That is a page rather than a line — file it for \`Loom docs\`.`
  }

  const [first] = pages

  if (standing === "one") {
    return `${specifier}'s prose is all on one page, ${first?.title ?? ""} (${first?.source ?? ""}), so a sentence about a new name on it goes there and there is nothing to decide.`
  }

  return `${pages.length} written pages name something published by ${specifier}. The one that names the most is ${first?.title ?? ""} (${first?.source ?? ""}); which of the ${pages.length} a particular name belongs on is a judgement, so say what the name is for and let \`Loom docs\` place it.`
}

/**
 * One door's answer.
 *
 * Pure over an entry and an index, like everything else in this directory that
 * states a rule, so the three standings can be shown against invented pages
 * instead of waiting for the site to be in each of the three states.
 *
 * A mention whose address is not a page the navigation lists **throws** rather
 * than being dropped. It cannot happen while the index is built by walking that
 * same navigation, and if some later caller hands this an index built another
 * way, a silently shorter shortlist is the one failure this function must not
 * produce: it would read as a door with less prose than it has.
 */
export const proseHomeFor = (
  entry: ApiEntry,
  mentions: ProseMentionIndex = proseMentions,
  sections: readonly DocsSection[] = writtenDocsSections
): ProseHome => {
  const sources = sourcesByHref(sections)

  const pages: readonly ProseHomePage[] = prosePagesFor(entry, mentions).map((page) => {
    const source = sources.get(page.href)

    if (source === undefined) {
      throw new Error(
        `loom: a written page at ${page.href} names an export of ${entry.specifier}, and the documentation navigation lists no page at that address`
      )
    }

    return { ...page, source }
  })

  const standing: ProseHomeStanding =
    pages.length === 0 ? "none" : pages.length === 1 ? "one" : "several"

  return {
    specifier: entry.specifier,
    slug: entry.slug,
    pages,
    standing,
    sentence: sentenceFor(entry.specifier, standing, pages),
  }
}

export const proseHomes = (
  entries: readonly ApiEntry[],
  mentions: ProseMentionIndex = proseMentions,
  sections: readonly DocsSection[] = writtenDocsSections
): readonly ProseHome[] => entries.map((entry) => proseHomeFor(entry, mentions, sections))

/** Every name a set of entries publishes, counting a name on two doors once. */
export const namesPublishedBy = (entries: readonly ApiEntry[]): ReadonlySet<string> =>
  new Set(entries.flatMap((entry) => entry.groups.flatMap((g) => g.symbols.map((s) => s.name))))

/** One door, and the names it has started publishing. */
export type ArrivedNames = {
  readonly specifier: string
  readonly names: readonly string[]
}

/**
 * The names a regenerated reference holds that the committed one does not,
 * grouped by the door they arrived on.
 *
 * This is the question a framework run is actually asking when the gate tells
 * it the published surface has moved: *what did I add?* The alternative is
 * reading a diff of a forty-thousand-line generated file, which is where the
 * answer is and not where anybody can see it.
 *
 * A name on two doors is reported under both, because the reader's question is
 * about a door. The doors keep the order the fresh reference is in, which is
 * the order `package.json` opens them in.
 */
export const namesArrived = (
  committed: readonly ApiEntry[],
  fresh: readonly ApiEntry[]
): readonly ArrivedNames[] => {
  const before = namesPublishedBy(committed)

  return fresh
    .map((entry) => ({
      specifier: entry.specifier,
      names: [...new Set(entry.groups.flatMap((g) => g.symbols.map((s) => s.name)))]
        .filter((name) => !before.has(name))
        .sort(),
    }))
    .filter((arrived) => arrived.names.length > 0)
}

/**
 * What a run that has just published names is told, in full.
 *
 * One block of text rather than a value, because the only consumers are a
 * generator's standard output and a failed assertion's message — both of which
 * are read by a person once and never parsed. Keeping the arrangement here
 * rather than at those two call sites is what stops them drifting into two
 * accounts of the same thing.
 *
 * **It opens by saying that nothing is required**, and that is the load-bearing
 * sentence rather than a pleasantry. The whole cost of the 3 October finding was
 * a run believing a page was owed; a block that listed homes without saying so
 * would reproduce the belief in a friendlier font.
 */
export const whereProseGoes = (
  arrived: readonly ArrivedNames[],
  homes: readonly ProseHome[]
): string => {
  if (arrived.length === 0) {
    return "loom: no name is new — nothing is published now that was not published before. If the file moved at all it was a signature, a summary or a module title, and there is nothing to say about prose."
  }

  const total = new Set(arrived.flatMap((door) => door.names)).size

  const lines = [
    `loom: ${total} ${total === 1 ? "name is" : "names are"} new, and the generated reference is where ${total === 1 ? "it appears" : "they appear"}.`,
    "",
    "Nothing on this site requires prose for a published name: the gate holds the generated page against the package and asks nothing of the written pages. Most published names have a signature and the sentence on their declaration, and nothing else.",
    "",
    "If you want a sentence for one of these, or are filing one for `Loom docs`, this is where it would go:",
    "",
  ]

  for (const door of arrived) {
    const home = homes.find((candidate) => candidate.specifier === door.specifier)

    lines.push(`  ${door.specifier} — ${door.names.join(", ")}`)
    lines.push(`    ${home?.sentence ?? "this door is not in the generated reference, which is a fault of its own."}`)
  }

  return lines.join("\n")
}

/**
 * What the gate says when the committed reference has fallen behind.
 *
 * The same block the generator prints, in front of the remedy, because this is
 * the message a run sees **before** it has run the command — and the belief the
 * 3 October finding was built on is one a run holds at exactly that moment.
 * Composed here rather than at the assertion for the reason `generatorSays` is:
 * a message built inline in a test file is a message no test can read.
 */
export const staleReferenceMessage = (
  committed: readonly ApiEntry[],
  fresh: readonly ApiEntry[]
): string =>
  [
    "the runtime's published surface has moved. Run `pnpm --filter @loom/app docs:api` and commit the result.",
    "",
    whereProseGoes(namesArrived(committed, fresh), proseHomes(fresh)),
  ].join("\n")

/**
 * Everything `docs:api` says, as one string.
 *
 * The whole of the generator's standard output lives here rather than in the
 * script, and the reason is a mutation that survived: deleting the block from
 * the script turned nothing red, because a script is the one kind of module
 * nothing imports. Composed here it is an ordinary function with ordinary
 * tests, and what is left in the script is one expression — write this.
 *
 * `committed` is `undefined` for a regeneration with nothing to compare
 * against: a first run, or a tree where the file has been deleted. Every name
 * looks new there and saying so would be noise, so the block is left off. That
 * is a different case from a comparison that found nothing, which has its own
 * sentence, and the two must not be spelled the same way — one means *nothing
 * was published*, the other means *nobody knows*.
 */
export const generatorSays = (
  committed: readonly ApiEntry[] | undefined,
  fresh: readonly ApiEntry[],
  exports: number
): string => {
  const wrote = `loom: wrote ${fresh.length} entry points and ${exports} exports to reference.generated.json`

  if (committed === undefined) {
    return `${wrote}\nloom: there was no reference to compare against, so nothing is said about which names are new.\n`
  }

  return `${wrote}\n${whereProseGoes(namesArrived(committed, fresh), proseHomes(fresh))}\n`
}
