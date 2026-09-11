import { DECISION_RECORDS, type DecisionRecord } from "./records"
import { plainText, readDecisionsFile } from "./source"

/**
 * What each ruling turned down, read out of the ruling.
 *
 * Every decision record ends in **Alternatives considered**, and that section
 * is the part a future reader cannot reconstruct: the approach a reasonable
 * engineer would have reached for, and why it was not taken. It is also the
 * honest answer to the one question a stranger asks before adopting anything —
 * *what can I not do* — because a rejected alternative is exactly a thing you
 * cannot have.
 *
 * So the costs page shows them, and does not keep them. Each paragraph in that
 * section opens with a bold lead naming the alternative, and the lead is all
 * this module takes: what was turned down, never why. **The reasoning stays in
 * the record**, one link away, for the same reason the rest of this section
 * points outward rather than copying — a second copy of an argument is a second
 * copy to keep true, and the copy on a documentation site is the one that goes
 * stale because nothing fails when it does.
 *
 * The records walked are `DECISION_RECORDS`, which is the repository's own
 * generated index, so this adds no new place for a record to hide: a ruling
 * that exists is in that table or the build is already red.
 */

export type ConsideredAlternative = {
  /** The record that turned it down — `"0013"`. */
  readonly recordId: string
  readonly recordNumber: number
  readonly recordTitle: string
  /** The record itself, in the repository. */
  readonly href: string
  /** What the alternative was, in the record's words and nothing more. */
  readonly lead: string
  /**
   * Whether the record closed it.
   *
   * Most are closed and stay closed. A few say *deferred*, *not now*, *worth
   * revisiting* — and those are the ones worth putting in front of somebody
   * deciding whether to adopt, because they are the constraints that might lift.
   */
  readonly settled: boolean
  /** The record's own sentence saying it is not closed. Present only when it is not. */
  readonly note?: string
}

const HEADING = "## Alternatives considered"

/**
 * The section, from its heading to the next one.
 *
 * A record that has no such section yields nothing rather than throwing. One
 * record has none today — the format settled after it was written — and a
 * missing section is a fact about that record, not a broken build.
 */
const alternativesSection = (markdown: string): string => {
  const start = markdown.indexOf(HEADING)

  if (start === -1) return ""

  const body = markdown.slice(start + HEADING.length)
  const next = body.indexOf("\n## ")

  return next === -1 ? body : body.slice(0, next)
}

/** `**A weighted risk score with a threshold.** Rejected: …` */
const LEAD = /^\*\*(.+?)\*\*/

/**
 * One alternative, however the record chose to lay it out.
 *
 * Most records write each one as a paragraph. Nine write them as a bullet list
 * — same sentences, same bold lead, a dash in front — and a parser that only
 * knew about paragraphs read those nine as having considered nothing at all. It
 * was silent about it, which is the worst way for this to be wrong: the page
 * would have shown a shorter list of roads not taken and looked complete.
 *
 * So a unit is a bullet, or a paragraph, and the two are the same thing here.
 */
const BULLET = /^[-*]\s+/

/**
 * The words a record uses when it has not closed something.
 *
 * Matched sentence by sentence rather than against a verdict position, because
 * the records do not write verdicts in a fixed place — *"Rejected for now, and
 * worth revisiting when §4 exists"* puts it at the end, and *"Deferred rather
 * than rejected"* puts it at the start.
 */
const UNSETTLED = /\b(deferred|revisit(?:ing|ed)?|left open|not closed|for now)\b/i

/**
 * A conditional is not a verdict.
 *
 * 0038 argues an alternative that *"the last run recommended if the fix were
 * deferred again"*, and closes it in the next sentence. Reading the word alone
 * marks a closed ruling as open, on the friendliest page in the section, which
 * is the one error here that misleads somebody deciding whether to adopt. So a
 * marker that sits after an `if` in its own sentence is describing a
 * hypothetical rather than saying where the ruling stands, and does not count.
 *
 * Every real one reads the other way round — *"worth revisiting **if** a repair
 * loop needs multiple turns"* — so the marker comes first and the condition is
 * what would reopen it.
 */
const CONDITIONAL = /\bif\b/i

const SENTENCE = /(?<=[.?!])\s+/

const flatten = (paragraph: string): string => paragraph.split("\n").join(" ").replace(/\s+/g, " ")

const unitsOf = (section: string): readonly string[] => {
  const units: string[] = []
  let current: string[] = []

  const finish = (): void => {
    if (current.length === 0) return

    units.push(flatten(current.join(" ")))
    current = []
  }

  for (const raw of section.split("\n")) {
    const line = raw.trim()

    if (line === "") {
      finish()
      continue
    }

    if (BULLET.test(line)) {
      finish()
      current.push(line.replace(BULLET, ""))
      continue
    }

    current.push(line)
  }

  finish()

  return units
}

const saysUnsettled = (sentence: string): boolean => {
  const marker = UNSETTLED.exec(sentence)

  if (marker === null) return false

  return !CONDITIONAL.test(sentence.slice(0, marker.index))
}

/**
 * The record's own sentence saying it is not closed, so the mark shows its
 * evidence — a reader can see what earned it rather than taking the reading on
 * trust. Searched after the lead, because a note that repeated the alternative's
 * own name back would say nothing.
 */
const unsettledNote = (afterLead: string): string | undefined => {
  const sentence = afterLead.split(SENTENCE).find(saysUnsettled)

  return sentence === undefined ? undefined : plainText(sentence)
}

export const parseAlternatives = (
  markdown: string,
  record: DecisionRecord
): readonly ConsideredAlternative[] => {
  const alternatives: ConsideredAlternative[] = []

  for (const paragraph of unitsOf(alternativesSection(markdown))) {
    const lead = LEAD.exec(paragraph)

    if (lead?.[0] === undefined || lead[1] === undefined) continue

    const note = unsettledNote(paragraph.slice(lead[0].length))

    alternatives.push({
      recordId: record.id,
      recordNumber: record.number,
      recordTitle: record.title,
      href: record.href,
      lead: plainText(lead[1]),
      settled: note === undefined,
      ...(note === undefined ? {} : { note }),
    })
  }

  return alternatives
}

export const CONSIDERED_ALTERNATIVES: readonly ConsideredAlternative[] = DECISION_RECORDS.flatMap(
  (record) => parseAlternatives(readDecisionsFile(record.file), record)
)

/** Everything one ruling turned down, in the order the record argues them. */
export const alternativesFor = (
  recordNumber: number,
  alternatives: readonly ConsideredAlternative[] = CONSIDERED_ALTERNATIVES
): readonly ConsideredAlternative[] =>
  alternatives.filter((alternative) => alternative.recordNumber === recordNumber)

/** The ones a record left open, which is the short list worth reading. */
export const unsettledAlternatives = (
  alternatives: readonly ConsideredAlternative[] = CONSIDERED_ALTERNATIVES
): readonly ConsideredAlternative[] => alternatives.filter((alternative) => !alternative.settled)

/**
 * The counts the page states, counted.
 *
 * A written total is wrong the first time somebody adds a record and nobody
 * notices for a month, and the number is load-bearing here: the page's whole
 * claim is that these constraints were argued rather than assumed, and the
 * denominator is the evidence.
 */
export const alternativeTally = (
  alternatives: readonly ConsideredAlternative[] = CONSIDERED_ALTERNATIVES
): { readonly alternatives: number; readonly records: number; readonly unsettled: number } => ({
  alternatives: alternatives.length,
  records: new Set(alternatives.map((alternative) => alternative.recordId)).size,
  unsettled: unsettledAlternatives(alternatives).length,
})
