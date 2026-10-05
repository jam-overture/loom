import { describe, expect, it } from "vitest"

import { transcriptText } from "./exercises"
import { readLesson, section } from "./lesson"
import type { Block } from "./markdown"
import { runExercises } from "./run"
import { WRITTEN_LESSONS } from "./syllabus"

/**
 * The half of the course's promise that nothing was checking.
 *
 * `run.test.ts` compiles every Try it program and runs it against this
 * checkout's `src/`, so a lesson whose code has stopped working is a red suite
 * naming the lesson. That is not the same promise. A program can keep running
 * perfectly and print something other than what the lesson says it prints, and
 * on 11 September two lessons did. Lesson 22 claimed 70 registered primitives
 * and 10 declaring a target, when the library had grown to 91 and 12. Lesson 15
 * was the worse of the two: it did not merely print stale numbers, it taught
 * that a component throwing under every configuration is absent from
 * `throwsOnDeclaredProps` — which was true when it was written, and which
 * [0090] changed three days later, on the strength of that very exercise.
 *
 * None of that was visible at `/lessons`, which renders the run rather than a
 * transcript. It was visible only in the markdown — which is the source, the
 * reviewed artefact, and the version you read on a train. A lesson that lies
 * about what the code does is worse than no lesson, because the reader trusts it
 * over their own eyes.
 *
 * **What counts as a transcript**, since a Try it section also holds
 * illustrations — a tree drawn in ASCII, a list of candidate URLs — that are
 * prose in a fence and print nowhere. A plain fence is taken to be a transcript
 * when at least one of its lines appears in what the program actually printed;
 * every line is then required to. An illustration shares no line with the output
 * and is left alone.
 *
 * That heuristic has one failure mode: a transcript whose every single line has
 * drifted looks like an illustration and would be skipped in silence. So the
 * number of blocks it recognises is pinned. A format change that moves the whole
 * course out from under this check fails here rather than passing quietly.
 *
 * **Control characters are normalised to a space on both sides**, and lesson 18
 * is why. A data request's key is `${source}\0${params}` — a NUL separator,
 * chosen in `plan.ts` because it is a byte that can occur in neither a source id
 * nor JSON, so two different questions cannot collide on one key. A markdown
 * file cannot hold that byte, so the lesson prints the key with a space where
 * the NUL is, which is the honest rendering rather than a drifted one. Comparing
 * raw bytes would demand a transcript no text file can contain.
 */

const TRY_IT = "Try it"

/**
 * The other place a lesson prints what its code did.
 *
 * Lessons 01 to 11 hold their exercise transcripts under `## Answers`, beside
 * the answers to the questions the exercises ask; from lesson 12 on they stand
 * under Try it. Only the second half was ever compared to anything, and the pin
 * below could not notice, because it counts Try it blocks and there were always
 * exactly as many of those as there were.
 *
 * What that cost is on the record. Lesson 05's exercise D emits into a sink that
 * throws, and its answer said the exception reaches the caller — which was true
 * when it was written, was made false the next day by 0042, and stayed in the
 * lesson for seven weeks with a green suite either side of it. The lesson had
 * found that defect itself, and the report that fixed it predicted in writing
 * that this lesson would be left wrong. Nothing was in a position to act on the
 * prediction.
 */
const ANSWERS = "Answers"

