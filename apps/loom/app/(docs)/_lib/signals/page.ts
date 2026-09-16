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

/**
 * A kind this page has prose for, which is not the same list as the runtime's.
 *
 * The vocabulary is closed but it is not finished: `completed` is approved and
 * not built. Writing the union this way means the page carries its sentences
 * before the runtime carries the kind, and that the type **erases itself** on
 * the day it lands — once `ReaderSignalKind` includes `completed`, this union is
 * `ReaderSignalKind` and every table below still has exactly the right keys.
 *
 * The alternative was a page that argues there are four, which is what this
 * page used to do and what stopped the runtime growing for three days.
 */
export type DocumentedKind = ReaderSignalKind | "completed"

export type KindRow = {
  readonly kind: DocumentedKind
  /** The sentence a person could repeat back. */
  readonly means: string
  /** What a reader did, in this page's own example tree. */
  readonly here: string
  /** The field this kind carries beyond the address every kind carries. */
  readonly carries: string
  /** The same thing in the words the page opens with, before any of them are named. */
  readonly plainly: string
  /** One real signal of this kind, as JSON, having been through the schema. */
  readonly example: string
}

/**
 * Every kind this page can describe, whether or not the runtime has it yet.
 *
 * `produceKinds` walks `READER_SIGNAL_KINDS` rather than this table, so what a
 * reader sees as *the vocabulary* is the runtime's list and never this one. What
 * this table adds is that a kind arriving in the runtime finds its prose already
 * written — and `produceApproved` shows the difference between the two lists to
 * the reader instead of hiding it.
 *
 * Every example signal is parsed by `readerSignalSchema` on the way out. A field
 * that gets renamed in the runtime takes this producer down; a table of
 * plausible-looking JSON would have survived it.
 */
const DESCRIPTIONS: Readonly<
  Record<
    DocumentedKind,
    { readonly means: string; readonly here: string; readonly carries: string; readonly plainly: string }
  >
> = {
  viewed: {
    means: "It came into view. Once, the first time, for the life of the page.",
    here: "The reader scrolled far enough for the questions band to be on screen.",
    carries: "at — when it happened",
    plainly: "which part someone looked at",
  },
  dwelled: {
    means: "It was on screen this long, since the last batch went out.",
    here: "They stayed on the first section for eleven seconds before scrolling.",
    carries: "ms — milliseconds, this batch only",
    plainly: "what they stayed on",
  },
  activated: {
    means: "A reader used a link, a button or a field inside it.",
    here: "They pressed “See the frames”.",
    carries: "at — when it happened",
    plainly: "what they pressed",
  },
  disclosed: {
    means: "A region was opened, or closed.",
    here: "They opened “How long does a frame take?”.",
    carries: "open — true for opened, false for closed",
    plainly: "what they opened",
  },
  completed: {
    means: "A form inside it was submitted, and the browser let it go.",
    here: "Nothing on the page above can produce one: there is no form in it.",
    carries: "at — when it happened",
    plainly: "what they finished",
  },
}

/** The order the tables are written in, taken from the table rather than retyped. */
const DOCUMENTED_KINDS = Object.keys(DESCRIPTIONS) as readonly DocumentedKind[]

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

/**
 * One example signal per documented kind, judged by the schema rather than by
 * the compiler.
 *
 * The values are `unknown` for one reason, and it is the honest one: the entry
 * for `completed` is **not** a `ReaderSignal` today, because the schema's enum
 * does not have that member yet. Typing this table as `ReaderSignal` would mean
 * either leaving the kind out — which is the problem — or asserting a lie past
 * the compiler.
 *
 * Nothing is lost by it. Every value is run through `readerSignalSchema` before
 * it reaches a page, and the schema is the stricter of the two: it checks the
 * fields a kind must carry, which the type alone would not.
 */
const EXAMPLES: Readonly<Record<DocumentedKind, unknown>> = {
  viewed: { kind: "viewed", ...addressOf("loom.faq-list"), at: AT },
  dwelled: { kind: "dwelled", ...addressOf("loom.section"), ms: 11_000 },
  activated: { kind: "activated", ...addressOf("loom.action"), at: AT + 11_000 },
  disclosed: { kind: "disclosed", ...addressOf("loom.faq"), open: true, at: AT + 18_000 },
  /**
   * Addressed to the section, which is where a form would sit on a page that had
   * one. The shape is real; the scenario is the only invented thing here, and
   * the block that prints it says so.
   */
  completed: { kind: "completed", ...addressOf("loom.section"), at: AT + 19_000 },
}

/** What this page would show for a kind, whether or not the runtime has it. */
export const documentedExample = (kind: DocumentedKind): unknown => EXAMPLES[kind]

