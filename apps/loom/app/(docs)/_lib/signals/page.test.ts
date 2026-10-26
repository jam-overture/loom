import {
  DELIVERY_FIELDS,
  READER_SIGNAL_KINDS,
  parseReaderSignalBatch,
  readerSignalBatchSchema,
  readerSignalSchema,
  viewKeySchema,
} from "@jam-overture/loom/signals"
import { describe, expect, it } from "vitest"

import { produceAddressedMarkup } from "./markup"
import {
  documentedExample,
  produceApproved,
  produceBatch,
  produceKinds,
  producePlainly,
  produceReadBack,
  subjectContains,
} from "./page"

/**
 * What *What your readers do* shows, held against the runtime it claims to be
 * showing.
 *
 * The producers already refuse to print something the schema would reject, so
 * these are not re-checking the schema. They are checking the things a producer
 * cannot notice about itself: that the vocabulary it walked is the runtime's
 * whole vocabulary, that the addresses it prints belong to nodes on the page
 * above, that the page's central privacy claim is the parser's behavior rather
 * than this repository's opinion, and that the markup comparison would fail if
 * addressing ever started doing more than it says.
 */

describe("the vocabulary block", () => {
  it("covers the runtime's whole vocabulary, in its order", () => {
    expect(produceKinds().map((row) => row.kind)).toEqual([...READER_SIGNAL_KINDS])
  })

  it("gives every kind a sentence, a field and a real signal", () => {
    for (const row of produceKinds()) {
      expect(row.means.length, row.kind).toBeGreaterThan(20)
      expect(row.here.length, row.kind).toBeGreaterThan(20)
      expect(row.carries.length, row.kind).toBeGreaterThan(0)
      expect(JSON.parse(row.example), row.kind).toMatchObject({ kind: row.kind })

      for (const field of row.carries) {
        expect(field.field.length, `${row.kind}.${field.field}`).toBeGreaterThan(0)
        expect(field.says.length, `${row.kind}.${field.field}`).toBeGreaterThan(20)
      }
    }
  })

  /**
   * The assertion the old one could not make, and the reason this row stopped
   * being a string.
   *
   * It said `activated` carries *at — when it happened* and nothing else, for
   * the five weeks after `within` landed on all three delegated kinds with
   * 0167, and `disclosed` named `open` without the two fields beside it. Nothing
   * noticed: the row was a sentence, and a sentence is as long as its author
   * left it.
   *
   * This asks the page's own example signal — a real object, through the real
   * schema — which fields it has, and requires each one to be named in the row
   * or to be one of the three every kind carries. **A field arriving on a kind
   * is red here on the commit that adds it**, whichever direction it arrives
   * from.
   */
  it("names every field its own example signal turned out to have", () => {
    const shared = ["kind", "nodeId", "type"]

    for (const row of produceKinds()) {
      const named = [...shared, ...row.carries.map((field) => field.field)]

      expect(Object.keys(JSON.parse(row.example) as object).sort(), row.kind).toEqual(
        [...new Set(named)].sort()
      )
    }
  })

  /**
   * And the half a name cannot carry, for every row rather than for the one row
   * somebody happened to write it for.
   *
   * `gaps.test.tsx` holds each of these sentences to the broadcaster actually
   * behaving that way. What is asserted here is the thing that has to be true
   * before any of that matters: there is one, on every row, in a suite with no
   * DOM in it — so a kind that arrives with no caveat is red in the node half of
   * the suite as well as the DOM half.
   */
  it("gives every kind the half its name cannot carry", () => {
    for (const row of produceKinds()) {
      expect(row.doesNotMean, row.kind).toContain("does not mean")
      expect(row.doesNotMean.length, row.kind).toBeGreaterThan(60)
    }
  })

  /**
   * The address in every printed signal is a node that is really on the page.
   *
   * This is the failure 0136 exists to prevent — a signal filed against a
   * position rather than a node — and the one it would be most embarrassing for
   * its own guide to ship.
   */
  it("only names nodes the example tree actually has", () => {
    const batch = produceBatch()
    const ids = JSON.parse(batch.json) as { readonly signals: readonly { readonly nodeId: string }[] }

    for (const row of produceKinds()) {
      const signal = JSON.parse(row.example) as { readonly nodeId: string }

      expect(
        ids.signals.map((one) => one.nodeId),
        `the ${row.kind} example names ${signal.nodeId}`
      ).toContain(signal.nodeId)
    }
  })
})

