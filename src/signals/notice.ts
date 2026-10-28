import { everyMemberOf } from "../closed-set.js"

import type { ReaderSignalOptions } from "./broadcast.js"
import { DEFAULT_READER_SIGNAL_WINDOW_MS } from "./collect.js"
import { regionFloorOf } from "./region.js"
import {
  READER_SIGNAL_KINDS,
  type ReaderSignal,
  type ReaderSignalBatch,
  type ReaderSignalKind,
} from "./signal.js"

/**
 * What a published page reports, written for the people it reports about.
 *
 * Every other reading in this subsystem answers a deployment's question. This
 * is the one that answers a reader's, and it is the half of the argument that
 * had nothing behind it: Loom exists so that a change to a page can be
 * inspected, attributed and undone, and reader measurement that could not be
 * explained to the person being measured would contradict the whole premise.
 * Every competitor in this space collects more and explains less; the
 * explaining has to be something a deployment can publish, not a paragraph in
 * this repository.
 *
 * So this is a value rather than a page: a structure a deployment's privacy
 * page, portal or consent surface can print, derived from the configuration its
 * own pages are broadcast with.
 *
 * ## Why it is derived and not written
 *
 * A hand-written list of what a product collects is right on the day it is
 * written. This one cannot drift from the payload, and it is the type system
 * that holds it rather than a reviewer: {@link DELIVERY_FIELDS} and
 * {@link SIGNAL_FIELDS} are keyed by the schema's own fields through
 * `keyof Required<…>`, so **a field added to a batch without a sentence here
 * does not compile.** `notice.test.ts` holds the other end, which a type cannot
 * reach: it drives the real broadcaster over a real page and fails if a kind or
 * a field arrives that this does not name.
 *
 * ## It is a ceiling, and never an understatement
 *
 * The notice names everything the configuration permits. A deployment that
 * narrows `types` collects about fewer parts than this says, and one that turns
 * `within` off carries no ancestry on the three delegated kinds. Both are
 * published here as though they were on.
 *
 * That is deliberate in one direction only. A disclosure that overstates costs
 * a reader nothing and a deployment a little credit; one that understates is
 * the failure this module exists to make impossible. It also keeps the notice
 * stable: a ceiling changes when the vocabulary or the deployment's own three
 * numbers change, where a floor would have to be republished every time
 * somebody added a primitive type to a list.
 *
 * ## What it is not
 *
 * **Not a consent gate and not a banner.** There is nothing here to consent to:
 * a signal is anonymous and node-shaped, correlation is scoped to one page view
 * by a key that never persists, and neither is configurable
 * ([0146](../../decisions/0146-a-reader-signal-stays-anonymous-and-a-funnel-is-correlated-inside-one-page-view.md)).
 * A notice says what is collected; the rules say it cannot be about a person.
 * Per-reader identity is parked, and nothing here assumes it ever arrives or
 * builds toward it — what a gate would need is a recorded decision, which is a
 * different artefact from this one.
 *
 * **Not a reading.** It touches no store, no clock and no counter. Three
 * numbers come from the deployment's own configuration — the window a
 * delivery ripens at, the floor under a published country, and how often its
 * sweep runs (0320) — and everything else is the vocabulary.
 *
 * ## The voice
 *
 * Every sentence in this module is addressed to a reader of the page, because
 * that is who ends up reading them: *your address is never stored*, not *the
 * reader's address is never stored*. It is the one module in `src/signals/`
 * that speaks to anybody.
 */

/** What one field of a delivery is about. */
export type FieldSubject =
  /** The part of the page the observation is about. */
  | "part"
  /** Which page, which revision of it, and which form was served. */
  | "page"
  /** What was observed about the part — when, how long, open or closed. */
  | "observation"
  /**
   * The one visit the delivery belongs to.
   *
   * The narrowest scope anything here is correlated at, and the only one about
   * a visit rather than about a page (0146).
   */
  | "page-view"
  /** The delivery itself — when it was sent, and what it carried. */
  | "delivery"

/**
 * The closed set, for a surface grouping a notice by what its fields are about.
 *
 * **There is deliberately no member for the reader.** Every field of every
 * batch is about one of these five things, which is rule 1 stated as a type
 * rather than as a sentence: a field that needed a sixth member would be a
 * field about a person, and adding one is a decision record and not a
 * judgement call inside a pull request.
 */
