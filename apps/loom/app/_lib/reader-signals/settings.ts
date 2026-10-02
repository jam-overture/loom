import { DEFAULT_REGION_FLOOR, regionFloorOf } from "@jam-overture/loom/signals"

import { resolveTrustedHops } from "@/app/(portal)/_lib/auth/subject"

/**
 * Whether this deployment collects reader signals, read off the environment.
 *
 * Signals are off unless a host asks (0136), and until now that sentence was
 * only true of the broadcaster — a page said nothing unless its own code
 * started one. An endpoint is the other half and it does not have a page's
 * excuse: it is one URL, it is public, and a deployment that never asked for
 * reader signals should not have a table filling up because the application it
 * deployed happens to carry a route.
 *
 * So the switch is here, it is off by default, and **a value that is neither on
 * nor absent is neither** — it says so instead of being read as off. That is
 * `resolveConnectionString`'s rule: a deployment that configured something and
 * got silence is the failure nobody notices, and the operator who typed
 * `LOOM_SIGNAL_INTAKE=yes` deserves better than an endpoint that quietly
 * refuses every batch their pages send.
 */

export const INTAKE_KEY = "LOOM_SIGNAL_INTAKE"

/** What the switch accepts. Lowercased before comparison; anything else is a mistake. */
const ON = ["on", "true", "1", "yes"] as const
const OFF = ["off", "false", "0", "no", ""] as const

export type IntakeSwitch =
  | { readonly state: "on" }
  | { readonly state: "off" }
  | { readonly state: "unusable"; readonly given: string }

export const readIntakeSwitch = (value: string | undefined): IntakeSwitch => {
  if (value === undefined) return { state: "off" }

  const given = value.trim().toLowerCase()

  if ((ON as readonly string[]).includes(given)) return { state: "on" }
  if ((OFF as readonly string[]).includes(given)) return { state: "off" }

  return { state: "unusable", given: value }
}

export const describeIntakeSwitch = (chosen: IntakeSwitch): string =>
  chosen.state === "unusable"
    ? `${INTAKE_KEY} is "${chosen.given}", which is neither on nor off, so no batch is being kept. ` +
      `Set it to "on" or remove it.`
    : chosen.state === "on"
      ? "reader signals are being collected"
      : `reader signals are not being collected; set ${INTAKE_KEY}=on to collect them`

export const REGION_KEY = "LOOM_SIGNAL_REGION"
export const REGION_HEADER_KEY = "LOOM_SIGNAL_REGION_HEADER"
export const REGION_FLOOR_KEY = "LOOM_SIGNAL_REGION_FLOOR"

/**
 * The header a coarse region is read from, when nobody says otherwise.
 *
 * This deployment runs on Vercel, which writes the country of the request and
 * overwrites whatever a caller sent. A deployment behind something else names
 * its own header — and a deployment whose proxy *passes a caller's value
 * through* should switch regions off rather than count buckets a stranger can
 * fill, which is why the header is configuration and not a constant.
 */
export const DEFAULT_REGION_HEADER = "x-vercel-ip-country"

/**
 * Whether this deployment counts where its readers are.
 *
 * On by default, and that is the one default in this file that is not off. The
 * endpoint is already the opt-in: a deployment that switched intake on asked to
 * measure its readers, and a count of page views per country — floored so no
 * bucket can be a person, with the address it was read from never stored — is
 * the least a measurement can say about anybody. A deployment with its own
 * reason to refuse sets this to off and the rest keeps working.
 */
export type RegionSwitch =
  | { readonly state: "on" }
  | { readonly state: "off" }
  | { readonly state: "unusable"; readonly given: string }

export const readRegionSwitch = (value: string | undefined): RegionSwitch => {
  if (value === undefined) return { state: "on" }

  const given = value.trim().toLowerCase()

  if (given === "") return { state: "on" }
  if ((ON as readonly string[]).includes(given)) return { state: "on" }
  if ((OFF as readonly string[]).includes(given)) return { state: "off" }

  return { state: "unusable", given: value }
}

/**
 * The smallest bucket this deployment will name.
 *
 * Raise-only, which the runtime enforces and this reports: a floor is what makes
 * the aggregate an aggregate, so an operator may be more careful than the
 * default and may not be less. A number that was refused is said out loud rather
 * than quietly replaced, because an operator who typed a 5 and got 25 should be
 * able to find out why from the status rather than from the source.
 */
export type RegionFloorSetting =
  | { readonly state: "default"; readonly floor: number }
  | { readonly state: "raised"; readonly floor: number }
  | { readonly state: "refused"; readonly given: string; readonly floor: number }

export const readRegionFloor = (value: string | undefined): RegionFloorSetting => {
  if (value === undefined || value.trim() === "") return { state: "default", floor: DEFAULT_REGION_FLOOR }

  const asked = Number(value.trim())
  const floor = regionFloorOf(Number.isInteger(asked) ? asked : undefined)

  return Number.isInteger(asked) && asked >= DEFAULT_REGION_FLOOR
    ? { state: "raised", floor }
    : { state: "refused", given: value, floor }
}

/** Blank is absent: switching regions off is `LOOM_SIGNAL_REGION=off`, not an empty header name. */
const regionHeaderOf = (value: string | undefined): string => {
  const given = value?.trim().toLowerCase() ?? ""

  return given === "" ? DEFAULT_REGION_HEADER : given
}

export type RegionSettings = {
  readonly chosen: RegionSwitch
  readonly header: string
  readonly floor: RegionFloorSetting
}

export const describeRegionSettings = (region: RegionSettings): string => {
  if (region.chosen.state === "unusable") {
    return (
      `${REGION_KEY} is "${region.chosen.given}", which is neither on nor off, so no region is being counted. ` +
      `Set it to "on" or remove it.`
    )
  }

  if (region.chosen.state === "off") {
    return `where readers are is not being counted; remove ${REGION_KEY} to count it`
  }

  const floor =
    region.floor.state === "refused"
      ? `${REGION_FLOOR_KEY} is "${region.floor.given}", which is not a bucket size this runtime will go down to, ` +
        `so the floor is ${region.floor.floor} views`
      : `a bucket is reported once it holds ${region.floor.floor} views`

  return `where readers are is read from ${region.header}; ${floor}`
}

export type IntakeSettings = {
  readonly chosen: IntakeSwitch
  /**
   * How far from the right of a forwarded-for list the caller is. The sign-in
   * throttle's setting, read again rather than duplicated: it is a fact about
   * what sits in front of this deployment, and a deployment cannot have two
   * different numbers of proxies in front of it.
   */
  readonly hops: number
  readonly region: RegionSettings
}

export const readIntakeSettings = (
  env: Record<string, string | undefined> = process.env
): IntakeSettings => ({
  chosen: readIntakeSwitch(env[INTAKE_KEY]),
  hops: resolveTrustedHops(env["LOOM_PORTAL_TRUSTED_PROXY_HOPS"]),
  region: {
    chosen: readRegionSwitch(env[REGION_KEY]),
    header: regionHeaderOf(env[REGION_HEADER_KEY]),
    floor: readRegionFloor(env[REGION_FLOOR_KEY]),
  },
})
