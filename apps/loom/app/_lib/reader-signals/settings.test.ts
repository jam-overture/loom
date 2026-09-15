import { describe, expect, it } from "vitest"

import {
  describeIntakeSwitch,
  INTAKE_KEY,
  readIntakeSettings,
  readIntakeSwitch,
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
