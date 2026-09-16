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

export type IntakeSettings = {
  readonly chosen: IntakeSwitch
  /**
   * How far from the right of a forwarded-for list the caller is. The sign-in
   * throttle's setting, read again rather than duplicated: it is a fact about
   * what sits in front of this deployment, and a deployment cannot have two
   * different numbers of proxies in front of it.
   */
  readonly hops: number
}

export const readIntakeSettings = (
  env: Record<string, string | undefined> = process.env
): IntakeSettings => ({
  chosen: readIntakeSwitch(env[INTAKE_KEY]),
  hops: resolveTrustedHops(env["LOOM_PORTAL_TRUSTED_PROXY_HOPS"]),
})