/**
 * How many plain fences across the course are currently recognised as
 * transcripts. Pinned so that a change in how the exercises print — which would
 * make every block stop matching and so stop being recognised — fails here
 * rather than quietly checking nothing.
 *
 * 148 since 3 October, when lesson 33's exercise G became two blocks rather than
 * one. A mark governs a whole fence, so a fence carrying a mark has to be the
 * size of the thing that moves: six of those ten lines are two components
 * answering and move for nobody, and leaving them under the mark would have had
 * a real drift in them reported as the expected one. Lesson 31's exercise F
 * split for the same kind of reason, before there were marks.
 *
 * It was 147 since lesson 33 (shortfall), which added seven — one per exercise, each a
 * whole transcript in a single block. Four of the seven print a *count of calls*
 * rather than a value, because the lesson's subject is when a party runs rather
 * than what it knows: exercise C's `times the component pushed: 0` is the whole
 * argument of the lesson and is a number about the clock. Exercise G's last three
 * lines read the starter registry at run time — which primitives read a binding and
 * which have declared what they could not show — rather than printing a number this
 * lane typed. That block carries a `moves:` mark, and the sentence that used to be
 * here is on it: a comment on a constant in a passing assertion was the wrong place
 * to explain a red somebody else was going to get.
 *
 * It was 140 since lesson 32 (layout), which added seven — one per exercise, each a whole
 * transcript in a single block. Three of the seven print booleans rather than
 * numbers, because the lesson's subject is a fact that is absent from everything a
 * pure function can produce and the honest shape of that is a row of `false`.
 * Exercise F's first line is the one line in this course that was first produced by
 * a browser rather than by Vitest — it is `describeShot`'s own formatting of the
 * reading `pnpm specimen` took on the committed specimen — and it is held here
 * because the exercise reproduces it from the same function. None of the seven
 * prints the size of the primitive library, a count of the Gate's ladder, or
 * anything else `claims.test.ts` holds a sentence against: the lesson's two counts
 * that could have drifted are `CLIP_TOLERANCE` and `CLIP_VISIBLE_MINIMUM`, and both
 * are printed from the constants rather than typed.
 *
 * It was 133 after lesson 31 (behaviour). It was 125 since lesson 30 (rendezvous), which added seven — one per exercise, each a
 * whole transcript in a single block. Two of them print an empty string as the
 * whole of what a page says, which is the lesson's subject rather than a fence
 * that lost its content: a binding answered under a name nothing reads draws the
 * primitive's empty region, and a transcript that elided that would be eliding
 * the finding. None of them prints the size of the primitive library; exercise G
 * prints it on a line of its own and the prose under it declines to repeat the
 * number, on lessons 22 and 24's precedent.
 *
 * It was 118 after lesson 29 (readership), which added seven — one per exercise, each a
 * whole transcript in a single block. Exercise B's second fence is a `tsc`
 * diagnostic and is marked `text` rather than left plain, on lesson 25's
 * precedent: no program in this course prints a compiler error, so a plain fence
 * there would be a transcript nothing could match. That lesson's exercise C is
 * also the first block in the course that was deliberately a second copy of a
 * fact about `src/primitives/` — the set of primitives with a conditionally-read
 * prop — and it carries a `moves:` mark for the reason the other one does.
 *
 * It was 111 after lesson 28 (corroboration), which added nine — seven exercises, two
 * of which split their output across two fences so that the half about the
 * check and the half about the people writing the records are not read as one
 * thing. Every one of them prints a verdict rather than a total, and the lesson
 * argues the reason in its own Try it: a transcript is a second copy of
 * whatever it prints, and these exercises read a directory that six routines
 * add to three times a day. Printing the size of that directory here would make
 * a red lessons build the ordinary consequence of writing a decision record —
 * which is what the size of the primitive library has already done to lessons
 * 22, 23 and 24.
 *
 * It was 125 after lesson 30 (rendezvous), which added seven — one per
 * exercise, every one a whole transcript in a single block. Lesson 31
 * (behaviour) added eight for seven exercises: its exercise F prints in two
 * blocks, because the line that compares its two pages to each other is a claim
 * about the two transcripts above it rather than part of either.
 *
 * It was 102 after lesson 27 (scale), which added seven — one per exercise, every one
 * of them a whole transcript in a single block, and two of them carrying a line
 * of CSS read out of the library's own stylesheet rather than computed. It was
 * 95 after lesson 26 (liveness), which added six on the same terms; 89 after
 * lesson 25
 * (exhaustiveness), which added six, with its two compiler diagnostics and its
 * pair of type-check counts fenced as `text` rather than plain, because no
 * program in this course prints them; 83 after lesson 18 was repaired on
 * 14 September (two exercises added, one for the reason the runtime could not
 * produce until the ceiling landed and one for the reason no tree and no source
 * can cause), 81 after lesson 24 (silence), which added eight — seven exercises,
 * one of which prints its transcript in two blocks — 73 after lesson 23, and 66
 * when this was written.
 */
const RECOGNISED_TRANSCRIPTS = 148