export const FIELD_SUBJECTS: readonly FieldSubject[] = everyMemberOf<FieldSubject>()([
  "part",
  "page",
  "observation",
  "page-view",
  "delivery",
])

/** One line per subject, addressed to the reader, for a surface grouping a notice. */
export const describeFieldSubject = (subject: FieldSubject): string => {
  switch (subject) {
    case "part":
      return "which part of the page it is about"
    case "page":
      return "which page you were reading, and which version of it"
    case "observation":
      return "what was observed about that part"
    case "page-view":
      return "this one visit to this one page, and nothing outside it"
    case "delivery":
      return "the delivery itself"
  }
}

/** One field of a payload, and what it says. */
export type CollectedField = {
  /** The field's name in the delivery, which is what a reader comparing this to a payload sees. */
  readonly field: string
  /** What it is about. */
  readonly subject: FieldSubject
  /** One sentence, addressed to the reader. */
  readonly says: string
}

/** A field as the tables below hold it, before its name is read off the key. */
type FieldNote = Omit<CollectedField, "field">

/**
 * Every field of one shape, keyed by the shape's own fields.
 *
 * `Required` is what makes an optional field — `within`, `view`, `audience`,
 * `first` — as mandatory to describe as any other. A reader is owed a sentence
 * about a field that is sometimes there.
 */
type FieldsOf<Shape> = { readonly [Field in keyof Required<Shape>]: FieldNote }

const fieldsOf = (table: Readonly<Record<string, FieldNote>>): readonly CollectedField[] =>
  Object.entries(table).map(([field, note]) => ({ field, ...note }))

/** The three fields every kind carries: which kind it is, and which part it is about. */
const ADDRESS_FIELDS = {
  kind: {
    subject: "observation",
    says: "which of the five kinds of observation this is, and nothing beyond the five",
  },
  nodeId: {
    subject: "part",
    says: "which part of the page this is about, as the page's own name for that part",
  },
  type: {
    subject: "part",
    says: "what kind of part it is — a section, a card, a link — and never what it says",
  },
} as const satisfies Readonly<Record<string, FieldNote>>

const AT: FieldNote = {
  subject: "observation",
  says: "when it happened, to the millisecond, by your browser's clock",
}

const WITHIN: FieldNote = {
  subject: "part",
  says:
    "the parts of the page it happened inside, named the same way — so that a press can be counted" +
    " against the section it was in and not only against the button",
}

/**
 * Every kind's fields.
 *
 * Spread from {@link ADDRESS_FIELDS} rather than written five times, with the
 * per-kind annotation doing the checking: the three shared entries plus
 * whatever that kind adds has to be exactly the fields the schema gives it.
 */
export const SIGNAL_FIELDS: {
  readonly [Kind in ReaderSignalKind]: FieldsOf<Extract<ReaderSignal, { kind: Kind }>>
} = {
  viewed: { ...ADDRESS_FIELDS, at: AT },
  dwelled: {
    ...ADDRESS_FIELDS,
    ms: {
      subject: "observation",
      says: "how long it was on your screen since the last delivery, in milliseconds",
    },
  },
  activated: { ...ADDRESS_FIELDS, at: AT, within: WITHIN },
  disclosed: {
    ...ADDRESS_FIELDS,
    open: { subject: "observation", says: "whether it was opened or closed" },
    at: AT,
    within: WITHIN,
  },
  completed: { ...ADDRESS_FIELDS, at: AT, within: WITHIN },
}

/** What travels with a delivery, whatever observations are in it. */
export const DELIVERY_FIELDS: FieldsOf<ReaderSignalBatch> = {
  treeId: { subject: "page", says: "which page it was" },
  revision: {
    subject: "page",
    says: "which revision of that page you were served, so that an observation keeps its meaning after the page changes",
  },
  sentAt: { subject: "delivery", says: "when the delivery left your browser" },
  audience: {
    subject: "page",
    says:
      "which form of the page you were served, by the name the deployment gave that form — a name for a group," +
      " never a name for you, and nothing about why you matched it",
  },
  view: {
    subject: "page-view",
    says:
      "a random key that ties this delivery to the others from the same visit to this page, so that steps can be" +
      " counted in order; it is tied to nothing else, it is never stored beside the counters, and it is gone when" +
      " the delivery is",
  },
  first: {
    subject: "page-view",
    says: "whether this was the opening delivery of the visit, which is how arrivals are counted once rather than once per delivery",
  },
  signals: { subject: "delivery", says: "the observations themselves" },
}

