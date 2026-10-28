import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

import {
  DEFAULT_READER_SIGNAL_WINDOW_MS,
  DEFAULT_REGION_FLOOR,
  MIN_READER_SIGNAL_WINDOW_MS,
} from "@jam-overture/loom/signals"

import {
  DEFAULT_REGION_HEADER,
  describeCollectionWindow,
  describeIntakeSwitch,
  describeRegionSettings,
  describeSweepSchedule,
  INTAKE_KEY,
  readCollectionWindow,
  readIntakeSettings,
  readIntakeSwitch,
  readRegionFloor,
  readRegionSwitch,
  readSweepSchedule,
  REGION_FLOOR_KEY,
  REGION_HEADER_KEY,
  REGION_KEY,
  SWEEP_KEY,
  WINDOW_KEY,
} from "./settings"

describe("readIntakeSwitch", () => {
  it("is off when nothing is set, because signals are off unless a host asks", () => {
    expect(readIntakeSwitch(undefined)).toEqual({ state: "off" })
    expect(readIntakeSwitch("")).toEqual({ state: "off" })
  })

  it("takes the words an operator is likely to type", () => {
    for (const on of ["on", "ON", " on ", "true", "1", "yes"]) {
      expect(readIntakeSwitch(on)).toEqual({ state: "on" })
    }

    for (const off of ["off", "FALSE", "0", "no"]) {
      expect(readIntakeSwitch(off)).toEqual({ state: "off" })
    }
  })

  /**
   * The failure this exists to prevent: a deployment that configured something,
   * got silence, and has no way to tell that from an audience of nobody.
   */
  it("refuses to read a value it does not know as off", () => {
    expect(readIntakeSwitch("enabled")).toEqual({ state: "unusable", given: "enabled" })
    expect(readIntakeSwitch("maybe")).toEqual({ state: "unusable", given: "maybe" })
  })

  it("keeps what was typed, so the message can quote it", () => {
    const described = describeIntakeSwitch(readIntakeSwitch("Enabled"))

    expect(described).toContain('"Enabled"')
    expect(described).toContain(INTAKE_KEY)
  })

  it("tells an operator how to switch it on", () => {
    expect(describeIntakeSwitch({ state: "off" })).toContain(`${INTAKE_KEY}=on`)
    expect(describeIntakeSwitch({ state: "on" })).toContain("being collected")
  })
})

describe("readIntakeSettings", () => {
  it("reads the switch and the proxy hops off the environment", () => {
    const settings = readIntakeSettings({
      [INTAKE_KEY]: "on",
      LOOM_PORTAL_TRUSTED_PROXY_HOPS: "2",
    })

    expect(settings.chosen).toEqual({ state: "on" })
    expect(settings.hops).toBe(2)
  })

  /** One deployment cannot have two different numbers of proxies in front of it. */
  it("shares the sign-in throttle's hop count rather than keeping its own", () => {
    expect(readIntakeSettings({}).hops).toBe(1)
    expect(readIntakeSettings({ LOOM_PORTAL_TRUSTED_PROXY_HOPS: "nonsense" }).hops).toBe(1)
  })

  it("is off on an environment that says nothing", () => {
    expect(readIntakeSettings({}).chosen).toEqual({ state: "off" })
  })
})

describe("readRegionSwitch", () => {
  /**
   * The one default here that is not off. The endpoint is already the opt-in,
   * and a floored count of page views per country is the least a measurement can
   * say about anybody.
   */
  it("is on when nothing is set", () => {
    expect(readRegionSwitch(undefined)).toEqual({ state: "on" })
    expect(readRegionSwitch("")).toEqual({ state: "on" })
  })

  it("can be switched off by a deployment with its own reason", () => {
    expect(readRegionSwitch("off")).toEqual({ state: "off" })
    expect(readRegionSwitch("NO")).toEqual({ state: "off" })
  })

  it("refuses to read a value it does not know as either", () => {
    expect(readRegionSwitch("coarse")).toEqual({ state: "unusable", given: "coarse" })
  })
})

