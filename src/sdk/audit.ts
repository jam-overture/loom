import type { PrimitiveType } from "../primitive-type.js"

import { probeEditableDecoration, type ConformanceVerdict } from "./conformance.js"
import type { PrimitiveRegistry } from "./registry.js"

/**
 * The registration-time check 0010 asked for, as a function a host calls rather
 * than a side effect of building a registry.
 *
 * The split matters. Probing calls every registered component once, and calling
 * arbitrary components while a module graph is still evaluating is not something
 * a library should do behind a host's back. So `createPrimitiveRegistry` stays
 * pure and this runs where such things belong — in a test, or a build step, where
 * a failure stops a release rather than a request.
 *
 * The audit reports; it does not decide. A primitive that ignores
 * `loom.editable` renders correctly and is only invisible to the portal, so
 * whether that blocks a deployment depends on whether the deployment has a
 * portal. `notDecorated` is there to be asserted empty by a host that cares.
 */

export type PrimitiveAudit = {
  readonly type: PrimitiveType
  readonly verdict: ConformanceVerdict
}

export type RegistryAudit = {
  readonly audits: readonly PrimitiveAudit[]
  /** Registered, renders, invisible to the portal. */
  readonly notDecorated: readonly PrimitiveType[]
  /** The probe could not answer — neither a pass nor a failure. */
  readonly notProbeable: readonly PrimitiveType[]
}

export const auditRegistry = (registry: PrimitiveRegistry): RegistryAudit => {
  const audits = registry.primitives.map((primitive) => ({
    type: primitive.type,
    verdict: probeEditableDecoration(primitive.component),
  }))

  return {
    audits,
    notDecorated: audits.filter((audit) => audit.verdict.outcome === "not-decorated").map((audit) => audit.type),
    notProbeable: audits.filter((audit) => audit.verdict.outcome === "not-probeable").map((audit) => audit.type),
  }
}

const describeVerdict = (verdict: ConformanceVerdict): string => {
  switch (verdict.outcome) {
    case "decorates":
      return "spreads loom.editable"
    case "not-decorated":
      return "does not spread loom.editable — it will be invisible to the portal"
    case "not-probeable":
      return `could not be probed (${verdict.reason})`
  }
}

/** One line per primitive, for a CLI or a failing test's message. */
export const describeRegistryAudit = (audit: RegistryAudit): string =>
  audit.audits.map((entry) => `${entry.type}: ${describeVerdict(entry.verdict)}`).join("\n")
