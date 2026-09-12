import { channelsOf } from "./contrast.js"

/**
 * A colour in CIELAB, which is where every perceptual question about a palette
 * gets answered.
 *
 * Two modules ask one: `separation.ts` asks *how far apart are these two*, and
 * `measure.ts` asks *how much colour is in this one*. Both are distances in the
 * same space, so the conversion lives here rather than twice — the rule
 * `channelsOf` already set, where two parsers would have been two answers to
 * whether a colour can be measured at all.
 *
 * Nothing here decides anything. It converts, and declines the forms
 * `channelsOf` declines.
 */

/**
 * sRGB channel, linearised.
 *
 * The knee is 0.04045, the sRGB specification's own value, where `contrast.ts`
 * uses WCAG's 0.03928 for the same curve. The two differ in the fourth decimal
 * of a rounding and each module keeps the constant its own standard publishes,
 * rather than one of them citing a standard it is not following.
 */
export const linearise = (value: number): number => {
  const c = value / 255

  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

/** CIE's cube-root transfer, with the linear segment near black. */
const transfer = (t: number): number => (t > 216 / 24389 ? Math.cbrt(t) : (841 / 108) * t + 4 / 29)

/** Lightness, green–red, blue–yellow. */
export type Lab = readonly [number, number, number]

/**
 * L*a*b* under D65, the white point sRGB is defined against, or `undefined`
 * when the colour is a form `channelsOf` declines to guess at.
 */
export const labOf = (colour: string): Lab | undefined => {
  const channels = channelsOf(colour)
  if (!channels) return undefined

  const [red, green, blue] = channels
  const r = linearise(red)
  const g = linearise(green)
  const b = linearise(blue)

  const x = transfer((0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047)
  const y = transfer(0.2126 * r + 0.7152 * g + 0.0722 * b)
  const z = transfer((0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883)

  return [116 * y - 16, 500 * (x - y), 200 * (y - z)]
}
