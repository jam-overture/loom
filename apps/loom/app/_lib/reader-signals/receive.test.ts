import { beforeEach, describe, expect, it } from "vitest"

import {
  createIntakeGate,
  DEFAULT_INTAKE_POLICY,
  DEFAULT_REGION_FLOOR,
  memoryReaderRegionStore,
  memoryReaderSignalJournal,
  type IntakePolicy,
  type ReaderRegionStore,
  type ReaderSignalJournal,
} from "@jam-overture/loom/signals"

import { describeIntake, readerSignalStatus, receiveReaderSignals, type Intake } from "./receive"
import {
  DEFAULT_REGION_HEADER,
  readIntakeSwitch,
  readRegionFloor,
  readRegionSwitch,
  type IntakeSettings,
} from "./settings"

const TREE = "t_page"

/** What a browser actually posts: plain JSON, with every brand already lost. */
const batch = (signals = 1, nodeFrom = 0, over: Record<string, unknown> = {}) => ({
  treeId: TREE,
  revision: 3,
  sentAt: 1_700_000_000_000,
  view: "0123456789abcdef0123456789abcdef",
  ...over,
  signals: Array.from({ length: signals }, (_unused, at) => ({
    kind: "viewed",
    nodeId: `n_${nodeFrom + at}`,
    type: "loom.section",
    at: 1_000 + at,
  })),
})

const policy: IntakePolicy = { ...DEFAULT_INTAKE_POLICY, deliveries: 3, maxBytes: 512 }

const settingsOf = (over: Partial<IntakeSettings> = {}): IntakeSettings => ({
  chosen: { state: "on" },
  hops: 1,
  region: {
    chosen: { state: "on" },
    header: DEFAULT_REGION_HEADER,
    floor: { state: "default", floor: DEFAULT_REGION_FLOOR },
  },
  ...over,
})

const intakeOf = (over: Partial<Intake> = {}): Intake => ({
  settings: settingsOf(),
  journal: memoryReaderSignalJournal(),
  regions: memoryReaderRegionStore(),
  gate: createIntakeGate(policy),
  durable: true,
  subjectOf: () => Promise.resolve("a-caller"),
  now: () => 1_000,
  ...over,
})

const post = (body: unknown, headers: Record<string, string> = {}): Request =>
  new Request("https://loom.test/api/reader-signals", {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  })

