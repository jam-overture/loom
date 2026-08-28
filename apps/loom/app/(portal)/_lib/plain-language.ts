/**
 * The rename queue, turned from a list into a check.
 *
 * Six runs of this lane worked through a queue of screens: `/portal/trees` →
 * `/portal/pages`, `/portal/calibration` → `/portal/trust`, `/portal/audit` →
 * `/portal/checkup`, then the page screen, Activity and History. On 25 August
 * the queue was declared empty. On 27 August `/portal/primitives` turned out to
 * still be on it, and the note filed with that run said the real defect out
 * loud:
 *
 * > A rename queue kept as a list of screens is a list somebody has to
 * > remember to add to.
 *
 * `/portal/sign-ins` is the second screen the list forgot, and it had been
 * there since day 32 — a lowercase `h1` naming its own route, a decision-record
 * number printed at a reader, and a raw store error at the same altitude as the
 * sentence above it. Nobody added it to the queue because the queue counted
 * screens that print the runtime's *states*, and this one prints the portal's
 * own machinery instead.
 *
 * So this module is the queue as an invariant rather than a memory. It gives
 * the sweep in `plain-language.test.ts` two things it cannot do by grepping:
 *
 * - **What counts as a word a reader should not meet unasked** — the list, in
 *   one place, with the reasoning attached to each entry rather than to the
 *   list.
 * - **What counts as *unasked*** — which is the harder half, and the one that
 *   made every earlier "this is on the surface" test in this lane weaker than
 *   it looked. A closed `<details>` is still in the DOM, deliberately (see
 *   `technical-detail.tsx`: find-in-page has to reach inside it), so
 *   `body.textContent` cannot tell a word a reader meets from a word that is
 *   one click down. `surfaceText` can.
 *
 * The rule being enforced is the brief's, unchanged:
 *
 * > **Plain language is the default. The technical record is one click away.
 * > Nothing is ever removed.**
 *
 * Note the shape of what this checks. It is not a readability score and it
 * makes no attempt to be one. It answers one question — *did a word from the
 * runtime's own vocabulary reach a reader who did not ask for it* — because
 * that is the failure this lane has actually shipped, twice, on screens it had
 * already declared done.
 */

/**
 * The words that are the runtime talking to itself.
 *
 * Seeded from `RESERVED_VOCABULARY` in the marketing lane's `copy.ts`, which is
 * the same list for the same reason and was written first. It is copied rather
 * than imported: a lane may not reach into another's route group, and the two
 * lists should be free to diverge anyway, because the audiences differ. A
 * visitor to the front door has no context at all. Somebody signed in to the
 * portal has some — they run a deployment — so `page`, `change` and `rule` are
 * fine here and would not be there, while `throttle`, `subject` and `survey`
 * are portal machinery that the front door never had a chance to leak.
 *
 * Each entry is a word that is *correct* somewhere. `delta` is a delta and the
 * documentation should say so; a decision record citing 0034 is doing its job.
 * The claim is only about **where**: not on a portal surface, unasked, in front
 * of somebody who wants to know whether to press a button.
 */
export const RUNTIME_VOCABULARY: readonly string[] = [
  /* The delta model and the tree. 0016's vocabulary, printed at a person. */
  "delta",
  "TreeDelta",
  "reconfigure",
  "inverse",
  "invert",
  "uninvertible",
  /* The Gate. `disposition` is the word 0019 turns on, and it is unreadable. */
  "disposition",
  "the Gate",
  "predicate",
  /* The registry and what is in it. */
  "registry",
  "primitive",
  "schema",
  "provenance",
  /* The runtime itself, named as a thing rather than as "Loom". */
  "runtime",
  "interpreter",
  /* This portal's own machinery, which no other lane could have leaked. */
  "throttle",
  "survey",
  "digest",
  "seeded",
  "cursor",
  "store handle",
]

/**
 * A word is meant as jargon when the source says so.
 *
 * The technical record is *supposed* to contain these words — that is the whole
 * point of putting it one click down rather than deleting it — so the sweep
 * needs a way to tell "this reached a reader" from "this is the record". In the
 * DOM that is `surfaceText`. In source it is the `<TechnicalDetail>` element,
 * and in prose it is a code span: a word set in `font-mono` is being *quoted*
 * as a name rather than used as English, which is what `DATABASE_URL` and
 * `create` already are on three portal screens.
 */