/**
 * Whether the tree at the top of this page contains a node of a given type.
 *
 * `completed`'s row says there is no form on the page above it, which is the one
 * sentence in `DESCRIPTIONS` that is a claim about the example rather than about
 * the runtime. This is how it is held to it: a docs run that adds a form to that
 * tree — which would be the right way to make the row demonstrable — is told
 * that the sentence beside it has stopped being true.
 */
export const subjectContains = (type: string): boolean =>
  firstOfType(buildSubject().root, type) !== undefined

/**
 * The example signal for a kind the runtime does have, having been through the
 * schema.
 *
 * The throw is the tripwire that survives this change: a kind in
 * `READER_SIGNAL_KINDS` with no sentence here, or with an example the schema
 * refuses, takes the build down naming itself. What it no longer does is fire
 * for `completed` — that one has its sentence already.
 */
const acceptedExample = (kind: ReaderSignalKind): ReaderSignal => {
  const checked = readerSignalSchema.safeParse(EXAMPLES[kind])

  if (!checked.success) {
    throw new Error(
      `loom: this page's example ${kind} signal is not a ${kind} signal — ${checked.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ")}`
    )
  }

  return checked.data
}

/**
 * The vocabulary, as the runtime publishes it today.
 *
 * Walks `READER_SIGNAL_KINDS`, so this is the runtime's list and never this
 * file's. A kind added to the runtime appears here on the day it is added, and
 * appears with prose because `DESCRIPTIONS` is allowed to run ahead.
 */
export const produceKinds = (): readonly KindRow[] =>
  READER_SIGNAL_KINDS.map((kind) => {
    const description = DESCRIPTIONS[kind]

    if (description === undefined) {
      throw new Error(
        `loom: the reader-signals page has no sentence for the "${kind}" signal — a kind was added to the runtime and this page cannot describe it`
      )
    }

    return { kind, ...description, example: JSON.stringify(acceptedExample(kind)) }
  })

/**
 * The half of an approved kind's meaning that a name cannot carry, which is the
 * half worth printing.
 *
 * Only a kind that is not in the runtime needs one: once it ships, what it does
 * is visible in the signals beside it.
 */
const NOT_MEANT: Partial<Readonly<Record<DocumentedKind, string>>> = {
  completed: "It does not mean a server accepted it. The broadcaster watches the page, never the reply — it can see that a form was let go with its constraints satisfied, and a kind that implied more than that would be measuring something it cannot see.",
}

export type ApprovedRow = {
  readonly kind: DocumentedKind
  readonly means: string
  readonly carries: string
  /** The sentence that stops a reader over-reading it. */
  readonly doesNotMean: string
}

/**
 * Kinds this page describes that the runtime does not accept yet.
 *
 * Today that is `completed`, and this is the whole mechanism by which the page
 * stops lying about the size of the vocabulary: the list above is the runtime's,
 * this one is the difference, and **this one empties itself**. On the day
 * `completed` joins `READER_SIGNAL_KINDS` it moves from here into `produceKinds`
 * and the block that prints it renders nothing at all — so the announcement is
 * not a paragraph anybody has to remember to delete.
 *
 * `live` is an argument so that the day can be rehearsed in a test rather than
 * waited for.
 */
export const produceApproved = (
  live: readonly string[] = READER_SIGNAL_KINDS
): readonly ApprovedRow[] =>
  DOCUMENTED_KINDS.filter((kind) => !live.includes(kind)).map((kind) => {
    const description = DESCRIPTIONS[kind]

    if (description === undefined) throw new Error(`loom: no sentence for the "${kind}" signal`)

    return {
      kind,
      means: description.means,
      carries: description.carries,
      doesNotMean: NOT_MEANT[kind] ?? "",
    }
  })


/**
 * The opening sentence's list of what a page may say, in plain words.
 *
 * Produced because it is an enumeration, and an enumeration in prose is a count
 * written out longhand. This one grew by a member on the day `completed` landed
 * and nobody edited a paragraph.
 */
export const producePlainly = (live: readonly string[] = READER_SIGNAL_KINDS): string => {
  const phrases = DOCUMENTED_KINDS.filter((kind) => live.includes(kind)).map(
    (kind) => DESCRIPTIONS[kind]?.plainly ?? ""
  )
  const last = phrases.at(-1)

  return phrases.length < 2 ? (last ?? "") : `${phrases.slice(0, -1).join(", ")} and ${last}`
}

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
    signals: READER_SIGNAL_KINDS.map((kind) => acceptedExample(kind)),
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
    input: { ...good, signals: [{ ...acceptedExample("activated"), kind: "purchased" }] },
  },
  {
    what: "A signal carrying the words a reader saw",
    input: { ...good, signals: [{ ...acceptedExample("activated"), label: "See the frames" }] },
  },
  {
    what: "A page that never said which revision",
    input: { treeId: good.treeId, sentAt: good.sentAt, signals: [acceptedExample("viewed")] },
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