/** Something a reader signal never carries, whatever a deployment configures. */
export type Refusal =
  /**
   * No identifier for a person or a device, and nothing standing in for one.
   *
   * The first clause of rule 1. The second half of the sentence is the half
   * that matters to somebody who has read a privacy policy before: an
   * identifier nobody set is still an identifier.
   */
  | "no-identifier"
  /** No signature derived from a device, a browser or its settings. */
  | "no-fingerprint"
  /** Nothing the page said to you and nothing you said to it. */
  | "no-content"
  /** No cursor, no scroll trace, no recording. */
  | "no-pointer-path"
  /** Nothing that joins one visit to another. */
  | "no-stitching"
  /** Nothing derived from your address outlives the request it arrived on. */
  | "no-address"

/** The closed set, for a surface listing what is refused. */
export const REFUSALS: readonly Refusal[] = everyMemberOf<Refusal>()([
  "no-identifier",
  "no-fingerprint",
  "no-content",
  "no-pointer-path",
  "no-stitching",
  "no-address",
])

/** One line per refusal, addressed to the reader. */
export const describeRefusal = (refusal: Refusal): string => {
  switch (refusal) {
    case "no-identifier":
      return "nothing that identifies you: no account, no visitor id, no device id, and nothing derived from your browser to stand in for one"
    case "no-fingerprint":
      return "nothing about your device, your browser or your settings, and so nothing that could be combined into a signature for you"
    case "no-content":
      return "nothing the page showed you and nothing you typed into it: no text, no link target, no form value"
    case "no-pointer-path":
      return "no cursor positions, no scroll trace, and no recording of your session"
    case "no-stitching":
      return "nothing that joins this visit to another one, here or on any other page, so there is no history of you to hold"
    case "no-address":
      return "nothing derived from the address your request arrived from outlives the request, and the address itself is never stored"
  }
}

/** Where a deployment counts its readers from, or that it does not. */
export type RegionNotice = {
  /**
   * The page views a country needs before it is published at all, or `null`
   * where no country is read.
   *
   * `null` is *nothing about where you are is read*, which is a different
   * sentence from *your country is counted and will not be published until
   * enough others share it* — and the difference is the whole of what a floor
   * is for. A country with a handful of views in it is a person (§7).
   */
  readonly floor: number | null
}

/** One or two sentences about where readers are counted from, addressed to the reader. */
export const describeRegionNotice = (notice: RegionNotice): string =>
  notice.floor === null
    ? "nothing about where you are is read, not even your country"
    : `the country your request arrives from is counted, and nothing finer than the country; a country is published only once at least ${notice.floor} visits are counted in it, and the address it was read from is never stored`

/**
 * How often the deployment's own sweep runs, or that it has not said.
 *
 * The one thing a reader of {@link CollectionNotice.bufferMs} could not find
 * out. `bufferMs` is the age at which a delivery becomes *ripe* — ready to be
 * counted into the totals and deleted — and nothing in `src/signals/` deletes
 * it: a host calls {@link collectReaderSignals} from a cron, a deploy hook or
 * by hand (0146, 0158). So a deployment that never scheduled the sweep keeps
 * every delivery for ever while its notice names an hour, and *a delivery is
 * kept until it is 60 minutes old* was read by somebody with no way of hearing
 * *…or indefinitely*.
 *
 * The deployment is the only party that knows how often it sweeps, so it states
 * it — the shape `CollectionSchedule` already takes for the operator's half of
 * the same fact
 * ([0274](../../decisions/0274-a-page-view-row-says-when-the-fold-last-touched-it-and-a-stall-is-judged-against-a-schedule-the-deployment-hands-in.md)).
 * A framework that guessed an interval would publish a ceiling nobody promised.
 *
 * **Two states rather than a nullable number**, because the ceiling has to be
 * unreachable where no schedule was stated: a surface cannot print *gone within
 * 70 minutes* on a deployment that promised nothing, which is the one way this
 * field could make a notice overstate.
 */
