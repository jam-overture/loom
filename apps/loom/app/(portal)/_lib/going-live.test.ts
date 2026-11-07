import { describe, expect, it } from "vitest"

import {
  buildElement,
  buildText,
  intentIdSchema,
  nodeIdSchema,
  proposalIdSchema,
  sequentialIdFactory,
  treeIdSchema,
  type DeltaId,
  type TreeId,
} from "@jam-overture/loom"
import type { StoredRevision } from "@jam-overture/loom/store"

import {
  ACCEPTED_PAGE_SIZE,
  acceptedChangesOf,
  acceptedPage,
  boundsAround,
  boundsOf,
  changedAtOf,
  goalNameOf,
  liveAtOf,
  reachOf,
  sentencesOf,
  statusOf,
  servedNoteOf,
  servedOf,
  stakeWordsOf,
  timelineOf,
  type AcceptedChange,
  type CopyRecord,
  type Origins,
  type Reach,
  type Served,
} from "./going-live"
import { goalIdSchema } from "./goals/goal"
import type { ProposalGoal } from "./goals/serving"
import { MEASURING_MS, windowsOf, type Measurement, type Side } from "./measuring"
import { partNameOf } from "./part-name"
import { firstCopyOf } from "./proposing/copies"

const PAGE = treeIdSchema.parse("t_home")
const SECOND_COPY = treeIdSchema.parse("t_home2")
const THIRD_COPY = treeIdSchema.parse("t_home3")

const NOT_RECORDED: Served = { kind: "not-recorded" }
const NOT_LIVE: Measurement = { kind: "not-live" }

const AT = Date.UTC(2026, 10, 7, 9, 0)
const MINUTE = 60_000

const entry = (
  copy: TreeId,
  revision: number,
  proposal: string,
  at: number,
  extra: { readonly answeredBy?: string; readonly undoes?: number } = {}
): StoredRevision => ({
  treeId: copy,
  revision,
  proposalId: proposalIdSchema.parse(proposal),
  delta: {
    deltaId: `d_${proposal}` as DeltaId,
    treeId: copy,
    baseRevision: revision - 1,
    operations: [{ op: "remove", nodeId: nodeIdSchema.parse("n_banner") }],
  },
  provenance: {
    origin: "system-signal",
    interpreter: "scripted",
    authoredBy: "model",
    confidence: 0.8,
    interpretedAt: new Date(at).toISOString(),
    ...(extra.undoes === undefined ? {} : { undoes: extra.undoes }),
  },
  appliedAt: new Date(at).toISOString(),
  ...(extra.answeredBy === undefined ? {} : { answeredBy: extra.answeredBy }),
})

const record = (
  copyId: TreeId,
  startedAt: number,
  revisions: readonly StoredRevision[]
): CopyRecord => ({ copy: { pageId: PAGE, copyId, startedAt }, revisions })

const first = (revisions: readonly StoredRevision[]): CopyRecord => ({
  copy: firstCopyOf(PAGE),
  revisions,
})

const only = (records: readonly CopyRecord[]): AcceptedChange => {
  const [change] = acceptedChangesOf(PAGE, records)

  if (change === undefined) throw new Error("expected a change")

  return change
}

const pulling = (taken: readonly number[], quiet = false): Reach => ({
  kind: "pulling",
  quiet,
  taken,
})

const titles = (change: AcceptedChange, reach: Reach, now = AT): readonly string[] =>
  timelineOf(change, reach, now, NOT_RECORDED, NOT_LIVE).map((step) => step.title)

