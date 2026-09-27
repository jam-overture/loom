import { renderCatalogue, type CataloguedPrimitive, type CataloguedProp } from "@jam-overture/loom"

import { namedList } from "./vocabulary"

/**
 * The catalogue, read as a person would ask about it.
 *
 * The counterpart to History's `revision-view` and the review queue's
 * `effect-view`: an assembly module that decides nothing. Every fact here comes
 * off `CataloguedPrimitive`, which is the runtime's own projection of the
 * registry (0013) — this file only chooses the words.
 *
 * The screen it feeds used to print the registry's vocabulary directly: a
 * lower-case `primitives` heading, `slots: header, footer`, `No props.`, and
 * `Props cannot be enumerated from this schema.` Every one of those is still on
 * the page, under a disclosure, beside the line the model is actually given.
 */

/**
 * `loom.card` → "Card". `acme.pricing-table` → "Pricing table".
 *
 * A registered type is a namespaced identifier and a person reads the last part
 * of it as an ordinary noun. The namespace is what tells `loom.card` from a
 * host's own `acme.card`, so it is never dropped from the surface — it sits
 * beside this name in monospace rather than being replaced by it. This is the
 * heading a reader scans; the type is the string they will meet again on every
 * other screen in the portal.
 *
 * Deliberately mechanical rather than a table. A table would have to be
 * maintained beside a registry it cannot see, and the first host primitive to
 * arrive would get no name at all — which is the failure this page exists to not
 * have, since the catalogue is whatever the deployment registered.
 */
export const plainPieceName = (type: string): string => {
  const last = type.slice(type.lastIndexOf(".") + 1)
  const words = last.replace(/[-_]+/g, " ").trim()

  /**
   * A type that is all namespace — `loom.` — or empty leaves nothing to read, so
   * the identifier itself is the name. Ugly, and better than a blank heading
   * over a card that plainly holds something.
   */
  if (words === "") return type

  return `${words.charAt(0).toUpperCase()}${words.slice(1)}`
}

/**
 * What a person can set on this piece, and which of it they must.
 *
 * Three states rather than two, because the runtime makes three claims and
 * flattening the third into "none" would say something false. `props` is
 * `undefined` when the declared schema is not an object schema and its field
 * names therefore cannot be read off it — "I cannot tell you" rather than
 * "there are none", which `catalogue.ts` is explicit about.
 */
export type PieceSettings =
  | { readonly kind: "unknowable"; readonly reading: string }
  | { readonly kind: "none"; readonly reading: string }
  | {
      readonly kind: "some"
      readonly reading: string
      readonly required: readonly string[]
      readonly optional: readonly string[]
    }

/**
 * The sentence is assembled here and asserted whole, which is the rule this lane
 * took from three shipped defects: where two independently held strings meet,
 * both halves being right is not the property.
 *
 * "must be given" and "can be left out" rather than a trailing `?`. The `?` is
 * TypeScript's notation and the model is given it deliberately — a model has
 * read a great deal more TypeScript than English about this — but a reader who
 * has not written any is being shown punctuation as a fact.
 */
export const settingsOf = (primitive: CataloguedPrimitive): PieceSettings => {
  if (primitive.props === undefined) {
    return {
      kind: "unknowable",
      reading: "Loom cannot list what you can set on this one. That is not the same as nothing.",
    }
  }

  if (primitive.props.length === 0) {
    return { kind: "none", reading: "Nothing to set. It holds whatever you put inside it." }
  }

  const named = (props: readonly CataloguedProp[]): readonly string[] =>
    props.map((prop) => prop.name)

  const required = named(primitive.props.filter((prop) => prop.required))
  const optional = named(primitive.props.filter((prop) => !prop.required))

  return { kind: "some", reading: settingsReading(required, optional), required, optional }
}

/**
 * Four readings, because the two lists are independently empty and a sentence
 * that says "and nothing has to be given" after naming nothing optional reads as
 * a machine filling in a template.
 */
const settingsReading = (
  required: readonly string[],
  optional: readonly string[]
): string => {
  if (required.length === 0) return `You can set ${namedList(optional)}, or leave it as it comes.`
  if (optional.length === 0) return `${sentenceCase(namedList(required))} must be given a value.`

  return `${sentenceCase(namedList(required))} must be given a value. You can also set ${namedList(optional)}.`
}

const sentenceCase = (text: string): string => `${text.charAt(0).toUpperCase()}${text.slice(1)}`

/**
 * A slot is a named space the piece keeps for content it does not write itself
 * (0051). "Space" is the word `partPhrase` already uses for one in the middle of
 * a sentence — *the header space* — so it is the word here too, because a
 * reviewer moves between this page and a change's plain reading and the two
 * calling it different things is how a vocabulary comes apart.
 *
 * Absent when there are none. That is not information removed: a piece with no
 * named spaces has nothing to say about them, and a line reading "no named
 * spaces" on every card teaches a reader a word they did not need.
 */
export const spacesReading = (primitive: CataloguedPrimitive): string | undefined => {
  if (primitive.slots.length === 0) return undefined

  const spaces = namedList([...primitive.slots])

  return primitive.slots.length === 1
    ? `It keeps one named space, ${spaces}, that holds its own content.`
    : `It keeps named spaces — ${spaces} — that each hold their own content.`
}

/**
 * The line the model is actually given, verbatim.
 *
 * This is the disclosure that makes the page's claim checkable rather than
 * reassuring. `renderCatalogue` is the runtime's own function and it is what
 * builds the catalogue block of every proposal request, so the string under the
 * disclosure is the string in the prompt — not a portal rendering of the same
 * facts that could drift from it.
 *
 * Called per primitive because the disclosure sits on a card. `renderCatalogue`
 * over a one-element catalogue is that catalogue's only line, which is what
 * makes this safe: there is no second formatter here to keep in step.
 */
export const catalogueLineFor = (primitive: CataloguedPrimitive): string =>
  renderCatalogue([primitive])
