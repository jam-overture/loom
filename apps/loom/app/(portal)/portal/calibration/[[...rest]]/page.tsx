import { permanentRedirect } from "next/navigation"

/**
 * `/portal/calibration` was the route until this branch. It is `/portal/trust`
 * now, because calibration is a statistical property and what a person wants
 * from it is whether the AI can be believed.
 *
 * The same reasoning as `/portal/trees` a run earlier, and the same shape. A
 * rename that breaks every bookmark and every link written in a report is a
 * rename that gets reverted, so the old path keeps answering — permanently, with
 * the rest of the URL carried through.
 *
 * The query string has to be carried by hand: a 308's `Location` is whatever we
 * put in it, and dropping `?tree=` would silently widen a link scoped to one
 * page into a verdict over all of them. That is the failure mode worth writing a
 * test for, because it still renders and still looks right.
 *
 * Deliberately a redirect and not an alias. Two live names for one screen is how
 * a vocabulary comes back: somebody links to the old one, it works, and the
 * portal is speaking two languages again. A 308 lets the old name work exactly
 * once per visitor and then teaches their browser the new one.
 */
export const targetOf = (
  rest: readonly string[] | undefined,
  query: Readonly<Record<string, string | readonly string[] | undefined>>
): string => {
  const tail = (rest ?? []).map(encodeURIComponent).join("/")
  const path = tail === "" ? "/portal/trust" : `/portal/trust/${tail}`

  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (typeof value === "string") search.append(key, value)
    else if (Array.isArray(value)) for (const one of value) search.append(key, one)
  }

  const encoded = search.toString()

  return encoded === "" ? path : `${path}?${encoded}`
}

const MovedCalibration = async ({
  params,
  searchParams,
}: {
  params: Promise<{ rest?: readonly string[] }>
  searchParams: Promise<Record<string, string | readonly string[] | undefined>>
}) => {
  const [{ rest }, query] = await Promise.all([params, searchParams])

  permanentRedirect(targetOf(rest, query))
}

export default MovedCalibration
