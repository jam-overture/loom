import { readdir, mkdir, readFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"

import { chromium } from "playwright-core"

import { bestChromium, DEFAULT_BROWSERS_PATH, executableIn, LAUNCH_ARGUMENTS } from "./browser.js"
import { planShots, shotListSchema, type PlannedShot } from "./plan.js"

/**
 * Takes the pictures a run has to publish.
 *
 * Nine private versions of this had been written across five lanes before it
 * existed, and the recipe was filed four times because the finding kept being
 * true: every routine brief asks for a screenshot and nothing in the repository
 * took one. What each run rediscovered was never the interesting part — it was
 * that the browser is already installed, that it will not start as root without
 * a flag, and that waiting on the network photographs the page before the one
 * you asked for.
 *
 *   pnpm shoot <shot-list.json>
 *
 * The list is a value; `plan.ts` has its shape and the reasoning behind it.
 * Everything this file adds is the browser, and the browser is the part nobody
 * wanted to write again.
 *
 * `playwright-core` rather than `playwright`, deliberately: the difference
 * between them is that `playwright` downloads browsers on install, from a host
 * the sandbox cannot reach, to replace one that is already on disk.
 */

/**
 * Annotated rather than inferred, so TypeScript narrows after a call to it. An
 * inferred `never` from an arrow does not end control flow for the checker, and
 * the alternative is a cast at every use.
 */
const fail: (message: string) => never = (message) => {
  console.error(`loom shoot: ${message}`)
  process.exit(1)
}

const browsersPath = process.env["PLAYWRIGHT_BROWSERS_PATH"] ?? DEFAULT_BROWSERS_PATH

const reason = (cause: unknown): string => (cause instanceof Error ? cause.message : String(cause))

const executable = async (): Promise<string> => {
  const entries = await readdir(browsersPath).catch((cause: unknown) =>
    fail(
      `no browser directory at ${browsersPath} (${reason(cause)}).\n` +
        "Set PLAYWRIGHT_BROWSERS_PATH to where Playwright's browsers are installed.\n" +
        "Do not run `playwright install` — it downloads from a host the sandbox cannot reach."
    )
  )

  const found = bestChromium(entries)
  if (!found) fail(`no Chromium build under ${browsersPath} (saw: ${entries.join(", ")})`)

  return executableIn(browsersPath, found)
}

const readList = async (path: string) => {
  const source = await readFile(resolve(path), "utf8").catch((cause: unknown) =>
    fail(`cannot read ${path}: ${reason(cause)}`)
  )

  const parsed: unknown = (() => {
    try {
      return JSON.parse(source)
    } catch (cause) {
      return fail(`${path} is not JSON: ${reason(cause)}`)
    }
  })()

  const list = shotListSchema.safeParse(parsed)
  if (!list.success) {
    fail(
      `${path} is not a shot list:\n${list.error.issues
        .map((issue) => `  ${issue.path.join(".") || "(root)"}: ${issue.message}`)
        .join("\n")}`
    )
  }

  return list.data
}

/**
 * One context per shot rather than one per run.
 *
 * A viewport belongs to a context, so re-using one across widths resizes the
 * page rather than laying it out at that width from the start — not the same
 * picture for anything that measures itself once. Contexts are cheap; a wrong
 * screenshot that looks right is not.
 */
const take = async (
  browser: Awaited<ReturnType<typeof chromium.launch>>,
  shot: PlannedShot,
  settleMs: number
): Promise<void> => {
  const context = await browser.newContext({
    viewport: shot.viewport,
    /**
     * Without this, a page that reveals on scroll is photographed mid-animation
     * and everything below the fold comes out blank — which is how a full-page
     * screenshot of a page built from `loom.reveal` shows one band and a lot of
     * white.
     */
    reducedMotion: "reduce",
    deviceScaleFactor: 2,
  })

  try {
    const page = await context.newPage()
    await page.goto(shot.url, { waitUntil: "domcontentloaded" })

    if (shot.waitFor !== undefined) await page.locator(shot.waitFor).first().waitFor()
    if (settleMs > 0) await page.waitForTimeout(settleMs)

    await mkdir(dirname(shot.file), { recursive: true })
    await page.screenshot({ path: shot.file, fullPage: shot.fullPage })
    console.log(`loom shoot: ${shot.file} — ${shot.url} at ${shot.viewport.width}px`)
  } finally {
    await context.close()
  }
}

const listPath = process.argv[2]
if (listPath === undefined) fail("usage: pnpm shoot <shot-list.json>")

const list = await readList(listPath)
const shots = planShots(list)
const browser = await chromium.launch({
  executablePath: await executable(),
  args: [...LAUNCH_ARGUMENTS],
})

try {
  for (const shot of shots) await take(browser, shot, list.settleMs)
  console.log(`loom shoot: wrote ${shots.length} picture${shots.length === 1 ? "" : "s"}`)
} finally {
  await browser.close()
}
