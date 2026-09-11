import { join } from "node:path"

import type { PlannedShot } from "./plan.js"
import type { SpecimenViewport } from "./specimen.js"

/**
 * Driving a browser, expressed as the four things the harness actually asks of
 * one.
 *
 * The narrow seam is the point. Playwright is not a dependency of this
 * repository and must not become one — it is a tool for taking a picture, not
 * part of what ships — so the code that plans, names, measures and reports has
 * to be exercisable without it. Everything below runs against a double; the
 * adapter that speaks to a real browser is `playwright.ts` and is the only
 * file in this directory that knows the word.
 */

export type Overflow = {
  readonly scrollWidth: number
  readonly innerWidth: number
}

/**
 * The check four reports quote beside every phone shot. It is here rather than
 * in each of them because "the page is wider than the phone" is the single
 * most-reported visual defect in this repository and eyeballing a screenshot
 * is exactly how it gets missed.
 */
export const overflows = (measurement: Overflow): boolean =>
  measurement.scrollWidth > measurement.innerWidth

export type SpecimenPage = {
  readonly goto: (url: string) => Promise<void>
  readonly measure: () => Promise<Overflow>
  readonly capture: (file: string) => Promise<void>
  readonly close: () => Promise<void>
}

export type SpecimenBrowser = {
  readonly open: (viewport: SpecimenViewport) => Promise<SpecimenPage>
  readonly close: () => Promise<void>
}

export type ShotResult = {
  readonly name: string
  readonly file: string
  readonly viewport: SpecimenViewport
  readonly overflow: Overflow
  readonly overflowed: boolean
}

export type CaptureOptions = {
  readonly origin: string
  readonly outDir: string
}

/**
 * Measure before writing the file, so a shot that overflows is still taken.
 *
 * The temptation is to fail on overflow and skip the picture. That gets it
 * exactly backwards: the picture of the broken page is the artefact worth
 * having, and a report that says "1420 > 390" without one is the report nobody
 * can act on.
 */
export const captureShots = async (
  shots: readonly PlannedShot[],
  browser: SpecimenBrowser,
  { origin, outDir }: CaptureOptions
): Promise<readonly ShotResult[]> => {
  const results: ShotResult[] = []

  for (const shot of shots) {
    const page = await browser.open(shot.viewport)
    try {
      await page.goto(`${origin}/${shot.page.file}`)
      const overflow = await page.measure()
      const file = join(outDir, shot.file)
      await page.capture(file)
      results.push({
        name: shot.name,
        file,
        viewport: shot.viewport,
        overflow,
        overflowed: overflows(overflow),
      })
    } finally {
      await page.close()
    }
  }

  return results
}

/** One line per shot, which is what a report pastes. */
export const describeShot = (result: ShotResult): string =>
  `${result.name}  ${result.viewport.width}x${result.viewport.height}@${result.viewport.deviceScaleFactor}x  ` +
  `scrollWidth ${result.overflow.scrollWidth} / innerWidth ${result.overflow.innerWidth}` +
  (result.overflowed ? "  ← overflows" : "")
