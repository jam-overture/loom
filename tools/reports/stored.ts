import { STORED_EXTENSION } from "./visuals.js"

/**
 * What the two screenshot entry points say after they have written their
 * pictures.
 *
 * Neither of them re-encodes. The driver in `tools/specimen/playwright.ts` is
 * the one file that knows what a browser is, and teaching it what an image
 * format is would be the second thing it knows; doing it in one entry point and
 * not the other would be the drift
 * [0116](../../decisions/0116-a-screenshot-is-taken-by-the-repository-and-playwright-is-never-a-dependency.md)
 * was written to stop, and the specimen path additionally compares digests
 * across a git ref, which is not a thing to change blind.
 *
 * So the harness writes PNG as it always has, one command stores them, and
 * `pnpm verify` is what notices you did not run it. That is a loop that
 * corrects itself rather than a step you can silently skip.
 */
export const REMEMBER_TO_STORE =
  `these are PNG at capture scale — run \`pnpm reports:shrink\` to store them as ${STORED_EXTENSION} ` +
  `at the size the page was laid out at, which is what \`pnpm verify\` checks`

/** Only worth saying when the pictures landed somewhere the rule governs. */
export const governs = (outDir: string): boolean =>
  outDir === "reports" || outDir.startsWith("reports/") || outDir.includes("/reports")
