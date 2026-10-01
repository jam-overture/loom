/**
 * The initials a name falls back to when there is no photograph.
 *
 * It lived inside `loom.person` until `loom.avatar` needed the same two
 * letters, and a second copy is how two faces on one page end up disagreeing
 * about what a three-word name reduces to. The code-style rule about shared
 * constants is the reason this is a file rather than an import between two
 * primitives — neither of them owns it more than the other.
 *
 * The first letter of the first two words, which is the convention a reader
 * recognises and the only one that does not need a name to be two words. A name
 * written in a script with no case is unchanged by `toUpperCase`, which is the
 * right behavior rather than a missing one.
 *
 * It takes `string | undefined` although every caller's schema says `string`,
 * and that is not defensiveness for its own sake: a primitive is called with an
 * unvalidated bag by the conformance probe (`conformance.ts`) and, per
 * [0008](../../decisions/0008-the-renderer-is-a-total-pure-projection.md), must
 * be total. Every other primitive gets this for free because React renders
 * `undefined` as nothing; these two are the ones that *compute* from a prop, so
 * they are the ones that have to say so. Throwing here made `loom.person` the
 * only primitive in the library the portal could not probe.
 */
export const monogramOf = (name: string | undefined): string =>
  (name ?? "")
    .split(/\s+/u)
    .filter((part) => part.length > 0)
    .slice(0, 2)
    .map((part) => [...part][0] ?? "")
    .join("")
    .toUpperCase()
