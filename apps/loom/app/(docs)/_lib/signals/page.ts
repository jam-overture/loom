import type { LoomNode, NodeId, PrimitiveType } from "@loom/runtime"
import {
  READER_SIGNAL_KINDS,
  parseReaderSignalBatch,
  readerSignalSchema,
  type ReaderSignal,
  type ReaderSignalBatch,
  type ReaderSignalKind,
} from "@loom/runtime/signals"

import { docsExamples } from "@/app/(docs)/_lib/examples/catalogue"

/**
 * What *What your readers do* prints, produced rather than typed.
 *
 * Three of the four blocks on that page are the runtime answering for itself:
 * the kinds come from the closed list the schema is built from, the markup
 * comparison is one real tree rendered twice, and the read-back is
 * `parseReaderSignalBatch` given good input and bad. The fourth block is live in
 * the reader's browser, because a broadcaster has nothing to say on a server.
 *
 * Nothing here starts a broadcaster. It cannot: the broadcaster wants a DOM and
 * a page being read, and neither exists while this file runs. What it *can* do
 * is produce every fact the page states about the shape of a signal, so a fifth
 * kind or a renamed field takes the page red rather than leaving it confidently
 * describing last month's vocabulary.
 */

/** The tree the whole page is about, built once per producer that needs it. */
const buildSubject = () => {
  const example = docsExamples.get("a-page-a-reader-scrolls")

  if (example === undefined) {
    throw new Error('loom: the reader-signals page needs the "a-page-a-reader-scrolls" example')
  }

  return example.build()
}

export type KindRow = {
  readonly kind: ReaderSignalKind
  /** The sentence a person could repeat back. */
  readonly means: string
  /** What a reader did, in this page's own example tree. */
  readonly here: string
  /** The field this kind carries beyond the address every kind carries. */
  readonly carries: string
  /** One real signal of this kind, as JSON, having been through the schema. */
  readonly example: string
}

/**
 * The four kinds, each with a real signal of that kind behind it.
 *
 * Built by walking `READER_SIGNAL_KINDS` rather than by listing four rows, so a
 * fifth kind added to the runtime fails here — with the message naming it —
 * instead of quietly not appearing on a page that says there are four.
 *
 * Every example signal is parsed by `readerSignalSchema` on the way out. A field
 * that gets renamed in the runtime takes this producer down; a table of
 * plausible-looking JSON would have survived it.
 */
const DESCRIPTIONS: Readonly<
  Record<ReaderSignalKind, { readonly means: string; readonly here: string; readonly carries: string }>
> = {
  viewed: {
    means: "It came into view. Once, the first time, for the life of the page.",
    here: "The reader scrolled far enough for the questions band to be on screen.",
    carries: "at — when it happened",
  },
  dwelled: {
    means: "It was on screen this long, since the last batch went out.",
    here: "They stayed on the first section for eleven seconds before scrolling.",
    carries: "ms — milliseconds, this batch only",
  },
  activated: {
    means: "A reader used a link, a button or a field inside it.",
    here: "They pressed “See the frames”.",
    carries: "at — when it happened",
  },
  disclosed: {
    means: "A region was opened, or closed.",
    here: "They opened “How long does a frame take?”.",
    carries: "open — true for opened, false for closed",
  },
}

/**
 * The address of the first node of a given type in the example tree.
 *
 * Looked up rather than written down. Every signal this page prints is about a
 * node that is really on the page above it, so a reader who opens the tree can
 * find the id — and editing the tree cannot leave the signals pointing at nodes
 * that no longer exist, which is precisely the failure 0136 exists to prevent
 * and would be an embarrassing one for its own guide to ship.
 */
const addressOf = (type: string): { readonly nodeId: NodeId; readonly type: PrimitiveType } => {
  const found = firstOfType(buildSubject().root, type)

  if (found === undefined) {
    throw new Error(
      `loom: the reader-signals example tree has no "${type}" node, so this page cannot show a signal about one`
    )
  }

  return found
}

const firstOfType = (
  node: LoomNode,
  type: string
): { readonly nodeId: NodeId; readonly type: PrimitiveType } | undefined => {
  if (node.kind === "text") return undefined
  if (node.kind === "element" && node.type === type) return { nodeId: node.id, type: node.type }

  /** A slot is a node holding children, so both kinds are walked the same way. */
  return node.children
    .map((child) => firstOfType(child, type))
    .find((found) => found !== undefined)
}

/**
 * The clock, frozen.
 *
 * A signal carries an instant, and a page built from `Date.now()` would produce
 * different bytes on every build — which is a broken prerender check rather than
 * a documentation improvement. These are a plausible twenty seconds of one
 * reader's afternoon.
 */
const AT = 1_757_720_400_000

