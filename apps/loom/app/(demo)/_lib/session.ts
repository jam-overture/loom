import {
  defaultGatePolicy,
  err,
  fixedPolicy,
  gatePolicySchema,
  randomIdFactory,
  systemClock,
  type GatePolicy,
  type ChangeInterpreter,
  type LoomTree,
  type RuntimeEventEnvelope,
} from "@jam-overture/loom"
import { memoryTreeStore, type TreeStore } from "@jam-overture/loom/store"
import { memoryHoldStore, type HoldStore, type WritePath } from "@jam-overture/loom/write"

import { fullBucket, PER_INSTANCE_MODEL_CALLS, PER_SESSION_MODEL_CALLS, spendToken, type Bucket } from "./budget"
import { demoPageTree } from "./page-tree"
import type { ChangeRecord } from "./record"

/**
 * A visitor's own copy of the demo.
 *
 * One tree per session, in memory, and nothing shared but the code that builds
 * it. A single tree would make the demo a multiplayer editor nobody asked for —
 * two visitors undoing each other is a worse first impression than no demo.
 *
 * Memory is the right store here for the reason `lib/store.ts` says it is the
 * wrong one for the portal: this state is *meant* to be as durable as the visit.
 * On a serverless host an instance recycles and a visitor's page returns to its
 * starting shape, which is the correct behavior for a demo and would be data
 * loss for a portal.
 */

/**
 * The demo's own policy, and it is stricter than the default on purpose.
 *
 * `user-instruction` may auto-apply `low` here rather than `medium`, which is
 * what makes the Gate visible: a re-theme lands on its own, and anything that
 * restructures the page waits for the visitor to answer it. Under the shipped
 * default every one of the demo's changes would auto-apply and the hold — the
 * most interesting thing the runtime does — would never appear on screen.
 *
 * A named policy rather than an edited default (0033): the name is what the
 * disposition carries, and a host that changes what a policy contains owes it a
 * new name. `demo` has never meant anything else.
 */
export const demoPolicy: GatePolicy = gatePolicySchema.parse({
  ...defaultGatePolicy,
  policyId: "demo",
  autoApplyCeiling: { ...defaultGatePolicy.autoApplyCeiling, "user-instruction": "low" },
})

export type DemoSession = {
  readonly id: string
  readonly store: TreeStore
  readonly holds: HoldStore
  /** The tree's original shape, so an undo can be planned from it (0028). */
  readonly seed: LoomTree
  readonly records: readonly ChangeRecord[]
  readonly modelCalls: Bucket
  readonly touchedAt: number
}

/**
 * How many visitors one instance remembers. Past this the least recently
 * touched session is dropped, which reads to that visitor as the page having
 * reset — the same thing an instance recycling does, and the only failure mode
 * a demo can afford.
 */
const MAX_SESSIONS = 64

const CARRIER_KEY = Symbol.for("loom.demo.sessions")
const INSTANCE_KEY = Symbol.for("loom.demo.instance-budget")

type Carrier = {
  [CARRIER_KEY]?: Map<string, DemoSession>
  [INSTANCE_KEY]?: Bucket
}

const carrier = globalThis as unknown as Carrier

const sessions = (): Map<string, DemoSession> => (carrier[CARRIER_KEY] ??= new Map())

export const newDemoSessionId = (): string => randomIdFactory.intentId()

const evictOldest = (map: Map<string, DemoSession>): void => {
  if (map.size <= MAX_SESSIONS) return

  const oldest = [...map.entries()].sort(([, a], [, b]) => a.touchedAt - b.touchedAt)[0]
  if (oldest) map.delete(oldest[0])
}

const createSession = async (id: string): Promise<DemoSession> => {
  const seed = demoPageTree()
  const store = memoryTreeStore()

  await store.create(seed)

  return {
    id,
    store,
    holds: memoryHoldStore(),
    seed,
    records: [],
    modelCalls: fullBucket(PER_SESSION_MODEL_CALLS, Date.now()),
    touchedAt: Date.now(),
  }
}

