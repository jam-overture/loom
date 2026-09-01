import { permanentRedirect } from "next/navigation"

/**
 * `/portal/primitives` was the route until this branch. It is `/portal/pieces`
 * now, because a primitive is the framework's word for the thing and a person
 * has pieces — which is already what every other screen in the portal calls one.
 *
 * The fourth rename of this shape, after `/portal/trees`, `/portal/calibration`
 * and `/portal/audit`, and the same reasoning each time: a rename that breaks
 * every bookmark and every link written in a report is a rename that gets
 * reverted, so the old path keeps answering — permanently, with the rest of the
 * URL carried through.
 *
 * Deliberately a redirect and not an alias. Two live names for one screen is how
 * a vocabulary comes back: somebody links to the old one, it works, and the
 * portal is speaking two languages again. A 308 lets the old name work exactly
 * once per visitor and then teaches their browser the new one.
 */
export const targetOf = (rest: readonly string[] | undefined): string => {
  const tail = (rest ?? []).map(encodeURIComponent).join("/")

  return tail === "" ? "/portal/pieces" : `/portal/pieces/${tail}`
}

const MovedPrimitives = async ({ params }: { params: Promise<{ rest?: readonly string[] }> }) => {
  const { rest } = await params

  permanentRedirect(targetOf(rest))
}

export default MovedPrimitives