export type SweepNotice =
  | {
      readonly state: "stated"
      /** The longest the deployment lets pass between sweeps, as it stated it. */
      readonly everyMs: number
      /**
       * The longest a delivery can live: its ripeness window plus one sweep
       * interval.
       *
       * The two add because a delivery is not counted until it ripens and then
       * not until the next sweep runs, which is the arithmetic
       * `CollectionSchedule.foldsWithinMs` spells out for the operator's half
       * of this question (0274) — so **this is the number to hand the stall
       * check**, and a deployment states the interval once rather than keeping
       * a reader's ceiling and an operator's threshold in step by hand.
       */
      readonly goneWithinMs: number
    }
  /** Nothing was stated, so nothing here says when a ripe delivery actually goes. */
  | { readonly state: "unstated" }

/** What a published page reports, and what it refuses to. */
export type CollectionNotice = {
  /** The kinds this configuration broadcasts, in the vocabulary's order. */
  readonly collects: readonly CollectedKind[]
  /** What travels with every delivery. */
  readonly delivery: readonly CollectedField[]
  /** What is never collected, whatever else is configured. */
  readonly refuses: readonly Refusal[]
  /** Where readers are counted from, or that they are not. */
  readonly region: RegionNotice
  /**
   * How long a delivery itself lives before it is counted and dropped, in
   * milliseconds.
   *
   * The deployment's own number (`collect.ts`), and the honest bound on the
   * life of the page-view key, since the key exists in the buffer and nowhere
   * else. **The framework cannot promise the moment it is swept**, because a
   * host schedules the sweep: this is the age at which a delivery becomes ripe,
   * not a guarantee about when the next run happens. What the deployment itself
   * promises about that is {@link CollectionNotice.sweep}, and
   * {@link describeBuffer} says the two together.
   */
  readonly bufferMs: number
  /**
   * How often this deployment sweeps a ripe delivery away, where it has stated
   * it.
   *
   * The half of retention that is not the framework's to promise, and the half
   * a reader of `bufferMs` alone would assume. {@link describeBuffer} takes the
   * two together for that reason: an age with no sweep beside it is a sentence
   * that reads like a deletion and is not one.
   */
  readonly sweep: SweepNotice
}

/** One kind of observation, with the fields it carries. */
export type CollectedKind = {
  readonly kind: ReaderSignalKind
  /** What the page observed, addressed to the reader. */
  readonly observes: string
  /** Every field that kind carries, including the ones it sometimes omits. */
  readonly carries: readonly CollectedField[]
}

/** What each kind observes, in the reader's own terms rather than the browser's. */
const OBSERVES: Readonly<Record<ReaderSignalKind, string>> = {
  viewed: "that a part of the page came onto your screen",
  dwelled: "how long a part of the page stayed on your screen",
  activated: "that you used a link, a button or a field, and which part of the page it was in",
  disclosed: "that you opened or closed a part of the page",
  completed: "that a form you filled in was submitted — that it left your browser, and never what was in it",
}

/**
 * A length of time as a notice says it.
 *
 * Minutes above a minute and seconds below it, because the one number here a
 * deployment can set low is the buffer and `collect.ts` floors it at a minute
 * — so a notice reading *0 minutes* would be reporting a window the collector
 * would refuse to run on.
 */
const inWords = (ms: number): string => {
  if (ms < 60_000) {
    const seconds = Math.round(ms / 1000)
    return seconds === 1 ? "a second" : `${seconds} seconds`
  }

  const minutes = Math.round(ms / 60_000)
  return minutes === 1 ? "a minute" : `${minutes} minutes`
}

/**
 * Both halves of how long a delivery lives: the age it ripens at, and how often
 * the deployment takes the ripe ones away.
 *
 * A `Pick` of the notice rather than two arguments, so that the sentence cannot
 * be built from one of them. The age alone reads as a deletion and is not one.
 */
export type DeliveryRetention = Pick<CollectionNotice, "bufferMs" | "sweep">

/**
 * How long a delivery lives, addressed to the reader.
 *
 * It takes the retention whole, because the age is the half the framework knows
 * and the sweep is the half it cannot promise, and a notice that published the
 * first without the second said *a delivery is kept until it is 60 minutes old*
 * to a reader who had no way of hearing *…or for ever, if nobody runs the
 * sweep*. Where a schedule was stated the sentence ends on a ceiling a reader
 * can hold the deployment to; where none was, it says that in as many words
 * rather than leaving the age to be read as a promise.
 */