describe("acceptedChangesOf", () => {
  it("finds nothing on a page nothing was accepted on", () => {
    expect(acceptedChangesOf(PAGE, [first([])])).toEqual([])
    expect(acceptedChangesOf(PAGE, [])).toEqual([])
  })

  it("lists every change on the page newest first, each standing on the live page", () => {
    const changes = acceptedChangesOf(PAGE, [
      first([entry(PAGE, 1, "p_old", AT), entry(PAGE, 2, "p_new", AT + MINUTE)]),
    ])

    expect(changes.map((change) => change.proposalId)).toEqual(["p_new", "p_old"])
    expect(changes.map((change) => change.ending)).toEqual([
      { kind: "standing" },
      { kind: "standing" },
    ])
  })

  it("keeps when a change was first accepted, not when a newer version replayed it", () => {
    const change = only([
      first([entry(PAGE, 1, "p_kept", AT, { answeredBy: "ana@example.com" })]),
      record(SECOND_COPY, AT + 60 * MINUTE, [entry(SECOND_COPY, 4, "p_kept", AT + 60 * MINUTE)]),
    ])

    expect(change.acceptedAt).toBe(AT)
    expect(change.accepted.answeredBy).toBe("ana@example.com")
    expect(change.ending).toEqual({ kind: "standing" })
  })

  it("says a change the newer version could not take was dropped when that copy started", () => {
    const change = only([
      first([entry(PAGE, 1, "p_gone", AT)]),
      record(SECOND_COPY, AT + 30 * MINUTE, [entry(SECOND_COPY, 4, "p_gone", AT + 30 * MINUTE)]),
      record(THIRD_COPY, AT + 90 * MINUTE, []),
    ])

    expect(change.ending).toEqual({ kind: "dropped", at: AT + 90 * MINUTE })
  })

  it("says a change undone on the live page was undone, and when", () => {
    const changes = acceptedChangesOf(PAGE, [
      first([entry(PAGE, 1, "p_done", AT), entry(PAGE, 2, "p_undo", AT + MINUTE, { undoes: 1 })]),
    ])
    const undone = changes.find((change) => change.proposalId === "p_done")

    expect(undone?.ending).toEqual({ kind: "undone", at: AT + MINUTE })
  })
})

describe("reachOf", () => {
  it("passes the site's standing through, and the answers it took when it pulls", () => {
    expect(reachOf({ kind: "own-site" }, { ok: true, value: [] })).toEqual({ kind: "own-site" })
    expect(reachOf({ kind: "never" }, { ok: true, value: [] })).toEqual({ kind: "never" })
    expect(reachOf({ kind: "unreadable" }, { ok: true, value: [] })).toEqual({
      kind: "unreadable",
    })
    expect(
      reachOf({ kind: "pulling", first: AT, last: AT, quiet: false }, { ok: true, value: [AT] })
    ).toEqual(pulling([AT]))
  })

  it("cannot say when a change went live if the answers taken cannot be read", () => {
    expect(reachOf({ kind: "pulling", first: AT, last: AT, quiet: false }, { ok: false })).toEqual({
      kind: "unreadable",
    })
  })
})

const START: ProposalGoal = {
  intentId: intentIdSchema.parse("i_1"),
  goalId: goalIdSchema.parse(`g_${"1".padStart(32, "0")}`),
  name: "Start presses",
  kind: "activated",
  nodeId: nodeIdSchema.parse("n_start"),
  at: AT,
}

const SERVED: Served = { kind: "recorded", goal: START, stakes: "low" }

const read = (
  liveAt: number,
  before: Pick<Side, "views" | "count">,
  after: Pick<Side, "views" | "count">
): Measurement => {
  const windows = windowsOf(liveAt, {})

  return {
    kind: "read",
    goal: "activated",
    windows,
    before: { range: windows.before, ...before },
    after: { range: windows.after, ...after },
  }
}

