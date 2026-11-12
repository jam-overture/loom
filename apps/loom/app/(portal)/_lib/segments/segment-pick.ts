import type { AudienceId } from "@jam-overture/loom/store"

import { audienceOfSegment, segmentWordSchema, type SegmentWord } from "./segment"

/**
 * The segment picker on *Signals*, *By page* and *Goals* (unit 9 of
 * `docs/portal.md`, piece 3 of
 * [0371](../../../../../../decisions/0371-a-segment-is-an-audience-the-site-sorts-its-readers-into-and-loom-keeps-only-its-rules-and-its-name.md)):
 * which readers a screen's figures are about, in the address as `?segment=`.
 *
 * **Every figure for a segment is a figure for that audience alone** (0371
 * clause 6). A segment's audience is `aud_` and its word, so the address needs
 * nothing but the word to narrow every counter read to it, and the counters
 * already keep each audience apart (0284). The project's rules say only which
 * segments to offer: a word the rules no longer name (a segment removed, or one
 * a site names on its own) still narrows the figures to what was counted under
 * it, and is offered beside the others so the screen says what it is showing.
 *
 * Everything here is pure; reading the project's segments is
 * `project-segments.ts`'.
 */

/** The address's key, on every screen that takes a segment. */
export const SEGMENT_PARAM = "segment"

/** The segment an address asks for, `undefined` for everyone or for a word no segment could have. */
export const segmentAsked = (asked: string | undefined): SegmentWord | undefined => {
  const parsed = segmentWordSchema.safeParse(asked)

  return parsed.success ? parsed.data : undefined
}

/** The audience a screen's counters are read for, `undefined` for every reader. */
export const audienceOfPick = (word: SegmentWord | undefined): AudienceId | undefined =>
  word === undefined ? undefined : audienceOfSegment(word)

/** What a screen knows about segments: the one it shows, and the ones it may offer. */
export type SegmentPick = {
  /** `undefined` for everyone. */
  readonly word: SegmentWord | undefined
  /** The project's segments, by word; `undefined` where its rules could not be read. */
  readonly offered: readonly string[] | undefined
}

/** The address of the screen being drawn, about another segment, or everyone for `undefined`. */
export type SegmentHref = (word: string | undefined) => string

export type SegmentChoice = {
  readonly label: string
  readonly href: string
  readonly selected: boolean
}

/** What the segment is called on a chip and in a sentence. */
export const EVERYONE_LABEL = "Everyone"

/**
 * The picker's chips: *Everyone* first, then each segment alphabetically, the
 * one shown among them even where the rules no longer name it. None at all for
 * a project with nothing to pick between, where a lone *Everyone* would be a
 * control that does nothing.
 */
export const segmentChoicesOf = (
  pick: SegmentPick,
  hrefOf: SegmentHref
): readonly SegmentChoice[] => {
  const words = [
    ...new Set([...(pick.offered ?? []), ...(pick.word === undefined ? [] : [pick.word])]),
  ].sort((left, right) => left.localeCompare(right))

  return words.length === 0
    ? []
    : [
        { label: EVERYONE_LABEL, href: hrefOf(undefined), selected: pick.word === undefined },
        ...words.map((word) => ({ label: word, href: hrefOf(word), selected: word === pick.word })),
      ]
}
