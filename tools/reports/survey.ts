import { execFile } from "node:child_process"
import { readFile, stat } from "node:fs/promises"
import { promisify } from "node:util"

import { err, ok, type Result } from "../../src/result.js"

import type { Survey, Visual } from "./visuals.js"

/**
 * Reading the repository, so that `visuals.ts` can be a function of a value.
 *
 * It asks git rather than walking the filesystem, because the question the
 * check is answering is what a clone of this repository weighs, and an
 * untracked scratch file neither adds to that nor counts as a citation. It is
 * also the difference between a routine's leftover `/tmp` copy silently
 * satisfying the reference rule and the rule meaning something.
 */

const run = promisify(execFile)

const IMAGE = /\.(?:webp|svg|png|jpe?g|avif|gif)$/i

/** Any image filename a file mentions, in prose, in markdown, in a shot list or in code. */
const MENTION = /[A-Za-z0-9._-]+\.(?:webp|svg|png|jpe?g|avif|gif)/gi

export type SurveyError = { readonly code: "not-a-repository"; readonly reason: string }

const tracked = async (dir: string): Promise<Result<readonly string[], SurveyError>> => {
  try {
    /**
     * Tracked *and* untracked-but-not-ignored, which is not the obvious choice
     * and is the one that makes the check mean something. `ls-files` alone
     * lists what git already knows about, so a 5MB PNG written a moment ago and
     * not yet added is invisible to it — and that is exactly the state a run is
     * in when it has just taken its screenshots and is about to call `verify`
     * green. `--exclude-standard` keeps `.gitignore` honoured, so `node_modules`
     * and build output stay out.
     */
    const { stdout } = await run(
      "git",
      ["ls-files", "-z", "--cached", "--others", "--exclude-standard"],
      { cwd: dir, maxBuffer: 64 * 1024 * 1024 }
    )
    return ok(stdout.split("\0").filter((line) => line.length > 0))
  } catch (cause) {
    return err({
      code: "not-a-repository",
      reason: cause instanceof Error ? cause.message : String(cause),
    })
  }
}

/**
 * `within` is the directory whose visuals are governed; the citations are
 * looked for across the whole repository.
 *
 * That asymmetry is deliberate and was measured: scoping the search to markdown
 * image syntax inside `reports/` called 395 files unreferenced, and scoping it
 * to every mention anywhere called 329. The 66 in between are cited from a shot
 * list, from a findings entry or from prose, and deleting them on the narrower
 * reading would have been deleting evidence that something still points at.
 * When the rule's consequence is `rm`, it takes the widest net.
 */
export const surveyReports = async (
  root: string,
  within: string
): Promise<Result<Survey, SurveyError>> => {
  const files = await tracked(root)
  if (!files.ok) return files

  const prefix = within.endsWith("/") ? within : `${within}/`
  const images = files.value.filter((file) => file.startsWith(prefix) && IMAGE.test(file))
  const readable = files.value.filter((file) => !IMAGE.test(file))

  const visuals: Visual[] = []
  for (const file of images) {
    const found = await stat(`${root}/${file}`).catch(() => undefined)
    if (found !== undefined) visuals.push({ file, bytes: found.size })
  }

  const mentioned = new Set<string>()
  for (const file of readable) {
    const source = await readFile(`${root}/${file}`, "utf8").catch(() => undefined)
    if (source === undefined) continue
    for (const match of source.matchAll(MENTION)) mentioned.add(match[0])
  }

  return ok({ visuals, mentioned })
}
