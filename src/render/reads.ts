import type { JsonObject, JsonValue } from "../json.js"
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
 * the walk asks, the two forms a declaration may take, and the comparison it
 * makes; what a primitive declares is `reads` on its definition, and what the
 * walk *calls* the mismatch is the diagnostic vocabulary's business (0181).
 */

/**
 * The name a primitive reads one answer under: a fixed one, or the one a prop
 * gives.
 *
 * Two forms because there are two kinds of bound primitive and the first form
 * can only describe one of them (0184). A primitive that always looks under
 * `rows` declares the string. A primitive that looks under whatever its
 * `binding` prop says — which is both primitives in the library that read a
 * binding at all — declares the prop and the name it falls back to, and a fixed
 * list could only have said something untrue about it.
 *
 * `Name` is the brand: an author writes plain strings, and what a registry
 * hands back has been through `bindingNameSchema`.
 */
export type BindingDeclaration<Name extends string = string> =
  | Name
  | {
      /** The prop whose value is the name. Declared by the primitive's schema. */
      readonly fromProp: string
      /** The name read when that prop is absent, which is the common case. */
      readonly default: Name
    }

/**
 * Which binding names a primitive says it reads, asked per type.
 *
 * Structural, and detected the way `FrameResolver` and `BehaviourResolver` are:
 * a registry built by the SDK satisfies it, and a host resolving from a plain
 * map has registered nothing that could declare a binding name in the first
 * place — so there is nothing here to wire and nothing that can go missing.
 *
 * It answers the *declaration* rather than the names, because half of a
 * declaration is a question about one node's props and a registry is asked
 * about a type. Resolving it is `unreadBindings`' job, which is the one caller
 * holding both.
 */
export interface BindingReader {
  readonly bindingsReadBy: (
    type: PrimitiveType
  ) => readonly BindingDeclaration[] | undefined
}

export const isBindingReader = (value: object): value is BindingReader =>
  typeof (value as Partial<BindingReader>).bindingsReadBy === "function"

/**
 * The name one declaration resolves to on a node carrying these props.
 *
 * A prop-named declaration falls back to its default for anything that is not a
 * non-empty string, which covers the two cases that reach here: the prop was
 * left off, which is what a node binding one thing does and is why the default
 * exists, and a prop whose value the schema would refuse. The second cannot
 * happen on a rendered node — props are validated before the walk asks — and
 * guarding it is cheaper than reasoning about whether it stays that way.
 */
const nameRead = (declaration: BindingDeclaration, props: JsonObject): string => {
  if (typeof declaration === "string") return declaration

  const named: JsonValue | undefined = props[declaration.fromProp]

  return typeof named === "string" && named !== "" ? named : declaration.default
}

/**
 * Every name a node carrying these props reads, one per declaration.
 *
 * Exported because a second instrument asks the same question of a state it is
 * about to probe in rather than of a node — whether an answer it was handed is
 * keyed under a name this primitive will look for — and the resolution has to be
 * the walk's own or the two disagree about one declaration. Unsorted and not
 * deduplicated: it answers *per declaration*, and `unreadBindings` wants a set
 * while a caller reporting what a primitive asked for wants the list as declared.
 */
export const namesRead = (
  declared: readonly BindingDeclaration[],
  props: JsonObject
): readonly string[] => declared.map((declaration) => nameRead(declaration, props))

/**
 * The names this node asked under that its primitive says it does not read.
 *
 * `undefined` from the reader means nobody has said, and nothing is reported:
 * the whole point of the declaration is that absence and emptiness are
 * different answers, and treating "unknown" as "reads none" would report every
 * binding on every primitive that has not been declared yet.
 *
 * The node's own props are the second half of the answer, because a prop-named
 * declaration means something different on every node that carries it. A node
 * that renamed its binding to `rows` and said so in the prop reads `rows`, and
 * a node beside it that said nothing reads the default.
 *
 * Name-sorted, because the caller reports one diagnostic per name and a
 * diagnostic list whose order depends on object key order is one a test can
 * only assert loosely.
 */
export const unreadBindings = (
  asked: Iterable<string>,
  declared: readonly BindingDeclaration[] | undefined,
  props: JsonObject
): readonly string[] => {
  if (declared === undefined) return []

  const reads = new Set(namesRead(declared, props))
  const unread: string[] = []

  for (const name of asked) if (!reads.has(name)) unread.push(name)

  return unread.sort()
}
