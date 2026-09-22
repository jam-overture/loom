import type { PrimitiveType } from "../primitive-type.js"

/**
 * What a primitive says it reads, and what a tree asked for that nothing will
 * look at.
 *
 * A binding is a question the tree asks under a *name*, and the name is how the
 * primitive reading the answer finds it (0058). Two of the three ways that
 * declaration can be wrong are refused at the seam — an unregistered source, a
 * param the source did not declare — and the third was silent: a name nothing
 * reads resolves cleanly, costs a round trip, and is then dropped on the floor.
 *
 * This module is the half that makes the third one visible. It holds the seam
 * the walk asks, and the comparison it makes; what a primitive declares is
 * `reads` on its definition, and what the walk *calls* the mismatch is the
 * diagnostic vocabulary's business (0181).
 */

/**
 * Which binding names a primitive says it reads, asked per type.
 *
 * Structural, and detected the way `FrameResolver` and `BehaviourResolver` are:
 * a registry built by the SDK satisfies it, and a host resolving from a plain
 * map has registered nothing that could declare a binding name in the first
 * place — so there is nothing here to wire and nothing that can go missing.
 */
export interface BindingReader {
  readonly bindingsReadBy: (type: PrimitiveType) => readonly string[] | undefined
}

export const isBindingReader = (value: object): value is BindingReader =>
  typeof (value as Partial<BindingReader>).bindingsReadBy === "function"

/**
 * The names this node asked under that its primitive says it does not read.
 *
 * `undefined` from the reader means nobody has said, and nothing is reported:
 * the whole point of the declaration is that absence and emptiness are
 * different answers, and treating "unknown" as "reads none" would report every
 * binding on every primitive that has not been declared yet.
 *
 * Name-sorted, because the caller reports one diagnostic per name and a
 * diagnostic list whose order depends on object key order is one a test can
 * only assert loosely.
 */
export const unreadBindings = (
  asked: Iterable<string>,
  declared: readonly string[] | undefined
): readonly string[] => {
  if (declared === undefined) return []

  const reads = new Set(declared)
  const unread: string[] = []

  for (const name of asked) if (!reads.has(name)) unread.push(name)

  return unread.sort()
}
