// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it } from "vitest"

import {
  broadcastReaderSignals,
  type ObserveVisibility,
  type ReaderSignalBroadcast,
  type ReaderSignalOptions,
  type VisibilityEntry,
} from "./broadcast.js"
import { DEFAULT_READER_SIGNAL_WINDOW_MS, MIN_READER_SIGNAL_WINDOW_MS } from "./collect.js"
import {
  collectionNoticeOf,
  describeBuffer,
  describeFieldSubject,
  describeRefusal,
  describeRegionNotice,
  DELIVERY_FIELDS,
  FIELD_SUBJECTS,
  REFUSALS,
  SIGNAL_FIELDS,
  type DeliveryRetention,
  type Refusal,
} from "./notice.js"
import { DEFAULT_REGION_FLOOR } from "./region.js"
import {
  READER_SIGNAL_KINDS,
  readerSignalBatchSchema,
  readerSignalSchema,
  type ReaderSignalBatch,
  type ReaderSignalKind,
} from "./signal.js"

/**
 * A page with one of everything a reader can do to it, so that the five kinds
 * are all reachable from one fixture: a link to activate, a details element to
 * disclose, and a form to let go.
 */
const PAGE = `
  <main data-loom-node="n_1" data-loom-type="loom.page" data-loom-tree="t_1" data-loom-revision="4">
    <section data-loom-node="n_2" data-loom-type="loom.section">
      <article data-loom-node="n_3" data-loom-type="loom.card">
        <a href="/kit"><span id="link-text">Shop the kit</span></a>
      </article>
      <details data-loom-node="n_4" data-loom-type="loom.faq">
        <summary><span>Is a 3L jacket warmer?</span></summary>
        <p>No.</p>
      </details>
      <form data-loom-node="n_5" data-loom-type="loom.form" id="ask">
        <input name="email" />
        <button id="send" type="submit">Send</button>
      </form>
    </section>
  </main>
`

let root: HTMLElement
let clock: number
let broadcast: ReaderSignalBroadcast | undefined
let reportVisibility: (entries: readonly VisibilityEntry[]) => void

const fakeVisibility: ObserveVisibility = (onChange) => {
  reportVisibility = onChange
  return { observe: () => undefined, disconnect: () => undefined }
}

const start = (options: ReaderSignalOptions = {}): ReaderSignalBatch[] => {
  const batches: ReaderSignalBatch[] = []
  const started = broadcastReaderSignals(root, {
    observeVisibility: fakeVisibility,
    now: () => clock,
    send: (batch) => void batches.push(batch),
    ...options,
  })
  if (!started.ok) throw new Error(started.error.detail)
  broadcast = started.value
  return batches
}

const byId = (nodeId: string): Element => {
  const element = root.querySelector(`[data-loom-node="${nodeId}"]`)
  if (element === null) throw new Error(`no ${nodeId}`)
  return element
}

/** Everything a reader can do to `PAGE`, which is one of each of the five kinds. */
const readThePage = async (): Promise<void> => {
  reportVisibility([{ target: byId("n_2"), visible: true }])
  clock = 4_000
  ;(document.getElementById("link-text") as HTMLElement).click()
  const details = byId("n_4") as HTMLDetailsElement
  details.open = true
  details.dispatchEvent(new Event("toggle"))
  ;(document.getElementById("ask") as HTMLFormElement).dispatchEvent(
    new Event("submit", { bubbles: true, cancelable: true })
  )
  await Promise.resolve()
  broadcast?.flush()
}

beforeEach(() => {
  document.body.innerHTML = PAGE
  root = document.querySelector("main") as HTMLElement
  clock = 1_000
})

afterEach(() => {
  broadcast?.stop()
  broadcast = undefined
  document.body.innerHTML = ""
})

/** The fields the notice names for a kind, and for a delivery. */
const namedFor = (kind: ReaderSignalKind): readonly string[] => Object.keys(SIGNAL_FIELDS[kind])
const namedOnDelivery = Object.keys(DELIVERY_FIELDS)

/**
 * Every field a page actually sent that the notice does not name.
 *
 * The tables are passed in rather than read, so that the same walk can be run
 * against a doctored table — which is what stops the empty result below from
 * being the result of a walk that stopped looking.
 */
