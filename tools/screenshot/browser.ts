/**
 * Finding the browser that is already installed.
 *
 * Every lane that needs a picture has hit the same two walls, and both are about
 * the browser rather than about the picture: `playwright install` cannot reach
 * its download host from the sandbox, and a current Playwright looks for a build
 * number that is not the one the image has. So the answer is never to install
 * one — it is to point at the build that is there, whichever it turns out to be.
 *
 * Nothing here launches anything or touches the filesystem. It is given the
 * names in a browsers directory and works out which of them is a Chromium and
 * where its binary sits, which is the whole part that is worth a test: the
 * directory this reads is not the same one on the machine that reads this file.
 */

/**
 * Where Playwright keeps its browsers, by convention and by the environment
 * variable that overrides it.
 *
 * The build is pinned by the image and not by this repository, which is a real
 * gap and one this cannot close: a screenshot taken here and a screenshot taken
 * in six months are compared against different Chromiums, and neither says so.
 * What it can do is refuse to hardcode a version, so the harness keeps working
 * when the image moves.
 */
export const DEFAULT_BROWSERS_PATH = "/opt/pw-browsers"

/**
 * A Chromium install directory, and how much of a browser it is.
 *
 * Playwright ships two: `chromium-<build>` is a full browser, and
 * `chromium_headless_shell-<build>` is the smaller shell. Both take a
 * screenshot. They do not always take the same one — the shell is the reduced
 * build, and a page leaning on anything it drops photographs differently — so
 * when the image carries both, the full browser is the one to use and the choice
 * should not be left to directory order.
 */
export type ChromiumBuild = {
  readonly directory: string
  readonly build: number
  readonly full: boolean
}

const CHROMIUM = /^chromium(?<shell>_headless_shell)?-(?<build>\d+)$/

export const parseChromiumDirectory = (name: string): ChromiumBuild | null => {
  const found = CHROMIUM.exec(name)
  const build = found?.groups?.["build"]
  if (build === undefined) return null

  return { directory: name, build: Number(build), full: found?.groups?.["shell"] === undefined }
}

/**
 * The best Chromium among these directory names: the full browser over the
 * shell, and the newest build within each.
 *
 * A directory that is not a Chromium — `ffmpeg-1011` sits beside them — is not
 * an error, it is simply not a candidate.
 */
export const bestChromium = (names: readonly string[]): ChromiumBuild | null => {
  const builds = names.flatMap((name) => parseChromiumDirectory(name) ?? [])

  return (
    builds
      .slice()
      .sort((left, right) =>
        left.full === right.full ? right.build - left.build : Number(right.full) - Number(left.full)
      )[0] ?? null
  )
}

/** Where the executable sits inside an install directory, on Linux. */
export const executableIn = (root: string, chromium: ChromiumBuild): string =>
  `${root}/${chromium.directory}/chrome-linux/${chromium.full ? "chrome" : "headless_shell"}`

/**
 * The arguments Chromium needs to start here at all.
 *
 * `--no-sandbox` is not a preference. The sandbox runs as root, and Chromium
 * refuses to start its own sandbox as root — it exits immediately, with an error
 * that reads like a missing binary rather than a refused one, which is what has
 * cost several runs an attempt. This is a throwaway browser pointed at pages
 * this repository built, so the trade it makes is not a real one.
 */
export const LAUNCH_ARGUMENTS: readonly string[] = ["--no-sandbox", "--disable-dev-shm-usage"]
