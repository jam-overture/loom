import type { LoomTree, NodeId, Result } from "@jam-overture/loom"
import { err, ok } from "@jam-overture/loom"
import {
  pageActionOf,
  pageReachOf,
  readingProgressOf,
  readReaderWindow,
  treesIn,
  windowReadingsOf,
  type PageReading,
  type PartDeclarations,
  type ReaderWindowSources,
  type StoredPageViews,
} from "@jam-overture/loom/signals"

/**
 * What readers did on one published page, as the facts the AI proposes a
 * change from (0329 clause 1).
 *
 * Every figure here is one the signals subsystem already publishes; this picks
 * the few that say where a page loses or ignores its readers, and keeps them
 * small enough to hand a model whole. Nothing is estimated: a part the window
 * cannot speak for is left without a figure rather than given a nought.
 */

/** Below this many page views, a share is an anecdote and nothing is proposed. */
export const MINIMUM_OPENED = 30

/** The words of a part, cut to what identifies it. */
const WORDS_SHOWN = 80

export type PartEvidence = {
  readonly nodeId: NodeId
  readonly type: string
  readonly depth: number
  readonly words: string
  /** Most of the page views that could have reached it, `null` where the window cannot say. */
  readonly reached: number | null
  /** Of readers who reached a part with things inside it, how many did something there. */
  readonly acted: number | undefined
}

export type Evidence = {
  readonly opened: number
  readonly parts: readonly PartEvidence[]
  /** Where the page loses the most readers, if it loses any. */
  readonly steepest: {
    readonly after: NodeId
    readonly before: NodeId
    readonly share: number
  } | null
}

/** Why there is nothing to propose from, each of which a person can be told. */
export type EvidenceSilence =
  | { readonly kind: "too-few"; readonly opened: number }
  | { readonly kind: "uncounted" }
  | { readonly kind: "two-forms" }
  | { readonly kind: "unavailable"; readonly detail: string }

const wordsOf = (words: readonly string[]): string => {
  const joined = words.join(" ").replace(/\s+/g, " ").trim()

  return joined.length <= WORDS_SHOWN ? joined : `${joined.slice(0, WORDS_SHOWN - 1)}…`
}

/** One page's reading, as evidence, or why it cannot be. Pure. */
export const evidenceOf = (
  reading: PageReading,
  pageViews: readonly StoredPageViews[]
): Result<Evidence, EvidenceSilence> => {
  const reach = pageReachOf(reading, pageViews)

  if (reach.opened < MINIMUM_OPENED) return err({ kind: "too-few", opened: reach.opened })
  if (reach.silence !== null) return err({ kind: "uncounted" })

  const action = new Map(pageActionOf(reading).parts.map((part) => [part.nodeId, part]))
  const reached = new Map(reach.parts.map((part) => [part.nodeId, part.share]))
  const steepest = readingProgressOf(reading).steepest

  return ok({
    opened: reach.opened,
    parts: reading.parts.map((part) => ({
      nodeId: part.nodeId,
      type: part.type,
      depth: part.depth,
      words: wordsOf(part.copy.words),
      reached: reached.get(part.nodeId) ?? null,
      acted: action.get(part.nodeId)?.share,
    })),
    steepest:
      steepest === null
        ? null
        : { after: steepest.after, before: steepest.before, share: steepest.share },
  })
}

const percent = (share: number): string => `${Math.round(share * 100)}%`

/**
 * The evidence as the lines a model reads: the page in reading order, indented
 * by depth, each part with what readers did there.
 */
export const evidenceText = (evidence: Evidence): string => {
  const lines = evidence.parts.map((part) => {
    const figures = [
      part.reached === null ? "reach unknown" : `reached by at most ${percent(part.reached)}`,
      ...(part.acted === undefined ? [] : [`${percent(part.acted)} of those did something inside`]),
    ].join(", ")
    const words = part.words === "" ? "" : ` "${part.words}"`

    return `${"  ".repeat(part.depth)}- ${part.nodeId} ${part.type}${words}: ${figures}`
  })

  const stop =
    evidence.steepest === null
      ? "Readers do not drop off sharply anywhere."
      : `The steepest drop: ${percent(evidence.steepest.share)} of readers who reached ${evidence.steepest.after} did not reach ${evidence.steepest.before}.`

  return [`${evidence.opened} page views were counted on this version.`, stop, "", ...lines].join(
    "\n"
  )
}

/**
 * Read one published page's window and turn it into evidence.
 *
 * The window is asked for this tree at this revision alone, so every row is
 * about the version the site serves. A page served in two forms (0263) is two
 * populations, and nothing here picks one: it is said, and nothing proposed.
 */
export const readEvidence = async (
  sources: ReaderWindowSources,
  declarations: PartDeclarations,
  page: LoomTree
): Promise<Result<Evidence, EvidenceSilence>> => {
  const window = await readReaderWindow(sources, { treeId: page.treeId, revision: page.revision })

  if (!window.ok) return err({ kind: "unavailable", detail: window.error.detail })

  const readings = windowReadingsOf(window.value, treesIn([page]), declarations).pages

  if (readings.length > 1) return err({ kind: "two-forms" })

  const [reading] = readings

  return reading === undefined
    ? err({ kind: "too-few", opened: 0 })
    : evidenceOf(reading, window.value.pageViews)
}
