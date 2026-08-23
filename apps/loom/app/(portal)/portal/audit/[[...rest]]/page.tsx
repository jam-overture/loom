import { permanentRedirect } from "next/navigation"

/**
 * `/portal/audit` was the route until this branch. It is `/portal/checkup` now,
 * because *audit* is a compliance word for a thing a person would call checking
 * that their page still adds up — and nobody opens a page called Audit hoping to
 * find out whether their site is fine.
 *
 * The third rename to take this shape, after `/portal/trees` → `/portal/pages`
 * and `/portal/calibration` → `/portal/trust`, and for the same reason each
 * time: a rename that breaks every bookmark and every link written in a report
 * is a rename that gets reverted. The old path keeps answering, permanently,
 * with the rest of the URL carried through.
 *
 * The query string has to be carried by hand — a 308's `Location` is whatever we
 * put in it — and here that matters more than it did for `/portal/trust`.
 * `?tree=` is not a filter on this page, it is the whole request: dropping it
 * turns a link to one page's result into the chooser, which still renders and
 * still looks like a working link.
 *
 * Deliberately a redirect and not an alias. Two live names for one screen is how
 * a vocabulary comes back — somebody links to the old one, it works, and the
 * portal is speaking two languages again.
 */
export const targetOf = (
  rest: readonly string[] | undefined,
  query: Readonly<Record<string, string | readonly string[] | undefined>>
): string => {
  const tail = (rest ?? []).map(encodeURIComponent).join("/")
  const path = tail === "" ? "/portal/checkup" : `/portal/checkup/${tail}`

  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (typeof value === "string") search.append(key, value)
    else if (Array.isArray(value)) for (const one of value) search.append(key, one)
  }

  const encoded = search.toString()

  return encoded === "" ? path : `${path}?${encoded}`
}

const MovedAudit = async ({
  params,
  searchParams,
}: {
  params: Promise<{ rest?: readonly string[] }>
  searchParams: Promise<Record<string, string | readonly string[] | undefined>>
}) => {
  const [{ rest }, query] = await Promise.all([params, searchParams])

  permanentRedirect(targetOf(rest, query))
}

export default MovedAudit
