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
  /**
   * A row of a comparison names itself in a prop, the way a feature does.
   *
   * Added 11 September, when `/what-you-run` put six of them on a page and the
   * register could read none of them — the same failure this note was written
   * about, in a second primitive, four weeks later. A criterion is the most
   * load-bearing copy on a comparison: the marks mean nothing without it, and it
   * is exactly the sentence a reader quotes back at you.
   */
  "heading",
  "label",
  /**
   * The figure beside a meter's label — *nine of twelve*, *5 of 10*.
   *
   * Added 16 September with the readers page, which is nine meters and the one
   * band on this site whose whole content is figures. Every one of them is copy
   * a reader reads and none of it was scanned: the register could not see it,
   * and neither could the check that no page prints a bare percentage, which is
   * the assertion that exists because a rate without its denominator is the one
   * number on this site that would flatter.
   */
  "readout",
  /**
   * The figure on a stat, which is the largest type on the front door.
   *
   * Added 16 September for the same reason as `readout` and it is the older
   * omission of the two: *96*, *100+* and *4* have stood on the front door in
   * the biggest characters on the site since the facts band was written, and
   * nothing that reads this site's words could see any of them. `facts.test.ts`
   * checks those three against the repository, which is why it never showed up
   * — the numbers were right, and unreadable to every other check.
   *
   * **It scans one string that is not copy**, and the trade is deliberate:
   * `loom.option`'s `value` is what a form submits rather than what a reader
   * reads. Nothing on this site uses that primitive, an option's value is still
   * a string somebody here wrote, and having it checked for jargon it should not
   * contain is a far smaller cost than the two figures-only primitives staying
   * invisible. `loom.meter`'s value is a number and is unaffected.
   */
  "value",
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