/**
 * The session for this id, created if this instance has never seen it. An
 * unknown id is not an error: a cookie outlives the instance that issued it, and
 * a visitor returning to a recycled instance should get a working page rather
 * than an apology.
 */
export const demoSession = async (id: string): Promise<DemoSession> => {
  const map = sessions()
  const existing = map.get(id)

  if (existing) {
    const touched = { ...existing, touchedAt: Date.now() }
    map.set(id, touched)

    return touched
  }

  const created = await createSession(id)
  map.set(id, created)
  evictOldest(map)

  return created
}

const update = (session: DemoSession, changes: Partial<DemoSession>): DemoSession => {
  const next = { ...session, ...changes, touchedAt: Date.now() }
  sessions().set(session.id, next)

  return next
}

/**
 * Newest first, and a record replaces the one it continues rather than joining
 * it. Answering a hold is not a second ask — it is the end of the first one —
 * so a rail that showed both would be showing a change twice and a history that
 * never happened.
 */
export const rememberRecord = (session: DemoSession, record: ChangeRecord): DemoSession => {
  const others = session.records.filter((existing) => existing.recordId !== record.recordId)
  const wasKnown = others.length !== session.records.length

  return update(session, {
    records: wasKnown
      ? session.records.map((existing) => (existing.recordId === record.recordId ? record : existing))
      : [record, ...others].slice(0, 24),
  })
}

/** The record still waiting on an answer for this proposal, if this session has one. */
export const recordAwaiting = (session: DemoSession, proposalId: string): ChangeRecord | undefined =>
  session.records.find((record) => record.heldProposalId === proposalId)

/**
 * Whether this session may spend a model call, and the two buckets it spends
 * from. Both are consulted and both are debited, so minting fresh sessions gets
 * a visitor past the first limit and straight into the second.
 */
export const spendModelCall = (session: DemoSession, now: number): boolean => {
  const instance = (carrier[INSTANCE_KEY] ??= fullBucket(PER_INSTANCE_MODEL_CALLS, now))
  const perInstance = spendToken(instance, PER_INSTANCE_MODEL_CALLS, now)
  const perSession = spendToken(session.modelCalls, PER_SESSION_MODEL_CALLS, now)

  if (!perInstance.allowed || !perSession.allowed) return false

  carrier[INSTANCE_KEY] = perInstance.bucket
  update(session, { modelCalls: perSession.bucket })

  return true
}

const nothingToInterpret: ChangeInterpreter = {
  interpret: () =>
    Promise.resolve(
      err({
        code: "interpreter-misconfigured",
        detail: "this write path was built for an answer, not for an interpretation",
      })
    ),
}

export type DemoWrite = {
  readonly path: WritePath
  /** What the runtime narrated while composing, in order (0023's own stream). */
  readonly narrated: () => readonly RuntimeEventEnvelope[]
}

/**
 * A write path over this session's store, with the interpreter the caller
 * chose: a preset's, or the model's.
 *
 * The event sink is an array rather than the telemetry journal. The demo's
 * record *is* the event stream, read back within the same request — so what a
 * visitor sees is what the runtime said about itself, not a summary a surface
 * wrote about it afterwards.
 */
export const beginDemoWrite = (
  session: DemoSession,
  /**
   * Optional because two of the three things a visitor can do — answering a
   * hold, and undoing a revision — have nothing to interpret. `confirmHeld`
   * starts from a proposal that already exists, and `revertRevision` builds its
   * own deterministic interpreter from the plan. Handing either of them a model
   * would be handing them something they must not use.
   */
  interpreter: ChangeInterpreter = nothingToInterpret
): DemoWrite => {
  const narrated: RuntimeEventEnvelope[] = []

  return {
    path: {
      store: session.store,
      holds: session.holds,
      runtime: {
        interpreter,
        policySource: fixedPolicy(demoPolicy),
        events: { emit: (envelope) => void narrated.push(envelope) },
        clock: systemClock,
        idFactory: randomIdFactory,
      },
    },
    narrated: () => narrated,
  }
}
