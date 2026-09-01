/**
 * Naming every member of a union, so that something can walk it.
 *
 * A union of string literals is exhaustive at compile time in the direction the
 * runtime was designed for: a `switch` over it cannot miss a case. It is not
 * enumerable in the other direction. Anything that wants to *walk* the members
 * rather than react to one — a page describing what a host must handle, a
 * dashboard that needs every bucket to exist before the first request, a
 * conformance check — has to keep its own copy of the list, in its own order,
 * with nothing to fail when a new member lands.
 *
 * Where the members already come from a schema there is no problem: the list is
 * `schema.options` and completeness is not a claim anyone makes. This is for the
 * unions that cannot have one, because their members carry values a schema
 * cannot describe.
 */

/**
 * A list that has to name every member of a union, checked where it is written.
 *
 * Curried because TypeScript infers all of a call's type arguments or none of
 * them, and the union has to be named while the list is inferred.
 *
 * The completeness check is the second parameter, and it is the whole point: it
 * is an empty rest parameter while the list is complete, and a *required*
 * argument the moment a member is missing, so the call itself stops compiling.
 * The argument it then asks for is named `missing` and typed as the member that
 * is missing, which is what the signature shows a reader who goes to look.
 *
 * ```ts
 * export const KINDS: readonly Kind[] = everyMemberOf<Kind>()(["held", "refused"])
 * ```
 */
export const everyMemberOf =
  <Union extends string>() =>
  <const List extends readonly Union[]>(
    list: List,
    ..._complete: [Union] extends [List[number]] ? [] : [missing: Exclude<Union, List[number]>]
  ): List =>
    list
