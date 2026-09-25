import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { ApiDoors } from "@/app/(docs)/_components/api-doors"
import { grouped } from "@/app/(docs)/_components/api-reference"
import { doorwayOf } from "@/app/(docs)/_lib/api/doors"
import { entryPoints } from "@/app/(docs)/_lib/entry-points"
import { apiEntries } from "@/app/(docs)/_lib/api/reference"
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

  const doorway = doorwayOf(apiEntries, entryPoints)

  return (
    <>
      <h1>{listed.page.heading ?? listed.page.title}</h1>

      <p className="text-lg">
        Loom is one package. What you write at the top of a file is one of {doorway.doors.length}{" "}
        imports, and which one you write decides what your program loads — so they are worth two
        minutes before you pick.
      </p>

      <p>
        Every name behind them is read from the package itself rather than written here, which is
        why the counts below are exact: {doorway.doors.length} imports, {grouped(doorway.packageNames)}{" "}
        names,
        and a page for each import saying what comes out of it.
      </p>

      <ApiDoors doorway={doorway} />
    </>
  )
}

export default ApiReferenceIndexPage