/**
 * The same, for the `## Answers` sections of lessons 01 to 11.
 *
 * Fifty-one blocks: nine in lesson 05, eight in 09, seven in 11, six each in 06,
 * 08 and 10, five in 07 and four in 04. Lessons 02 and 03 print nothing and 01
 * has no exercises, so they contribute none and always did.
 *
 * It was 50 until 26 September, when lesson 11 gained a seventh: the exercise
 * that hangs a client and gets an answer anyway, written the same day the
 * declaration check found that lesson printing a `ModelClient.complete` the
 * runtime had stopped having.
 *
 * It is pinned for the reason the other one is, and with one extra failure mode
 * worth naming: these fences sit under a heading the reader is meant to reach
 * last, so nobody is looking at them. A format change that stopped every block
 * matching would take this from 50 to 0 and, without the pin, read as a clean
 * sheet.
 */
const RECOGNISED_ANSWERS = 51

/**
 * Lines under `## Answers` that are the author speaking rather than the program
 * printing, per lesson, and why each lesson is allowed any.
 *
 * Lesson 04 is the only one. Its Q4 block labels two transcripts `move:` and
 * `rebuild:` so that a reader can tell which run produced which, and its Q5
 * block appends `a different node at n_4`, `the card itself, moved` and `a
 * look-alike is not it` to three otherwise identical-looking lines. Every value
 * in both is correct — they were checked by hand, line by line, against a run.
 *
 * The alternative was to flatten them into raw terminal output, and that is the
 * trade this file declines to make: the annotation is the explanatory device,
 * and a check that demands its removal has bought a comparison by spending the
 * thing being compared. So the count is declared and held **exactly**. Annotate
 * a sixth line and this fails; remove one and it fails; let a real transcript
 * drift and it fails, because a drift makes six.
 *
 * What it cannot catch is a real drift arriving in the same commit that removes
 * an annotation. That is the residue, it is small, and it is written down rather
 * than discovered.
 */
const ANNOTATED: Readonly<Record<string, number>> = {
  "04-identity.md": 5,
}

/**
 * Printable, so that a byte a markdown file cannot hold compares as the space it
 * is written as — and so that a run of spaces compares as one.
 *
 * The second half is what lets an Answers fence be checked at all. Lesson 08
 * lays its six transcripts out in columns (`stakes: low     reversible: true`)
 * because six rows of settings are unreadable otherwise, and lesson 04 indents
 * a wrapped JSON line under the one above it. Neither is drift and both would
 * be reported as drift by a byte comparison.
 *
 * It is the one normalisation here that cannot weaken the check, which is the
 * test to apply to any other one proposed: **a value is never whitespace**, so
 * collapsing runs of spaces can hide a difference in layout and nothing else.
 * Stripping a trailing annotation or rejoining a wrapped line would each hide a
 * class of real difference, and neither is done — see `ANNOTATED` below for what
 * happens to the fences that would have needed them.
 *
 * Applying it to Try it as well changed nothing there: the same 102 blocks are
 * recognised and none of them drifted before or after. One rule, two sections.
 */
