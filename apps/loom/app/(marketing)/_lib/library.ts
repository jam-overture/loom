import { catalogueOf } from "@jam-overture/loom/sdk"

import { siteRegistry } from "./registry"

/**
 * The parts a page can be built from, named the way a reader would say them.
 *
 * ## Why the site shows them at all
 *
 * The front door has said *107 ready-made parts to build with* since the facts
 * band was written, and `/what-you-run` says *"a starter set comes with it and
 * this site is made out of that set"*. Both are true and neither shows a
 * reader one of them. A developer deciding whether this is worth an afternoon
 * is asking a concrete question — **is there a table in there, is there a
 * pricing tier, is there a thing that holds a photograph** — and a number
 * cannot answer it. The maintainer's direction of 24 October is that the site
 * leads on *"the building part"*; this is the building part with the lid off.
 *
 * ## It is read off the registry and never written down
 *
 * `copy.ts` already counts this registry rather than carrying a literal, and
 * the reason is in its own note: a number typed into this lane makes every run
 * that registers a part come here and edit a digit. A **list** typed into this
 * lane would be the same mistake with a hundred times the surface, and it
 * would be wrong rather than merely stale — a page claiming to show the whole
 * set while missing the three added last week is worse than the number it
 * replaced.
 *
 * So the names are a projection of the registry this site renders with, and
 * the only thing authored here is the projection.
 */

/**
 * The one place sentence case gets a name wrong, and it is a casing table
 * rather than a naming one.
 *
 * `loom.faq` comes out as *Faq*, which a reader does not parse as a word and
 * does parse as a typo — on a page whose whole job is to look like a real
 * product's. Nothing else here is a judgement about what a part should be
 * called, so a part added tomorrow whose name is an initialism reads as
 * sentence case and nothing breaks; this table is the exception a hundred-entry
 * label map would have been the rule.
 */
const ACRONYMS: Readonly<Record<string, string>> = { Faq: "FAQ", "Faq list": "FAQ list" }

/**
 * `loom.feature-grid` to *Feature grid*, and nothing else.
 *
 * Mechanical on purpose, and the alternative was considered and dropped: a map
 * from type to a hand-written label reads better on perhaps six of them
 * — *Before after* would be *Before and after* — and it is a hundred-entry
 * table in this lane that goes stale the moment `Loom primitives` registers
 * anything. The band is worth more honest than polished, and a name a reader
 * cannot quite parse is a name they can still search the documentation for.
 *
 * The prefix goes because every part in the starter set carries it, so printing
 * it a hundred times says nothing a reader can use.
 */
export const partNameOf = (type: string): string => {
  const words = type.replace(/^loom\./, "").split("-").join(" ")
  const sentenced = `${words.slice(0, 1).toUpperCase()}${words.slice(1)}`

  return ACRONYMS[sentenced] ?? sentenced
}


/**
 * Every part in the set, named and sorted.
 *
 * Alphabetical because the band is scanned rather than read: somebody looking
 * for a table wants to know in a second whether there is one, and no other
 * order answers that. The registry's own order is registration order, which is
 * a fact about how the library was built and not about what is in it.
 */
export const LIBRARY_PARTS: readonly string[] = catalogueOf(siteRegistry)
  .map(({ type }) => partNameOf(type))
  .sort((left, right) => left.localeCompare(right))
