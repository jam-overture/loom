import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"
import { z } from "zod"

import { modelKeySchema, type ModelKeyStanding } from "@/app/_lib/models/model-keys"

import { DAILY_LOOK_UTC, nextDailyAt, nextLookOf, untilWords } from "./next-look"

const MINUTE = 60_000
const HOUR = 60 * MINUTE

const at = (iso: string): number => Date.parse(iso)

const SET: ModelKeyStanding = {
  kind: "set",
  key: modelKeySchema.parse(`sk-ant-${"k".repeat(24)}`),
  hint: "kkkk",
  setAt: 0,
}

describe("DAILY_LOOK_UTC", () => {
  it("is when vercel.json starts the sweep, so the screen and the schedule cannot drift apart", () => {
    const config = z
      .object({ crons: z.array(z.object({ path: z.string(), schedule: z.string() })) })
      .parse(JSON.parse(readFileSync(join(process.cwd(), "vercel.json"), "utf8")))
    const sweep = config.crons.filter((cron) => cron.path === "/api/proposals")

    expect(sweep.map((cron) => cron.schedule)).toEqual([
      `${DAILY_LOOK_UTC.minute} ${DAILY_LOOK_UTC.hour} * * *`,
    ])
  })
})

describe("nextDailyAt", () => {
  const time = { hour: 14, minute: 0 }

  it("is today's start while it is still ahead", () => {
    expect(nextDailyAt(at("2026-11-09T01:20:00Z"), time)).toBe(at("2026-11-09T14:00:00Z"))
  })

  it("is tomorrow's once today's has passed, across a month's end", () => {
    expect(nextDailyAt(at("2026-11-30T14:00:01Z"), time)).toBe(at("2026-12-01T14:00:00Z"))
  })

  it("is tomorrow's at the very instant today's starts, because that one has begun", () => {
    expect(nextDailyAt(at("2026-11-09T14:00:00Z"), time)).toBe(at("2026-11-10T14:00:00Z"))
  })

  it("keeps the minute", () => {
    expect(nextDailyAt(at("2026-11-09T09:29:00Z"), { hour: 9, minute: 30 })).toBe(
      at("2026-11-09T09:30:00Z")
    )
  })
})

describe("nextLookOf", () => {
  const now = at("2026-11-09T01:20:00Z")

  it("is the next start of the schedule for a project whose key can be used", () => {
    expect(nextLookOf({ now, scheduled: true, key: SET })).toEqual({
      kind: "scheduled",
      at: at("2026-11-09T14:00:00Z"),
    })
  })

  it("says the deployment starts no sweep before anything about the key", () => {
    expect(nextLookOf({ now, scheduled: false, key: SET })).toEqual({ kind: "no-schedule" })
    expect(nextLookOf({ now, scheduled: false, key: { kind: "none" } })).toEqual({
      kind: "no-schedule",
    })
  })

  it("says why a project is passed by: no key, or a key that can no longer be opened", () => {
    expect(nextLookOf({ now, scheduled: true, key: { kind: "none" } })).toEqual({ kind: "no-key" })
    expect(
      nextLookOf({ now, scheduled: true, key: { kind: "unreadable", hint: "test", setAt: 0 } })
    ).toEqual({ kind: "key-unreadable" })
  })
})

describe("untilWords", () => {
  it.each([
    [0, "in under a minute"],
    [59_999, "in under a minute"],
    [MINUTE, "in about 1 minute"],
    [25 * MINUTE + 20_000, "in about 25 minutes"],
    [59 * MINUTE + 40_000, "in about an hour"],
    [HOUR, "in about an hour"],
    [HOUR + 29 * MINUTE, "in about an hour"],
    [12 * HOUR + 40 * MINUTE, "in about 13 hours"],
    [24 * HOUR - 1, "in about 24 hours"],
  ])("says %i ms as %s", (ms, words) => {
    expect(untilWords(ms)).toBe(words)
  })
})