const unnamed = (
  batches: readonly ReaderSignalBatch[],
  delivery: readonly string[],
  signal: (kind: ReaderSignalKind) => readonly string[]
): readonly string[] => [
  ...new Set(
    batches.flatMap((batch) => [
      ...Object.keys(batch).filter((field) => !delivery.includes(field)),
      ...batch.signals.flatMap((one) =>
        Object.keys(one).filter((field) => !signal(one.kind).includes(field))
      ),
    ])
  ),
]

describe("collectionNoticeOf", () => {
  it("names every kind of the closed vocabulary where a configuration names none", () => {
    expect(collectionNoticeOf().collects.map((collected) => collected.kind)).toEqual([
      ...READER_SIGNAL_KINDS,
    ])
  })

  /**
   * A notice is read by somebody who did not write the configuration, so the
   * order is the vocabulary's and a kind asked for twice is one entry.
   */
  it("names the kinds a configuration asks for, once each, in the vocabulary's order", () => {
    const notice = collectionNoticeOf({ page: { kinds: ["dwelled", "viewed", "dwelled"] } })

    expect(notice.collects.map((collected) => collected.kind)).toEqual(["viewed", "dwelled"])
  })

  /** A page that reports nothing has a notice that says so, rather than no notice. */
  it("collects nothing where the configuration asks for no kinds", () => {
    const notice = collectionNoticeOf({ page: { kinds: [] } })

    expect(notice.collects).toEqual([])
    expect(notice.refuses).toEqual(REFUSALS)
    expect(notice.delivery.map((field) => field.field)).toEqual(namedOnDelivery)
  })

  it("gives every kind its own sentence and the fields that kind carries", () => {
    const notice = collectionNoticeOf()

    for (const collected of notice.collects) {
      expect(collected.observes.length).toBeGreaterThan(0)
      expect(collected.carries.map((field) => field.field)).toEqual(namedFor(collected.kind))
      expect(collected.carries.every((field) => FIELD_SUBJECTS.includes(field.subject))).toBe(true)
    }

    expect(new Set(notice.collects.map((collected) => collected.observes)).size).toBe(
      READER_SIGNAL_KINDS.length
    )
  })

  it("reports the deployment's own window, and the default where it has none", () => {
    expect(collectionNoticeOf().bufferMs).toBe(DEFAULT_READER_SIGNAL_WINDOW_MS)
    expect(collectionNoticeOf({ windowMs: 15 * 60_000 }).bufferMs).toBe(15 * 60_000)
  })

  describe("where readers are counted from", () => {
    it("reads no country at all where no region counting was offered", () => {
      expect(collectionNoticeOf().region.floor).toBeNull()
      expect(describeRegionNotice({ floor: null })).toContain("nothing about where you are is read")
    })

    /** The floor is the published one, by the helper the region map itself uses. */
    it("raises a floor below the published minimum and keeps one above it", () => {
      expect(collectionNoticeOf({ region: {} }).region.floor).toBe(DEFAULT_REGION_FLOOR)
      expect(collectionNoticeOf({ region: { floor: 2 } }).region.floor).toBe(DEFAULT_REGION_FLOOR)
      expect(collectionNoticeOf({ region: { floor: 500 } }).region.floor).toBe(500)
    })

    it("says the floor, the coarseness and the address in one sentence", () => {
      const sentence = describeRegionNotice({ floor: 40 })

      expect(sentence).toContain("40 visits")
      expect(sentence).toContain("nothing finer than the country")
      expect(sentence).toContain("never stored")
    })
  })

  describe("how long a delivery lives", () => {
    /** No schedule stated, which is every deployment that has not set one. */
    const unswept = (bufferMs: number): DeliveryRetention => ({
      bufferMs,
      sweep: { state: "unstated" },
    })

    it("says the deployment's window in minutes, and who sweeps it", () => {
      const sentence = describeBuffer(unswept(DEFAULT_READER_SIGNAL_WINDOW_MS))

      expect(sentence).toContain("60 minutes")
      expect(sentence).toContain("this deployment's own sweep")
    })

    /**
     * The collector's own floor, which is the lowest window a notice can
     * honestly be of — and the one place a figure in minutes would round to
     * nought if it were written the obvious way.
     */
    it("says a minute rather than 1 minutes at the collector's floor", () => {
      expect(describeBuffer(unswept(MIN_READER_SIGNAL_WINDOW_MS))).toContain("a minute old")
    })

    it("falls back to seconds below a minute, where a notice would otherwise read nought", () => {
      expect(describeBuffer(unswept(30_000))).toContain("30 seconds")
      expect(describeBuffer(unswept(1_000))).toContain("a second old")
    })

    /**
     * The sentence this module exists for, in the state most deployments are
     * in: the age is a ripeness window and **nothing here promises when the
     * delivery actually goes**, because nothing in `src/signals/` deletes it.
     * A notice that stopped at the age would be read as a deletion it cannot
     * promise.
     */
    it("says that nothing promises a deletion where no schedule was stated", () => {
      const sentence = describeBuffer(unswept(DEFAULT_READER_SIGNAL_WINDOW_MS))

      expect(sentence).toContain("has not said how often that sweep runs")
      expect(sentence).toContain("nothing here promises when a ripe delivery actually goes")
      expect(sentence).not.toContain("gone within")
    })

    it("ends on a ceiling a reader can hold the deployment to where one was stated", () => {
      const sentence = describeBuffer({
        bufferMs: DEFAULT_READER_SIGNAL_WINDOW_MS,
        sweep: { state: "stated", everyMs: 10 * 60_000, goneWithinMs: 70 * 60_000 },
      })

      expect(sentence).toContain("60 minutes old")
      expect(sentence).toContain("at least every 10 minutes")
      expect(sentence).toContain("gone within 70 minutes of arriving")
      expect(sentence).not.toContain("has not said")
    })
  })

  describe("how often the deployment sweeps", () => {
    it("states nothing where the deployment stated nothing", () => {
      expect(collectionNoticeOf().sweep).toEqual({ state: "unstated" })
    })

    /**
     * The ceiling is the ripeness window **plus one sweep**, because a delivery
     * is not counted until it ripens and then not until the next run — the
     * same addition the stall check asks a deployment for in one number (0274).
     *
     * The two addends are deliberately different lengths here. Fifteen and five
     * make twenty; the window counted twice would make thirty and the interval
     * counted twice ten, and all three are plausible-looking minute figures in
     * a sentence nobody would check (0158).
     */
    it("adds the deployment's own window once, and the interval once", () => {
      expect(
        collectionNoticeOf({ windowMs: 15 * 60_000, sweep: { everyMs: 5 * 60_000 } }).sweep
      ).toEqual({ state: "stated", everyMs: 5 * 60_000, goneWithinMs: 20 * 60_000 })
    })

    /** The default window is what the ceiling is over where a deployment set none. */
    it("adds the interval to the default window where the deployment set none", () => {
      expect(collectionNoticeOf({ sweep: { everyMs: 10 * 60_000 } }).sweep).toEqual({
        state: "stated",
        everyMs: 10 * 60_000,
        goneWithinMs: DEFAULT_READER_SIGNAL_WINDOW_MS + 10 * 60_000,
      })
    })

    /**
     * Nothing accumulates between calls. A ceiling that grew on the second read
     * of one configuration is the one way this figure could double-count, and
     * it is the way a ceiling held on a module-level total would.
     */
    it("gives one configuration the same ceiling however often it is asked", () => {
      const request = { windowMs: 15 * 60_000, sweep: { everyMs: 5 * 60_000 } }

      expect(collectionNoticeOf(request).sweep).toEqual(collectionNoticeOf(request).sweep)
    })

    /**
     * A notice may promise a reader less than the deployment knows and may
     * never promise more. A nought would publish *gone within 60 minutes* on a
     * deployment that sweeps when somebody remembers to.
     */
    it("states nothing for an interval that is not a positive, finite length", () => {
      for (const everyMs of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
        expect(collectionNoticeOf({ sweep: { everyMs } }).sweep).toEqual({ state: "unstated" })
      }
    })
  })

  /**
   * Five subjects and no sixth, which is rule 1 as a type: a field about a
   * person could not be described without a member for one.
   */
  it("gives every subject a sentence of its own, and has none for the reader", () => {
    const sentences = FIELD_SUBJECTS.map(describeFieldSubject)

    expect(FIELD_SUBJECTS).toHaveLength(5)
    expect(new Set(sentences).size).toBe(FIELD_SUBJECTS.length)
    expect(sentences.some((sentence) => sentence.includes("you were reading"))).toBe(true)
  })

  it("gives every refusal a sentence of its own", () => {
    const sentences = REFUSALS.map(describeRefusal)

    expect(new Set(sentences).size).toBe(REFUSALS.length)
    expect(REFUSALS).toContain<Refusal>("no-identifier")
    expect(sentences.every((sentence) => sentence.length > 0)).toBe(true)
  })
})