/**
 * A fence that has signed up to go red, and the sentence it says when it does.
 *
 * Two blocks in this course are **deliberately a second copy of a fact about
 * `src/`**, and both are the point of the lesson they are in rather than a cost
 * it forgot to count. Lesson 29's exercise C prints the set of primitives with a
 * declared prop nothing reads, which is that lesson's entire subject; lesson 33's
 * exercise G prints which primitives have declared what they could not show,
 * which is `(none)` and is the state of play rather than a conclusion; and lesson
 * 32's exercise G prints what `tools/specimen/` hands to a browser and what a test
 * can do with each one, which is the whole of what that lesson found by running.
 * Each will go red the day another lane writes the thing its lesson is about, and
 * when they do, **the red is the lesson's claim following the code, not drift.**
 * The remedy is to re-run the exercise and paste in what it prints now.
 *
 * Until this existed that distinction was written in two places, and neither was
 * the one a tripping lane would read. Lesson 29 says it in a paragraph under its
 * own fence — which is prose the check cannot see — and lesson 33's was a
 * sentence in the doc comment on `RECOGNISED_TRANSCRIPTS` below. That comment
 * sits on a **passing** assertion. Nobody reads the documentation of a constant
 * in a test that went green; what they read is the message of the test that went
 * red, and the message was a bare array of strings.
 *
 * So the declaration moves onto the block, as an HTML comment on the line above
 * the fence:
 *
 * ```
 * <!-- moves: when `Loom primitives` gives loom.feed an `unshown` declaration (0206) -->
 * ```
 *
 * It is invisible in both renderings of the course — GitHub does not draw an HTML
 * comment and neither does `/lessons` — so it is a message between maintainers
 * that costs the reader nothing. It travels with the block: moving the fence to
 * another lesson or deleting it takes the mark too, which is the thing a record
 * in this file keyed by filename could not have done.
 *
 * **It never makes anything pass.** A marked fence that has drifted still fails;
 * what changes is that the failure leads with the author's own sentence about
 * what would do this and what to do about it. An exemption here would be the one
 * change to this file that could make the course less true, since the fences
 * most worth marking are the ones most likely to be stale.
 *
 * **And it governs a fence, not a line**, which is a constraint on the fence
 * rather than a limitation to live with. A mark over a block whose other lines
 * are ordinary claims would have a real drift in one of them reported as the
 * expected one, which is worse than no mark at all — so a fence carrying a mark
 * has to be the size of the thing that moves, and lesson 33's exercise G was
 * split in two on the day this was written for exactly that reason. Where a
 * fence cannot be cut that finely — lesson 29's prints three control zeros and
 * the census in one comparison, and the prose names *the fourth line* — the mark
 * says which lines it covers and the failure message puts the judgement back on
 * whoever is reading it rather than promising that the red is harmless.
 *
 * And it buys one thing a comment never could. The heuristic above reads a plain
 * fence as a transcript only if at least one of its lines appears in the output,
 * so a transcript whose every line has moved looks like an illustration and is
 * skipped **in silence** — the known blind spot, currently survivable only
 * because the recognised count is pinned, which reports it as an off-by-one on a
 * number rather than as a lesson that has stopped being true. A marked fence is
 * an author stating that this block *is* a transcript, and the fences carrying a
 * mark are precisely the ones whose whole content can turn over at once. So a
 * marked fence that matches nothing is a failure naming the lesson, instead of a
 * decrement nobody can read.
 */
const MOVES = /^moves:\s*(\S.*)$/

const printable = (line: string): string =>
  line.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/ {2,}/g, " ").trim()

const linesOf = (block: string): readonly string[] =>
  block
    .split("\n")
    .map(printable)
    .filter((line) => line !== "")

/** One marked fence, and whichever of its lines the run did not produce. */
type Movement = { readonly moves: string; readonly lines: readonly string[] }

type Comparison = {
  readonly recognised: number
  /** Lines that drifted in a fence which said nothing about moving. */
  readonly drifted: readonly string[]
  /** The same, in the fences that did say so. Separated for the message, not for the verdict. */
  readonly moved: readonly Movement[]
  /** Marked fences that matched nothing at all, which the heuristic would otherwise pass over. */
  readonly unmatched: readonly Movement[]
}

/** An untagged fence, and the mark governing it if it has one. */
type Recorded = {
  readonly block: Extract<Block, { kind: "code" }>
  readonly moves: string | undefined
}

/**
 * The untagged fences of a section, each with the mark above it if it has one.
 *
 * A mark governs the fence **directly** under it and nothing else: any other
 * block between the two clears it, so a note left behind by an edit stops
 * applying to whatever moved up into its place rather than silently adopting
 * it. Where it governs nothing at all, the describe at the foot of this file
 * says so — a declaration that reaches nothing is this course's own lesson 23,
 * and leaving one unread here would be teaching it and not doing it.
 */
