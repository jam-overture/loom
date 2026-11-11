import type { AudienceId, AudienceRule } from "@jam-overture/loom/store"

import type { RulesWrite, WritesOutcome } from "./rules"
import {
  MAX_SEGMENTS,
  movedRule,
  placeRule,
  segmentCountAfter,
  withoutRule,
  type Direction,
  type PageRules,
} from "./segment"

/**
 * What an owner's edit on *Segments* writes, worked out from the rules as they
 * were read: one write per page whose list changes, each against the revision
 * it was read at (0376's `expectedRevision`), and none for a page it leaves as
 * it was. Pure, so every rule of the edit is a test rather than a database.
 */

/** Which pages an edit applies to: every page the site published (0371's *copy to every page*), or one. */
export type Target = { readonly kind: "every" } | { readonly kind: "page"; readonly treeId: string }

export const targetOf = (value: FormDataEntryValue | null): Target =>
  value === null || value === "every" ? { kind: "every" } : { kind: "page", treeId: String(value) }

const targeted = (pages: readonly PageRules[], target: Target): readonly PageRules[] =>
  target.kind === "every" ? pages : pages.filter((page) => page.treeId === target.treeId)

const writesOf = (
  pages: readonly PageRules[],
  change: (rules: readonly AudienceRule[]) => readonly AudienceRule[]
): readonly RulesWrite[] =>
  pages.flatMap((page) => {
    const held = page.head?.rules ?? []
    const rules = change(held)

    return JSON.stringify(rules) === JSON.stringify(held)
      ? []
      : [{ treeId: page.treeId, expectedRevision: page.head?.revision ?? 0, rules }]
  })

export type Planned =
  | { readonly ok: true; readonly writes: readonly RulesWrite[] }
  | { readonly ok: false; readonly says: string }

const NO_PAGE: Planned = { ok: false, says: "That page is not one your site published." }

/** A segment's rule placed on the target pages: in its own place where it is already there, else last. */
export const planSave = (
  pages: readonly PageRules[],
  target: Target,
  rule: AudienceRule
): Planned => {
  const on = targeted(pages, target)

  if (on.length === 0) return NO_PAGE

  const writes = writesOf(on, (rules) => placeRule(rules, rule))
  const count = segmentCountAfter(
    pages,
    new Map(writes.map((write) => [write.treeId, write.rules]))
  )

  return count > MAX_SEGMENTS
    ? {
        ok: false,
        says: `This project has ${MAX_SEGMENTS} segments already. Remove one before adding another.`,
      }
    : { ok: true, writes }
}

/** The segment taken off the target pages. On a page it was not on, nothing is written. */
export const planRemove = (
  pages: readonly PageRules[],
  target: Target,
  audienceId: AudienceId
): Planned => {
  const on = targeted(pages, target)

  return on.length === 0
    ? NO_PAGE
    : { ok: true, writes: writesOf(on, (rules) => withoutRule(rules, audienceId)) }
}

/**
 * The segment moved one place on one page, **against the revision the person
 * was looking at** rather than the one read when the edit arrived: a reorder is
 * a statement about the order on the screen, and if that order has changed
 * since, it is refused rather than applied to a list nobody saw.
 */
export const planMove = (
  pages: readonly PageRules[],
  treeId: string,
  audienceId: AudienceId,
  direction: Direction,
  seenRevision: number
): Planned => {
  const page = pages.find((candidate) => candidate.treeId === treeId)

  if (page === undefined) return NO_PAGE

  const writes = writesOf([page], (rules) => movedRule(rules, audienceId, direction))

  return {
    ok: true,
    writes: writes.map((write) => ({ ...write, expectedRevision: seenRevision })),
  }
}

const pagesWord = (count: number): string => (count === 1 ? "1 page" : `${count} pages`)

/**
 * What the edit did, in a sentence, or `undefined` when every page took it.
 * Pages are written one at a time, so a partial edit is said as one: which
 * pages took it and which did not, and why.
 */
export const outcomeSentence = (
  outcome: WritesOutcome,
  nameOf: (treeId: string) => string
): string | undefined => {
  if (outcome.moved.length === 0 && outcome.failed.length === 0) return undefined

  const parts = [
    outcome.written > 0 ? `Saved on ${pagesWord(outcome.written)}.` : "Nothing was saved.",
    outcome.moved.length > 0
      ? `Someone changed the segments on ${outcome.moved.map(nameOf).join(", ")} while you were editing, so those were left as they are; the list below is current.`
      : "",
    outcome.failed.length > 0
      ? `${outcome.failed.map(nameOf).join(", ")} could not be saved just now; try again in a moment.`
      : "",
  ]

  return parts.filter((part) => part.length > 0).join(" ")
}