describe("receiveReaderSignals", () => {
  let intake: Intake

  beforeEach(() => {
    intake = intakeOf()
  })

  it("keeps a batch and answers with nothing", async () => {
    const response = await receiveReaderSignals(post(batch(2)), intake)

    expect(response.status).toBe(204)
    expect(await response.text()).toBe("")

    const page = await intake.journal.read()
    expect(page.ok && page.value.batches).toHaveLength(1)
    expect(page.ok && page.value.batches[0]?.signals).toHaveLength(2)
  })

  it("keeps a list, because a queue draining after an outage posts one", async () => {
    const response = await receiveReaderSignals(post([batch(1, 0), batch(1, 1)]), intake)

    expect(response.status).toBe(204)
    const page = await intake.journal.read()
    expect(page.ok && page.value.batches).toHaveLength(2)
  })

  it("never lets a response be cached", async () => {
    const response = await receiveReaderSignals(post(batch()), intake)

    expect(response.headers.get("cache-control")).toBe("no-store")
  })

  describe("a deployment that never asked", () => {
    it("does not have this endpoint at all", async () => {
      const off = intakeOf({ settings: settingsOf({ chosen: { state: "off" } }) })

      const response = await receiveReaderSignals(post(batch()), off)

      expect(response.status).toBe(404)

      const page = await off.journal.read()
      expect(page.ok && page.value.batches).toHaveLength(0)
    })

    /** An operator who configured something and got silence is the failure nobody notices. */
    it("says so loudly when the switch was typed wrong", async () => {
      const broken = intakeOf({
        settings: settingsOf({ chosen: readIntakeSwitch("enabled") }),
      })

      const response = await receiveReaderSignals(post(batch()), broken)

      expect(response.status).toBe(503)
      expect(await response.text()).toContain("enabled")
    })
  })

  describe("what it refuses", () => {
    it("refuses a body that is not JSON", async () => {
      const response = await receiveReaderSignals(post("{not json"), intake)

      expect(response.status).toBe(400)

      const page = await intake.journal.read()
      expect(page.ok && page.value.batches).toHaveLength(0)
    })

    it("refuses a body that is JSON and not a batch, naming which", async () => {
      const response = await receiveReaderSignals(post([batch(), { kind: "nonsense" }]), intake)

      expect(response.status).toBe(400)
      expect(await response.text()).toContain("batch 1")
    })

    /** Nothing is kept unless all of it parses — a partial accept is a retry nobody can reason about. */
    it("keeps nothing at all from a delivery with one bad batch", async () => {
      await receiveReaderSignals(post([batch(), { kind: "nonsense" }]), intake)

      const page = await intake.journal.read()
      expect(page.ok && page.value.batches).toHaveLength(0)
    })

    it("refuses an empty body", async () => {
      const response = await receiveReaderSignals(
        new Request("https://loom.test/api/reader-signals", { method: "POST" }),
        intake
      )

      expect(response.status).toBe(400)
    })

    it("refuses a delivery over the ceiling", async () => {
      const response = await receiveReaderSignals(post(batch(200)), intake)

      expect(response.status).toBe(413)
      expect(await response.text()).toContain("512")
    })

    /**
     * Measured off the bytes, not off a header a stranger wrote — the one
     * endpoint in Loom whose callers are not this deployment's own server.
     */
    it("is not fooled by a content-length that lies", async () => {
      const honest = await receiveReaderSignals(post(batch(200), { "content-length": "10" }), intake)
      expect(honest.status).toBe(413)

      const also = await receiveReaderSignals(
        post(batch(1), { "content-length": "99999" }),
        intakeOf()
      )
      expect(also.status).toBe(204)
    })

    it("refuses a sender past the window, and says how long in whole seconds", async () => {
      for (let sent = 0; sent < 3; sent += 1) {
        expect((await receiveReaderSignals(post(batch()), intake)).status).toBe(204)
      }

      const response = await receiveReaderSignals(post(batch()), intake)

      expect(response.status).toBe(429)
      expect(response.headers.get("retry-after")).toBe("60")
    })

    it("never reports a wait of zero seconds", async () => {
      const late = intakeOf({ now: () => 1_000 })
      for (let sent = 0; sent < 3; sent += 1) await receiveReaderSignals(post(batch()), late)

      const atTheEdge = { ...late, now: () => 1_000 + policy.windowMs - 1 }
      const response = await receiveReaderSignals(post(batch()), atTheEdge)

      expect(response.status).toBe(429)
      expect(response.headers.get("retry-after")).toBe("1")
    })

    it("counts senders apart", async () => {
      let caller = "a"
      const shared = intakeOf({ subjectOf: () => Promise.resolve(caller) })

      for (let sent = 0; sent < 3; sent += 1) await receiveReaderSignals(post(batch()), shared)
      expect((await receiveReaderSignals(post(batch()), shared)).status).toBe(429)

      caller = "b"
      expect((await receiveReaderSignals(post(batch()), shared)).status).toBe(204)
    })

    /** A journal that cannot answer is this deployment's problem, not the sender's. */
    it("answers 503 when the buffer is unavailable", async () => {
      const refusing: ReaderSignalJournal = {
        ...memoryReaderSignalJournal(),
        receive: () =>
          Promise.resolve({ ok: false, error: { code: "unavailable", detail: "no database" } }),
      }

      const response = await receiveReaderSignals(post(batch()), intakeOf({ journal: refusing }))

      expect(response.status).toBe(503)
      expect(await response.text()).toContain("no database")
    })

    it("refuses more batches than one delivery may carry", async () => {
      const many = Array.from({ length: 51 }, (_unused, at) => batch(1, at))

      const response = await receiveReaderSignals(
        post(many),
        intakeOf({ gate: createIntakeGate(DEFAULT_INTAKE_POLICY) })
      )

      expect(response.status).toBe(400)
      expect(await response.text()).toContain("50")
    })
  })
})

