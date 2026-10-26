import type { LoomNode, NodeId, PrimitiveType } from "@jam-overture/loom"
import {
  READER_SIGNAL_KINDS,
  mintViewKey,
  parseReaderSignalBatch,
  readerSignalSchema,
  type CollectedField,
  type ReaderSignal,
  type ReaderSignalBatch,
  type ReaderSignalKind,
} from "@jam-overture/loom/signals"

import { docsExamples } from "@/app/(docs)/_lib/examples/catalogue"

import { beyondTheAddress } from "./notice"

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
 * A kind this page has prose for, which was once not the same list as the
 * runtime's.
 *
 * Written when the vocabulary was closed and not finished — `completed` was
 * approved and not built — so that the page could carry its sentences before
 * the runtime carried the kind. The type was designed to **erase itself** on
 * the day it landed: once `ReaderSignalKind` included `completed`, this union
 * would be `ReaderSignalKind` and every table below would still have exactly
 * the right keys.
 *
 * **It landed, and the erasure worked.** `READER_SIGNAL_KINDS` has five members
 * and this union is now `ReaderSignalKind` exactly. Nothing had to be edited
 * for that, which is the whole of why it was written this way, and it is kept
 * as the shape to reach for the next time a page is ready before a runtime is:
 * a union that dissolves beats a list that has to be remembered.
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
  /**
   * The fields this kind carries beyond the address every kind carries, read off
   * the schema.
   *
   * It was a sentence somebody typed, and by 26 October three of the five were
   * wrong: `within` landed on the three delegated kinds with 0167 on
   * 17 September and no row mentioned it, and `disclosed` named `open` without
   * the two fields beside it.
   * `beyondTheAddress()` reads the runtime's own table, so a field added to a
   * kind arrives in this row on the commit that adds it.
   */
  readonly carries: readonly CollectedField[]
  /** The same thing in the words the page opens with, before any of them are named. */
  readonly plainly: string
  /** The sentence that stops a reader over-reading the name. */
  readonly doesNotMean: string
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
    {
      readonly means: string
      readonly here: string
      /**
       * The field a kind will carry, in prose, **for a kind the runtime has not
       * got yet and only for that**.
       *
       * There is nothing to read for such a kind: `SIGNAL_FIELDS` is keyed by
       * `ReaderSignalKind`, so a kind that is agreed on and not built has no
       * entry in it, and a page that wants to describe one ahead of time has to
       * write the sentence. That is this field, and it is **optional** because
       * every kind the runtime has reads its fields off the schema instead.
       *
       * It held five strings until 26 October and nothing read three of them
       * correctly. They are gone; a future pending kind brings one back for as
       * long as it is pending, and loses it on the day the schema can answer
       * for it.
       */
      readonly carries?: string
      readonly plainly: string
      /**
       * The gap between the name and the fact, which every one of these has.
       *
       * **Required, for every kind, whether the runtime has it or not.** It used
       * to be a partial table printed only beside a kind that was agreed on and
       * not built, on the reasoning that once a kind ships what it does is
       * visible in the signals beside it. That reasoning is wrong and
       * `Loom signals` filed it on the day `completed` landed: a signal beside
       * `completed` shows a form that was let go, and shows nothing at all about
       * the forms this seam cannot see, so the row left behind said only what the
       * kind *does* mean to a reader about to build a conversion report on it.
       *
       * The same argument holds for the other four, which is why this is a field
       * rather than a second table. Every one of these names is shorter than the
       * fact it stands for — a name has to be — and in each case the shortfall is
       * a mechanism in the broadcaster rather than a nuance: a press is reported
       * without its effect, a disclosure without who caused it, time on screen
       * without attention. `gaps.test.tsx` makes the broadcaster do each of those
       * and reads the signals back, so these sentences are held to the code
       * rather than to this file's belief about it.
       */
      readonly doesNotMean: string
    }
  >