describe("the batch the page prints", () => {
  it("is a batch the runtime would accept", () => {
    const batch = produceBatch()

    expect(readerSignalBatchSchema.safeParse(JSON.parse(batch.json)).success).toBe(true)
  })

  it("carries one signal of each kind, about the example tree", () => {
    const batch = produceBatch()

    expect(batch.signals).toBe(READER_SIGNAL_KINDS.length)
    expect(batch.treeId).toMatch(/^t_readersignals/)
    expect(batch.revision).toBe(0)
  })

  /**
   * The delivery a reader is shown is a whole delivery.
   *
   * It was not until 26 October. A real broadcast mints a page-view key once and
   * puts it on every batch, and marks the opening one `first` — both since 0146
   * — and the block printed neither, so the one place on this site where a
   * reader could see what arrives at their endpoint was missing the two fields
   * every funnel reading is built on. It was found by `DELIVERY_FIELDS`, which
   * names them because the schema does.
   *
   * Held against the notice's own list rather than against the two names, so a
   * field added to a delivery is caught here as well as there.
   */
  it("is a whole delivery, carrying every field a delivery always carries", () => {
    const batch = JSON.parse(produceBatch().json) as Readonly<Record<string, unknown>>
    const named = Object.keys(DELIVERY_FIELDS)

    expect(Object.keys(batch).every((key) => named.includes(key))).toBe(true)

    /**
     * Stated as *which named fields the block does not have*, rather than as two
     * `toContain`s.
     *
     * A subset check alone was the first version of this and a mutation walked
     * straight through it: taking `view` and `first` back off the batch left
     * every remaining key still named, so it passed. Said this way round, a
     * field going missing from the block fails here, and so does a field added
     * to a delivery that the block then does not carry.
     *
     * `audience` is the exception, and it is one for a reason rather than by
     * exemption: a delivery carries it only where the host serves an audience,
     * and nothing on this site does. The notice describes it anyway, because a
     * notice is a ceiling.
     */
    expect(named.filter((field) => !Object.keys(batch).includes(field))).toEqual(["audience"])
  })

  /** The key is a real one of the real width, minted by the runtime's own minter. */
  it("names a page view the schema would accept as one", () => {
    const batch = JSON.parse(produceBatch().json) as { readonly view: unknown }

    expect(viewKeySchema.safeParse(batch.view).success).toBe(true)
  })

  /**
   * The page tells a reader the revision is on the batch and not on the signals.
   * A shape that carried it twice would make that paragraph wrong.
   */
  it("names the revision once, on the batch", () => {
    const batch = JSON.parse(produceBatch().json) as {
      readonly revision: number
      readonly signals: readonly Record<string, unknown>[]
    }

    expect(batch.revision).toBeDefined()
    for (const signal of batch.signals) expect(signal).not.toHaveProperty("revision")
  })
})

describe("the read-back block", () => {
  const rows = produceReadBack()

  it("takes the batch a page sent and refuses the other four", () => {
    expect(rows.map((row) => row.accepted)).toEqual([true, false, false, false, false])
  })

  it("prints the runtime's own words for each refusal", () => {
    for (const row of rows.filter((one) => !one.accepted)) {
      expect(row.says.length, row.what).toBeGreaterThan(10)
    }
  })

  /**
   * The page is written around this row. A signal carrying the words a reader
   * saw is refused rather than quietly stripped, and the refusal names the key —
   * which is what makes "a signal carries no content" a property of the runtime
   * rather than a promise on a documentation page.
   */
  it("refuses a signal carrying content, naming the key it refused", () => {
    const row = rows.find((one) => one.what.includes("words a reader saw"))

    expect(row?.accepted).toBe(false)
    expect(row?.says).toContain("label")
  })

  it("refuses a batch that never said which revision", () => {
    const row = rows.find((one) => one.what.includes("revision"))

    expect(row?.accepted).toBe(false)
    expect(row?.says).toContain("revision")
  })
})

