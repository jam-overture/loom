import { isEmptyRecord, RECORD_FORMAT } from "./record"
import { EMPTY_PROGRESS, readProgress, type Progress } from "./progress"

/**
 * Where the record came from, and what it means that there is nothing in it.
 *
 * This surface reads one string out of one browser and turns it into a study
 * history. That read is total — it has to be, since the value is the reader's
 * own and may have been written by an older version of this page or edited by
 * hand — and totality bought it the failure the course spends a lesson on:
 * **four different situations produced the same empty record, and the page said
 * the same thing about all four.**
 *
 * | what is true | what the page said |
 * | --- | --- |
 * | nobody has done anything yet | *No set is due today. That is the schedule working.* |
 * | the record is on the reader's other machine | the same sentence |
 * | site data is blocked, so nothing can ever be stored | the same sentence |
 * | something is stored and is not legible | the same sentence, and then the next keystroke overwrote it |
 *
 * The first is true and the sentence is right. The second and third are the
 * page reporting a *fact about the reader* that it is in no position to know,
 * which is lesson 24's subject exactly: a reading that cannot say *I could not
 * look* returns a confident no. The fourth is worse than a wrong sentence,
 * because a value nobody could read is still a value somebody might rescue, and
 * `setItem` does not ask.
 *
 * So the read answers with which of them it is, the way `MarkedHolds` answers
 * with an `unreadable` list rather than a shorter one (0138): the caller gets
 * the record *and* what the record is evidence of, and may say so.
 *
 * Nothing here touches `window`. The storage is a parameter — the same seam the
 * clock enters through, for the same reason (0005): three of the five readings
 * below can only be produced by a browser misbehaving, and a test that has to
 * arrange a misbehaving browser is a test nobody writes.
 */

export const RECORD_KEY = "loom.lessons.progress.v1"

/**
 * A key written and immediately removed, to find out whether writing works.
 *
 * Reading and writing are separately permitted, and the gap between them is
 * real: a browser with site data disabled can hand back `null` from `getItem`
 * and throw from `setItem`, which is the one arrangement where the reader is
 * told they are starting fresh, spends ten minutes on a closed-book set, and
 * loses all of it. A probe is a side effect on load and is worth it, because the
 * question it answers — *will this sitting survive?* — has to be answered before
 * the sitting rather than after.
 */
export const PROBE_KEY = "loom.lessons.probe"

/**
 * The slice of Web Storage this module needs, as three functions that may throw.
 * Narrow on purpose: a fake for the tests below is four lines, and nothing here
 * can reach a key this surface does not own.
 */
export type RecordStore = {
  readonly read: (key: string) => string | null
  readonly write: (key: string, value: string) => void
  readonly drop: (key: string) => void
}

export type UnreadableReason =
  /** The browser refused the read. Site data is off, or this is a blocked frame. */
  | "storage-blocked"
  /** Something is stored under this key and it is not JSON. */
  | "not-json"
  /** It is JSON, and it is not a study record — no field this course writes. */
  | "not-a-record"

export type RecordReading =
  /** A record was found and read. It may still be blank; that is a fifth thing. */
  | { readonly kind: "read"; readonly progress: Progress }
  /** Storage answered, and holds nothing for this course. */
  | { readonly kind: "absent" }
  | {
      readonly kind: "unreadable"
      readonly reason: UnreadableReason
      /**
       * What was there, when there was something. This is the reason the page
       * refuses to write: it is the only copy, and handing it back is the only
       * repair available from inside a browser.
       */
      readonly held: string | undefined
    }

