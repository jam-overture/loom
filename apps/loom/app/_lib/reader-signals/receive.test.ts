import { beforeEach, describe, expect, it } from "vitest"

import {
  createIntakeGate,
  DEFAULT_INTAKE_POLICY,
  DEFAULT_REGION_FLOOR,
  memoryReaderRegionStore,
  memoryReaderSignalJournal,
  memoryReaderTallyStore,
  type IntakePolicy,
  type ReaderRegionStore,
  type ReaderSignalJournal,
} from "@jam-overture/loom/signals"

import { err, ok } from "@jam-overture/loom"
import {
  applicationIdSchema,
  DEFAULT_APPLICATION_ID,
  projectIdSchema,
  type Application,
  type ApplicationId,
} from "@jam-overture/loom/store"

import type { Senders } from "./attribution"
import { mintIngestKey } from "./keys"
import {
  describeIntake,
  readerSignalStatus,
  receiveReaderSignals,
  type Filing,
  type Intake,
} from "./receive"
import type { RefusalCounter } from "./refusals"
import { memoryRefusalCounter } from "./refusals-memory"
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

/**
 * A deployment that has issued one key, to its own application — what this
 * site's pages post with. Every test that is not about *whose* readers these
 * are posts with it.
 */
const SITE_KEY = mintIngestKey()

const SITE: Application = {
  applicationId: DEFAULT_APPLICATION_ID,
  projectId: projectIdSchema.parse("prj_default"),
  name: "Your application",
  createdAt: "1970-01-01T00:00:00.000Z",
}

const siteSenders: Senders = {
  applicationWithKey: (key) => Promise.resolve(ok(key === SITE_KEY ? SITE : null)),
}

const ADDRESS = "https://loom.test/api/reader-signals"

/**
 * An intake whose every delivery is kept in one filing, handed back beside it
 * so a test can read what was kept. The tests of *which* filing are below, in
 * `whose readers these are`, and they build their own.
 */
const intakeOf = (over: Partial<Intake> & Partial<Filing> = {}): Intake & Filing => {
  const filing: Filing = {
    journal: over.journal ?? memoryReaderSignalJournal(),
    regions: over.regions ?? memoryReaderRegionStore(),
    openings: over.openings ?? memoryReaderTallyStore(),
    refusals: over.refusals ?? memoryRefusalCounter(),
  }

  return {
    settings: settingsOf(),
    senders: siteSenders,
    filingFor: () => filing,
    gate: createIntakeGate(policy),
    durable: true,
    subjectOf: () => Promise.resolve("a-caller"),
    now: () => 1_000,
    ...over,
    ...filing,
  }
}

