import { generatedPageBody } from "../api/body"
import { docsHref, docsSections } from "../nav"

import { renderedWords } from "./rendered"

/**
 * The words on the pages nobody wrote.
 *
 * A written page is a file, and `prose.ts` reads it. A **generated** page —
 * every page in the API reference — has no file, so until now what the search
 * box held for one was its title and the one-line summary `nav.ts` keeps for it.
 * That was close to free while such a page was a list of names, because what a
 * reader wants to find on a list of names is a name and the names have an index
 * of their own. It stopped being free the week those pages grew five bands of
 * argued prose and a front door made entirely of it: a reader searching *do the
 * imports nest* was searching for a sentence this site contains and its index
 * did not.
 *
 * So the generated pages are read the way the written ones are, off the thing
 * that renders them (`rendered.ts` says why that is a walk rather than a
 * render). **Nothing is written down twice**: the band says the sentence, this
 * reads the band.
 *
 * Keyed by address and unanchored, which is the one thing it does not do that
 * the written half does. A written page's words are cut up by heading, so a
 * result can land a reader on the paragraph; a generated page's are one body
 * under the page. The reason is the file a reader *waits for*: a heading entry
 * is a row in the table of contents, the 85 bands on these pages would be 85
 * rows, and that file is the only one in the index a reader sits in front of.
 * The bands have no `id` to land on either. A reader searching a reference
 * sentence now gets the page the sentence is on, which is the whole of what was
 * missing.
 */
export const generatedPageWords = (): ReadonlyMap<string, string> =>
  new Map(
    docsSections
      .filter((section) => section.source === "generated")
      .flatMap((section) =>
        section.pages.flatMap((page) => {
          const body = generatedPageBody(section.slug, page.slug)

          /* An address the section does not serve has no words rather than an
             empty body — and `generated.test.ts` holds that this never happens
             for a page the rail lists, because such a page would be one the
             search box describes by its title alone and nothing would say so. */
          return body === undefined
            ? []
            : [[docsHref(section.slug, page.slug), renderedWords(body)] as const]
        })
      )
  )

/** A sentence the index holds twice: once where it belongs, once in a body. */
export type RepeatedSummary = {
  /** The page the summary belongs to, which is where the contents file has it. */
  readonly page: string
  /** The generated page whose body says it again. */
  readonly indexedUnder: string
  readonly summary: string
}

/**
 * Every page summary a generated page's body says again.
 *
 * **The plain version.** The search box ranks in four bands. The first three —
 * a page's title, the section it is in, and its one-line summary — come from
 * the contents file, which every reader waits for and which covers **every
 * page on the site**. The fourth band is the words on a page. So a summary is
 * in the index the moment the page exists, under that page, ranked above any
 * body match.
 *
 * A body that prints another page's summary therefore puts one sentence in the
 * index twice, and the second copy is not a better answer — it is the wrong
 * page, ranked below the right one and above everything else. A reader
 * searching a phrase from the `@jam-overture/loom/signals` summary got the
 * signals door and, under it, *the page that lists the doors*.
 *
 * ## Why the check is general and the instance was not
 *
 * This was found as eighteen sentences on one page — the front door's table of
 * doors, which prints each door's summary under its specifier. Marking them
 * `data-search="off"` fixed those eighteen and nothing else, and the next list
 * of pages anybody draws on a generated page would do it again. The argument
 * had already been made once, in `generated.test.ts`, about the per-door band's
 * list of written pages beside it; it was made as a comment on one assertion,
 * and a comment is what the next author does not read.
 *
 * So the rule is stated over the whole index rather than over the page that
 * broke it: **no generated page's body repeats a summary the contents file
 * carries.** It costs nothing to keep and it is the shape that notices the
 * third instance.
 *
 * ## It is split in two, because the site's own answer is empty
 *
 * `repeatedSummaries()` reads the real site and is supposed to return nothing,
 * which makes every assertion over it true by accident — the lesson `plain.ts`
 * paid for twice. `summariesRepeatedIn` takes the two sides as arguments, so
 * the rule itself is held against summaries and bodies written to exercise it.
 *
 * **Written pages are not excluded and do not need to be.** A written page's
 * words come from its file and its summary is written in `nav.ts`, so the two
 * cannot be the same string by construction — but a page that pasted its own
 * summary into its opening would be the same defect, and the rule as stated
 * would say so. What is scoped to generated pages is the **bodies** read, for
 * the reason this module exists: they are the only bodies nobody wrote.
 */
export const summariesRepeatedIn = (
  summaries: readonly { readonly href: string; readonly summary: string }[],
  bodies: ReadonlyMap<string, string>
): readonly RepeatedSummary[] =>
  summaries.flatMap(({ href, summary }) =>
    /* An empty summary is in every body by `includes`, and says nothing. A
       page without one is a page the contents file describes by title alone,
       which `build.test.ts` already holds against. */
    summary.trim() === ""
      ? []
      : [...bodies.entries()].flatMap(([indexedUnder, body]) =>
          body.includes(summary) ? [{ page: href, indexedUnder, summary }] : []
        )
  )

/** Every page on this site and the one line the contents file carries for it. */
export const everyPageSummary = (): readonly { readonly href: string; readonly summary: string }[] =>
  docsSections.flatMap((section) =>
    section.pages.map((page) => ({
      href: docsHref(section.slug, page.slug),
      summary: page.summary,
    }))
  )

/**
 * What the real site holds twice, and what the question was asked of.
 *
 * **The answer is nothing, so the answer has to name its subject.** That is
 * [0347](../../../../../../decisions/0347-an-empty-fix-list-names-its-subject-so-nothing-to-fix-and-nothing-to-fix-it-with-are-two-answers.md)
 * — *nothing to fix* and *nothing to fix it with* are two answers — and it is
 * the rule rather than a flourish here, because a mutation proved the
 * difference is invisible otherwise.
 *
 * Replacing the bodies with an empty map made this reading look at **no words
 * at all** and return the same empty list, and the whole block of assertions
 * over it stayed green: a site with no duplicated summary and a reader that
 * never opened a page agree exactly. `pages` and `bodies` are what tell them
 * apart, and the test asserts both are real before it believes the third.
 */
export type SummaryAudit = {
  /** How many pages' summaries were compared. */
  readonly pages: number
  /** How many generated bodies they were compared against. */
  readonly bodies: number
  readonly repeats: readonly RepeatedSummary[]
}

export const summaryAudit = (): SummaryAudit => {
  const summaries = everyPageSummary()
  const bodies = generatedPageWords()

  return {
    pages: summaries.length,
    bodies: bodies.size,
    repeats: summariesRepeatedIn(summaries, bodies),
  }
}

/**
 * The sentence a repeat prints.
 *
 * It names the page whose summary it is first, because that is the page the
 * reader should have been sent to, and the body second, because that is the
 * file somebody has to edit. The remedy is named, since it is one attribute
 * and nobody would guess which.
 */
export const repeatedSummarySentence = (repeat: RepeatedSummary): string =>
  `loom: ${repeat.indexedUnder} prints the summary of ${repeat.page} into its indexed words, so the search box holds that one sentence twice and answers it with the wrong page. Mark the region data-search="off": "${repeat.summary}"`
