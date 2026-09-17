import { namedList, type PlainLine, type PlainWord } from "./vocabulary"
import type { OperationEffect, ProposalEffect, ValueChange } from "./proposal-effect"

/**
 * What a proposal would do to a page, said to the person being asked to approve
 * it.
 *
 * `proposal-effect` reads a delta against a tree and is the only place that can:
 * the delta carries the forward side of a change and the tree carries what is
 * there now, and the answer exists nowhere until the two are held side by side.
 * What it produces is still the delta's account of itself — `reconfigure`,
 * `2 values, 1 already set this way`, `into loom.band, before loom.heading`,
 * `not in this tree`, `The tree has moved on` — and that account was going
 * straight onto the review queue card.
 *
 * Which is the one screen where it matters most. Every other portal screen
 * reports something that has already happened; this one asks somebody to decide.
 * A reviewer who cannot read what a change would do is not reviewing it, and the
 * card around this had already been rewritten in a person's words on 21 August
 * while its middle — the part that actually says what would change — stayed in
 * the runtime's.
 *
 * So this is the assembly module, the counterpart to History's `revision-view`
 * and Activity's `episode-view`. It decides nothing and computes nothing: every
 * fact comes from `ProposalEffect`, and the technical reading it replaces is
 * carried along on the same object so a disclosure can show it unaltered. The
 * rule is the brief's — **plain language is the default, the technical record is
 * one click away, nothing is ever removed** — and the last clause is the one
 * this file is arranged around.
 *
 * Names stay on the surface. `n_gone` is what tells one row from another, and a
 * sentence that said "a piece of the page" four times would be friendlier and
 * useless. They are the subject of a `PlainLine`, which is the shape a test can
 * assert whole.
 *
 * ## What a part is called, 11 September
 *
 * Those names were the *runtime's* — `loom.card`, `loom.band`, `loom.heading` —
 * on the one screen in the portal that asks somebody to decide something.
 * `/portal/history`, which only reports what already happened, had been saying
 * *the card “Autumn arrivals”* since 10 September. Two screens of one portal
 * named the same part two different ways and the worse of the two was on the
 * screen with the buttons.
 *
 * So the subject of every sentence here is a `PartName` now, and the sentences
 * around it changed shape to take one: a name arrives with its own article
 * attached, so *"Adds a "* is *"Adds "*, and a possessive that used to sit
 * against the type — *"the loom.heading's title"* — would now sit against an id.
 * `"Changes the title and width of the heading “Prices” n_h."` puts the name
 * where a name belongs, at the end of the clause and not inside a contraction.
 *
 * ## The words it takes away, 16 September
 *
 * The one sentence on this card that was not a plain-language problem was a
 * *truth* problem, and it had been wrong since the card was written. `its
 * words` read text children only, and 0052 keeps a fixed field as a setting —
 * so every primitive that carries its content in settings reported no words at
 * all, and a proposal to delete a band of headline figures was described to a
 * reviewer as taking away three pieces and nothing to read.
 *
 * Three sentences come out of that rather than one, because the reading now has
 * three answers: the words, *how many more there are than the preview shows*,
 * and the parts whose author has said nothing. The third is the one worth
 * arguing about, and the argument is on `unreadableSentence`: a silence about
 * words is not the same news as no words, and a reviewer is the last person who
 * should have the difference rounded off for them.
 */

const plural = (count: number, noun: string): string =>
  `${count} ${noun}${count === 1 ? "" : "s"}`

/**
 * A count of parts, as a sentence says it.
 *
 * "the 1 piece inside it" and "it brings 1 more piece" are both correct and both
 * read as a machine filling a slot — the screenshot is where that shows and no
 * test would have. One is the only number a sentence spells out, because it is
 * the only one that appears mid-clause often enough to grate.
 */
const pieces = (count: number): string => (count === 1 ? "one piece" : plural(count, "piece"))

/**
 * A part the operation names and the page does not have.
 *
 * Every operation can hit it and it reads the same every time, so it is one
 * string rather than four. The conditional is deliberately *would* — nothing
 * here is going to happen, and the rest of these sentences are in the present
 * tense precisely so that this one stands out from them.
 */
const GONE = ", but that part isn't on this page any more."

/**
 * How an operation stands, when it does not simply stand.
 *
 * Two badges, and they are opposites a reader would otherwise conflate: one says
 * the change cannot happen, the other says it can and would achieve nothing.
 * `missing` and `inert` are the portal's own field names rather than the
 * runtime's — `proposal-effect` derives both — so the technical string names the
 * field somebody would go and read.
 */
