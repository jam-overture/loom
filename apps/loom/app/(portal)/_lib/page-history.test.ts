import { describe, expect, it } from "vitest"

import { nodeIdSchema, proposalIdSchema, treeIdSchema, type DeltaId } from "@jam-overture/loom"
import type { StoredRevision } from "@jam-overture/loom/store"

import { acceptedChangesOf, type AcceptedChange, type Ending, type Reach } from "./going-live"
import { MEASURING_MS, windowsOf, type Measurement, type Side } from "./measuring"
import {
  historyOf,
  keyOf,
  loomOutcomeOf,
  marksOf,
  newestOf,
  originOf,
  siteOutcomeOf,
  versionWordsOf,
} from "./page-history"
import { firstCopyOf } from "./proposing/copies"

const PAGE = treeIdSchema.parse("t_home")
const OTHER = treeIdSchema.parse("t_about")
const AT = Date.UTC(2026, 9, 1, 9, 0)
const HOUR = 3_600_000
const DAY = 24 * HOUR

const entry = (
  revision: number,
  proposal: string,
  at: number,
  answeredBy?: string
): StoredRevision => ({
  treeId: PAGE,
  revision,
  proposalId: proposalIdSchema.parse(proposal),
  delta: {
    deltaId: `d_${proposal}` as DeltaId,
    treeId: PAGE,
    baseRevision: revision - 1,
    operations: [{ op: "remove", nodeId: nodeIdSchema.parse("n_banner") }],
  },
  provenance: {
    origin: "system-signal",
    interpreter: "scripted",
    authoredBy: "model",
    confidence: 0.8,
    interpretedAt: new Date(at).toISOString(),
  },
  appliedAt: new Date(at).toISOString(),
  ...(answeredBy === undefined ? {} : { answeredBy }),
})

const changesOn = (revisions: readonly StoredRevision[]): readonly AcceptedChange[] =>
  acceptedChangesOf(PAGE, [{ copy: firstCopyOf(PAGE), revisions }])

const ended = (change: AcceptedChange, ending: Ending): AcceptedChange => ({ ...change, ending })

const pulling = (given: readonly number[]): Reach => ({
  kind: "pulling",
  quiet: false,
  answers: given.map((first) => ({ first, last: first, kept: false })),
  namesBack: false,
})

const [newer, older] = changesOn([
  entry(1, "p_old", AT, "ana@example.com"),
  entry(2, "p_new", AT + 3 * DAY),
])

if (newer === undefined || older === undefined) throw new Error("expected two changes")

describe("historyOf", () => {
  it("has nothing for a page nothing happened to", () => {
    expect(historyOf(PAGE, [], [], pulling([]))).toEqual({ pending: [], versions: [] })
  })

  it("lists the live changes and the site's newer versions together, newest first", () => {
    const reach = pulling([AT + HOUR, AT + 3 * DAY + HOUR])
    const history = historyOf(PAGE, [newer, older], [AT + 2 * DAY], reach)

    expect(history.pending).toEqual([])
    expect(history.versions.map(keyOf)).toEqual(["p_new", `site-${AT + 2 * DAY}`, "p_old"])
    expect(history.versions[0]).toMatchObject({ liveAt: AT + 3 * DAY + HOUR })
  })

  it("puts a change the site has not taken on top as pending, and not among the versions", () => {
    const history = historyOf(PAGE, [newer, older], [], pulling([AT + HOUR]))

    expect(history.pending.map(keyOf)).toEqual(["p_new"])
    expect(history.versions.map(keyOf)).toEqual(["p_old"])
  })

  it("keeps a change that came off before any reader had it, where it was accepted", () => {
    const dropped = ended(newer, { kind: "dropped", at: AT + 4 * DAY })
    const history = historyOf(PAGE, [dropped], [], pulling([]))

    expect(history.pending).toEqual([])
    expect(history.versions).toEqual([
      { kind: "loom", change: dropped, liveAt: undefined, at: dropped.acceptedAt },
    ])
  })

  it("leaves out changes on other pages", () => {
    const elsewhere = { ...older, pageId: OTHER }

    expect(historyOf(PAGE, [elsewhere], [], { kind: "own-site" }).versions).toEqual([])
  })

  it("orders a change and a site version at the same moment the same way on every read", () => {
    const history = historyOf(PAGE, [older], [AT], { kind: "own-site" })

    expect(history.versions.map(keyOf)).toEqual(["p_old", `site-${AT}`])
  })
})

