import type { ReactNode } from "react"

import { ApiDoors } from "@/app/(docs)/_components/api-doors"
import { ApiEntryReference } from "@/app/(docs)/_components/api-reference"

import { entryPoints } from "../entry-points"
import { DOCS_LANDING_SLUG } from "../nav"

import { doorwayOf } from "./doors"
import { entryProseFor } from "./mentions"
import { apiEntries, apiEntryAt } from "./reference"

/**
 * What a page in the reference is, below its title — said once.
 *
 * Every other section of this site keeps its words in an MDX file, and two
 * different things read that file: the route serves it, and the search index
 * reads it for the words on it. **A generated page had no such file**, so the
 * route composed the page inline and the index had nothing to read. This is the
 * file's replacement: the route renders what this returns, and the index reads
 * the words out of the same thing (`search/rendered.ts`), so the page a reader
 * is looking at and the page the search box describes cannot be two different
 * pages.
 *
 * It is the reason this is a function rather than two routes each building
 * their own tree. A second copy of the arrangement is a second copy to keep
 * true, which is the rule §4c already applies to the reference's *content* —
 * generated from the published entry points rather than written — applied to
 * the arrangement of it.
 *
 * `undefined` for an address the reference does not serve, which is the
 * lockstep both routes already keep: the rail's list of doors and the generated
 * reference's have to agree, and an address where they do not is a `notFound`
 * rather than an empty page.
 */
export const generatedPageBody = (sectionSlug: string, pageSlug: string): ReactNode | undefined => {
  if (sectionSlug !== "api-reference") return undefined

  if (pageSlug === DOCS_LANDING_SLUG) {
    return <ApiDoors doorway={doorwayOf(apiEntries, entryPoints)} />
  }

  const entry = apiEntryAt(pageSlug)

  /*
   * Resolved here rather than inside the component, because working out which
   * written pages show a name off this door means reading every page off disk.
   * The component takes data and arranges it, which is what lets its tests
   * state a situation instead of arranging for one to exist in the repository.
   */
  return entry === undefined ? undefined : (
    <ApiEntryReference entry={entry} prose={entryProseFor(entry)} />
  )
}