describe("timelineOf", () => {
  const accepted = only([first([entry(PAGE, 1, "p_1", AT, { answeredBy: "ana@example.com" })])])

  it("goes Accepted, Live, Measuring, Result, live on the first new answer the site took", () => {
    const live = AT + 2 * MINUTE
    const steps = timelineOf(
      accepted,
      pulling([AT - MINUTE, live]),
      AT + 3 * MINUTE,
      SERVED,
      read(live, { views: 0, count: 0 }, { views: 0, count: 0 })
    )

    expect(steps.map((step) => [step.title, step.state, step.at])).toEqual([
      ["Accepted", "done", AT],
      ["Live", "done", live],
      ["Measuring", "current", AT + 60 * MINUTE],
      ["Result", "upcoming", undefined],
    ])
    expect(steps[0]?.lines[0]).toContain("ana@example.com said yes to it")
    expect(steps[2]?.lines).toEqual([
      "It is measured on its goal, Start presses, from 7 November 2026 to 21 November 2026, against the 14 days before.",
      "So far: no page views.",
    ])
    expect(steps[3]?.lines[0]).toBe("A verdict comes once the 14 days end, on 21 November 2026.")
  })

  it("is live at once on this deployment's own site", () => {
    const steps = timelineOf(accepted, { kind: "own-site" }, AT, NOT_RECORDED, NOT_LIVE)

    expect(steps[1]).toMatchObject({ title: "Live", state: "done", at: AT })
  })

  it("waits for the site's next pull, and says when the site seems to have stopped", () => {
    expect(
      timelineOf(accepted, pulling([AT - MINUTE]), AT, NOT_RECORDED, NOT_LIVE)[1]
    ).toMatchObject({
      title: "Waiting for your site to pull",
      state: "current",
    })
    expect(
      timelineOf(accepted, pulling([], true), AT, NOT_RECORDED, NOT_LIVE)[1]?.lines[0]
    ).toContain("has not pulled for over an hour")
  })

  it("says a site that never pulled is connected for observation only, with the way to connect", () => {
    const live = timelineOf(accepted, { kind: "never" }, AT, NOT_RECORDED, NOT_LIVE)[1]

    expect(live).toMatchObject({ title: "Your site is not pulling yet", connect: true })
    expect(live?.lines[0]).toContain("connected for observation only")
  })

  it("says what it will be measured on before it is live, and measures nothing yet", () => {
    const steps = timelineOf(accepted, { kind: "never" }, AT, SERVED, NOT_LIVE)

    expect(steps[2]?.lines[0]).toBe(
      "Once it is live, it is measured on its goal, Start presses, over the 14 days after, against the 14 days before."
    )
    expect(steps.slice(2).map((step) => step.state)).toEqual(["upcoming", "upcoming"])
  })

  it("gives the verdict once the window has passed, with both sides and the test one click away", () => {
    const steps = timelineOf(
      accepted,
      { kind: "own-site" },
      AT + MEASURING_MS,
      SERVED,
      read(AT, { views: 4_000, count: 100 }, { views: 4_000, count: 160 })
    )

    expect(steps[2]).toMatchObject({ title: "Measuring", state: "done" })
    expect(steps[2]?.lines[0]).toBe(
      "It was measured on its goal, Start presses, from 7 November 2026 to 21 November 2026, against the 14 days before."
    )
    expect(steps[3]).toMatchObject({
      title: "Result: Helped",
      state: "done",
      at: AT + MEASURING_MS,
    })
    expect(steps[3]?.lines).toEqual([
      "Readers did it more often after the change, by more than chance would explain.",
      "Before (24 October 2026 to 7 November 2026, 14 days): 100 presses in 4,000 page views, 2.5 per 100.",
      "After (7 November 2026 to 21 November 2026, 14 days): 160 presses in 4,000 page views, 4 per 100.",
    ])
    expect(steps[3]?.detail?.[1]).toMatch(/^z = 3\.78, p < 0\.001;/u)
  })

  it("says a side was shorter than 14 days where the page changed inside it", () => {
    const windows = windowsOf(AT, { previous: AT - 3 * 24 * 60 * MINUTE })
    const steps = timelineOf(accepted, { kind: "own-site" }, AT + MEASURING_MS, SERVED, {
      kind: "read",
      goal: "activated",
      windows,
      before: { range: windows.before, views: 10, count: 1 },
      after: { range: windows.after, views: 10, count: 1 },
    })

    expect(steps[3]?.title).toBe("Result: Too early")
    expect(steps[3]?.lines).toContain(
      "A side is shorter than 14 days where the page changed, or counting began, inside it: each version is measured on its own."
    )
  })

  it("says a change with no goal recorded is not measured", () => {
    const steps = timelineOf(accepted, { kind: "own-site" }, AT, NOT_RECORDED, {
      kind: "no-goal",
      liveAt: AT,
    })

    expect(steps.map((step) => step.title)).toEqual(["Accepted", "Live", "Not measured"])
  })

  it("says the figures could not be read, rather than giving a verdict", () => {
    const steps = timelineOf(accepted, { kind: "own-site" }, AT + MEASURING_MS, SERVED, {
      kind: "unreadable",
      windows: windowsOf(AT, {}),
    })

    expect(steps[3]).toMatchObject({ title: "Result", state: "upcoming" })
    expect(steps[3]?.lines[0]).toContain("could not be read")
  })

  it("ends at no longer fitting the site's newer version, after being live", () => {
    const dropped = only([
      first([entry(PAGE, 1, "p_1", AT)]),
      record(SECOND_COPY, AT + 60 * MINUTE, []),
    ])

    expect(titles(dropped, pulling([AT + MINUTE]))).toEqual([
      "Accepted",
      "Live",
      "No longer fits the site's newer version",
    ])
    expect(
      timelineOf(dropped, pulling([AT + MINUTE]), AT, NOT_RECORDED, NOT_LIVE).at(-1)
    ).toMatchObject({
      state: "ended",
      at: AT + 60 * MINUTE,
    })
  })

  it("says a change that came off before the site took it was never live", () => {
    const dropped = only([first([entry(PAGE, 1, "p_1", AT)]), record(SECOND_COPY, AT + MINUTE, [])])

    expect(titles(dropped, pulling([AT + 2 * MINUTE]))).toEqual([
      "Accepted",
      "Never live",
      "No longer fits the site's newer version",
    ])
    expect(titles(dropped, { kind: "never" })[1]).toBe("Never live")
  })

  it("ends at undone", () => {
    const [, undone] = acceptedChangesOf(PAGE, [
      first([entry(PAGE, 1, "p_1", AT), entry(PAGE, 2, "p_2", AT + 5 * MINUTE, { undoes: 1 })]),
    ])

    if (undone === undefined) throw new Error("expected the undone change")

    expect(titles(undone, { kind: "own-site" })).toEqual(["Accepted", "Live", "Undone"])
  })
})

