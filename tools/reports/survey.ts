import { readFile, stat } from "node:fs/promises"

import { ok, type Result } from "../../src/result.js"

import { governedFiles, type GovernedError } from "./governed.js"
import type { Survey, Visual } from "./visuals.js"

/**
 * Reading the repository, so that `visuals.ts` can be a function of a value.
 *
 * It asks git rather than walking the filesystem, because the question the
 * check is answering is what a clone of this repository weighs. Which files git
 * is asked about is `governed.ts`' to say, and is shared with the command that
 * prepares them.
 */

const IMAGE = /\.(?:webp|svg|png|jpe?g|avif|gif)$/i

/** Any image filename a file mentions, in prose, in markdown, in a shot list or in code. */
const MENTION = /[A-Za-z0-9._-]+\.(?:webp|svg|png|jpe?g|avif|gif)/gi

/** The shape `main.ts` reports; the reading itself is `governed.ts`'. */
export type SurveyError = GovernedError

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
  const files = await governedFiles(root)
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