const recordedIn = (blocks: readonly Block[]): readonly Recorded[] => {
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

const compare = (blocks: readonly Block[], printed: readonly string[]): Comparison => {
  const shown = (line: string): boolean => printed.some((one) => one === line || one.includes(line))

  let recognised = 0
  const drifted: string[] = []
  const moved: Movement[] = []
  const unmatched: Movement[] = []

  for (const { block, moves } of recordedIn(blocks)) {
    const lines = linesOf(block.code)

    if (lines.length === 0) continue

    if (!lines.some(shown)) {
      if (moves !== undefined) unmatched.push({ moves, lines })
      continue
    }

    recognised += 1

    const off = lines.filter((line) => !shown(line))

    if (off.length === 0) continue
    if (moves === undefined) drifted.push(...off)
    else moved.push({ moves, lines: off })
  }

  return { recognised, drifted, moved, unmatched }
}

const transcriptsIn = async (
  file: string
): Promise<{ readonly tryIt: Comparison; readonly answers: Comparison }> => {
  const doc = readLesson(file)
  const exercises = section(doc, TRY_IT)?.blocks ?? []
  const { run } = await runExercises(exercises)

  if (run.kind === "failed") {
    const nothing: Comparison = { recognised: 0, drifted: [], moved: [], unmatched: [] }

    return { tryIt: { ...nothing, drifted: [run.message] }, answers: nothing }
  }

  const printed = run.outputs
    .map(transcriptText)
    .join("\n")
    .split("\n")
    .map(printable)

  return {
    tryIt: compare(exercises, printed),
    answers: compare(section(doc, ANSWERS)?.blocks ?? [], printed),
  }
}

const listed = (movements: readonly Movement[]): string =>
  movements
    .map(({ moves, lines }) =>
      [`  <!-- moves: ${moves} -->`, ...lines.map((line) => `        ${line}`)].join("\n")
    )
    .join("\n")

describe("what a lesson says its exercises print", () => {
  let underTryIt = 0
  let underAnswers = 0

  for (const entry of WRITTEN_LESSONS) {
    if (entry.file === undefined) continue

    const file = entry.file as string

    it(`is what lesson ${entry.number} actually prints`, async () => {
      const { tryIt, answers } = await transcriptsIn(file)

      underTryIt += tryIt.recognised
      underAnswers += answers.recognised

      /**
       * Three verdicts, in the order a reader of the failure wants them.
       *
       * A marked fence that matched **nothing** comes first: it is a whole
       * transcript turned over at once, it is the case the recognised count
       * would otherwise report as an off-by-one, and it is the one the mark
       * exists to make legible. Unmarked drift is second, because a lesson
       * saying something untrue it never warned about is the alarming kind.
       * Marked drift is last and is the ordinary one — a line of a census
       * moving, with the author's own sentence attached saying so.
       *
       * A lesson with two kinds at once reports the first and the rest on the
       * next run. That is accepted: each is fixed by the same act, which is
       * re-running the exercises and pasting in what they printed.
       */
      expect(
        tryIt.unmatched,
        `${file}: a fence marked "moves:" matched nothing these exercises printed, so the ` +
          `comparison passed over it as an illustration. Either every line of it has moved at ` +
          `once — which is what the mark is for, and what it is here to stop happening in ` +
          `silence — or the mark is on an illustration and belongs on the transcript instead.\n` +
          listed(tryIt.unmatched)
      ).toEqual([])

      expect(tryIt.drifted).toEqual([])

      expect(
        tryIt.moved,
        `${file}: a fence marked "moves:" has drifted. A mark governs the whole fence and ` +
          `not one line of it, so read what it predicted against what moved: if these are ` +
          `that, re-run the exercise and paste in what it prints now, and nothing is wrong ` +
          `with src/. If they are not, this is ordinary drift and the mark does not cover ` +
          `it.\n` +
          listed(tryIt.moved)
      ).toEqual([])

      const allowed = ANNOTATED[file] ?? 0

      if (allowed === 0) {
        expect(answers.drifted).toEqual([])
      } else {
        expect(
          answers.drifted.length,
          `${file}: ${allowed} lines under Answers are annotation rather than output, and this ` +
            `is not that number — a line was annotated, un-annotated, or has genuinely drifted. ` +
            `Read them: ${JSON.stringify(answers.drifted)}`
        ).toBe(allowed)
      }
    }, 60_000)
  }

  it("still recognises as many transcripts as it did when this was written", () => {
    expect(underTryIt).toBe(RECOGNISED_TRANSCRIPTS)
  })

  it("still recognises as many answer transcripts as it did when this was written", () => {
    expect(underAnswers).toBe(RECOGNISED_ANSWERS)
  })
})

/**
 * Where a note is allowed to be, and what it is allowed to say.
 *
 * The parser will accept an HTML comment anywhere in a lesson and this surface
 * draws nothing for one wherever it lands. That is the hazard: a construct
 * invisible in both renderings is a construct whose mistakes are invisible too,
 * and the whole value of the mark is that a lane which trips a red test can
 * trust what it says. A mark two blocks above the fence, a mark misspelled
 * `moves :`, a mark left behind by an edit that deleted the exercise under it —
 * each of those is a sentence that reads as a live declaration and governs
 * nothing, and none of them would otherwise fail anything.
 *
 * So the vocabulary is closed and it is held here. One form of note exists; it
 * reads inside Try it and nowhere else, because Try it is the only section this
 * file compares and a mark anywhere else would be read by nobody; and it governs
 * the untagged fence directly beneath it, because that is what `recordedIn`
 * implements and a convention nothing enforces is a comment with extra steps.
 */
describe("the marks on a lesson's transcripts", () => {
  type Misplaced = { readonly where: string; readonly text: string; readonly why: string }

  const misplacedIn = (file: string): readonly Misplaced[] => {
    const doc = readLesson(file)
    const wrong: Misplaced[] = []

    const walk = (where: string, blocks: readonly Block[], nested: boolean): void => {
      blocks.forEach((block, index) => {
        if (block.kind === "quote") {
          walk(where, block.blocks, true)
          return
        }

        if (block.kind !== "note") return

        const say = (why: string): number => wrong.push({ where, text: block.text, why })

        if (nested) return void say("a note inside a blockquote is read by nothing")
        if (where !== TRY_IT) return void say(`a note is only read under ${TRY_IT}`)
        if (MOVES.exec(block.text) === null) {
          return void say('the one note this course reads opens "moves: " and says what moves it')
        }

        const under = blocks[index + 1]

        if (under?.kind !== "code" || under.language !== undefined) {
          say("a moves: mark governs the untagged fence directly under it, and there is none there")
        }
      })
    }

    walk("the front matter", doc.front, false)
    for (const each of doc.sections) walk(each.title, each.blocks, false)

    return wrong
  }

  for (const entry of WRITTEN_LESSONS) {
    if (entry.file === undefined) continue

    const file = entry.file as string

    it(`each govern a transcript in lesson ${entry.number}`, () => {
      const wrong = misplacedIn(file)

      expect(
        wrong,
        `${file}: a note in this lesson is not a mark this file reads, so it is a sentence ` +
          `nothing acts on. ${JSON.stringify(wrong, null, 2)}`
      ).toEqual([])
    })
  }

  /**
   * And the four that exist, by name.
   *
   * Pinned for the reason everything else here is pinned: a mark removed is a
   * fence that goes back to reporting its red as drift, which is a worse message
   * and a true one, so nothing else in this file would notice.
   *
   * They are there for two different reasons, and the difference is what decides
   * whether a fence wants one.
   *
   * **An expected red.** Lessons 29 and 33 print a set that *is* the lesson's
   * subject — the primitives with a prop nothing reads, the primitives that have
   * declared what they could not show — so a new member of it is news rather than
   * a mistake, and the mark stops the red being read as drift.
   *
   * **Load-bearing prose.** Lessons 32 and 24 had their numbers moved from outside
   * this lane, correctly, on 2 and 4 October, and both times the paragraph drawing
   * the conclusion under them was left asserting the opposite on `main`. Their
   * marks say that the prose below is a function of these lines, which is the half
   * of both incidents that no file said anywhere.
   *
   * That second reason is also why lessons 22 and 23 have no mark, though their
   * fences pin the size of the library too: their prose declines to lean on the
   * number, deliberately and in as many words. **A fence wants a mark when
   * correcting a line of it is not the whole repair.**
   */
  it("are on the four fences that have signed up for one", () => {
    const marked = WRITTEN_LESSONS.flatMap((entry) => {
      if (entry.file === undefined) return []

      const blocks = section(readLesson(entry.file), TRY_IT)?.blocks ?? []

      return recordedIn(blocks)
        .filter((recorded) => recorded.moves !== undefined)
        .map(() => entry.number)
    })

    expect(marked).toEqual([24, 29, 32, 33])
  })
})