export const NOT_ON_PAGE: PlainWord = {
  label: "Not on this page",
  meaning:
    "This change names a part of the page that isn't there any more, so Loom cannot carry it out.",
  technical: "missing",
}

/**
 * Scoped to the step on purpose. The note at the foot of the section says the
 * same thing about the whole proposal, and a reader who met "would leave the
 * page exactly as it is" beside one step of six would reasonably read it as a
 * verdict on all of them.
 */
export const NO_CHANGE: PlainWord = {
  label: "No change",
  meaning: "This step writes what is already there, so that part of the page would stay as it is.",
  technical: "inert",
}

const changedKeys = (changes: readonly ValueChange[]): readonly string[] =>
  changes.filter((change) => change.after !== null).map((change) => change.key)

const clearedKeys = (changes: readonly ValueChange[]): readonly string[] =>
  changes.filter((change) => change.after === null).map((change) => change.key)

/**
 * What a reconfigure would do to a part's settings.
 *
 * Setting and clearing are two different pieces of news — "changed its width"
 * and "took its width away" are not the same thing to look at — so they are
 * worded apart, exactly as `delta-summary` words them apart for a change that
 * has already happened. The two files share `namedList` rather than each
 * building a list, which is what stops the review queue and History disagreeing
 * about whether there is an "and" before the last item.
 */
const settingSentence = (
  subject: PlainLine["subject"],
  changes: readonly ValueChange[]
): PlainLine => {
  const changed = changedKeys(changes)
  const cleared = clearedKeys(changes)

  if (changed.length === 0 && cleared.length === 0) {
    return { before: "Changes nothing about ", subject, after: " — it lists no settings." }
  }

  /**
   * Clearing gets its own verb rather than being appended to "changes". Taking a
   * setting away and giving it a new value are different enough that a reader
   * scanning six of these should be able to tell them apart at the first word.
   */
  if (changed.length === 0) {
    return { before: `Takes away the ${namedList(cleared)} of `, subject, after: "." }
  }

  /**
   * The settings come before the part, which is the one sentence here that had
   * to be turned around rather than re-worded.
   *
   * It used to read *"Changes the loom.heading's title"* — a possessive hung on
   * the subject. A named part ends in its id, so the same shape would produce
   * *"the heading “Prices” n_h's title"*, which reads as though the identifier
   * owns the setting. Nothing is lost by naming the settings first and the part
   * afterwards, and the subject then ends the clause, where a name can be
   * quoted without tripping over an apostrophe.
   */
  return {
    before: `Changes the ${namedList(changed)} of `,
    subject,
    after: cleared.length === 0 ? "." : `, and takes away its ${namedList(cleared)}.`,
  }
}

const insertSentence = (effect: OperationEffect): PlainLine => {
  if (effect.into === null) {
    return {
      before: "Would add ",
      subject: effect.subject,
      after: ", but the part it would go inside isn't on this page any more.",
    }
  }

  const where =
    effect.before === null
      ? ` at the end of ${effect.into}.`
      : ` inside ${effect.into}, just before ${effect.before}.`

  /**
   * `carries` counts the node itself, so what a reader is being told about is
   * everything but the first one. Said only when there is something to say: "it
   * brings 0 more pieces" is a sentence about a data structure.
   */
  const brings =
    effect.carries !== null && effect.carries > 1
      ? ` It brings ${effect.carries === 2 ? "one more piece" : `${effect.carries - 1} more pieces`} with it.`
      : ""

  return { before: "Adds ", subject: effect.subject, after: `${where}${brings}` }
}

const removeSentence = (effect: OperationEffect): PlainLine =>
  effect.missing
    ? { before: "Would delete ", subject: effect.subject, after: GONE }
    : {
        before: "Deletes ",
        subject: effect.subject,
        after:
          effect.carries !== null && effect.carries > 1
            ? `, and the ${pieces(effect.carries - 1)} inside it.`
            : ", which has nothing inside it.",
      }

const moveSentence = (effect: OperationEffect): PlainLine => {
  if (effect.missing) return { before: "Would move ", subject: effect.subject, after: GONE }

  if (effect.into === null) {
    return {
      before: "Would move ",
      subject: effect.subject,
      after: ", but the part it would go into isn't on this page any more.",
    }
  }

  /**
   * `from` is null when the part is not leaving anywhere — a move inside one
   * parent is a reordering, and "out of the band and into the band" would read
   * as a change of address that is not happening.
   */
  return {
    before: "Moves ",
    subject: effect.subject,
    after:
      effect.from === null
        ? ` to a different place inside ${effect.into}.`
        : ` out of ${effect.from} and into ${effect.into}.`,
  }
}

