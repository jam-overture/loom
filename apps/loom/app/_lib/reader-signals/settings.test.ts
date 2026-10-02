import { describe, expect, it } from "vitest"

import { DEFAULT_REGION_FLOOR } from "@jam-overture/loom/signals"

import {
  DEFAULT_REGION_HEADER,
  describeIntakeSwitch,
  describeRegionSettings,
  INTAKE_KEY,
  readIntakeSettings,
  readIntakeSwitch,
  readRegionFloor,
  readRegionSwitch,
  REGION_FLOOR_KEY,
  REGION_HEADER_KEY,
  REGION_KEY,
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