describe("where a delivery came from", () => {
  const opening = (over: Record<string, unknown> = {}) => batch(1, 0, { first: true, ...over })

  const bucketsIn = async (regions: ReaderRegionStore): Promise<readonly string[]> => {
    const rows = await regions.regions()

    return rows.ok ? rows.value.map((row) => `${row.region}:${row.views}`) : ["unavailable"]
  }

  it("counts a reader arriving from the region the platform wrote", async () => {
    const regions = memoryReaderRegionStore()

    const response = await receiveReaderSignals(
      post(opening(), { [DEFAULT_REGION_HEADER]: "de" }),
      intakeOf({ regions })
    )

    expect(response.status).toBe(204)
    expect(await bucketsIn(regions)).toEqual(["DE:1"])
  })

  /**
   * The counter that makes the floor mean anything. A reader who stays on a page
   * delivers a batch every few seconds, and a bucket that moved for each of them
   * would let one visitor clear any floor on their own.
   */
  it("counts one reader once, however many batches they deliver", async () => {
    const regions = memoryReaderRegionStore()
    const intake = intakeOf({ regions })
    const headers = { [DEFAULT_REGION_HEADER]: "GB" }

    await receiveReaderSignals(post(opening(), headers), intake)
    await receiveReaderSignals(post(batch(), headers), intake)
    await receiveReaderSignals(post(batch(), headers), intake)

    expect(await bucketsIn(regions)).toEqual(["GB:1"])
  })

  it("counts a reader it could not place, rather than dropping them", async () => {
    const regions = memoryReaderRegionStore()

    await receiveReaderSignals(post(opening()), intakeOf({ regions }))

    expect(await bucketsIn(regions)).toEqual(["unknown:1"])
  })

  /**
   * A deployment whose proxy passes a caller's header through is a deployment
   * whose region column a stranger can write to. Two letters or nothing is the
   * closed set that makes the worst case *a bucket that already exists*.
   */
  it("counts a header holding something that is not a country as unplaced", async () => {
    const regions = memoryReaderRegionStore()

    await receiveReaderSignals(
      post(opening(), { [DEFAULT_REGION_HEADER]: "Kensington" }),
      intakeOf({ regions })
    )

    expect(await bucketsIn(regions)).toEqual(["unknown:1"])
  })

  it("reads the header this deployment was told to read", async () => {
    const regions = memoryReaderRegionStore()
    const intake = intakeOf({
      regions,
      settings: settingsOf({
        region: {
          chosen: { state: "on" },
          header: "cf-ipcountry",
          floor: { state: "default", floor: DEFAULT_REGION_FLOOR },
        },
      }),
    })

    await receiveReaderSignals(post(opening(), { "cf-ipcountry": "FR", [DEFAULT_REGION_HEADER]: "GB" }), intake)

    expect(await bucketsIn(regions)).toEqual(["FR:1"])
  })

  it("counts nothing for a deployment that switched regions off", async () => {
    const regions = memoryReaderRegionStore()
    const intake = intakeOf({
      regions,
      settings: settingsOf({
        region: {
          chosen: readRegionSwitch("off"),
          header: DEFAULT_REGION_HEADER,
          floor: { state: "default", floor: DEFAULT_REGION_FLOOR },
        },
      }),
    })

    const response = await receiveReaderSignals(post(opening(), { [DEFAULT_REGION_HEADER]: "GB" }), intake)

    expect(response.status).toBe(204)
    expect(await bucketsIn(regions)).toEqual([])
  })

  /**
   * The region is used once, in this handler, and never written down beside the
   * page view it came with — which is the constraint the whole shape exists for.
   */
  it("never lets the region reach the batch it buffered", async () => {
    const intake = intakeOf()

    await receiveReaderSignals(post(opening(), { [DEFAULT_REGION_HEADER]: "GB" }), intake)

    const page = await intake.journal.read()

    expect(JSON.stringify(page.ok && page.value.batches)).not.toContain("GB")
  })

  /**
   * The batch is already kept by then. Refusing would invite a retry that
   * counted every signal in it twice, which is the one mistake in this subsystem
   * that cannot be undone.
   */
  it("keeps a delivery whose bucket could not be written", async () => {
    const regions: ReaderRegionStore = {
      ...memoryReaderRegionStore(),
      count: () => Promise.resolve({ ok: false, error: { code: "unavailable", detail: "no database" } }),
    }
    const intake = intakeOf({ regions })

    const response = await receiveReaderSignals(post(opening(), { [DEFAULT_REGION_HEADER]: "GB" }), intake)

    expect(response.status).toBe(204)

    const page = await intake.journal.read()
    expect(page.ok && page.value.batches).toHaveLength(1)
  })
})

describe("the status", () => {
  it("distinguishes the three states that all present as no numbers", () => {
    expect(describeIntake(intakeOf()).intake).toBe("on")
    expect(
      describeIntake(intakeOf({ settings: settingsOf({ chosen: { state: "off" } }) })).intake
    ).toBe("off")
    expect(
      describeIntake(
        intakeOf({ settings: settingsOf({ chosen: readIntakeSwitch("enabled") }) })
      ).intake
    ).toBe("unusable")
  })

  it("says when what is kept will not outlive the process", () => {
    const status = describeIntake(intakeOf({ durable: false }))

    expect(status.durable).toBe(false)
    expect(status.detail).toContain("DATABASE_URL")
  })

  it("reports the limits an operator would otherwise have to measure", async () => {
    const response = readerSignalStatus(intakeOf())

    expect(response.headers.get("cache-control")).toBe("no-store")
    await expect(response.json()).resolves.toMatchObject({
      intake: "on",
      durable: true,
      maxBytes: policy.maxBytes,
      deliveries: policy.deliveries,
      windowMs: policy.windowMs,
    })
  })

  it("counts the senders this instance is holding", async () => {
    const intake = intakeOf()
    expect(describeIntake(intake).subjects).toBe(0)

    await receiveReaderSignals(post(batch()), intake)

    expect(describeIntake(intake).subjects).toBe(1)
  })

  it("says whether where readers are is being counted, and under what floor", () => {
    expect(describeIntake(intakeOf()).regions).toContain(DEFAULT_REGION_HEADER)
    expect(describeIntake(intakeOf()).regions).toContain(String(DEFAULT_REGION_FLOOR))
  })

  /**
   * An operator who asked for a smaller bucket than the runtime allows gets the
   * runtime's, and should be able to find that out from the status rather than
   * from the source.
   */
  it("says so when a floor it was given was refused", () => {
    const status = describeIntake(
      intakeOf({
        settings: settingsOf({
          region: {
            chosen: { state: "on" },
            header: DEFAULT_REGION_HEADER,
            floor: readRegionFloor("5"),
          },
        }),
      })
    )

    expect(status.regions).toContain("5")
    expect(status.regions).toContain(String(DEFAULT_REGION_FLOOR))
  })

  it("names no secret", () => {
    const printed = JSON.stringify(describeIntake(intakeOf()))

    expect(printed).not.toContain("postgres")
    expect(printed).not.toContain("a-caller")
  })
})
