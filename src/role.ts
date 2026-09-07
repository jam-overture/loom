import { everyMemberOf } from "./closed-set.js"

/**
 * What part a primitive plays, said by the author who knows and asked by every
 * consumer that needs a semantic fact about a component rather than its name.
 *
 * A registry can already answer what exists, what each accepts and what each
 * projects. What it could not answer is anything *about* a primitive beyond its
 * identifier — so a consumer wanting "which of these carries the page's title?"
 * had one move available: match on the type string. The portal did exactly that
 * and filed it, with the array it had to write:
 *
 * ```ts
 * const TITLE_TYPES: readonly string[] = ["loom.heading"]
 * ```
 *
 * That array is correct for a deployment that registered `loom.heading` and
 * wrong for one that registered `acme.hero`, and nothing in the registry could
 * be asked instead. A `description` is prose for a model to read and cannot be
 * matched on; a type is an identifier, and an identifier is not a category.
 *
 * ## Why it is a role and not a boolean
 *
 * `submits` is a boolean because a primitive either posts or does not, and there
 * is no second question of that shape. This is the opposite: the categorical
 * question a host asks about a primitive is one of a family, and the members
 * arrive one filed consumer at a time. A boolean per member — `isHeading`,
 * `isByline` — is one more field on every definition there is, per question
 * anyone ever asks. One optional field carrying a closed vocabulary grows by a
 * string.
 *
 * ## What a role is not
 *
 * **It is not a position.** "The page's title" is the *first* heading in reading
 * order, and which node is first is a fact about a tree, not about a primitive.
 * A primitive can say it is a heading; only a tree can say which heading leads.
 * Keeping those apart is what lets one declaration serve a page name, an
 * outline, and a table of contents rather than only the first of them.
 *
 * **It is not a licence.** Nothing in the runtime renders, validates or refuses
 * differently because of a role. It is read by hosts, the same way `submits` is
 * read by an audit: a fact carried from the author who knows it to the consumer
 * who needs it, and nowhere in between.
 */

/**
 * The vocabulary, and it has one member on purpose.
 *
 * `heading` is what was asked for, by the one consumer that filed for it. The
 * members that were considered and left out — a page root, a body text, a byline
 * — were all derived from what the portal happens to register rather than from a
 * consumer asking a categorical question about them, and a vocabulary invented
 * ahead of its readers is a vocabulary that is wrong in a way nobody can measure.
 *
 * The bar for a second member is the bar this one cleared: a consumer that
 * cannot answer its question from the registry, written down as a finding.
 */
export type PrimitiveRole = "heading"

/**
 * Every role, so a host can render the vocabulary rather than keep its own copy
 * of it — the same reason every other closed set in this package is exported.
 */
export const PRIMITIVE_ROLES: readonly PrimitiveRole[] = everyMemberOf<PrimitiveRole>()(["heading"])

/**
 * One line per role, for a host putting the vocabulary in front of a person.
 *
 * Written for the author choosing a declaration rather than for the consumer
 * reading one: the question at the declaration site is "is my component this?",
 * and the answer has to be decidable without reading the runtime.
 */
export const describePrimitiveRole = (role: PrimitiveRole): string => {
  switch (role) {
    case "heading":
      return "names the section it heads — the text a reader takes as the title of what follows"
  }
}

/** Whether a string a host wrote is a role the runtime knows. */
export const isPrimitiveRole = (value: string): value is PrimitiveRole =>
  (PRIMITIVE_ROLES as readonly string[]).includes(value)