describe("readRegionFloor", () => {
  it("is the runtime's bucket size when nobody asked", () => {
    expect(readRegionFloor(undefined)).toEqual({ state: "default", floor: DEFAULT_REGION_FLOOR })
  })

  it("can be raised by a deployment that wants more caution", () => {
    expect(readRegionFloor("250")).toEqual({ state: "raised", floor: 250 })
  })

  /**
   * The floor is what makes the aggregate an aggregate, so an operator may be
   * more careful than the default and never less — and is told, rather than
   * quietly given a number they did not type.
   */
  it("refuses a smaller bucket than the runtime allows, and keeps what was asked for", () => {
    expect(readRegionFloor("5")).toEqual({ state: "refused", given: "5", floor: DEFAULT_REGION_FLOOR })
    expect(readRegionFloor("0")).toEqual({ state: "refused", given: "0", floor: DEFAULT_REGION_FLOOR })
    expect(readRegionFloor("lots")).toEqual({ state: "refused", given: "lots", floor: DEFAULT_REGION_FLOOR })
    expect(readRegionFloor("40.5")).toEqual({ state: "refused", given: "40.5", floor: DEFAULT_REGION_FLOOR })
  })
})

describe("describeRegionSettings", () => {
  const settings = (over: Record<string, unknown> = {}) => ({
    chosen: { state: "on" } as const,
    header: DEFAULT_REGION_HEADER,
    floor: readRegionFloor(undefined),
    ...over,
  })

  it("names the header it reads and the bucket size it reports at", () => {
    const described = describeRegionSettings(settings())

    expect(described).toContain(DEFAULT_REGION_HEADER)
    expect(described).toContain(String(DEFAULT_REGION_FLOOR))
  })

  it("quotes a floor it refused, so an operator can see why they got another", () => {
    expect(describeRegionSettings(settings({ floor: readRegionFloor("5") }))).toContain('"5"')
  })

  it("tells an operator what to remove to switch it back on", () => {
    expect(describeRegionSettings(settings({ chosen: readRegionSwitch("off") }))).toContain(REGION_KEY)
  })

  it("quotes a switch it could not read", () => {
    const described = describeRegionSettings(settings({ chosen: readRegionSwitch("coarse") }))

    expect(described).toContain('"coarse"')
    expect(described).toContain("no region is being counted")
  })
})

describe("the region an environment configures", () => {
  it("reads the switch, the header and the floor", () => {
    const settings = readIntakeSettings({
      [INTAKE_KEY]: "on",
      [REGION_HEADER_KEY]: " CF-IPCountry ",
      [REGION_FLOOR_KEY]: "100",
    })

    expect(settings.region.chosen).toEqual({ state: "on" })
    expect(settings.region.header).toBe("cf-ipcountry")
    expect(settings.region.floor).toEqual({ state: "raised", floor: 100 })
  })

  it("reads the platform's own header on an environment that says nothing", () => {
    expect(readIntakeSettings({}).region.header).toBe(DEFAULT_REGION_HEADER)
    expect(readIntakeSettings({ [REGION_HEADER_KEY]: "  " }).region.header).toBe(DEFAULT_REGION_HEADER)
  })
})