export type RecordState = {
  readonly reading: RecordReading
  /**
   * What everything downstream computes from. The empty record when the reading
   * failed — the queue still has to draw — but now beside a reading that says
   * the emptiness is not a measurement.
   */
  readonly progress: Progress
  /** Whether a write to this browser lands. Probed, not assumed. */
  readonly writable: boolean
  /**
   * Whether writing would destroy something. True exactly when a value is held
   * and could not be read: the one case where saving the reader's next answer
   * costs them everything they did before it.
   */
  readonly wouldOverwrite: boolean
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

/**
 * The four fields this course writes. One of them is enough.
 *
 * The test is deliberately about the *shape* rather than the contents, because
 * `{ lessons: {} }` is a record of somebody who marked a lesson and unmarked it
 * — legible, and empty — while `{ note: "hi" }` is somebody else's value under a
 * key that happens to collide. The first may be overwritten and the second may
 * not, and nothing but the keys distinguishes them.
 */
const RECORD_FIELDS = ["lessons", "sets", "predictions", "corrections"] as const

const looksLikeRecord = (value: Record<string, unknown>): boolean =>
  RECORD_FIELDS.some((field) => field in value)

/**
 * A record saved by this page, or the export file, whichever got pasted in.
 *
 * The key holds a bare `Progress` and always has. Somebody who copied their
 * export file into devtools has a file under the key instead, and telling them
 * their own record is unreadable would be true of nothing but the wrapper.
 */
const unwrap = (value: Record<string, unknown>): unknown =>
  value["format"] === RECORD_FORMAT ? value["progress"] : value

const probe = (store: RecordStore): boolean => {
  try {
    store.write(PROBE_KEY, "1")
    store.drop(PROBE_KEY)

    return true
  } catch {
    return false
  }
}

const unreadable = (
  reason: UnreadableReason,
  held: string | undefined,
  writable: boolean
): RecordState => ({
  reading: { kind: "unreadable", reason, held },
  progress: EMPTY_PROGRESS,
  writable,
  /**
   * A blocked read holds nothing to lose, so it does not block writing on top
   * of it — there is nothing under there and the probe has already said whether
   * the write would land anyway.
   */
  wouldOverwrite: held !== undefined,
})

/** The record, and what its absence is evidence of. */
export const openRecord = (store: RecordStore): RecordState => {
  const raw = ((): string | null | undefined => {
    try {
      return store.read(RECORD_KEY)
    } catch {
      return undefined
    }
  })()

  /**
   * A browser that will not be read from will not be written to either, and
   * probing it would be asking a question already answered.
   */
  if (raw === undefined) return unreadable("storage-blocked", undefined, false)

  const writable = probe(store)

  if (raw === null) {
    return { reading: { kind: "absent" }, progress: EMPTY_PROGRESS, writable, wouldOverwrite: false }
  }

  const parsed = ((): unknown => {
    try {
      return JSON.parse(raw) as unknown
    } catch {
      return undefined
    }
  })()

  if (parsed === undefined) return unreadable("not-json", raw, writable)
  if (!isObject(parsed)) return unreadable("not-a-record", raw, writable)

  const inner = unwrap(parsed)

  if (!isObject(inner) || !looksLikeRecord(inner)) return unreadable("not-a-record", raw, writable)

  const progress = readProgress(inner)

  return { reading: { kind: "read", progress }, progress, writable, wouldOverwrite: false }
}

/**
 * Whether this reading is evidence that the reader has done nothing, or only
 * evidence that this browser cannot say.
 *
 * The distinction the whole module exists for, in one predicate, so that no
 * caller has to remember which of the three kinds counts as an answer. A blank
 * record read cleanly **is** an answer: somebody opened the course here and has
 * not marked anything yet.
 */
export const recordIsKnown = (reading: RecordReading): boolean => reading.kind !== "unreadable"

/** Whether a clean reading found a study history in it. */
export const recordHasHistory = (reading: RecordReading): boolean =>
  reading.kind === "read" && !isEmptyRecord(reading.progress)

/**
 * Whether what the reader does next will still be here tomorrow.
 *
 * Two different facts say no and they arrive from opposite directions — a
 * browser that will not take a write at all, and a browser that would take one
 * on top of a value nobody could read — and the answer to *will this be kept*
 * is the same for both. It lives here rather than inline because the store
 * already asks it before every write and a page is now entitled to ask it
 * before the reader spends ten minutes, and two spellings of one condition
 * across one surface is how those two come apart.
 */
export const recordWillKeep = (state: RecordState): boolean =>
  state.writable && !state.wouldOverwrite

/** The browser's own storage, as the three functions above. */
export const browserStore = (): RecordStore => ({
  read: (key) => window.localStorage.getItem(key),
  write: (key, value) => {
    window.localStorage.setItem(key, value)
  },
  drop: (key) => {
    window.localStorage.removeItem(key)
  },
})
