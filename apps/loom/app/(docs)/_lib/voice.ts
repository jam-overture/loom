import { docsHref, docsOrder } from "./nav"
import { generatedPageWords } from "./search/generated"
import { readPageHeadings, readPageSource } from "./search/headings"
import { readPageProse } from "./search/prose"
import { plainWords } from "./search/words"

/**
 * The words a reader actually reads on this site, page by page, so a claim
 * about them can be a test rather than a convention somebody remembers.
 *
 * `spelling.ts` is the first claim and the reason this exists: **US English
 * everywhere a visitor reads, and the package's own spelling wherever a name is
 * named.** What this module contributes is the *reader* — the thing that says
 * what a page says.
 *
 * ## Why a sweep rather than a pass somebody does once
 *
 * The maintainer asked for US spelling everywhere a visitor reads on
 * 26 September, and `(marketing)/_lib/voice.test.ts` has held its three pages
 * to it since. This surface is forty-nine pages of prose, it is where a
 * stranger spends their afternoon, and nothing checked it — so it drifted the
 * way the register drifted before anything checked that either. On the morning
 * this was written the site said *color* twenty-six times and *colour* five,
 * *behavior* four times and *behaviour* three, and the page about theming and
 * the page about writing a primitive of your own disagreed with each other
 * about the one word they are both mostly about.
 *
 * A site edited by routines with no memory of each other cannot hold a
 * convention that is only written down. It can hold one that goes red.
 *
 * ## It reads the pages the way the search box reads them
 *
 * Deliberately, and it is the reason this file is short. A second reader of
 * these pages would be a second thing to keep true, and the two that exist are
 * already the two halves of this site: a **written** page is a file, and
 * `search/prose.ts` takes the markdown out of it; a **generated** page has no
 * file, and `search/rendered.ts` walks what its components return.
 *
 * Both of them take **names out** — a name between backticks on a written page
 * and a name inside `<code>` on a generated one both arrive here as an ellipsis
 * (`search/words.ts`). That is the seam the spelling rule rides on for free:
 * the words this module hands over are the words in sentences, and the names
 * were never among them.
 */

/** The words a reader reads on one page of this site. */
export type ReaderPage = {
  /** `getting-started/quickstart`, for a failure message that names the file. */
  readonly id: string
  readonly href: string
  /**
   * Everything the page says in a sentence: its own heading, the one-line
   * summary the rail and the pager carry, its headings, and its prose — with
   * every name taken out.
   */
  readonly words: string
}

/**
 * A written page's own `#` heading.
 *
 * `readPageHeadings` indexes levels 2 and 3, because the `#` is the page rather
 * than a section in it. A reader still reads it, and it is the one line on the
 * page most likely to carry the word the page is about, so it is read here. The
 * markdown a heading is allowed is backticks and emphasis, which is the same
 * rule `headings.ts` applies and the same characters to drop.
 */
const titleHeadingIn = (source: string): string =>
  source
    .split("\n")
    .flatMap((line) => {
      const match = /^#\s+(.+?)\s*$/.exec(line)

      return match === null ? [] : [(match[1] ?? "").replace(/[`*_]/g, "")]
    })
    .join(" ")

/**
 * Every page of this site, in reading order, as the words a reader reads on it.
 *
 * The **summary** is in both halves, and it is the one piece that is not on the
 * page at all: `nav.ts` keeps a sentence per page, and a reader meets it in the
 * sidebar, under a pager link and in the page's `<meta name="description">`.
 * Three of them carried a British spelling on the morning this was written, so
 * leaving them out would have been a sweep passing over the copy with the
 * highest chance of being read.
 *
 * **What it does not reach**, said rather than left to be discovered: the
 * components a *written* page embeds. `<ScaffoldTranscript />` and the
 * diagnostic tables print copy of their own, the MDX reader sees a tag with
 * nothing between its ends, and rendering one needs the data the route hands
 * it. The generated pages are covered because their components *are* the page;
 * the written pages' are not, and that gap is filed rather than guessed at.
 */
export const readerPages = (): readonly ReaderPage[] => {
  const generated = generatedPageWords()

  return docsOrder.map(({ section, page }) => {
    const href = docsHref(section.slug, page.slug)
    const id = page.slug === "" ? section.slug : `${section.slug}/${page.slug}`

    if (section.source === "generated") {
      /* `heading ?? title` is what both generated routes put in the `h1`, and
         `heading` is the one that is counted rather than written — so a page
         whose own title is derived is read as the reader gets it. */
      return {
        id,
        href,
        words: plainWords(
          [page.heading ?? page.title, page.summary, generated.get(href) ?? ""].join(". ")
        ),
      }
    }

    return {
      id,
      href,
      words: plainWords(
        [
          titleHeadingIn(readPageSource(section.slug, page.slug)),
          page.summary,
          ...readPageHeadings(section.slug, page.slug).map((heading) => heading.text),
          ...readPageProse(section.slug, page.slug).values(),
        ].join(". ")
      ),
    }
  })
}