describe("newestOf", () => {
  it("has none for a page nothing happened to", () => {
    expect(newestOf(historyOf(PAGE, [], [], pulling([])))).toBeUndefined()
  })

  it("is the newest version readers had", () => {
    const reach = pulling([AT + HOUR, AT + 3 * DAY + HOUR])
    const newest = newestOf(historyOf(PAGE, [newer, older], [AT + 4 * DAY], reach))

    expect(newest === undefined ? undefined : keyOf(newest)).toBe(`site-${AT + 4 * DAY}`)
  })

  it("is a change accepted and on its way to readers, ahead of what they have", () => {
    const newest = newestOf(historyOf(PAGE, [newer, older], [], pulling([AT + HOUR])))

    expect(newest === undefined ? undefined : keyOf(newest)).toBe("p_new")
    expect(newest?.kind === "loom" ? newest.liveAt : "site").toBeUndefined()
  })
})

describe("marksOf", () => {
  it("marks each live change and each of the site's versions, oldest first", () => {
    const reach = pulling([AT + HOUR, AT + 3 * DAY + HOUR])
    const history = historyOf(PAGE, [newer, older], [AT + 2 * DAY], reach)

    expect(marksOf(history.versions)).toEqual([
      { at: AT + HOUR, origin: "loom", label: "Version 1" },
      { at: AT + 2 * DAY, origin: "site", label: "Your site's version" },
      { at: AT + 3 * DAY + HOUR, origin: "loom", label: "Version 2" },
    ])
  })

  it("leaves out a change that came off before any reader had it", () => {
    const dropped = ended(newer, { kind: "dropped", at: AT + 4 * DAY })

    expect(marksOf(historyOf(PAGE, [dropped], [], pulling([])).versions)).toEqual([])
  })
})

const LIVE = AT + HOUR

const side = (from: number, views: number, count: number): Side => ({
  range: { from, to: from + MEASURING_MS },
  views,
  count,
})

const read = (before: Side, after: Side): Extract<Measurement, { kind: "read" }> => ({
  kind: "read",
  goal: "activated",
  windows: windowsOf(LIVE, {}),
  before,
  after,
})

const BEFORE = side(LIVE - MEASURING_MS, 4_000, 100)
const OVER = LIVE + MEASURING_MS + 2 * HOUR