describe("readCollectionWindow", () => {
  /**
   * The whole point of the unit: the number the sweep runs on is the number the
   * runtime publishes the argument for, and there is no second copy of it to
   * drift. This fails if anybody writes an hour out again anywhere.
   */
  it("is the runtime's own default when nothing is set", () => {
    expect(readCollectionWindow(undefined)).toEqual({
      state: "default",
      windowMs: DEFAULT_READER_SIGNAL_WINDOW_MS,
    })
    expect(readCollectionWindow("   ")).toEqual({
      state: "default",
      windowMs: DEFAULT_READER_SIGNAL_WINDOW_MS,
    })
  })

  it("takes a window an operator set, and says it was set", () => {
    expect(readCollectionWindow("900000")).toEqual({ state: "set", windowMs: 900_000 })
    expect(readCollectionWindow(" 86400000 ")).toEqual({ state: "set", windowMs: 86_400_000 })
    expect(readCollectionWindow(String(MIN_READER_SIGNAL_WINDOW_MS))).toEqual({
      state: "set",
      windowMs: MIN_READER_SIGNAL_WINDOW_MS,
    })
  })

  /**
   * `60` is the units mistake this setting is written wrongly by: it reads as an
   * hour and means a minute and a tenth of a second. The runtime's own schema is
   * what refuses it, which is why there is no second rule about it here.
   */
  it("refuses a value that is not a window this runtime would sweep on", () => {
    for (const given of ["60", "0", "-1", "nonsense", "90000.5", "an hour"]) {
      expect(readCollectionWindow(given)).toEqual({
        state: "unusable",
        given,
        windowMs: DEFAULT_READER_SIGNAL_WINDOW_MS,
      })
    }
  })

  /**
   * The state is what carries the refusal, not the number — a caller reading
   * only `windowMs` would sweep on an hour the operator never asked for, so the
   * two are kept distinguishable and the sweep reads the state.
   */
  it("carries the default beside a refused value, so a status has a number to print", () => {
    const refused = readCollectionWindow("60")

    expect(refused.windowMs).toBe(DEFAULT_READER_SIGNAL_WINDOW_MS)
    expect(refused.state).not.toBe("default")
    expect(refused.state).not.toBe("set")
  })
})

describe("describeCollectionWindow", () => {
  it("quotes what was typed and names the units it wanted", () => {
    const described = describeCollectionWindow(readCollectionWindow("60"))

    expect(described).toContain('"60"')
    expect(described).toContain(WINDOW_KEY)
    expect(described).toContain(String(MIN_READER_SIGNAL_WINDOW_MS))
    expect(described).toContain("nothing is being counted")
  })

  it("tells an operator how to change a default, and does not nag about one they set", () => {
    expect(describeCollectionWindow(readCollectionWindow(undefined))).toContain(
      `set ${WINDOW_KEY}`
    )
    expect(describeCollectionWindow(readCollectionWindow("900000"))).not.toContain(
      `set ${WINDOW_KEY}`
    )
    expect(describeCollectionWindow(readCollectionWindow("900000"))).toContain("900000ms")
  })
})

describe("the window an environment configures", () => {
  it("is read off the environment with the rest of the intake's settings", () => {
    expect(readIntakeSettings({ [WINDOW_KEY]: "900000" }).window).toEqual({
      state: "set",
      windowMs: 900_000,
    })
    expect(readIntakeSettings({}).window).toEqual({
      state: "default",
      windowMs: DEFAULT_READER_SIGNAL_WINDOW_MS,
    })
  })

  /**
   * A window that cannot be read stops the sweep and nothing else. Refusing
   * batches at the door as well would lose the deliveries a sweep could still
   * count the moment the value is fixed.
   */
  it("does not reach the switch the door reads", () => {
    const settings = readIntakeSettings({ [INTAKE_KEY]: "on", [WINDOW_KEY]: "nonsense" })

    expect(settings.window.state).toBe("unusable")
    expect(settings.chosen).toEqual({ state: "on" })
  })
})

describe("readSweepSchedule", () => {
  it("states nothing where nothing was set", () => {
    expect(readSweepSchedule(undefined)).toEqual({ state: "unstated" })
    expect(readSweepSchedule("   ")).toEqual({ state: "unstated" })
  })

  it("takes a whole number of milliseconds above nought", () => {
    expect(readSweepSchedule("600000")).toEqual({ state: "stated", everyMs: 600_000 })
    expect(readSweepSchedule(" 60000 ")).toEqual({ state: "stated", everyMs: 60_000 })
  })

  /**
   * A value that is not an interval is **neither**, as everywhere else in this
   * file. The ordinary way this one is written wrongly is a units mistake with
   * a suffix — `10m` — and reading it as unstated would leave an operator who
   * configured something looking at a privacy page that promises nothing, with
   * nothing anywhere saying why.
   */
  it("is neither for anything that is not a whole, positive interval", () => {
    for (const given of ["10m", "0", "-600000", "1.5", "nonsense", "1e3ms"]) {
      expect(readSweepSchedule(given)).toEqual({ state: "unusable", given })
    }
  })
})

