import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { portalTelemetry } from "./telemetry"
import { beginWrite } from "./write"

/**
 * The wiring, not the runtime: that a write begun by this app narrates into the
 * journal, and that the narration only lands when the write is finished. The
 * composition itself is §2's to test — this asserts the seam the portal owns.
 */
describe("beginWrite", () => {
  it("records what the runtime narrated, and only once the write finishes", async () => {
    const write = beginWrite()
    const treeId = "t_wiring"

    write.path.runtime.events.emit({
      treeId: treeId as never,
      occurredAt: new Date().toISOString(),
      event: { type: "hold-confirmed", proposalId: "p_wiring" as never },
    })

    const before = await portalTelemetry.read({ treeId: treeId as never })
    expect(before.ok && before.value.records).toHaveLength(0)

    await write.finish()

    const after = await portalTelemetry.read({ treeId: treeId as never })
    expect(after.ok && after.value.records.map((record) => record.event.type)).toEqual([
      "hold-confirmed",
    ])
  })

  it("gives each write its own sink, so one request cannot flush another's", async () => {
    const first = beginWrite()
    const second = beginWrite()

    expect(first.path.runtime.events).not.toBe(second.path.runtime.events)
    expect(first.path.store).toBe(second.path.store)
  })
})

/**
 * Which store the portal keeps its held proposals in.
 *
 * A choice of backend does not normally deserve a test. This one does, because
 * the wrong answer is invisible: a `Map` satisfies every call `HoldStore` makes,
 * every unit test passes against it, and the failure only appears on a
 * deployment with more than one instance — where the process that judged a
 * change is gone before the reviewer opens the queue, and a confirmation comes
 * back as `not-held`, which reads as "already answered" and is not.
 *
 * So the assertion is the one thing a running deployment cannot tell you: on a
 * host with a database, holds do not live in this process.
 */
describe("portalHolds", () => {
  const CARRIER_KEY = Symbol.for("loom.portal.holds")

  type Carrier = { [CARRIER_KEY]?: unknown }

  const forget = (): void => {
    delete (globalThis as Carrier)[CARRIER_KEY]
  }

  /**
   * Both Postgres-backed constructors are stubbed rather than spied on. A spy is
   * taken on one instance of a module and `resetModules` hands the next import a
   * different one, so the spy watches a copy nobody calls — and the test passes
   * for the wrong reason in whichever direction the assertion is written.
   */
  const built: string[] = []

  const holdStoreWith = async (database: unknown): Promise<unknown> => {
    forget()
    vi.resetModules()
    built.length = 0

    vi.doMock("./database", () => ({
      portalDatabase: database,
      storeIsDurable: database !== undefined,
    }))

    vi.doMock("@loom/runtime/postgres", () => ({
      postgresHoldStore: (handle: unknown) => {
        built.push(`holds:${String((handle as { marker?: string }).marker)}`)

        return { hold: () => {}, get: () => {}, forTree: () => {}, release: () => {} }
      },
      postgresTreeStore: () => ({ create: () => Promise.resolve(undefined) }),
    }))

    const { portalHolds } = await import("./write")

    return portalHolds
  }

  beforeEach(forget)

  afterEach(() => {
    vi.doUnmock("./database")
    vi.doUnmock("@loom/runtime/postgres")
    vi.resetModules()
    forget()
  })

  it("keeps holds in the database when this deployment has one", async () => {
    await holdStoreWith({ marker: "a database handle" })

    expect(built).toEqual(["holds:a database handle"])
  })

  /**
   * Memory is a supported state rather than a broken one — it is right for
   * `pnpm dev`, where one process makes a hold durable for as long as you are
   * looking at it. The pages screen says so on the surface when it applies.
   */
  it("keeps them in this process when it has none", async () => {
    await holdStoreWith(undefined)

    expect(built).toEqual([])
  })

  it("answers the hold contract either way", async () => {
    const holds = (await holdStoreWith(undefined)) as Record<string, unknown>

    for (const call of ["hold", "get", "forTree", "release"]) {
      expect(typeof holds[call]).toBe("function")
    }
  })
})