const configureSentence = (effect: OperationEffect): PlainLine =>
  effect.missing
    ? { before: "Would change ", subject: effect.subject, after: GONE }
    : settingSentence(effect.subject, effect.changes)

/**
 * The words an operation brings or takes, introduced rather than labelled.
 *
 * `its words:` was a field name with a colon after it. Which direction they are
 * travelling in is the whole of what a reader wants: text arriving and text
 * being deleted look identical as a list of strings and are opposite pieces of
 * news.
 */
const wordsSentence = (effect: OperationEffect): string | null => {
  if (effect.text.length === 0) return null

  const quoted = effect.text.map((line) => `“${line}”`).join(" · ")
  /**
   * The cut, said rather than made silently. Three of nine is a preview; three
   * printed as though they were all of them is an account of a deletion with
   * six words missing from it, and the reviewer has no way to tell which they
   * were reading. Found by reading this function against `textTotal` after the
   * reading it feeds started answering for props as well as text children — a
   * stat grid crosses the limit on its second figure.
   */
  const rest = effect.textTotal - effect.text.length
  const more = rest > 0 ? ` and ${plural(rest, "word")} more` : ""

  return effect.op === "remove"
    ? `The words it takes away: ${quoted}${more}`
    : `The words it adds: ${quoted}${more}`
}

/**
 * The words this reading could not see, said to the person being asked to
 * approve their deletion.
 *
 * `copyIn` has three answers where a text walk had two, and this is the third:
 * a part whose author has never said which of its settings a reader reads. It
 * is not *no words* — that is what the old reading called it, and it is how a
 * proposal to delete a page's headline numbers came to be described as taking
 * away nothing.
 *
 * So it is said, and what it claims is exactly *cannot list* — not that there
 * are words and not that there are none. Nothing here knows whether a
 * `loom.stat`'s `value` is a figure a reader reads or a flag nobody sees, and a
 * portal that guessed would be answering a question only the component's author
 * can. A reviewer told *I cannot list these* can go and look at the page; one
 * told nothing has no reason to.
 *
 * One sentence for both directions, which is the opposite of the choice
 * `wordsSentence` makes above, and for a reason rather than for economy: the
 * direction of words that *are* known is the news, and the direction of an
 * absence is not. *Adds words I cannot show you* and *takes away words I
 * cannot show you* prompt the same single action, which is to look.
 *
 * *Settings* rather than props, which is the word this file already uses for
 * the same thing further up — *"Takes away the width of the heading"*.
 */
const unreadableSentence = (effect: OperationEffect): string | null => {
  const parts = effect.unreadable.reduce((total, kind) => total + kind.parts, 0)
  if (parts === 0) return null

  return parts === 1
    ? "Loom can’t list the words in one part of this: nobody has said which of its settings a reader reads."
    : `Loom can’t list the words in ${parts} parts of this: nobody has said which of their settings a reader reads.`
}

export type PlainOperation = {
  /** What it would do, as one sentence with the part's name in the middle. */
  readonly reading: PlainLine
  /** Set only when the operation cannot happen, or would achieve nothing. */
  readonly standing: PlainWord | null
  /** Where the part sits, root first, each step named as a place. */
  readonly place: readonly string[]
  /** The words arriving or leaving, said in the direction they travel. */
  readonly words: string | null
  /**
   * That some of them could not be read, when some could not. `null` on the
   * ordinary operation, where every type involved has declared — so this line
   * appears exactly when a reader would otherwise be looking at a silence.
   */
  readonly unreadWords: string | null
  /**
   * Which types said nothing, and what they carry. Belongs one click down
   * beside `technical`: the sentence above tells a reviewer they are missing
   * something, and this tells whoever maintains the primitives what to declare
   * to end it — `loom.stat ×3 — value, label, caption`.
   */
  readonly technicalUnread: readonly string[]
  /** Before and after, per setting. Carried through untouched. */
  readonly changes: readonly ValueChange[]
  /** The delta's own account of this operation, verbatim. Belongs one click down. */
  readonly technical: string
  /**
   * The same path as `place`, in the runtime's labels. Belongs one click down
   * beside `technical`, and exists so that naming the breadcrumb on the surface
   * takes nothing away from the record under it.
   */
  readonly technicalPlace: readonly string[]
}