const wordPattern = (word: string): RegExp =>
  new RegExp(`(^|[^\\p{L}])${word.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}(s|es)?($|[^\\p{L}])`, "iu")

/**
 * Which reserved words a piece of reader-facing text contains.
 *
 * Returns the words rather than a boolean, because a failing assertion that
 * says *which* word is a failure somebody can fix without re-reading the
 * screen. Matching is whole-word and case-insensitive, and tolerates a plural:
 * "primitives" is the same leak as "primitive", and "Node" at the start of a
 * sentence is the same leak as "node".
 */
export const unplainWordsIn = (text: string): readonly string[] =>
  RUNTIME_VOCABULARY.filter((word) => wordPattern(word).test(text))

/**
 * Decision-record citations, which are the sharpest instance of the whole rule.
 *
 * `(0034)` on a screen is a reference to a document the reader has not read, on
 * the one surface whose entire test is whether somebody who has read no
 * decision record can follow it. The 25 August run found one on the history
 * chooser — *"A log is the truth and the tree is a view of it (0016)"* — and
 * called it the clearest single instance of the brief's principle it had found.
 * It was not the last one. Two more were still on `/portal/sign-ins`.
 *
 * The fix is never to drop the fact. It is to keep the fact in the reader's
 * words and move the citation into a code comment, where the next person to
 * edit the sentence can still find out why it says what it says.
 *
 * Matched as a parenthesised four-digit number so that a revision count, a
 * port number and a year in prose do not trip it.
 */
export const citationsIn = (text: string): readonly string[] =>
  [...text.matchAll(/\((\d{4})\)/gu)].map((match) => match[1] ?? "")

/**
 * The text a reader actually meets, as opposed to the text that is present.
 *
 * This is the half that no previous guard in this lane got right, and the
 * reason is worth stating rather than assuming. `TechnicalDetail` renders a
 * closed `<details>`, and a closed `<details>` keeps its children mounted on
 * purpose — that is what lets browser find-in-page reach a node id behind a
 * disclosure, and it is the property that makes "nothing is ever removed"
 * literally true rather than a claim about intent. The cost is that
 * `container.textContent` returns the disclosed and the undisclosed as one
 * string, so a test asserting "the word `disposition` is not on this screen"
 * passes and fails for the wrong reasons: it fails when the record does its
 * job, and it passes when the record is deleted.
 *
 * So: walk the tree, and when a `<details>` is shut, take its `<summary>` and
 * stop. The summary is on the surface — it is the label that tells a reader
 * what is down there, and a summary reading "disposition" would be exactly the
 * leak this is looking for.
 *
 * `hidden` elements and `aria-hidden` subtrees are skipped for the same reason
 * in the other direction: they are not on the surface for anybody. `sr-only`
 * is **not** skipped, because it is on the surface for the readers who most
 * depend on the words being plain.
 */
export const surfaceText = (root: Element): string => {
  const parts: string[] = []

  const walk = (element: Element): void => {
    if (element.hasAttribute("hidden") || element.getAttribute("aria-hidden") === "true") return

    if (element instanceof HTMLDetailsElement && !element.open) {
      const summary = element.querySelector("summary")

      if (summary !== null) walk(summary)

      return
    }

    for (const child of element.childNodes) {
      if (child.nodeType === child.TEXT_NODE) {
        parts.push(child.textContent ?? "")
        continue
      }

      if (child.nodeType === child.ELEMENT_NODE) {
        /*
         * A space at every element boundary, because the DOM does not put one
         * there and two adjacent blocks come back as `waiting.Technical`. The
         * direction of the error matters and this is the safe one: an inserted
         * space can only create a word boundary, never remove one, so the check
         * can be made to miss a leak split across two elements — `<span>dis
         * </span><span>position</span>` — and can never be made to invent one.
         * Missing that is a trade worth taking against flagging every screen
         * whose two paragraphs happen to abut.
         */
        parts.push(" ")
        walk(child as Element)
        parts.push(" ")
      }
    }
  }

  walk(root)

  return parts.join("").replace(/\s+/gu, " ").trim()
}