describe("what addressing costs", () => {
  const markup = produceAddressedMarkup()

  /**
   * The bag that addressing writes is the bag edit mode writes, and edit mode
   * means far more than identity. The useful question for a published page is
   * not whether the four arrived but whether a fifth ever does.
   */
  it("writes those four attribute names and no others", () => {
    expect(markup.nothingElseIsWritten).toBe(true)
  })

  it("addresses every element the tree has, and the root as well", () => {
    expect(markup.addressedElements).toBeGreaterThan(5)
    expect(markup.onAnElement.map((one) => one.attribute)).toEqual([
      "data-loom-node",
      "data-loom-type",
    ])
    expect(markup.onTheRoot.map((one) => one.attribute)).toEqual([
      "data-loom-tree",
      "data-loom-revision",
    ])
  })

  it("names a real primitive as the element it sampled", () => {
    expect(markup.thatElementIs).toMatch(/^loom\./)
    expect(markup.onAnElement.find((one) => one.attribute === "data-loom-type")?.value).toBe(
      markup.thatElementIs
    )
  })

  it("costs a couple of attributes per element and nothing more", () => {
    expect(markup.bytesAdded).toBeGreaterThan(0)
    expect(markup.bytesAdded).toBeLessThan(markup.addressedElements * 120)
  })
})

/**
 * The endpoint the page shows a reader, run.
 *
 * The page's handler parses and then either answers 400 with the issues or 204.
 * The fence beside it is compiled but never executed, so this is the only place
 * that behavior is actually exercised — and the issues a caller would be handed
 * are the ones the block above prints.
 */
describe("the endpoint the page shows", () => {
  const handle = (body: unknown): { readonly status: number; readonly issues: number } => {
    const read = parseReaderSignalBatch(body)

    return read.ok ? { status: 204, issues: 0 } : { status: 400, issues: read.error.issues.length }
  }

  it("answers 204 for a batch a Loom page sent", () => {
    expect(handle(JSON.parse(produceBatch().json))).toEqual({ status: 204, issues: 0 })
  })

  it("answers 400 with at least one issue for anything else", () => {
    expect(handle({ hello: "there" }).status).toBe(400)
    expect(handle({ hello: "there" }).issues).toBeGreaterThan(0)
  })
})

/**
 * The day `completed` lands, rehearsed.
 *
 * `completed` is approved and not built. The page carries its prose already, and
 * the point of doing it that way is that adding the kind to the runtime should
 * be step 2's own one-line change rather than a change that reds this lane and
 * blocks four surfaces until somebody writes a paragraph.
 *
 * **Every test here passes on both sides of that day**, which took two goes to
 * get right. Written the obvious way they pinned the pre-landing state — that
 * `completed` is announced, that the schema refuses it — and pinning those is
 * the same mistake as pinning the number four, one file further back. So each
 * one below asserts either an invariant that does not care, or the correct
 * behavior *for whichever state the runtime is in*.
 *
 * This was checked by adding the kind and its schema member locally and running
 * the suite, not by reasoning about it.
 */