describe("loomOutcomeOf", () => {
  const reach = pulling([LIVE])

  it("gives the verdict once the 14 days are over, with both sides and the test one click away", () => {
    const outcome = loomOutcomeOf(older, reach, read(BEFORE, side(LIVE, 4_000, 200)), OVER)

    expect(outcome.label).toBe("Helped")
    expect(outcome.tone).toBe("good")
    expect(outcome.lines[1]).toMatch(/^Before \(/u)
    expect(outcome.lines[2]).toMatch(/^After \(/u)
    expect(outcome.detail?.[0]).toMatch(/two-proportion test/u)
  })

  it("says Hurt in red where the fall holds up", () => {
    const outcome = loomOutcomeOf(older, reach, read(BEFORE, side(LIVE, 4_000, 40)), OVER)

    expect(outcome).toMatchObject({ label: "Hurt", tone: "bad" })
  })

  it("says Too early below the page views a side needs", () => {
    const outcome = loomOutcomeOf(older, reach, read(BEFORE, side(LIVE, 300, 30)), OVER)

    expect(outcome.label).toBe("Too early")
    expect(outcome.lines[0]).toMatch(/700 short/u)
  })

  it("says it is measuring, with the figures so far, while the 14 days run", () => {
    const outcome = loomOutcomeOf(older, reach, read(BEFORE, side(LIVE, 50, 2)), LIVE + DAY)

    expect(outcome.label).toBe("Measuring")
    expect(outcome.detail).toBeUndefined()
    expect(outcome.lines.at(-1)).toMatch(/^So far: /u)
  })

  it("says a change with no goal recorded is not measured", () => {
    expect(loomOutcomeOf(older, reach, { kind: "no-goal", liveAt: LIVE }, OVER).label).toBe(
      "Not measured"
    )
  })

  it("says figures that could not be read are no statement about the change", () => {
    const outcome = loomOutcomeOf(
      older,
      reach,
      { kind: "unreadable", windows: windowsOf(LIVE, {}) },
      OVER
    )

    expect(outcome.label).toBe("Figures could not be read")
    expect(outcome.lines[0]).toMatch(/Nothing here is a statement/u)
  })

  it("says where a change not live yet has got to, as its timeline does", () => {
    expect(loomOutcomeOf(newer, pulling([]), { kind: "not-live" }, OVER).label).toBe(
      "Waiting for your site to pull"
    )
  })

  it("says a change that came off the page came off, whatever was measured", () => {
    const undone = ended(older, { kind: "undone", at: LIVE + DAY })

    expect(loomOutcomeOf(undone, reach, read(BEFORE, side(LIVE, 4_000, 200)), OVER).label).toBe(
      "Undone"
    )
  })
})

describe("siteOutcomeOf", () => {
  const measured = (measurement: Extract<Measurement, { kind: "read" | "unreadable" }>) =>
    ({ kind: "measured", goal: "Start pressed", measurement }) as const

  it("never gives the site's own edit a verdict, and shows its figures for context", () => {
    const outcome = siteOutcomeOf(measured(read(BEFORE, side(LIVE, 4_000, 200))), OVER)

    expect(outcome.label).toBe("Not a Loom change")
    expect(outcome.tone).toBe("plain")
    expect(outcome.detail).toBeUndefined()
    expect(outcome.lines[0]).toMatch(/gets no verdict\. For context, on Start pressed:$/u)
    expect(outcome.lines[2]).toMatch(/^After \(/u)
  })

  it("shows the figures so far while the after side is still being counted", () => {
    const outcome = siteOutcomeOf(measured(read(BEFORE, side(LIVE, 40, 1))), LIVE + DAY)

    expect(outcome.lines[2]).toMatch(/^So far: /u)
  })

  it("says there are no figures on a page no goal is on", () => {
    expect(siteOutcomeOf({ kind: "no-goal" }, OVER).lines[1]).toMatch(/No goal is on this page/u)
  })

  it("says figures that could not be read, from the goals or the counters, are no statement", () => {
    expect(siteOutcomeOf({ kind: "unreadable" }, OVER).lines[0]).toMatch(/could not be read/u)
    expect(
      siteOutcomeOf(measured({ kind: "unreadable", windows: windowsOf(LIVE, {}) }), OVER).lines[0]
    ).toMatch(/could not be read/u)
  })
})

describe("originOf", () => {
  it("names who accepted a Loom change and when it went live", () => {
    expect(originOf({ kind: "loom", change: older, liveAt: LIVE, at: LIVE })).toBe(
      "Loom change, accepted by ana@example.com · live 1 October 2026"
    )
  })

  it("says a change nobody was asked about was made within the project's rules", () => {
    expect(originOf({ kind: "loom", change: newer, liveAt: undefined, at: newer.acceptedAt })).toBe(
      "Loom change, made within the project's rules · accepted 4 October 2026"
    )
  })

  it("names who asked for a revert the rules let through, and who accepted one they did not", () => {
    const asked = {
      ...newer,
      undoes: older.proposalId,
      accepted: {
        ...newer.accepted,
        provenance: {
          ...newer.accepted.provenance,
          origin: "user-instruction" as const,
          actor: "ana@example.com",
        },
      },
    }

    expect(originOf({ kind: "loom", change: asked, liveAt: LIVE, at: LIVE })).toBe(
      "Revert, asked for by ana@example.com and made within the project's rules · live 1 October 2026"
    )
    expect(
      originOf({
        kind: "loom",
        change: { ...asked, accepted: { ...asked.accepted, answeredBy: "bo@example.com" } },
        liveAt: LIVE,
        at: LIVE,
      })
    ).toBe("Revert, accepted by bo@example.com · live 1 October 2026")
  })

  it("calls the site's newer version its own edit", () => {
    expect(originOf({ kind: "site", at: AT })).toBe(
      "Your site's own edit · published 1 October 2026"
    )
  })
})

describe("versionWordsOf", () => {
  it("leads a change with the first thing it did, the rest under it", () => {
    expect(
      versionWordsOf(older, [newer, older], ["Took the banner off.", "Nothing else."])
    ).toEqual({
      heading: "Version 1: Took the banner off.",
      lines: ["Nothing else."],
    })
  })

  it("names a change it has no sentence for plainly", () => {
    expect(versionWordsOf(older, [older], []).heading).toBe("Version 1: A change Loom made")
  })

  it("names a revert by the version it reverted, with what it put back under it", () => {
    const revert = { ...newer, undoes: older.proposalId }

    expect(versionWordsOf(revert, [revert, older], ["Put the banner back."])).toEqual({
      heading: "Version 2: reverted version 1",
      lines: ["Put the banner back."],
    })
  })
})
