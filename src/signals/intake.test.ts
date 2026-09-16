import { describe, expect, it } from "vitest"

import {
  admit,
  createIntakeGate,
  CROWDED_SUBJECT,
  DEFAULT_INTAKE_POLICY,
  describeIntakeVerdict,
  type IntakeCount,
  type IntakePolicy,
} from "./intake.js"

const policy: IntakePolicy = { maxBytes: 100, deliveries: 3, windowMs: 1000, subjects: 2 }

const count = (deliveries: number, windowStartedAt: number): IntakeCount => ({
  deliveries,
  windowStartedAt,
})

describe("admit", () => {
  it("opens a window for a subject it has never seen", () => {
    const verdict = admit(null, 10, 5_000, policy)

    expect(verdict).toEqual({ code: "admitted", count: count(1, 5_000) })
  })

  it("counts inside the window", () => {
    const verdict = admit(count(1, 5_000), 10, 5_500, policy)

    expect(verdict).toEqual({ code: "admitted", count: count(2, 5_000) })
  })

  it("refuses the delivery past the limit, and says how long is left", () => {
    const verdict = admit(count(3, 5_000), 10, 5_400, policy)

    expect(verdict).toEqual({ code: "too-often", limit: 3, retryAfterMs: 600 })
  })

  it("starts a fresh window once the old one has closed", () => {
    const verdict = admit(count(3, 5_000), 10, 6_000, policy)

    expect(verdict).toEqual({ code: "admitted", count: count(1, 6_000) })
  })

  /** A count stamped in the future is two instances disagreeing, not a lockout anybody imposed. */
  it("starts a fresh window for a count stamped after now", () => {
    const verdict = admit(count(3, 9_000), 10, 5_000, policy)

    expect(verdict).toEqual({ code: "admitted", count: count(1, 5_000) })
  })

  it("refuses a body over the ceiling", () => {
    const verdict = admit(null, 101, 5_000, policy)

    expect(verdict).toEqual({ code: "too-large", count: count(1, 5_000), limit: 100, given: 101 })
  })

  it("admits a body exactly at the ceiling", () => {
    expect(admit(null, 100, 5_000, policy).code).toBe("admitted")
  })

  /** The refusal that cost the sender nothing is the endpoint that can be hammered for free. */
  it("spends the window on a body it refused for size", () => {
    const refused = admit(count(2, 5_000), 101, 5_100, policy)

    expect(refused).toMatchObject({ code: "too-large", count: count(3, 5_000) })
    expect(admit(refused.code === "too-large" ? refused.count : null, 10, 5_200, policy).code).toBe(
      "too-often"
    )
  })

  /** The rate is decided first, so an over-budget caller's body is never measured. */
  it("refuses an over-budget caller for the rate rather than the size", () => {
    expect(admit(count(3, 5_000), 999_999, 5_100, policy).code).toBe("too-often")
  })

  it("treats an unmeasurable body as too large", () => {
    expect(admit(null, Number.NaN, 5_000, policy).code).toBe("too-large")
    expect(admit(null, -1, 5_000, policy).code).toBe("too-large")
  })

  it("does not let an unusable clock into the arithmetic", () => {
    const verdict = admit(count(3, 5_000), 10, Number.NaN, policy)

    expect(verdict).toEqual({ code: "admitted", count: count(1, 0) })
  })

  it("never reports a negative wait", () => {
    const verdict = admit(count(3, 5_000), 10, 5_999.9, policy)

    expect(verdict).toMatchObject({ code: "too-often" })
    if (verdict.code === "too-often") expect(verdict.retryAfterMs).toBeGreaterThanOrEqual(0)
  })
})

describe("the default policy", () => {
  /** A delivery larger than a beacon may carry did not come from one. */
  it("is the ceiling sendBeacon itself imposes", () => {
    expect(DEFAULT_INTAKE_POLICY.maxBytes).toBe(64 * 1024)
  })

  /** Twelve deliveries a minute is one page view at the default flush. */
  it("leaves room for several tabs at the broadcaster's own cadence", () => {
    expect(DEFAULT_INTAKE_POLICY.deliveries / (DEFAULT_INTAKE_POLICY.windowMs / 5_000)).toBeGreaterThan(
      4
    )
  })
})

describe("describeIntakeVerdict", () => {
  it("names the limit and what was given", () => {
    expect(describeIntakeVerdict(admit(null, 101, 0, policy))).toContain("101")
    expect(describeIntakeVerdict(admit(count(3, 0), 1, 0, policy))).toContain("1000ms")
    expect(describeIntakeVerdict(admit(null, 1, 0, policy))).toBe("admitted")
  })
})

describe("createIntakeGate", () => {
  it("counts subjects apart", () => {
    const gate = createIntakeGate(policy)

    for (let sent = 0; sent < 3; sent += 1) expect(gate.admit("a", 1, 0).code).toBe("admitted")

    expect(gate.admit("a", 1, 0).code).toBe("too-often")
    expect(gate.admit("b", 1, 0).code).toBe("admitted")
  })

  it("remembers across calls and forgets when the window closes", () => {
    const gate = createIntakeGate(policy)

    for (let sent = 0; sent < 3; sent += 1) gate.admit("a", 1, 0)

    expect(gate.admit("a", 1, 999).code).toBe("too-often")
    expect(gate.admit("a", 1, 1_000).code).toBe("admitted")
  })

  /** A closed window holds nothing anybody is owed, so it is the first thing dropped. */
  it("sweeps closed windows before it calls itself full", () => {
    const gate = createIntakeGate(policy)

    gate.admit("a", 1, 0)
    gate.admit("b", 1, 0)
    expect(gate.subjects()).toBe(2)

    expect(gate.admit("c", 1, 2_000).code).toBe("admitted")
    expect(gate.subjects()).toBe(1)
  })

  /**
   * Full of live windows, a new caller shares one count rather than being waved
   * through — a limiter an attacker can fill their way out of is worse than
   * none, because the deployment believes it has one.
   */
  it("shares a count once it is full of live windows", () => {
    const gate = createIntakeGate(policy)

    gate.admit("a", 1, 0)
    gate.admit("b", 1, 0)

    expect(gate.admit("c", 1, 100).code).toBe("admitted")
    expect(gate.admit("d", 1, 100).code).toBe("admitted")
    expect(gate.admit("e", 1, 100).code).toBe("admitted")
    expect(gate.admit("f", 1, 100).code).toBe("too-often")

    /** And the crowd never displaces the subjects the gate was already counting. */
    expect(gate.subjects()).toBe(policy.subjects + 1)
    expect(gate.admit("a", 1, 100).code).toBe("admitted")
  })

  it("keeps counting a subject it already holds when it is full", () => {
    const gate = createIntakeGate(policy)

    gate.admit("a", 1, 0)
    gate.admit("b", 1, 0)
    gate.admit(CROWDED_SUBJECT, 1, 0)

    expect(gate.admit("a", 1, 0).code).toBe("admitted")
    expect(gate.admit("a", 1, 0).code).toBe("admitted")
    expect(gate.admit("a", 1, 0).code).toBe("too-often")
  })

  it("is bounded", () => {
    const gate = createIntakeGate(policy)

    for (let subject = 0; subject < 500; subject += 1) gate.admit(`s${subject}`, 1, 0)

    expect(gate.subjects()).toBeLessThanOrEqual(policy.subjects + 1)
  })
})
