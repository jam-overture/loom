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

  /**
   * The tee, and the reason it exists: a `WriteOutcome` carries the Gate's
   * verdict and not its reasoning, so the only place the factor codes can be read
   * is the event the runtime emits while it is deciding.
   */
  it("keeps what the Gate weighed, so a screen can say why and not only what", async () => {
    const write = beginWrite()

    write.path.runtime.events.emit({
      treeId: "t_weighed" as never,
      occurredAt: new Date().toISOString(),
      event: {
        type: "change-assessed",
        assessment: {
          proposal: { proposalId: "p_weighed" },
          stakes: {
            level: "critical",
            factors: [
              { code: "unknown-primitive", level: "critical", detail: "app.gallery at n_7" },
            ],
          },
        },
      } as never,
    })

    expect(write.weighedAgainst("p_weighed").map((factor) => factor.code)).toEqual([
      "unknown-primitive",
    ])
  })

  /**
   * Keyed by proposal, which is what makes the answer unambiguous when a refusal
   * was handed to a repairer: two assessments in one write, and the person is
   * being told about the one that was refused.
   */
  it("keeps one write's assessments apart, so a repair's reasons are not the refusal's", async () => {
    const write = beginWrite()
    const assess = (proposalId: string, code: string): void => {
      write.path.runtime.events.emit({
        treeId: "t_two" as never,
        occurredAt: new Date().toISOString(),
        event: {
          type: "change-assessed",
          assessment: {
            proposal: { proposalId },
            stakes: { level: "high", factors: [{ code, level: "high", detail: code }] },
          },
        } as never,
      })
    }

    assess("p_refused", "unknown-primitive")
    assess("p_repair", "large-removal")

    expect(write.weighedAgainst("p_refused").map((factor) => factor.code)).toEqual([
      "unknown-primitive",
    ])
    expect(write.weighedAgainst("p_repair").map((factor) => factor.code)).toEqual(["large-removal"])
  })

  /**
   * A proposal the Gate never weighed — a request the model could not interpret,
   * or a delta that would not apply. Empty rather than undefined, so a caller
   * renders a rule with no clauses instead of crashing; the distinction between
   * *nothing was wrong* and *nothing was looked at* is `reportOf`'s to make, from
   * whether there is a disposition at all.
   */
  it("answers with nothing for a proposal it never heard about", async () => {
    expect(beginWrite().weighedAgainst("p_never")).toEqual([])
  })

  /**
   * The ordering inside the sink, which is the one thing about it that is not
   * obvious.
   *
   * A journal write can fail and `narrator` contains whatever `emit` throws
   * (0042), so a tee that delegated before recording would let a failed record
   * take the reasoning down with it — and a reviewer would be told a refusal had
   * no reasons rather than that the record could not be written. The event here is
   * complete enough for the journal to want it, and the journal is made to reject,
   * which is the only arrangement that can tell the two orderings apart.
   */
  it("keeps the reasoning even when the journal refuses the same event", async () => {
    const write = beginWrite()
    const failing = vi
      .spyOn(portalTelemetry, "record")
      .mockResolvedValue({ ok: false, error: { code: "unavailable", detail: "no journal" } } as never)

    write.path.runtime.events.emit({
      treeId: "t_throws" as never,
      occurredAt: new Date().toISOString(),
      event: {
        type: "change-assessed",
        assessment: {
          proposal: { proposalId: "p_throws" },
          analysis: {
            operationCount: 1,
            insertedNodeCount: 1,
            removedNodeCount: 0,
            movedNodeCount: 0,
            configuredNodeCount: 0,
            relocatedNodeCount: 0,
            affectedNodeIds: [],
            touchedPrimitiveTypes: [],
            removedPrimitiveTypes: [],
            relocatedPrimitiveTypes: [],
            configuredPropKeys: [],
            shallowestAffectedDepth: 2,
          },
          stakes: {
            level: "critical",
            factors: [{ code: "invalid-props", level: "critical", detail: "tone" }],
          },
          reversibility: { reversible: true, retainedNodeCount: 0, reasons: [] },
        },
      } as never,
    })

    await write.finish()

    expect(failing).toHaveBeenCalled()
    expect(write.weighedAgainst("p_throws").map((factor) => factor.code)).toEqual(["invalid-props"])

    failing.mockRestore()
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

    vi.doMock("@jam-overture/loom/postgres", () => ({
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
    vi.doUnmock("@jam-overture/loom/postgres")
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
