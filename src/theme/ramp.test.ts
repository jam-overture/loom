import { describe, expect, it } from "vitest"

import { STARTER_FONT_PACKS, STARTER_STYLE_PRESETS } from "./library.js"
import { rampLength, type RampKind } from "./ramp.js"

/**
 * What a browser would compute, read back off the string this module emits.
 *
 * The arithmetic is deliberately re-derived here rather than imported: the
 * claims below are about the **CSS that ships**, not about the helper that
 * built it, and a test that asked `ramp.ts` what `ramp.ts` meant could not tell
 * a correct formula from a correctly-reported wrong one. So this parses the
 * emitted length the way a browser does and refuses anything it does not
 * recognise, which is also how a future third shape of output gets noticed.
 */
const resolveAt = (length: string, width: number): number => {
  const fixed = /^(\d+(?:\.\d+)?)px$/.exec(length)
  if (fixed) return Number(fixed[1])

  const clamped = /^clamp\((\d+(?:\.\d+)?)px, (\d+(?:\.\d+)?)cqi, (\d+(?:\.\d+)?)px\)$/.exec(length)
  if (!clamped) throw new Error(`not a length this test knows how to resolve: ${length}`)

  const floor = Number(clamped[1])
  const preferred = Number(clamped[2])
  const ceiling = Number(clamped[3])

  return Math.min(ceiling, Math.max(floor, (preferred * width) / 100))
}

/** A phone, the library's one width, and the widths either side of both. */
const WIDTHS = [240, 320, 360, 390, 430, 520, 640, 700, 767, 768, 769, 900, 1280, 1920]

const EVERY_STEP: readonly (readonly [string, RampKind, readonly number[]])[] = [
  ...STARTER_FONT_PACKS.map(
    (pack) => [`font pack ${pack.id}`, "type", pack.scaleRamp] as const
  ),
  ...STARTER_STYLE_PRESETS.map(
    (preset) => [`style preset ${preset.id}`, "space", preset.spacingScale] as const
  ),
]

describe("a ramp step as a length", () => {
  it("is the number the pack declared at the library's one width, and above it", () => {
    for (const [subject, kind, steps] of EVERY_STEP) {
      for (const step of steps) {
        for (const width of WIDTHS.filter((candidate) => candidate >= 768)) {
          expect(
            resolveAt(rampLength(step, kind, "fluid"), width),
            `${subject} step ${step} at ${width}`
          ).toBe(step)
        }
      }
    }
  })

  it("never renders a step larger than the pack declared, at any width", () => {
    for (const [subject, kind, steps] of EVERY_STEP) {
      for (const step of steps) {
        for (const width of WIDTHS) {
          expect(
            resolveAt(rampLength(step, kind, "fluid"), width),
            `${subject} step ${step} at ${width}`
          ).toBeLessThanOrEqual(step)
        }
      }
    }
  })

  /**
   * The property that keeps a ramp a ramp. A pack's eight steps are a scale,
   * and a narrow screen that reordered two of them would make `level: 2` set
   * larger than `level: 1` — a defect no overflow measurement would see and no
   * palette test would catch, which is why it is asserted at fourteen widths
   * rather than argued for in a comment.
   */
  it("holds the order the pack declared, at every width", () => {
    for (const [subject, kind, steps] of EVERY_STEP) {
      for (const width of WIDTHS) {
        const resolved = steps.map((step) => resolveAt(rampLength(step, kind, "fluid"), width))
        const pairs = resolved.slice(0, -1).map((value, index) => [value, resolved[index + 1]])

        for (const [smaller, larger] of pairs) {
          expect(
            larger,
            `${subject} at ${width}: ${String(larger)} follows ${String(smaller)}`
          ).toBeGreaterThanOrEqual(Number(smaller))
        }
      }
    }
  })

  it("leaves body copy alone, because every pack sets it at a step a phone holds", () => {
    for (const pack of STARTER_FONT_PACKS) {
      const body = Number(pack.scaleRamp[2])

      expect(rampLength(body, "type", "fluid"), `font pack ${pack.id}`).toBe(`${body}px`)
    }
  })

  it("emits a plain length, not a clamp, for a step already small enough", () => {
    expect(rampLength(18, "type", "fluid")).toBe("18px")
    expect(rampLength(12, "type", "fluid")).toBe("12px")
    expect(rampLength(8, "space", "fluid")).toBe("8px")
    expect(rampLength(0, "space", "fluid")).toBe("0px")
  })

  /**
   * The compression constant's whole justification, pinned so that moving it
   * has to be deliberate.
   *
   * `loom.heading` caps its top step at `11cqi`, a number `Loom primitives`
   * reached by photographing which words lost their last letter on a 390px
   * screen. `0.46` is the ratio that reproduces it from the pack's own number,
   * which is what makes the figure a derivation rather than a taste.
   */
  it("floors a 72px step where the library's measured cap already put it", () => {
    expect(resolveAt(rampLength(72, "type", "fluid"), 390)).toBeCloseTo(0.11 * 390, 0)
  })
})

describe("a ramp step for a medium with no cascade", () => {
  /**
   * The reason the mode exists. `inline-variables.ts` substitutes these values
   * into an image renderer or an email body, neither of which resolves a
   * container unit — so a `clamp()` there is strictly worse than the pixel it
   * replaced, and silently so.
   */
  it("is the declared pixel length, with no clamp and no container unit", () => {
    for (const [subject, kind, steps] of EVERY_STEP) {
      for (const step of steps) {
        const length = rampLength(step, kind, "fixed")

        expect(length, subject).toBe(`${step}px`)
        expect(length, subject).not.toContain("cqi")
        expect(length, subject).not.toContain("clamp")
      }
    }
  })
})
