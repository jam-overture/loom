import { readdir, stat } from "node:fs/promises"
import { join } from "node:path"

import { err, ok, type Result } from "../../src/result.js"

/**
 * Finding the browser that is already on disk.
 *
 * Three lanes have written `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`
 * into a script, and the finding that recorded it said the quiet part: *"the
 * number in it will go stale"*. It is a Playwright build number, it changes
 * with the image, and a pinned one fails with a launch error that tells you to
 * run the install command the sandbox blocks.
 *
 * So nothing here names a build. The candidates are derived from what the
 * directory actually holds, newest build first, and the whole of that decision
 * is a pure function over a listing — which is why it can be tested on a
 * machine with no browser on it at all.
 */

export const DEFAULT_BROWSERS_ROOT = "/opt/pw-browsers"

/** A headed Chromium first: the headless shell cannot take a full-page shot. */
const FAMILIES: readonly { readonly prefix: string; readonly binary: string }[] = [
  { prefix: "chromium", binary: "chrome-linux/chrome" },
  { prefix: "chromium_headless_shell", binary: "chrome-linux/headless_shell" },
]

const buildNumber = (entry: string, prefix: string): number | undefined => {
  const match = new RegExp(`^${prefix}-(\\d+)$`).exec(entry)
  const digits = match?.[1]
  return digits === undefined ? undefined : Number(digits)
}

/**
 * The paths worth trying, in order, given what is in the browsers root.
 *
 * The bare `chromium` entry comes first because the image maintains it as a
 * symlink to whichever build is current, which is the one thing here that
 * cannot go stale. Everything after it is a versioned directory, sorted
 * descending, so a root holding two builds picks the newer without being told
 * which.
 */
export const chromiumCandidates = (root: string, entries: readonly string[]): readonly string[] => {
  const present = new Set(entries)
  const paths: string[] = []

  for (const { prefix, binary } of FAMILIES) {
    if (present.has(prefix)) paths.push(join(root, prefix))

    const versioned = entries
      .map((entry) => ({ entry, build: buildNumber(entry, prefix) }))
      .filter((candidate): candidate is { entry: string; build: number } => candidate.build !== undefined)
      .sort((left, right) => right.build - left.build)

    for (const { entry } of versioned) paths.push(join(root, entry, binary))
  }

  return paths
}

export type BrowserError =
  | { readonly code: "no-browsers-root"; readonly root: string }
  | { readonly code: "no-chromium"; readonly root: string; readonly tried: readonly string[] }

export const describeBrowserError = (error: BrowserError): string => {
  switch (error.code) {
    case "no-browsers-root":
      return `no browser directory at ${error.root} — set PLAYWRIGHT_BROWSERS_PATH to where Chromium is installed`
    case "no-chromium":
      return `no Chromium under ${error.root}; tried ${error.tried.join(", ")}`
  }
}

const isFile = async (path: string): Promise<boolean> => {
  try {
    return (await stat(path)).isFile()
  } catch {
    return false
  }
}

/**
 * `PLAYWRIGHT_BROWSERS_PATH` before the default, because that is the variable
 * the image already sets and the one a different image would set differently.
 */
export const browsersRoot = (environment: Readonly<Record<string, string | undefined>>): string =>
  environment["PLAYWRIGHT_BROWSERS_PATH"] ?? DEFAULT_BROWSERS_ROOT

export const locateChromium = async (root: string): Promise<Result<string, BrowserError>> => {
  let entries: readonly string[]
  try {
    entries = await readdir(root)
  } catch {
    return err({ code: "no-browsers-root", root })
  }

  const tried = chromiumCandidates(root, entries)
  for (const candidate of tried) {
    if (await isFile(candidate)) return ok(candidate)
  }

  return err({ code: "no-chromium", root, tried })
}
