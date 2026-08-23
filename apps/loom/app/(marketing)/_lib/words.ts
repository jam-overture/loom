import type { LoomNode } from "@loom/runtime"

/**
 * What a reader actually reads, pulled off a page.
 *
 * The site's register is checked in more than one place — every route's opening
 * band, the front door in full, and every state the record page can be reached
 * in — and the check is only as good as its idea of what counts as copy. So the
 * idea lives here rather than in whichever test file needed it first: a prose
 * prop added to one list and not the other is copy one of the tests cannot see,
 * which is a failure that has already happened once on this surface.
 */

/**
 * The prop names that hold sentences rather than settings.
 *
 * Most of the words on this site are **props, not text nodes** — a
 * `loom.feature` carries its title and body as configuration, and 0052 is why:
 * there is exactly one of each and the primitive is meaningless without them.
 * The first version of this walked text nodes alone and reported a clean front
 * door while the entire feature grid, every FAQ answer and every stat caption
 * went unread.
 *
 * So the list is an allowlist and not a denylist. A new prose prop that nobody
 * adds here is copy the register cannot see; a new *setting* that nobody adds
 * here is simply not scanned, which is correct. `href` and `icon` are the two
 * string props deliberately outside it.
 */
export const PROSE_PROPS: readonly string[] = [
  "eyebrow",
  "title",
  "body",
  "label",
  "caption",
  "question",
  "answer",
  "name",
  "note",
  "price",
  "period",
  "state",
]

/** Text nodes and prose props, in document order. */
export const wordsOf = (node: LoomNode): string => {
  if (node.kind === "text") return node.value

  const own =
    node.kind === "element"
      ? PROSE_PROPS.flatMap((key) => (typeof node.props[key] === "string" ? [node.props[key]] : []))
      : []

  return [...own, ...node.children.map(wordsOf)].join(" ")
}

/**
 * Whole words only, and never inside a longer one.
 *
 * "primitive" must not match "primitives" being absent — it should — but "node"
 * must not fire on "nodes" being fine either. Both are the same word to a
 * reader, so the boundary is around the term and a trailing `s` is part of it.
 */
export const uses = (text: string, term: string): boolean =>
  new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}s?\\b`, "i").test(text)