describe("liveAtOf and boundsOf", () => {
  const [newer, older] = acceptedChangesOf(PAGE, [
    first([entry(PAGE, 1, "p_old", AT), entry(PAGE, 2, "p_new", AT + 60 * MINUTE)]),
  ])

  if (newer === undefined || older === undefined) throw new Error("expected two changes")

  it("says when a change went live, and nothing while no reader has it", () => {
    expect(liveAtOf(older, pulling([AT + MINUTE]))).toBe(AT + MINUTE)
    expect(liveAtOf(older, pulling([]))).toBeUndefined()
  })

  it("bounds a change by the page's changes either side of it, its own aside", () => {
    const reach = pulling([AT + MINUTE, AT + 61 * MINUTE])
    const copyStarted = AT + 3 * 24 * 60 * MINUTE

    expect(boundsOf(older, AT + MINUTE, [newer, older], [copyStarted], reach)).toEqual({
      next: AT + 61 * MINUTE,
    })
    expect(boundsOf(newer, AT + 61 * MINUTE, [newer, older], [copyStarted], reach)).toEqual({
      previous: AT + MINUTE,
      next: copyStarted,
    })
  })
})

describe("servedOf", () => {
  const P1 = proposalIdSchema.parse("p_1")
  const P2 = proposalIdSchema.parse("p_2")
  const P3 = proposalIdSchema.parse("p_3")
  const I1 = intentIdSchema.parse("i_1")
  const I2 = intentIdSchema.parse("i_2")
  const origins: Origins = {
    kind: "read",
    made: new Map([
      [P1, { proposalId: P1, intentId: I1, stakes: "medium", at: AT }],
      [P2, { proposalId: P2, intentId: I2, stakes: "low", at: AT }],
    ]),
    goals: new Map([
      [
        I1,
        {
          intentId: I1,
          goalId: goalIdSchema.parse(`g_${"1".padStart(32, "0")}`),
          name: "Start presses",
          kind: "activated",
          nodeId: nodeIdSchema.parse("n_start"),
          at: AT,
        },
      ],
    ]),
  }

  it("gives the goal the change's intent served, as it was named then, and its stake", () => {
    const served = servedOf(P1, origins)

    expect(served).toMatchObject({ kind: "recorded", stakes: "medium" })
    expect(goalNameOf(served)).toBe("Start presses")
    expect(stakeWordsOf(served)).toBe("Some risk")
    expect(servedNoteOf(served)).toBeUndefined()
  })

  it("names no goal for a change made from a proposal that named none, and still says its stake", () => {
    expect(servedOf(P2, origins)).toEqual({ kind: "recorded", goal: null, stakes: "low" })
  })

  it("says nothing was recorded for a change made before it was kept", () => {
    const served = servedOf(P3, origins)

    expect(served).toEqual({ kind: "not-recorded" })
    expect(stakeWordsOf(served)).toBeUndefined()
    expect(servedNoteOf(served)).toContain("no record of the goal")
  })

  it("says the goal could not be read, rather than that there was none", () => {
    const served = servedOf(P1, { kind: "unreadable" })

    expect(served).toEqual({ kind: "unreadable" })
    expect(servedNoteOf(served)).toContain("could not be read")
  })
})