export const describeBuffer = (retention: DeliveryRetention): string => {
  const ripens = `a delivery is kept until it is ${inWords(retention.bufferMs)} old, and this deployment's own sweep is what then counts it into totals and deletes it`
  const totals = "the totals it leaves behind have nobody in them, and they are kept"

  return retention.sweep.state === "stated"
    ? `${ripens}; that sweep runs at least every ${inWords(retention.sweep.everyMs)}, so a delivery is gone within ${inWords(retention.sweep.goneWithinMs)} of arriving — the key tying one visit together exists until then and nowhere else; ${totals}`
    : `${ripens}; this deployment has not said how often that sweep runs, so nothing here promises when a ripe delivery actually goes — the key tying one visit together exists until the sweep takes it and nowhere else; ${totals}`
}

/**
 * What a stated interval becomes on a notice.
 *
 * The ceiling is derived here and nowhere else, so that a surface cannot print
 * a number that disagrees with the age beside it: it is the ripeness window
 * plus one sweep, which is the same addition the stall check asks a deployment
 * for in one number (0274).
 *
 * **Anything that is not a positive, finite interval is `unstated`** rather
 * than an error or a nought. A nought would publish *gone within 60 minutes* on
 * a deployment that sweeps when somebody remembers to, and this module's one
 * standing rule is that it may overstate what is collected and may never
 * overstate what is deleted.
 */
const sweepNoticeOf = (everyMs: number | undefined, bufferMs: number): SweepNotice =>
  everyMs === undefined || !Number.isFinite(everyMs) || everyMs <= 0
    ? { state: "unstated" }
    : { state: "stated", everyMs, goneWithinMs: bufferMs + everyMs }

/** The configuration a notice is of. */
export type NoticeRequest = {
  /**
   * The options the page is broadcast with — the same object, so that a notice
   * and the page it is about cannot disagree about which kinds are reported.
   *
   * Only `kinds` is read. `types` and `within` narrow collection below what the
   * notice says, which is the ceiling rule above.
   */
  readonly page?: Pick<ReaderSignalOptions, "kinds">
  /**
   * The window the deployment collects on, from its own `CollectionRequest`
   * (`collect.ts`). The default when absent.
   *
   * Reported as given rather than clamped: `collect.ts` is what refuses a
   * window below its minimum, and a notice that silently reported a different
   * number from the one a deployment configured would be a second rule about
   * one setting.
   */
  readonly windowMs?: number
  /**
   * The region counting this deployment's intake does, where it does any.
   *
   * Absent is *no country is read*, which is the default: reading one is
   * something an intake is configured to do (§7). A floor below the published
   * minimum is raised to it, by the same helper the region map itself uses.
   */
  readonly region?: { readonly floor?: number }
  /**
   * How often this deployment's sweep runs, where it has stated it.
   *
   * Absent is *nothing is stated*, which is the honest default: nothing in this
   * subsystem schedules a sweep, so a notice that assumed one would publish a
   * ceiling no deployment promised. A value that is not a positive, finite
   * number of milliseconds is read the same way — the notice may always
   * promise a reader less than the deployment knows and may never promise more,
   * and the operator-facing half, where a value that could not be read is said
   * out loud, is a deployment's own settings (0317).
   */
  readonly sweep?: { readonly everyMs: number }
}

/**
 * What a page broadcast with these options reports, as a deployment may publish
 * it.
 *
 * Pure, and allocation-per-call: no store, no clock, no DOM.
 *
 * The kinds come out in the vocabulary's order and each appears once, whatever
 * order a configuration names them in and however often — a notice is read by
 * somebody who did not write the configuration, and *dwelled, dwelled, viewed*
 * is a leak of how the options were typed rather than a fact about the page.
 */
export const collectionNoticeOf = (request: NoticeRequest = {}): CollectionNotice => {
  const asked = request.page?.kinds
  const bufferMs = request.windowMs ?? DEFAULT_READER_SIGNAL_WINDOW_MS

  const collects = READER_SIGNAL_KINDS.filter(
    (kind) => asked === undefined || asked.includes(kind)
  ).map(
    (kind): CollectedKind => ({
      kind,
      observes: OBSERVES[kind],
      carries: fieldsOf(SIGNAL_FIELDS[kind]),
    })
  )

  return {
    collects,
    delivery: fieldsOf(DELIVERY_FIELDS),
    refuses: REFUSALS,
    region: { floor: request.region === undefined ? null : regionFloorOf(request.region.floor) },
    bufferMs,
    sweep: sweepNoticeOf(request.sweep?.everyMs, bufferMs),
  }
}