/** What one of this site's pages posts: its project's key, from the origin it posts to. */
const post = (body: unknown, headers: Record<string, string> = {}): Request =>
  new Request(`${ADDRESS}?key=${SITE_KEY}`, {
    method: "POST",
    headers: { origin: "https://loom.test", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  })

describe("receiveReaderSignals", () => {
  let intake: Intake & Filing

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
        new Request(`${ADDRESS}?key=${SITE_KEY}`, { method: "POST" }),
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

describe("whose readers these are", () => {
  const SHOP = applicationIdSchema.parse("app_shop")
  const BLOG = applicationIdSchema.parse("app_blog")
  const SHOP_KEY = mintIngestKey()
  const BLOG_KEY = mintIngestKey()

  const application = (
    applicationId: ApplicationId,
    over: Partial<Application> = {}
  ): Application => ({
    applicationId,
    projectId: projectIdSchema.parse(`prj_${applicationId.slice(4)}`),
    name: applicationId,
    createdAt: "2026-10-19T00:00:00.000Z",
    ...over,
  })

  /** Two customers and the deployment itself, each with a buffer of its own. */
  const deployment = (
    applications: readonly Application[] = [application(SHOP), application(BLOG)]
  ) => {
    const issued = new Map([
      [SHOP_KEY, SHOP],
      [BLOG_KEY, BLOG],
    ])
    const filings = new Map<ApplicationId, Filing>()
    const counters = new Map<ApplicationId, RefusalCounter>()

    const filingFor = (applicationId: ApplicationId): Filing => {
      const held = filings.get(applicationId)
      if (held !== undefined) return held

      const made: Filing = {
        journal: memoryReaderSignalJournal(),
        regions: memoryReaderRegionStore(),
        openings: memoryReaderTallyStore(),
        refusals: memoryRefusalCounter(),
      }
      filings.set(applicationId, made)
      counters.set(applicationId, made.refusals as RefusalCounter)

      return made
    }

    const senders: Senders = {
      applicationWithKey: (key) =>
        Promise.resolve(
          ok(applications.find((candidate) => candidate.applicationId === issued.get(key)) ?? null)
        ),
    }

    const kept = async (applicationId: ApplicationId): Promise<number> => {
      const page = await filingFor(applicationId).journal.read()

      return page.ok ? page.value.batches.length : -1
    }

    const refused = async (applicationId: ApplicationId) => {
      filingFor(applicationId)
      const read = await counters.get(applicationId)?.read()

      return read?.ok === true ? read.value : undefined
    }

    return { intake: intakeOf({ senders, filingFor }), kept, refused }
  }

  const keyed = (key: string, headers: Record<string, string> = {}): Request =>
    new Request(`https://loom.test/api/reader-signals?key=${key}`, {
      method: "POST",
      headers,
      body: JSON.stringify(batch()),
    })

  it("files a keyed delivery under the key's project and nowhere else", async () => {
    const { intake, kept } = deployment()

    expect((await receiveReaderSignals(keyed(SHOP_KEY), intake)).status).toBe(204)

    expect(await kept(SHOP)).toBe(1)
    expect(await kept(BLOG)).toBe(0)
    expect(await kept(DEFAULT_APPLICATION_ID)).toBe(0)
  })

  /** The demonstration the plan names: a second project's signals are never visible from the first. */
  it("keeps two projects' readers apart", async () => {
    const { intake, kept } = deployment()

    await receiveReaderSignals(keyed(SHOP_KEY), intake)
    await receiveReaderSignals(keyed(BLOG_KEY), intake)
    await receiveReaderSignals(keyed(BLOG_KEY), intake)

    expect({ shop: await kept(SHOP), blog: await kept(BLOG) }).toEqual({ shop: 1, blog: 2 })
  })

  /** And the same signal without a key is refused. */
  it("refuses a keyless delivery from another machine and keeps nothing", async () => {
    const { intake, kept } = deployment()
    const stranger = new Request(ADDRESS, { method: "POST", body: JSON.stringify(batch()) })

    const response = await receiveReaderSignals(stranger, intake)

    expect(response.status).toBe(403)
    expect(await response.text()).toContain("?key=")
    expect(await kept(DEFAULT_APPLICATION_ID)).toBe(0)
  })

  /** This deployment's own pages carry a key like anyone's (0298 clause 4). */
  it("refuses a keyless delivery from this deployment's own pages", async () => {
    const { intake, kept } = deployment()
    const own = new Request(ADDRESS, {
      method: "POST",
      headers: { origin: "https://loom.test" },
      body: JSON.stringify(batch()),
    })

    expect((await receiveReaderSignals(own, intake)).status).toBe(403)
    expect(await kept(DEFAULT_APPLICATION_ID)).toBe(0)
  })

  it("refuses a key it never issued", async () => {
    const { intake } = deployment()

    const response = await receiveReaderSignals(keyed(mintIngestKey()), intake)

    expect(response.status).toBe(403)
    expect(await response.text()).toContain("not a key this deployment issued")
  })

  it("refuses a closed project's key", async () => {
    const { intake, kept } = deployment([
      application(SHOP, { closedAt: "2026-10-19T12:00:00.000Z" }),
      application(BLOG),
    ])

    const response = await receiveReaderSignals(keyed(SHOP_KEY), intake)

    expect(response.status).toBe(403)
    expect(await response.text()).toContain("closed")
    expect(await kept(SHOP)).toBe(0)
  })

  it("refuses the project's key from a site the project does not name", async () => {
    const { intake, kept } = deployment([application(SHOP, { host: "shop.example.com" })])

    const copied = await receiveReaderSignals(
      keyed(SHOP_KEY, { origin: "https://copied.example.org" }),
      intake
    )

    expect(copied.status).toBe(403)
    expect(await copied.text()).toContain("https://copied.example.org")

    const own = await receiveReaderSignals(
      keyed(SHOP_KEY, { origin: "https://shop.example.com" }),
      intake
    )

    expect(own.status).toBe(204)
    expect(await kept(SHOP)).toBe(1)
  })

  /**
   * 0311: a refusal whose key was right is counted against the key's project,
   * so its *Signals* screen can say a page is posting and being turned away.
   */
  describe("counting what it turns away", () => {
    it("counts a delivery from another site against the project, with the site", async () => {
      const { intake, refused } = deployment([
        application(SHOP, { host: "www.shop.example.com" }),
        application(BLOG),
      ])

      await receiveReaderSignals(keyed(SHOP_KEY, { origin: "https://shop.example.com" }), intake)

      expect(await refused(SHOP)).toEqual([
        { reason: "wrong-site", refused: 1, lastAt: 1_000, lastOrigin: "https://shop.example.com" },
      ])
      expect(await refused(BLOG)).toEqual([])
    })

    it("counts a closed project's deliveries", async () => {
      const { intake, refused } = deployment([
        application(SHOP, { closedAt: "2026-10-19T12:00:00.000Z" }),
      ])

      await receiveReaderSignals(keyed(SHOP_KEY), intake)

      expect((await refused(SHOP))?.map((tally) => tally.reason)).toEqual(["closed"])
    })

    it("counts a delivery the door could not read", async () => {
      const { intake, refused } = deployment()
      const garbled = new Request(`https://loom.test/api/reader-signals?key=${SHOP_KEY}`, {
        method: "POST",
        body: "{ not json",
      })

      expect((await receiveReaderSignals(garbled, intake)).status).toBe(400)
      expect((await refused(SHOP))?.map((tally) => tally.reason)).toEqual(["unreadable"])
    })

    it("counts nothing that was kept", async () => {
      const { intake, refused } = deployment()

      await receiveReaderSignals(keyed(SHOP_KEY), intake)

      expect(await refused(SHOP)).toEqual([])
    })

    /** A counter that cannot answer changes nothing the sender is told. */
    it("refuses the same way when the count cannot be written", async () => {
      const { intake } = deployment([application(SHOP, { closedAt: "2026-10-19T12:00:00.000Z" })])
      const broken: Intake = {
        ...intake,
        filingFor: (applicationId) => ({
          ...intake.filingFor(applicationId),
          refusals: {
            record: () => Promise.resolve(err({ code: "unavailable", detail: "down" })),
          },
        }),
      }

      expect((await receiveReaderSignals(keyed(SHOP_KEY), broken)).status).toBe(403)
    })
  })

  /** A lookup that cannot answer is this deployment's fault, and is said to be. */
  it("answers 503 when it cannot look the key up", async () => {
    const intake = intakeOf({
      senders: { applicationWithKey: () => Promise.resolve(err({ detail: "no database" })) },
    })

    const response = await receiveReaderSignals(keyed(SHOP_KEY), intake)

    expect(response.status).toBe(503)
    expect(await response.text()).toContain("no database")
  })

  /**
   * The gate comes first, so a stranger guessing keys spends their own budget
   * rather than this deployment's database.
   */
  it("counts a sender against the window before it looks any key up", async () => {
    let lookups = 0
    const intake = intakeOf({
      senders: {
        applicationWithKey: () => {
          lookups += 1
          return Promise.resolve(ok(null))
        },
      },
    })

    for (let sent = 0; sent < 4; sent += 1) {
      await receiveReaderSignals(keyed(mintIngestKey()), intake)
    }

    expect(lookups).toBe(3)
  })

  /** A refused sender is not told what was wrong with a body nobody was going to keep. */
  it("refuses an unattributable delivery before it parses it", async () => {
    const stranger = new Request("https://loom.test/api/reader-signals", {
      method: "POST",
      body: "{not json",
    })

    expect((await receiveReaderSignals(stranger, intakeOf())).status).toBe(403)
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
   * And still counts how many readers there were. The two counters are written
   * on the same walk and only one of them has a switch: a region is a fact about
   * a reader and a page-view count is a fact about a revision, so a deployment
   * that refuses the first keeps the denominator everything else is a rate
   * against. A screen with no numerator is a screen; a screen with no
   * denominator is a wrong number.
   */
  it("counts the reader arriving even when regions are off", async () => {
    const openings = memoryReaderTallyStore()
    const intake = intakeOf({
      openings,
      settings: settingsOf({
        region: {
          chosen: readRegionSwitch("off"),
          header: DEFAULT_REGION_HEADER,
          floor: { state: "default", floor: DEFAULT_REGION_FLOOR },
        },
      }),
    })

    await receiveReaderSignals(post(opening(), { [DEFAULT_REGION_HEADER]: "GB" }), intake)

    const rows = await openings.pageViews()

    expect(rows.ok && rows.value.map((row) => `${row.opened}:${row.appearances}`)).toEqual(["1:0"])
  })

  /** One reader is one page view however long they read, which is the whole of the marker. */
  it("counts one page view however many batches a reader delivers", async () => {
    const openings = memoryReaderTallyStore()
    const intake = intakeOf({ openings })

    await receiveReaderSignals(post(opening()), intake)
    await receiveReaderSignals(post(batch()), intake)

    const rows = await openings.pageViews()

    expect(rows.ok && rows.value.map((row) => row.opened)).toEqual([1])
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