/**
 * The schema is the other end of the claim.
 *
 * The tables are keyed by `keyof Required<…>` so the compiler already refuses a
 * field nobody described. This holds the order and gives the failure a sentence:
 * a type error inside a table says a property is missing, and *the notice does
 * not name `locale`* is what the next author needs to read.
 */
describe("what the notice names, against the schema it is a notice of", () => {
  /** `.refine` wraps the object, and the fields are on what it wraps. */
  const deliveryShape = Object.keys(readerSignalBatchSchema.innerType().shape)

  it("names every field of a delivery, in the schema's own order", () => {
    expect(namedOnDelivery).toEqual(deliveryShape)
  })

  it("names every field of every kind, in the schema's own order", () => {
    for (const option of readerSignalSchema.options) {
      const kind = option.shape.kind.value

      expect(namedFor(kind)).toEqual(Object.keys(option.shape))
    }

    expect(readerSignalSchema.options).toHaveLength(READER_SIGNAL_KINDS.length)
  })
})

/**
 * The end a type cannot reach: what a browser actually puts in a batch.
 *
 * A field is named in the schema, described in the table and sent by the
 * broadcaster, and the first two agreeing says nothing about the third. This
 * drives the real broadcaster over a real page and reads the batches it sends.
 *
 * `audience` is the one delivery field no page produces here — a host puts it
 * on the batch when it serves a form of a page (0284), and the broadcaster
 * never sees one. The schema test above is what holds that field.
 */
