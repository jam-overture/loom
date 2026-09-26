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
