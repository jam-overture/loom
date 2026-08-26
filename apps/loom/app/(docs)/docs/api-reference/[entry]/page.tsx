import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { ApiEntryReference } from "@/app/(docs)/_components/api-reference"
import { entryProseFor } from "@/app/(docs)/_lib/api/mentions"
import { apiEntryAt, apiSlugs } from "@/app/(docs)/_lib/api/reference"
import { pageMetadata } from "@/app/(docs)/_lib/metadata"
import { docsEntryAt, docsHref } from "@/app/(docs)/_lib/nav"

/**
 * One page per published entry point, and not one of them written.
 *
 * §4c's rule for this section is that a reference is **generated from the
 * published entry points**, because a hand-maintained one is wrong within a
 * week and nothing goes red when it happens. So there is one route here rather
 * than eleven directories of prose, and what it renders is a file the
 * repository produces from its own declarations.
 *
 * `dynamicParams` is off: the eleven doors are the eleven the package opens,
 * and a twelfth URL is a mistake rather than an empty page.
 */

export const dynamicParams = false

type PageParams = { readonly params: Promise<{ readonly entry: string }> }

/** Next asks for a mutable array here, which is why this one is not `readonly`. */
export const generateStaticParams = (): { readonly entry: string }[] =>
  apiSlugs.map((slug) => ({ entry: slug }))

export const generateMetadata = async ({ params }: PageParams): Promise<Metadata> => {
  const { entry } = await params

  return pageMetadata("api-reference", entry)
}

const ApiReferencePage = async ({ params }: PageParams) => {
  const { entry } = await params
  const reference = apiEntryAt(entry)
  const listed = docsEntryAt(docsHref("api-reference", entry))

  /**
   * Two lists have to agree for this page to exist: the rail's, which comes from
   * `entryPoints`, and the generated reference's, which comes from the
   * declarations. A test holds them together — this is what happens if it ever
   * stops being true.
   */
  if (reference === undefined || listed === undefined) notFound()

  return (
    <>
      <h1 className="font-mono text-3xl! sm:text-4xl!">{listed.page.heading ?? listed.page.title}</h1>

      <p className="text-lg">{listed.page.summary}</p>

      <p>
        Everything below is exported from that import. The names, the signatures and the sentences
        are read from the package itself rather than written here, so this page says what the copy
        of Loom in your <code>node_modules</code> says — and it changes in the same pull request the
        code does.
      </p>

      {/*
       * Resolved here rather than inside the component, because working it out
       * means reading every written page off disk. The component takes data and
       * arranges it, which is what lets its tests state a situation instead of
       * arranging for one to exist in the repository.
       */}
      <ApiEntryReference entry={reference} prose={entryProseFor(reference)} />
    </>
  )
}

export default ApiReferencePage