describe("against what a page actually sends", () => {
  it("names every kind a page can send and every field those batches carry", async () => {
    const batches = start()

    await readThePage()

    const kinds = new Set(batches.flatMap((batch) => batch.signals.map((signal) => signal.kind)))
    expect([...kinds].sort()).toEqual([...READER_SIGNAL_KINDS].sort())
    expect(unnamed(batches, namedOnDelivery, namedFor)).toEqual([])

    const notice = collectionNoticeOf()
    expect(notice.collects.map((collected) => collected.kind)).toEqual(
      expect.arrayContaining([...kinds])
    )
  })

  /**
   * The mutation. One field dropped from one kind's table has to come back as
   * that field's name, or the walk above is a walk that passes vacuously.
   */
  it("would say which field it was, if the notice had stopped naming one", async () => {
    const batches = start()

    await readThePage()

    const without = (kind: ReaderSignalKind): readonly string[] =>
      namedFor(kind).filter((field) => !(kind === "dwelled" && field === "ms"))

    expect(unnamed(batches, namedOnDelivery, without)).toEqual(["ms"])
    expect(unnamed(batches, namedOnDelivery.filter((field) => field !== "view"), namedFor)).toEqual([
      "view",
    ])
  })

  /**
   * The ceiling in the one direction it has to hold: a page configured to
   * report one kind sends nothing the notice of that configuration does not
   * name.
   */
  it("sends no kind a narrowed notice does not name", async () => {
    const batches = start({ kinds: ["viewed"] })

    await readThePage()

    const named = collectionNoticeOf({ page: { kinds: ["viewed"] } }).collects.map(
      (collected) => collected.kind
    )

    expect(named).toEqual(["viewed"])
    expect(batches.flatMap((batch) => batch.signals.map((signal) => signal.kind))).toEqual(["viewed"])
    expect(unnamed(batches, namedOnDelivery, namedFor)).toEqual([])
  })
})