describe("statusOf", () => {
  it("names a change by where it has got to: live, waiting, or how it ended", () => {
    const standing = only([first([entry(PAGE, 1, "p_1", AT)])])
    const dropped = only([first([entry(PAGE, 1, "p_1", AT)]), record(SECOND_COPY, AT + 1, [])])

    expect(statusOf(standing, { kind: "own-site" }).title).toBe("Live")
    expect(statusOf(standing, pulling([])).title).toBe("Waiting for your site to pull")
    expect(statusOf(dropped, pulling([])).title).toBe("No longer fits the site's newer version")
  })
})

describe("acceptedPage", () => {
  const many = acceptedChangesOf(PAGE, [
    first(
      Array.from({ length: ACCEPTED_PAGE_SIZE + 3 }, (_, index) =>
        entry(PAGE, index + 1, `p_${String(index).padStart(3, "0")}`, AT + index * MINUTE)
      )
    ),
  ])

  it("shows the newest fifty, and carries on from the last of them", () => {
    const newest = acceptedPage(many, undefined)

    expect(newest.rows).toHaveLength(ACCEPTED_PAGE_SIZE)
    expect(newest.rows[0]?.proposalId).toBe("p_052")
    expect(newest.older).toBe(newest.rows.at(-1)?.proposalId)

    const older = acceptedPage(many, newest.older)

    expect(older.rows.map((change) => change.proposalId)).toEqual(["p_002", "p_001", "p_000"])
    expect(older.older).toBeUndefined()
  })

  it("starts from the newest for a change it does not hold", () => {
    expect(acceptedPage(many, "p_unknown").rows[0]?.proposalId).toBe("p_052")
  })
})

describe("sentencesOf", () => {
  const change = only([first([entry(PAGE, 1, "p_1", AT)])])

  it("names a part by what the page calls it, keeping its id for the record", () => {
    const ids = sequentialIdFactory("banner")
    const banner = partNameOf(
      buildElement(ids, { type: "loom.heading", children: [buildText(ids, "Spring sale")] })
    )
    const [said] = sentencesOf(change, new Map([[PAGE, new Map([["n_banner", banner]])]]))

    expect(said).toContain(banner.name)
    expect(said).not.toContain("n_banner")
  })

  it("keeps the id of a part nothing names, which is all there is to call it", () => {
    expect(sentencesOf(change, new Map())[0]).toContain("n_banner")
  })
})

describe("changedAtOf and boundsAround", () => {
  const [newer, older] = acceptedChangesOf(PAGE, [
    first([entry(PAGE, 1, "p_old", AT), entry(PAGE, 2, "p_new", AT + 60 * MINUTE)]),
  ])

  if (newer === undefined || older === undefined) throw new Error("expected two changes")

  it("finds every time the page changed for its readers, and only this page's", () => {
    const reach = pulling([AT + MINUTE])
    const elsewhere = { ...older, pageId: treeIdSchema.parse("t_about") }

    expect(changedAtOf(PAGE, [newer, older, elsewhere], [AT + 5 * MINUTE], reach)).toEqual([
      AT + 5 * MINUTE,
      AT + MINUTE,
    ])
  })

  it("bounds a moment by the changes either side, never by one at the moment itself", () => {
    expect(boundsAround(AT, [AT - MINUTE, AT, AT + MINUTE, AT - 2 * MINUTE])).toEqual({
      previous: AT - MINUTE,
      next: AT + MINUTE,
    })
    expect(boundsAround(AT, [AT])).toEqual({})
  })
})
