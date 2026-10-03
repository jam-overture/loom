import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { Specifier } from "@/app/(docs)/_components/specifier"
import { generatedPageBody } from "@/app/(docs)/_lib/api/body"
import { apiSlugs } from "@/app/(docs)/_lib/api/reference"
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

  /*
   * What this page is below its title, and the search index reads the same
   * function for the same address — so the words on this page are words the
   * search box can find. `_lib/api/body.tsx` carries the argument.
   */
  const body = generatedPageBody("api-reference", entry)
  const listed = docsEntryAt(docsHref("api-reference", entry))

  /**
   * Two lists have to agree for this page to exist: the rail's, which comes from
   * `entryPoints`, and the generated reference's, which comes from the
   * declarations. A test holds them together — this is what happens if it ever
   * stops being true.
   */
  if (body === undefined || listed === undefined) notFound()

  return (
    <>
      {/*
       * `break-words`, because the heading is an import specifier and a phone
       * is 390 pixels wide. `@jam-overture/loom/testing/contracts` is one unbroken
       * word to a line-breaker — CSS offers no break after a slash — so the
       * four longest doors pushed the whole document to 559 pixels and every
       * page on them scrolled sideways. Found by photographing the page at
       * phone width, which is the only instrument that reports it.
       *
       * It stays, and it is the floor rather than the answer: it stopped the
       * page scrolling and it chose nothing about *where* the line gives way.
       * Ten of these seventeen headings were measured breaking mid-word on
       * 3 October — `signal` · `s/broadcast`, in the largest type on the page —
       * and `Specifier` is what offers the breaker a slash to use instead. It
       * is ten rather than the four the finding named because the package was
       * renamed on 27 September and every specifier got five characters longer.
       * `_lib/api/specifier.ts` carries the measurement.
       */}
      <h1 className="font-mono text-3xl! break-words sm:text-4xl!">
        <Specifier of={listed.page.heading ?? listed.page.title} />
      </h1>

      <p className="text-lg">{listed.page.summary}</p>

      {body}
    </>
  )
}

export default ApiReferencePage
