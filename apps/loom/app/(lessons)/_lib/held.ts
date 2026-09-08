import type { LoomTree } from "@loom/runtime"

/**
 * What the page is not allowed to be carrying.
 *
 * Three things on a lesson page are answers: the transcripts under the Try it
 * fences, the printed answers to those exercises, and the printed answers to
 * Self-check. The reader component has held all three behind a gate since the
 * day it was written, and the gate has always been a decision about what to
 * *render* — which is a decision made in the browser, about content that was
 * already there.
 *
 * It was already there because a server component that renders an answer and
 * hands it to a client component has put that answer in the page. Not in the
 * HTML — the reader renders nothing until it has read `localStorage`, so the
 * markup a browser is served carries only "Reading what you have done so
 * far…". In the flight payload underneath it, which is the same document, one
 * `Ctrl-U` away, and searchable. Three lessons' worth of tests in this
 * directory assert that an answer is *not on the screen*, and every one of them
 * passed while the answer was in the page.
 *
 * So a held fragment is not rendered at all until it is earned. It is built at
 * its own address, served as the tree it is, and fetched by the reader at the
 * moment the gate opens — and what the page contains before then is a URL.
 *
 * **This is not secrecy and cannot be.** The reader owns the repository; the
 * answers are in `lessons/NN-*.md`, and the address below is guessable by
 * anyone who reads this file. The standard a page can actually meet is the one
 * the review sets have met since they were built: *nothing you have not earned
 * is in the document you are reading, and going to get it is a deliberate act.*
 * `lessons/README.md` already says why that is worth something — "going to get
 * one is another retrieval". It is now true of a lesson as well as of a set.
 */

/** The transcripts for every runnable fence in Try it, in one document. */
export const TRANSCRIPTS = "transcripts"

/** The `**Qn**` half of the printed `## Answers`. */
export const EXERCISE_ANSWERS = "exercise-answers"

/** The `**n**` half of the printed `## Answers`. */
export const SELF_CHECK_ANSWERS = "self-check-answers"

export const HELD_PARTS = [TRANSCRIPTS, EXERCISE_ANSWERS, SELF_CHECK_ANSWERS] as const

export type HeldPart = (typeof HELD_PARTS)[number]

/**
 * One held part of one lesson, as slots.
 *
 * A document rather than a fragment because the transcripts arrive together.
 * Every fence in Try it has to be predicted before any of them appears — that
 * is the section's own instruction, and revealing them one at a time would make
 * each prediction easier than the last — so they are one fetch that lands once,
 * keyed by the exercise number, rather than six that land in whatever order the
 * network settles them.
 */
export type HeldDocument = {
  readonly slots: Readonly<Record<string, LoomTree>>
}

/** The slot a whole-document part occupies, for the two that hold one fragment. */
export const ONLY = "only"

/** Where a piece of held content is, said in the one way a page may say it. */
export type HeldRef = {
  readonly href: string
  readonly slot: string
}

const pad = (number: number): string => String(number).padStart(2, "0")

/**
 * Where a held part is served.
 *
 * Under the lesson rather than beside it, because that is what it is: the
 * answers to lesson 20 are part of lesson 20, and an address that said
 * otherwise would be pretending the content is a shared resource that happens
 * to be reachable from here.
 */
export const heldHref = (lesson: number, part: HeldPart): string =>
  `/lessons/${pad(lesson)}/held/${part}`
