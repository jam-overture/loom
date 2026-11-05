import { describeUnmeasured } from "./repetition.js"
import type { DocumentWeight, WeighedStyle } from "./weight.js"

/**
 * The reading, printed.
 *
 * Under the same indent `describeShot` uses, and for the same reason: a run
 * reads these lines beside each other and a second shape of output is a second
 * thing to learn. It prints the number and says nothing about whether the
 * number is acceptable — 0213.
 */

const thousands = (count: number): string => count.toLocaleString("en-US")

const percent = (part: number, whole: number): number =>
  whole === 0 ? 0 : Math.round((part / whole) * 100)

const describeStyle = (style: WeighedStyle, documentBytes: number): string => {
  if (style.unmeasured !== undefined) return `    style  ${describeUnmeasured(style.unmeasured)}`

  const repetition = style.repetition
  if (repetition === undefined || repetition.copies <= 1) {
    return `    style  ${thousands(style.bytes)} bytes  carried once`
  }

  return (
    `    style  ${thousands(style.bytes)} bytes  carried ${thousands(repetition.copies)} times  ` +
    `at least ${thousands(repetition.repeatedBytes)} bytes repeated ` +
    `(${percent(repetition.repeatedBytes, documentBytes)}% of the document)`
  )
}

export const describeWeight = (subject: string, weight: DocumentWeight): string =>
  [
    `${subject}  ${thousands(weight.bytes)} bytes`,
    ...weight.styles.map((style) => describeStyle(style, weight.bytes)),
  ].join("\n")