const EXAMPLES: Readonly<Record<ReaderSignalKind, ReaderSignal>> = {
  viewed: { kind: "viewed", ...addressOf("loom.faq-list"), at: AT },
  dwelled: { kind: "dwelled", ...addressOf("loom.section"), ms: 11_000 },
  activated: { kind: "activated", ...addressOf("loom.action"), at: AT + 11_000 },
  disclosed: { kind: "disclosed", ...addressOf("loom.faq"), open: true, at: AT + 18_000 },
}

export const produceKinds = (): readonly KindRow[] =>
  READER_SIGNAL_KINDS.map((kind) => {
    const description = DESCRIPTIONS[kind]
    const example = EXAMPLES[kind]

    if (description === undefined || example === undefined) {
      throw new Error(
        `loom: the reader-signals page has no sentence for the "${kind}" signal — a kind was added to the runtime and this page still says there are ${READER_SIGNAL_KINDS.length}`
      )
    }

    const checked = readerSignalSchema.safeParse(example)

    if (!checked.success) {
      throw new Error(
        `loom: this page's example ${kind} signal is not a ${kind} signal — ${checked.error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join("; ")}`
      )
    }

    return { kind, ...description, example: JSON.stringify(checked.data) }
  })

export type BatchShape = {
  readonly treeId: string
  readonly revision: number
  readonly signals: number
  /** The whole batch, pretty-printed, exactly as it would arrive. */
  readonly json: string
}

/**
 * One batch, made of the four example signals and addressed to the real tree.
 *
 * The tree id and revision are read off the example rather than written down,
 * because the claim the page makes about a batch is that it names *this* page at
 * *this* revision — and a hand-typed id would make that claim about nothing.
 */
const goodBatch = (): ReaderSignalBatch => {
  const tree = buildSubject()

  return {
    treeId: tree.treeId,
    revision: tree.revision,
    sentAt: AT + 20_000,
    signals: READER_SIGNAL_KINDS.map((kind) => {
      const signal = EXAMPLES[kind]

      if (signal === undefined) throw new Error(`loom: no example signal for "${kind}"`)

      return signal
    }),
  }
}

export const produceBatch = (): BatchShape => {
  const read = parseReaderSignalBatch(goodBatch())

  if (!read.ok) {
    throw new Error(
      `loom: this page's example batch would be refused by the runtime — ${read.error.issues
        .map((issue) => `${issue.path}: ${issue.message}`)
        .join("; ")}`
    )
  }

  return {
    treeId: read.value.treeId,
    revision: read.value.revision,
    signals: read.value.signals.length,
    json: JSON.stringify(read.value, null, 2),
  }
}

export type ReadBackRow = {
  readonly what: string
  readonly accepted: boolean
  /** The runtime's own words: `path: message`, or the count of signals it took. */
  readonly says: string
}

/**
 * The five inputs a receiver actually gets: one a Loom page sent, and four that
 * arrived at the same endpoint claiming to be one.
 *
 * Each is built from the real batch by breaking one thing, so nothing here can
 * fail for a second reason nobody intended — and the endpoint is the same
 * endpoint either way, which is the only reason any of this matters. A browser
 * is not a trusted author.
 */
const suspectBatches = (
  good: ReaderSignalBatch
): readonly { readonly what: string; readonly input: unknown }[] => [
  { what: "A batch this page sent", input: good },
  { what: "A batch with nothing in it", input: { ...good, signals: [] } },
  {
    what: "A kind nobody registered",
    input: { ...good, signals: [{ ...EXAMPLES.activated, kind: "purchased" }] },
  },
  {
    what: "A signal carrying the words a reader saw",
    input: { ...good, signals: [{ ...EXAMPLES.activated, label: "See the frames" }] },
  },
  {
    what: "A page that never said which revision",
    input: { treeId: good.treeId, sentAt: good.sentAt, signals: [EXAMPLES.viewed] },
  },
]

/**
 * `parseReaderSignalBatch` given one batch it should take and four it should
 * not, printing whatever it actually says.
 *
 * The fourth is the one the page is written around: a signal with a `label` on
 * it is refused, not trimmed. That is what "a signal carries no content" means
 * in code rather than in a promise, and it is only worth printing because it is
 * the runtime refusing it here rather than this file asserting that it would.
 */
export const produceReadBack = (): readonly ReadBackRow[] => {
  const good = goodBatch()

  return suspectBatches(good).map(({ what, input }) => {
    const read = parseReaderSignalBatch(input)

    return read.ok
      ? { what, accepted: true, says: `${read.value.signals.length} signals, at revision ${read.value.revision}` }
      : {
          what,
          accepted: false,
          says: read.error.issues
            .map((issue) => (issue.path === "" ? issue.message : `${issue.path}: ${issue.message}`))
            .join(" · "),
        }
  })
}
