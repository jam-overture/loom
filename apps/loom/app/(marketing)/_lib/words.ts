import type { LoomNode } from "@jam-overture/loom"

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

/**
 * One string a reader reads, and the field of the tree it came from.
 *
 * `wordsOf` above joins everything into one string, which is right for asking
 * *does this page use a word it should not* and useless for every rule that has
 * to name the offender. A register failure can be reported as a term and a
 * route; a sentence that runs too long has to be quoted back, and a quote with
 * no field beside it sends whoever reads the failure hunting through nine page
 * builders for it.
 *
 * So the two readings are separate functions over the same idea of what counts
 * as copy, rather than one function that returns both shapes.
 */
export type ReaderString = {
  /** `loom.feature.body` for a prop, `loom.prose#text` for a text node. */
  readonly field: string
  readonly text: string
}

/**
 * Every string a reader reads, each labelled with where it is.
 *
 * **Text nodes and props alike, which is the whole reason this exists.** The
 * two plain-language rules in `voice.test.ts` read a list of six prop names
 * until today, so none of them had ever read a paragraph: the site's prose is
 * `loom.prose` with a text child, and a rule over props cannot see a single
 * word of it. Measured when this was written, this site served **twelve strings
 * carrying an em dash and those rules saw none of them** — seven of the twelve
 * are text nodes, and a list of prop names cannot read one.
 *
 * A text node is labelled with the type of the nearest element above it, which
 * is what makes the label useful: `loom.prose#text` says paragraph and
 * `loom.action#text` says the words on a button, and those are two different
 * kinds of copy with two different registers. A node inside a region carries
 * the region's own element rather than the slot, because a slot is a part of a
 * primitive rather than a thing on the page (0051).
 *
 * ## A sentence is one string even when the tree splits it
 *
 * Every paragraph on this site was a single text node until `loom.inline-link`
 * arrived, and a rule reading one text node at a time was therefore reading one
 * whole sentence at a time. A link in the middle of a paragraph ends that: the
 * sentence becomes three children, and a walk that pushed each of them would
 * hand every rule in `voice.test.ts` three fragments where a reader sees one
 * sentence.
 *
 * **What that would have cost is the 30-word rule, silently.** A 44-word
 * sentence split by a link into 6 words, 2 and 36 passes a ceiling of 30 three
 * times over, and the register would have gone on reporting the site clean. It
 * is the same shape as the failure at the top of this file — copy a check
 * cannot see reads exactly like copy with nothing wrong with it — and it would
 * have arrived on the first page that used the primitive rather than four weeks
 * later.
 *
 * So a maximal run of inline children is joined back into the one string a
 * reader reads. **On the trees this site served before the primitive it changes
 * nothing**, because a run of one text node joins to itself, and
 * `words.test.ts` holds that from both ends.
 */

/**
 * The types that sit *inside* a sentence rather than being a thing on the page.
 *
 * Three of them, and the list is the library's rather than this lane's choice:
 * `loom.inline-link`, `loom.emphasis` and `loom.code-span` are the primitives
 * whose whole design is that they render `inline` and borrow the line box
 * around them. Everything else the site composes is a block, a cell or a
 * control, and a block interrupts a sentence rather than joining one.
 *
 * It is a list and not a lookup on the registry because a registry entry does
 * not say this. `display: inline` is in a primitive's component or its
 * stylesheet, and reading a rendering decision back out of either would be
 * guessing. A primitive added to the library and used here without being added
 * to this list reads as a break in a sentence — which is the safe direction: a
 * sentence measured in halves is over the ceiling sooner, never later.
 */
export const INLINE_TYPES: readonly string[] = [
  "loom.inline-link",
  "loom.emphasis",
  "loom.code-span",
]

const isInlineContent = (node: LoomNode): boolean =>
  node.kind === "text" || (node.kind === "element" && INLINE_TYPES.includes(node.type))

/**
 * The words in an inline run, with nothing put between them.
 *
 * **No separator, and that is the whole point.** The parts of a split sentence
 * carry their own spaces — `"The "`, the phrase, `" on the How it works page…"`
 * — so joining them with anything reconstructs a sentence nobody wrote. A space
 * inserted here would put one in front of every comma that follows a link.
 */
const inlineTextOf = (node: LoomNode): string =>
  node.kind === "text" ? node.value : node.children.map(inlineTextOf).join("")

export const readerCopy = (node: LoomNode): readonly ReaderString[] => {
  const found: ReaderString[] = []

  const propsOf = (current: LoomNode, within: string): void => {
    if (current.kind !== "element") return

    for (const key of PROSE_PROPS) {
      const value = current.props[key]

      if (typeof value === "string") found.push({ field: `${within}.${key}`, text: value })
    }
  }

  const walk = (current: LoomNode, within: string): void => {
    if (current.kind === "text") {
      found.push({ field: `${within}#text`, text: current.value })

      return
    }

    const here = current.kind === "element" ? current.type : within

    propsOf(current, here)

    let run: LoomNode[] = []

    /**
     * An inline element's own prose props are read after the sentence it is in,
     * rather than being lost with its text nodes. None of the three carries one
     * today; a fourth that did would otherwise be copy nothing could see, which
     * is the failure this module exists to prevent and not one to reintroduce
     * at the inline layer.
     */
    const flush = (): void => {
      if (run.length === 0) return

      found.push({ field: `${here}#text`, text: run.map(inlineTextOf).join("") })

      const propsWithin = (current: LoomNode): void => {
        if (current.kind === "text") return

        propsOf(current, current.kind === "element" ? current.type : here)
        current.children.forEach(propsWithin)
      }

      run.forEach(propsWithin)

      run = []
    }

    for (const child of current.children) {
      if (isInlineContent(child)) {
        run.push(child)

        continue
      }

      flush()
      walk(child, here)
    }

    flush()
  }

  walk(node, node.kind === "element" ? node.type : "loom.page")

  return found
}

/**
 * The sentences in a string, as a reader would count them.
 *
 * Split on terminal punctuation followed by a space, with the closing curly
 * quote included among the terminators — the record quotes what a visitor said
 * and ends the quotation outside the full stop, so `“Calm it down.” Decided by…`
 * is two sentences and a splitter that only knew about `.` would call it one.
 *
 * Deliberately simple. It will read "Mr. Smith" as two sentences and there is
 * nothing on this site it gets wrong, which is the only test that matters for an
 * instrument this narrow: every string it is pointed at is copy this lane wrote
 * for a stranger, and if a page ever needs an abbreviation the rule it feeds
 * will say so by failing rather than by letting something through.
 */
export const sentencesOf = (text: string): readonly string[] =>
  text
    .split(/(?<=[.!?][”"]?)\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0)

/** How many words a reader is asked to take in one go. */
export const wordCountOf = (text: string): number =>
  text.trim().split(/\s+/).filter(Boolean).length
