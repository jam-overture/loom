import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { generatedPageBody } from "@/app/(docs)/_lib/api/body"
import { pageMetadata } from "@/app/(docs)/_lib/metadata"
import { DOCS_LANDING_SLUG, docsEntryAt, docsHref } from "@/app/(docs)/_lib/nav"

/**
 * The section's own page, and the only one in it that is not a door.
 *
 * Every page under this one now tells a reader that most of the package is
 * behind some other import, and until this existed the only thing they could be
 * offered next was the search box — which answers *where is this name*, and a
 * reader who has just learned they are looking at a third of what they came for
 * does not have a name yet.
 *
 * Generated like the rest of the section: nothing here is a list of imports
 * typed by hand, so a door that opens in `package.json` is on this page in the
 * same commit it opens in.
 */

export const generateMetadata = async (): Promise<Metadata> =>
  pageMetadata("api-reference", DOCS_LANDING_SLUG)

const ApiReferenceIndexPage = () => {
  const listed = docsEntryAt(docsHref("api-reference", DOCS_LANDING_SLUG))

  /* The same lockstep every page in this section keeps: the rail's list and the
     page that renders it have to agree, and this is what happens if they stop. */
  if (listed === undefined) notFound()

  /*
   * The words of this page are `generatedPageBody`'s, not this route's, and that
   * is deliberate: the search index reads the same function for the same
   * address, so a sentence on this page is a sentence the search box can find.
   * A paragraph written here instead would be invisible to it.
   */
  return (
    <>
      <h1>{listed.page.heading ?? listed.page.title}</h1>

      {generatedPageBody("api-reference", DOCS_LANDING_SLUG)}
    </>
  )
}

export default ApiReferenceIndexPage
