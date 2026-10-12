import { execFile } from "node:child_process"
import { readFile, rm, writeFile } from "node:fs/promises"
import { promisify } from "node:util"

import { describeShrinkerError, loadShrinker } from "./shrinker.js"
import { nameOf, STORED_EXTENSION } from "./visuals.js"

/**
 * `pnpm reports:shrink` — store what is already in `reports/` the way the rule
 * says, and fix up every report that cites it.
 *
 * Two jobs, and the second is the one that makes this a command rather than a
 * shell loop: a report whose picture 404s has lost the argument it was making,
 * so the re-encode and the citation have to move together or not at all. It
 * rewrites only the names it actually converted, which is why the illustrative
 * `path.png` and `shot.png` in the harness documentation are left alone.
 *
 * `--scale` is what the pictures were captured at, not what they will be stored
 * at. It defaults to 2 because that is the harness default and what every
 * specimen in `src/` declares; a run that shot at 1 should say so.
 */

const run = promisify(execFile)

function fail(message: string): never {
  process.stderr.write(`loom reports:shrink: ${message}\n`)
  process.exit(1)
}

const args = process.argv.slice(2)
const scaleAt = args.indexOf("--scale")
const scale = scaleAt === -1 ? 2 : Number(args[scaleAt + 1])
if (!Number.isFinite(scale) || scale <= 0) fail("--scale takes a positive number")
const dryRun = args.includes("--dry-run")

const root = process.cwd()
const REPORTS = "reports"
const RASTER = /\.(?:png|jpe?g|gif)$/i
const RASTER_MENTION = /\.(?:png|jpe?g|gif)/i

const shrinker = await loadShrinker()
if (!shrinker.ok) fail(describeShrinkerError(shrinker.error))

const { stdout } = await run("git", ["ls-files", "-z"], { cwd: root, maxBuffer: 64 * 1024 * 1024 })
const files = stdout.split("\0").filter((line) => line.length > 0)
const rasters = files.filter((file) => file.startsWith(`${REPORTS}/`) && RASTER.test(file))

if (rasters.length === 0) {
  process.stdout.write(`nothing to shrink — no raster images under ${REPORTS}/\n`)
  process.exit(0)
}

const kb = (bytes: number): number => Math.round(bytes / 1024)
const renames = new Map<string, string>()
let before = 0
let after = 0
let refused = 0

for (const file of rasters) {
  const source = await readFile(`${root}/${file}`).catch(() => undefined)
  if (source === undefined) {
    process.stderr.write(`  ?? ${file} could not be read\n`)
    refused += 1
    continue
  }

  const shrunk = await shrinker.value(source, scale)
  if (!shrunk.ok) {
    process.stderr.write(`  !! ${file}: ${shrunk.error}\n`)
    refused += 1
    continue
  }

  /**
   * A re-encode that came back bigger is left as it is. It has not happened on
   * anything in this repository, and a command that can only make files smaller
   * is one you can run twice.
   */
  if (shrunk.value.bytes.byteLength >= source.byteLength) {
    process.stdout.write(`  -- ${file} is already smaller than the re-encode\n`)
    continue
  }

  const stored = file.replace(RASTER, STORED_EXTENSION)
  before += source.byteLength
  after += shrunk.value.bytes.byteLength
  renames.set(nameOf(file), nameOf(stored))

  if (!dryRun) {
    await writeFile(`${root}/${stored}`, shrunk.value.bytes)
    await rm(`${root}/${file}`)
  }
}

/**
 * The citations, in one pass over every tracked file that is not itself an
 * image. Scoped to the names that were converted rather than to a pattern, so
 * that a `.png` this command did not touch keeps pointing at the file that is
 * still there.
 */
let citing = 0
if (renames.size > 0 && !dryRun) {
  const readable = files.filter(
    (file) => !/\.(?:webp|svg|png|jpe?g|avif|gif|woff2?|ttf|ico|pdf)$/i.test(file)
  )

  /**
   * One small pattern and a map lookup, rather than one alternation per name:
   * the first draft built a regular expression out of 1662 filenames, which is
   * 80KB of pattern to ask the engine to compile once per file.
   */
  const anyRaster = /[A-Za-z0-9._-]+\.(?:png|jpe?g|gif)/gi

  for (const file of readable) {
    const source = await readFile(`${root}/${file}`, "utf8").catch(() => undefined)
    if (source === undefined || !RASTER_MENTION.test(source)) continue
    const rewritten = source.replace(anyRaster, (name) => renames.get(name) ?? name)
    if (rewritten !== source) {
      await writeFile(`${root}/${file}`, rewritten)
      citing += 1
    }
  }
}

const mb = (bytes: number): string => `${(bytes / 1_048_576).toFixed(1)}MB`

process.stdout.write(
  [
    "",
    `${dryRun ? "would store" : "stored"} ${renames.size} of ${rasters.length} visuals as ${STORED_EXTENSION} at 1/${scale} the captured scale`,
    `  ${mb(before)} -> ${mb(after)}  (${before === 0 ? 0 : (before / after).toFixed(1)}x smaller, ${mb(before - after)} saved)`,
    `  mean ${kb(renames.size === 0 ? 0 : after / renames.size)}KB a visual`,
    dryRun ? "  citations not rewritten (--dry-run)" : `  citations rewritten in ${citing} files`,
    refused > 0 ? `  ${refused} refused — see above` : "",
    "",
  ]
    .filter((line) => line !== "")
    .join("\n") + "\n"
)