describe("the kind that is agreed on and not built", () => {
  const vocabulary: readonly string[] = READER_SIGNAL_KINDS
  const landed = vocabulary.includes("completed")

  /** The vocabulary as it will be, whichever it is now. */
  const AFTER = [...new Set([...vocabulary, "completed"])]

  /**
   * The invariant the whole design rests on: a documented kind is on exactly one
   * of the two lists. On neither, and a reader never hears of it; on both, and
   * the page announces something it is already showing.
   */
  it("is on exactly one of the two lists, and it is the one the runtime decides", () => {
    const inVocabulary = produceKinds().some((row) => row.kind === "completed")
    const announced = produceApproved().some((row) => row.kind === "completed")

    expect(inVocabulary).toBe(landed)
    expect(announced).toBe(!landed)
  })

  /**
   * The block that announces it removes itself. If this ever fails, the page has
   * a note about a coming addition that has already come.
   */
  it("stops being announced once the runtime has it", () => {
    expect(produceApproved(AFTER)).toEqual([])
  })

  /**
   * The opening sentence is an enumeration, so it is the other thing that has to
   * grow. Nobody edits it; it is read off the same table.
   */
  it("joins the opening sentence without anybody editing the opening sentence", () => {
    expect(producePlainly(AFTER)).toBe(
      "which part someone looked at, what they stayed on, what they pressed, what they opened and what they finished"
    )
    expect(producePlainly().split(/, | and /)).toHaveLength(vocabulary.length)
  })

  /** Whichever list it is on, it is described well enough to print. */
  it("has complete prose on whichever list it is on", () => {
    const row = [...produceKinds(), ...produceApproved()].find((one) => one.kind === "completed")

    expect(row, "completed has fallen off both lists").toBeDefined()
    expect(row?.means.length ?? 0).toBeGreaterThan(20)
    expect(row?.doesNotMean.length ?? 0).toBeGreaterThan(20)
  })

  /**
   * And the one thing that is *not* the same on both lists, which is the half
   * only the runtime can answer.
   *
   * A kind the runtime has gets its fields off the schema; a kind that is only
   * agreed on has no schema entry, so its row says what it will carry in prose
   * or says nothing. That asymmetry is the right one — the written sentence is
   * the thing that goes stale, and it survives only for as long as nothing can
   * be read instead.
   */
  it("reads its fields off the schema once the runtime has it, and not before", () => {
    const [announced] = produceApproved(vocabulary.filter((kind) => kind !== "completed"))
    const [live] = produceKinds().filter((row) => row.kind === "completed")

    expect(live?.carries.map((field) => field.field)).toEqual(["at", "within"])
    expect(announced?.carries, "a pending kind has nothing to read").toBeUndefined()
  })

  /**
   * The two lists say the same amount about the same kind.
   *
   * The defect behind this group was not that a sentence was missing, it was that
   * the two lists each printed a different number of things — so a kind moving
   * between them changed what a reader was told about it. `produceApproved`
   * reads the caveat off the same table the live rows read, and this is that
   * joined rather than stated.
   */
  it("says the same things about it on either list", () => {
    const [announced] = produceApproved(vocabulary.filter((kind) => kind !== "completed"))
    const [live] = produceKinds().filter((row) => row.kind === "completed")

    expect(announced?.means).toBe(live?.means)
    expect(announced?.doesNotMean).toBe(live?.doesNotMean)
  })

  /**
   * The sentence a name cannot carry, on whichever list the kind is on.
   *
   * This assertion used to be `skipIf(landed)`, on the reasoning that once a kind
   * ships the signals beside it say what it does. `completed` landed, the
   * assertion skipped itself, and `Loom signals` filed what was left: the one row
   * a reader is most likely to over-read lost its caveat on the day it became
   * real, and the skip in this suite was the only trace of it. The caveat is a
   * required field now, so this runs in both states and the skip is gone.
   */
  it("says what it is not, whichever list it is on", () => {
    const row = [...produceKinds(), ...produceApproved()].find((one) => one.kind === "completed")

    expect(row?.doesNotMean).toContain("does not mean a server accepted it")
    expect(row?.doesNotMean).toContain("never the reply")
  })

  /**
   * The example signal is one schema variant away from valid, and this says so
   * without pretending it is valid now.
   *
   * `readerSignalSchema` is a discriminated union, so the kind list is not the
   * only thing that grows — step 2 adds a `completed` member carrying an address
   * and an instant, which is the shape below. So: the schema accepts this object
   * exactly when the runtime has the kind, and in both states the *only* thing
   * standing in its way is the discriminator.
   */
  it("has an example signal the schema accepts exactly when the runtime has the kind", () => {
    const pending = documentedExample("completed") as Record<string, unknown>

    expect(readerSignalSchema.safeParse(pending).success).toBe(landed)
    expect(readerSignalSchema.safeParse({ ...pending, kind: "activated" }).success).toBe(true)
  })

  /**
   * `completed`'s row tells a reader that nothing on the page above can produce
   * one, which is a claim about the example tree rather than about the runtime.
   * A run that gives that tree a form — the right way to make the row
   * demonstrable — is told here that the sentence has to change with it.
   */
  it("is honest that the tree at the top of the page cannot produce one", () => {
    expect(subjectContains("loom.form")).toBe(false)
  })
})