> = {
  viewed: {
    means: "It came into view. Once, the first time, for the life of the page.",
    here: "The reader scrolled far enough for the questions band to be on screen.",
    plainly: "which part someone looked at",
    doesNotMean:
      "It does not mean anybody read it. Enough of the element was on screen, in a tab that was in front — so a reader who scrolled straight past is counted exactly like one who stopped, and a node sitting on screen in a tab nobody is looking at is not counted at all.",
  },
  dwelled: {
    means: "It was on screen this long, since the last batch went out.",
    here: "They stayed on the first section for eleven seconds before scrolling.",
    plainly: "what they stayed on",
    doesNotMean:
      "It does not mean time spent reading. A tab nobody has in front of them accrues nothing, which is as close to attention as a browser gets; a window left open behind another window goes on counting.",
  },
  activated: {
    means: "A reader used a link, a button or a field inside it.",
    here: "They pressed “See the frames”.",
    plainly: "what they pressed",
    doesNotMean:
      "It does not mean the press did anything. The page is watched and the outcome is not, so a control whose handler cancelled it, failed, or did nothing at all reports the same signal as one that worked.",
  },
  disclosed: {
    means: "A region was opened, or closed.",
    here: "They opened “How long does a frame take?”.",
    plainly: "what they opened",
    doesNotMean:
      "It does not mean a reader opened it. It is read off the region's own state changing, and your own code changing it — a link that arrives with an answer already expanded, an “open all” — looks identical to a person doing it.",
  },
  completed: {
    means: "A form inside it was submitted, and the browser let it go.",
    here: "Nothing on the page above can produce one: there is no form in it.",
    plainly: "what they finished",
    doesNotMean:
      "It does not mean a server accepted it, and it does not mean every submission is counted. The broadcaster watches the page and never the reply: it reports a form the page let go with its constraints satisfied, so a form posted with fetch — which is most forms in a client-rendered app — reports nothing at all.",
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
const addressOf = (type: string): SignalAddress => {
  const [found] = chainTo(type)

  if (found === undefined) {
    throw new Error(
      `loom: the reader-signals example tree has no "${type}" node, so this page cannot show a signal about one`
    )
  }

  return found
}

/**
 * The addressed nodes above the first node of a type, nearest first.
 *
 * What the broadcaster puts under `within` on the three delegated kinds, read
 * off the same tree the signal is addressed to. It is not a second walk: the
 * chain is found once and the address is its head, so the ancestry a signal
 * prints cannot belong to a different node from the one it names.
 *
 * `ancestryOf` in the broadcaster includes the root when the root is addressed
 * and skips anything it cannot read an address off, which is a slot here. This
 * is the same rule against the tree rather than against the document.
 */
const ancestryOf = (type: string): readonly SignalAddress[] => chainTo(type).slice(1)

/**
 * The first node of a type and every addressed node above it, nearest first.
 *
 * Empty where there is none, which `addressOf` turns into a throw naming the
 * type — a page whose example signals point at nodes that are not on the tree
 * above them is the failure 0136 exists to prevent.
 */
const chainTo = (type: string): readonly SignalAddress[] => firstOfType(buildSubject().root, type) ?? []

const firstOfType = (node: LoomNode, type: string): readonly SignalAddress[] | undefined => {
  if (node.kind === "text") return undefined

  const here: readonly SignalAddress[] =
    node.kind === "element" ? [{ nodeId: node.id, type: node.type }] : []

  if (node.kind === "element" && node.type === type) return here

  /** A slot is a node holding children, so both kinds are walked the same way. */
  const below = node.children
    .map((child) => firstOfType(child, type))
    .find((found) => found !== undefined)

  return below === undefined ? undefined : [...below, ...here]
}

/** One addressed node as a signal names it: an id and a type, and nothing else. */
type SignalAddress = { readonly nodeId: NodeId; readonly type: PrimitiveType }

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
  activated: {
    kind: "activated",
    ...addressOf("loom.action"),
    at: AT + 11_000,
    within: ancestryOf("loom.action"),
  },
  disclosed: {
    kind: "disclosed",
    ...addressOf("loom.faq"),
    open: true,
    at: AT + 18_000,
    within: ancestryOf("loom.faq"),
  },
  /**
   * Addressed to the section, which is where a form would sit on a page that had
   * one. The shape is real; the scenario is the only invented thing here, and
   * the block that prints it says so.
   */
  completed: {
    kind: "completed",
    ...addressOf("loom.section"),
    at: AT + 19_000,
    within: ancestryOf("loom.section"),
  },
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
export const produceKinds = (): readonly KindRow[] => {
  const fields = beyondTheAddress()

  return READER_SIGNAL_KINDS.map((kind) => {
    const description = DESCRIPTIONS[kind]

    if (description === undefined) {
      throw new Error(
        `loom: the reader-signals page has no sentence for the "${kind}" signal — a kind was added to the runtime and this page cannot describe it`
      )
    }

    return {
      ...description,
      kind,
      carries: fields[kind] ?? [],
      example: JSON.stringify(acceptedExample(kind)),
    }
  })
}

export type ApprovedRow = {
  readonly kind: DocumentedKind
  readonly means: string
  /**
   * The field it will carry, written, or nothing.
   *
   * The one hand-written field list left on this page, and it is here because a
   * kind the runtime has not got has no schema entry to read. Absent today: the
   * runtime has all five, so nothing is on this list at all.
   */
  readonly carries?: string
  /**
   * The sentence that stops a reader over-reading it, from the same field the
   * live rows read.
   *
   * There used to be a second table here holding one sentence for one kind, and
   * the two lists each printed a different amount about the same thing: a kind
   * that was agreed on and not built got its caveat, and the moment it shipped
   * the caveat went with the announcement. Reading it off `DESCRIPTIONS` is what
   * makes that impossible — the sentence belongs to the kind rather than to the
   * list the kind happens to be on this week, so moving between the lists is the
   * only thing that happens on the day a kind lands.
   */
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
      ...(description.carries === undefined ? {} : { carries: description.carries }),
      doesNotMean: description.doesNotMean,
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
 * The page view this delivery belongs to, minted by the runtime's own minter
 * from a byte source that counts.
 *
 * **The block above it was not a whole delivery until 26 October.** A real
 * broadcast mints a view key once and puts it on every batch, and marks the
 * opening one `first` — both since 0146 — and this page printed neither, so the
 * one place a reader could see what arrives at their endpoint was missing the
 * two fields the funnel readings are built on. The notice further down the page
 * names them, which is how it was noticed.
 *
 * `mintViewKey` takes its randomness as an argument for exactly this, and the
 * bytes count rather than being random for the same reason {@link AT} is frozen:
 * a page whose bytes differ per build is a failed prerender check rather than a
 * documentation improvement. The key is a real key of the real width, and the
 * schema's pattern is what judges it.
 */
const DEMONSTRATED_VIEW = mintViewKey((count) =>
  Uint8Array.from({ length: count }, (_unused, index) => (index * 17 + 3) % 256)
)

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
    view: DEMONSTRATED_VIEW,
    first: true,
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
