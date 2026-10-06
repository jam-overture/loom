import type { Block } from "./markdown"

/**
 * The note an author leaves above a transcript to say what moves it.
 *
 * A fence in **Try it** is normally a second copy of what the exercise above it
 * printed, and `transcripts.test.ts` holds it against a real run. Some fences
 * are a second copy of something else as well — a set in `src/primitives/`, a
 * table of facts about `tools/specimen/` — and those will go red the day another
 * lane writes the thing the lesson is about. That red is the lesson's claim
 * following the code rather than drift, and the difference is invisible to
 * anything that only compares strings.
 *
 * So the author states it, on the line above the fence:
 *
 * ```
 * <!-- moves: when `Loom primitives` gives loom.feed an `unshown` declaration (0206) -->
 * ```
 *
 * It is invisible in both renderings of the course — neither GitHub nor
 * `/lessons` draws an HTML comment — so it is a message between maintainers that
 * costs the reader nothing, and it travels with the block rather than sitting in
 * a record keyed by filename.
 *
 * This module is the parsing and nothing else: what a mark is, and which fence
 * it governs. What the two checks downstream *do* with one is their own, and
 * they do different things — `transcripts.test.ts` leads a drifted fence with
 * the author's own sentence, and `prose.test.ts` holds the paragraphs under a
 * marked fence to the numbers in it. Both used to be the first one's private
 * helpers; the second was written in September, and a second copy of this parser
 * would have been this course's own lesson 28 with the bill going to whoever
 * next changed the convention.
 */
export const MOVES = /^moves:\s*(\S.*)$/

/**
 * One line of a fence as the comparison sees it: control characters flattened,
 * runs of spaces collapsed, ends trimmed. A transcript is aligned with padding
 * that nothing should be held to.
 */
export const printable = (line: string): string =>
  line.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/ {2,}/g, " ").trim()

/** The non-empty lines of a fence, each `printable`. */
export const linesOf = (block: string): readonly string[] =>
  block
    .split("\n")
    .map(printable)
    .filter((line) => line !== "")

/** An untagged fence, and the mark governing it if it has one. */
export type Recorded = {
  readonly block: Extract<Block, { kind: "code" }>
  readonly moves: string | undefined
}

/**
 * The untagged fences of a section, each with the mark above it if it has one.
 *
 * A mark governs the fence **directly** under it and nothing else: any other
 * block between the two clears it, so a note left behind by an edit stops
 * applying to whatever moved up into its place rather than silently adopting
 * it. Where it governs nothing at all, `transcripts.test.ts` says so — a
 * declaration that reaches nothing is this course's own lesson 23, and leaving
 * one unread would be teaching it and not doing it.
 */
export const recordedIn = (blocks: readonly Block[]): readonly Recorded[] => {
  const recorded: Recorded[] = []
  let moves: string | undefined

  for (const block of blocks) {
    if (block.kind === "note") {
      moves = MOVES.exec(block.text)?.[1]?.trim()
      continue
    }

    if (block.kind === "code" && block.language === undefined) recorded.push({ block, moves })

    moves = undefined
  }

  return recorded
}
