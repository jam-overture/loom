/**
 * The grammar of Loom's identifiers, as plain patterns and nothing else.
 *
 * The schemas in `ids.ts` and `primitive-type.ts` are built from these, so there
 * is one definition of what a node id or a primitive type looks like. They live
 * apart from the schemas for one reader: code that runs in a visitor's browser —
 * the reader-signal broadcaster — needs to recognise an id without shipping the
 * schema library to every page that asks for signals (0136).
 */

export const ID_BODY_MAX_LENGTH = 32

export const ID_BODY_ALPHABET = "[0-9a-z]"

const ID_BODY = `${ID_BODY_ALPHABET}{1,${ID_BODY_MAX_LENGTH}}`

/** The pattern for one kind of id: its one-character prefix, an underscore, and the body. */
export const idPattern = (prefix: string): RegExp => new RegExp(`^${prefix}_${ID_BODY}$`)

export const NODE_ID_PATTERN = idPattern("n")

export const TREE_ID_PATTERN = idPattern("t")

const SEGMENT = "[a-z][a-z0-9]*(?:-[a-z0-9]+)*"

/**
 * The grammar of every name a tree uses to reach something a deployment
 * registered: a primitive, a data source, a submission endpoint. Dot-namespaced
 * kebab-case — `stack`, `commerce.product-card`, `contact.enquiry`.
 *
 * One pattern rather than one per registry, because the sameness is the point.
 * A tree names a capability and a registry decides what that name reaches; a
 * second grammar would say those are different kinds of name when they are not.
 */
export const NAMESPACED_ID_PATTERN = new RegExp(`^${SEGMENT}(?:\\.${SEGMENT})*$`)
