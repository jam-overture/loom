import { describe, expect, it } from "vitest"

import {
  DEFAULT_READER_SIGNAL_WINDOW_MS,
  DEFAULT_REGION_FLOOR,
  READER_SIGNAL_KINDS,
} from "@jam-overture/loom/signals"

import { deploymentNoticeOf } from "./notice"
import {
  INTAKE_KEY,
  readIntakeSettings,
  REGION_FLOOR_KEY,
  REGION_KEY,
  WINDOW_KEY,
} from "./settings"

/**
 * Built through the real reading rather than from a hand-made settings object,
 * because what is under test is the join between an environment and a notice —
 * and a hand-made object would let the two disagree about what a value means.
 */
const noticeOf = (env: Record<string, string | undefined>) =>
  deploymentNoticeOf(readIntakeSettings({ [INTAKE_KEY]: "on", ...env }))

describe("deploymentNoticeOf", () => {
  it("names every kind, whatever any page was broadcast with", () => {
    expect(noticeOf({}).collects.map((collected) => collected.kind)).toEqual([
      ...READER_SIGNAL_KINDS,
    ])
  })

  it("publishes what is never collected, and the fields a delivery carries", () => {
    const notice = noticeOf({})

    expect(notice.refuses.length).toBeGreaterThan(0)
    expect(notice.delivery.map((field) => field.field)).toContain("view")
  })

  describe("how long a delivery lives", () => {
    it("is this deployment's own window, not the framework's default", () => {
      expect(noticeOf({ [WINDOW_KEY]: "900000" }).bufferMs).toBe(900_000)
    })

    it("is the default where a deployment set none", () => {
      expect(noticeOf({}).bufferMs).toBe(DEFAULT_READER_SIGNAL_WINDOW_MS)
    })

    /**
     * A refused window reports the default, which is the number the sweep would
     * have used — and the sweep refuses to run on it at all, which is a louder
     * failure than any notice can carry and is the operator's to fix from the
     * status. Filed rather than hidden: a buffer age is a promise only a
     * scheduled sweep keeps, and nothing in this value says whether one runs.
     */
    it("falls back to the default where the window could not be read", () => {
      expect(noticeOf({ [WINDOW_KEY]: "60" }).bufferMs).toBe(DEFAULT_READER_SIGNAL_WINDOW_MS)
    })
  })

  describe("where readers are", () => {
    it("publishes the floor a bucket is kept at, where a country is read", () => {
      expect(noticeOf({}).region.floor).toBe(DEFAULT_REGION_FLOOR)
      expect(noticeOf({ [REGION_FLOOR_KEY]: "100" }).region.floor).toBe(100)
    })

    /**
     * The floor the door actually counts under, not the one an operator typed:
     * the runtime raises a floor below its own minimum, and a notice naming the
     * smaller number would promise a reader a bucket this deployment will never
     * publish.
     */
    it("publishes the raised floor where a smaller one was refused", () => {
      expect(noticeOf({ [REGION_FLOOR_KEY]: "5" }).region.floor).toBe(DEFAULT_REGION_FLOOR)
    })

    it("says nothing is read where a deployment switched regions off", () => {
      expect(noticeOf({ [REGION_KEY]: "off" }).region.floor).toBeNull()
    })

    /**
     * A misspelled switch counts no region (`receive.ts` reads a header only on
     * `on`), so the notice must not publish a floor under a bucket that does not
     * exist. This is the one direction the ceiling rule does not excuse: naming
     * a floor where nothing is counted would be a sentence about a measurement
     * this deployment is not taking.
     */
    it("says nothing is read where the switch could not be read either", () => {
      expect(noticeOf({ [REGION_KEY]: "coarse" }).region.floor).toBeNull()
    })
  })

  /**
   * Nothing about a person can reach it, and the type system is what holds that
   * (`FIELD_SUBJECTS` has no member for the reader). This is the assertion at
   * the deployment's own join: a notice derived from a real environment names
   * nothing the environment configured about anybody.
   */
  it("carries nothing out of the environment but two numbers", () => {
    const printed = JSON.stringify(
      noticeOf({ [REGION_FLOOR_KEY]: "100", [WINDOW_KEY]: "900000" })
    )

    expect(printed).not.toContain("x-vercel-ip-country")
    expect(printed).not.toContain(INTAKE_KEY)
  })
})