describe("describeSweepSchedule", () => {
  it("names the key, the value and what readers are told when it could not be read", () => {
    const sentence = describeSweepSchedule(readSweepSchedule("10m"))

    expect(sentence).toContain(SWEEP_KEY)
    expect(sentence).toContain('"10m"')
    expect(sentence).toContain("ripens")
  })

  it("says the interval and that it is published, where one was stated", () => {
    expect(describeSweepSchedule(readSweepSchedule("600000"))).toContain("600000ms")
  })

  it("tells an operator how to publish a ceiling, where none is stated", () => {
    const sentence = describeSweepSchedule(readSweepSchedule(undefined))

    expect(sentence).toContain("not stated")
    expect(sentence).toContain(SWEEP_KEY)
  })
})

describe("the schedule an environment states", () => {
  it("is read off the environment with the rest of the intake's settings", () => {
    expect(readIntakeSettings({ [SWEEP_KEY]: "600000" }).sweep).toEqual({
      state: "stated",
      everyMs: 600_000,
    })
    expect(readIntakeSettings({}).sweep).toEqual({ state: "unstated" })
  })

  /**
   * It reaches neither the door nor the sweep: a schedule nobody stated costs a
   * sentence on a privacy page and nothing a run does, which is the whole
   * difference between this setting and the window beside it.
   */
  it("stops nothing that the window stops", () => {
    const settings = readIntakeSettings({ [INTAKE_KEY]: "on", [SWEEP_KEY]: "nonsense" })

    expect(settings.sweep.state).toBe("unusable")
    expect(settings.chosen).toEqual({ state: "on" })
    expect(settings.window).toEqual({
      state: "default",
      windowMs: DEFAULT_READER_SIGNAL_WINDOW_MS,
    })
  })
})

/**
 * The fault this unit closes was a second spelling of one default, in a file no
 * type reaches: a script. So the guard is at the source, because that is where
 * the duplication would come back.
 */
describe("the sweep this deployment runs", () => {
  /**
   * Comments out, because the check is about what the script *does* and the
   * paragraph explaining the duplication names the arithmetic it replaced. A
   * negative assertion over prose fails on the sentence describing the fix,
   * which is the test failing for the opposite of its reason.
   */
  const codeOf = (path: string): string =>
    readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "")
      .replace(/_/g, "")

  const SWEEP = codeOf("../../../scripts/signals-collect.ts")

  it("reads the window from these settings rather than parsing the environment itself", () => {
    expect(SWEEP).toContain("readCollectionWindow")
    expect(SWEEP).not.toContain("readerSignalWindowSchema")
  })

  it("refuses to sweep on a window it could not read, rather than falling back", () => {
    expect(SWEEP).toContain('state === "unusable"')
    expect(SWEEP).toContain("process.exit(1)")
  })

  /**
   * Both spellings, and underscores stripped first, because the duplication
   * this closes was `60 * 60 * 1000` and the next one would as easily be
   * `3_600_000`. Over the code of both files: the one that held the second copy
   * and the one that holds the only reading.
   */
  /**
   * The script is the sweep, so it is where an operator finds out whether
   * anybody was told how often it runs — and it must not refuse on it. The
   * schedule is *called* on exactly one line of the file and that line is a
   * log, which is the assertion that no branch of this script turns on it: the
   * window has four exits in here and the schedule may have none.
   */
  it("prints the schedule it is the subject of, and never refuses on it", () => {
    const mentions = SWEEP.split("\n").filter((line) => line.includes("SweepSchedule("))

    expect(mentions).toHaveLength(1)
    expect(mentions[0]).toContain("console.log")
  })

  it("spells an hour nowhere, in either file", () => {
    for (const code of [SWEEP, codeOf("./settings.ts")]) {
      expect(code).not.toMatch(/60 ?\* ?60 ?\* ?1000/)
      expect(code).not.toContain("3600000")
    }
  })
})