export const plainOperationEffect = (effect: OperationEffect): PlainOperation => {
  const reading = ((): PlainLine => {
    switch (effect.op) {
      case "insert":
        return insertSentence(effect)
      case "remove":
        return removeSentence(effect)
      case "move":
        return moveSentence(effect)
      case "configure":
        return configureSentence(effect)
    }
  })()

  return {
    reading,
    standing: effect.missing ? NOT_ON_PAGE : effect.inert ? NO_CHANGE : null,
    place: effect.placeNames,
    words: wordsSentence(effect),
    unreadWords: unreadableSentence(effect),
    technicalUnread: effect.unreadable.map(
      (kind) =>
        `${kind.type}${kind.parts === 1 ? "" : ` ×${kind.parts}`} — ${kind.settings.join(", ")}`
    ),
    changes: effect.changes,
    /**
     * `label` rather than `subject`: the record says what it has always said.
     * The subject is a named part now, and composing this from it would put a
     * reader's sentence in the middle of the delta's account — and, before the
     * types were widened to stop it, would have printed `[object Object]`.
     */
    technical: `${effect.verb} ${effect.label} — ${effect.detail}`,
    technicalPlace: effect.place,
  }
}

/**
 * Why the whole proposal would be refused on arrival, in a person's words.
 *
 * Two causes and they need different sentences, because they suggest different
 * things to do. A stale proposal was fine when it was written and the page moved
 * underneath it; anything else means the change itself no longer fits. Both end
 * in the same advice, which is the point of saying either — a reviewer told only
 * that something is wrong has been informed and not helped.
 *
 * `applyDelta` checks the revision before it looks at an operation, so a stale
 * proposal's obstacle *is* the revision mismatch and printing both would say one
 * thing twice, once in each vocabulary. The runtime's sentence is kept as the
 * technical half either way.
 */
export const plainObstacle = (effect: ProposalEffect): PlainWord | null => {
  if (effect.applies) return null

  const moved = effect.treeRevision - effect.baseRevision
  /**
   * The runtime's own sentence, whichever cause it is. It was being dropped for
   * a stale proposal in favour of a restatement of the revision pair — which
   * `plainEffect` prints anyway, so the disclosure said one fact twice and the
   * only thing it did *not* say was the one thing a disclosure is for. A
   * screenshot with every disclosure open is what found it.
   */
  const technical =
    effect.obstacle ??
    `the change was judged against revision ${effect.baseRevision}; this page is at revision ${effect.treeRevision}`

  return effect.stale
    ? {
        label: "This was worked out on an older version of this page.",
        meaning:
          moved > 0
            ? `The page has been changed ${plural(moved, "time")} since Loom weighed this up, so it will not be applied as it stands. Turn it down and ask again.`
            : "The page is not the version Loom weighed this up against, so it will not be applied as it stands. Turn it down and ask again.",
        technical,
      }
    : {
        label: "This would not work on the page as it stands.",
        meaning:
          "Something the change refers to has moved or gone since it was written. Turn it down and ask again.",
        technical,
      }
}

/**
 * The one thing about a proposal that no field on it gives away: a change made
 * of operations that write what is already there looks like a change and is not
 * one. Said once, at the end, and only when the proposal would actually apply —
 * on a proposal that would be refused it is a footnote to news the reader has
 * already had.
 */
export const inertNote = (effect: ProposalEffect): string | null => {
  if (effect.inertCount === 0 || !effect.applies) return null

  return effect.inertCount === effect.operations.length
    ? "Every part of this writes what is already there — saying yes would leave the page exactly as it is."
    : `${effect.inertCount} of these ${plural(effect.operations.length, "step")} ${effect.inertCount === 1 ? "writes" : "write"} what is already there.`
}

export type PlainEffect = {
  readonly obstacle: PlainWord | null
  readonly operations: readonly PlainOperation[]
  readonly note: string | null
  /** The two revision numbers, for the disclosure. Always true, obstacle or not. */
  readonly revisions: string
}

export const plainEffect = (effect: ProposalEffect): PlainEffect => ({
  obstacle: plainObstacle(effect),
  operations: effect.operations.map(plainOperationEffect),
  note: inertNote(effect),
  revisions: `judged against revision ${effect.baseRevision} · this page is at revision ${effect.treeRevision}`,
})
