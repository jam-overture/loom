import { basename } from "node:path"

import type { ShotResult } from "./capture.js"

/**
 * The other half of the pair, and what to print about it.
 *
 * A screenshot proves a change only against a photograph of the tree
 * **without** it. Two consecutive runs of this lane wrote the same six shell
 * commands to get that pair — copy the source aside, `git show` an older
 * revision over it, re-shoot into a scratch directory, copy the good file back,
 * `cmp` the two sets — and the stronger half of what came out was never the
 * picture of the change. It was the two shots either side of it coming back
 * *byte-identical*, which is what makes the third one evidence rather than a
 * picture of something that was always there.
 *
 * Everything here is a pure function over two listings of digests. The IO —
 * assembling a tree at a ref and running the harness inside it — is
 * `baseline.ts`, and the split is the usual one: this file is what a test can
 * ask about without a browser, a git repository or a second process.
 */

/**
 * Where the pictures taken at the ref are left: a directory beside the run's own
 * output, holding the same file names.
 *
 * Not a suffix on the names, which was the first shape and is worse for two
 * reasons. A shot is named `<specimen>-<theme>-<viewport>-<state>` and nothing
 * else, so a fifth part would make the ref's picture the one file in `reports/`
 * that does not say what it is of. And that name already clears 160 characters
 * routinely, which is the wrong side of the length at which GitHub mangles an
 * image URL in a pull request body.
 */
export const AGAINST_SUBDIR = "against"

/** What a shot's two photographs turned out to be. */
export type ShotVerdict = "identical" | "differs" | "only-here" | "only-there"

export type ShotComparison = {
  /** The name both sides would give the file, which is the shot's and `.png`. */
  readonly file: string
  readonly verdict: ShotVerdict
}

/**
 * Whether the sheet could be photographed at the ref at all.
 *
 * A sheet that does not build against an older revision is an **ordinary**
 * outcome rather than a failure: a specimen written for an API this branch adds
 * has nothing to stand on at the ref, and *"it does not build there"* is a real
 * answer to the question being asked. So it is a reading like any other and
 * reaches the same printer, instead of an error that ends the run.
 */
export type Baseline =
  | {
      readonly built: true
      readonly digests: ReadonlyMap<string, string>
      /**
       * What the harness at the ref said on its way out, when it came back with
       * a non-zero status having photographed something.
       *
       * Carried rather than acted on, because the commonest reason for that
       * status is a shot that overflowed its viewport — which is a reading, not
       * trouble. It is printed only where it would explain something: a sheet
       * the ref photographed *part* of otherwise reads as a sheet full of new
       * shots, which is the one misreading available here.
       */
      readonly trouble?: string
    }
  | { readonly built: false; readonly reason: string }

/**
 * The verdicts, in the order this run took its shots, and then anything the ref
 * photographed that this run did not.
 *
 * Both sides are photographed with **this branch's** specimen sheet, so the two
 * file lists are usually equal by construction. They can still differ honestly:
 * a sheet whose themes or viewports come from `src/` names its shots off the
 * subject, so a theme added on this branch is a shot the ref cannot take.
 */
export const compareSheets = (
  here: ReadonlyMap<string, string>,
  there: ReadonlyMap<string, string>
): readonly ShotComparison[] => [
  ...[...here].map(([file, digest]): ShotComparison => {
    const theirs = there.get(file)
    if (theirs === undefined) return { file, verdict: "only-here" }
    return { file, verdict: digest === theirs ? "identical" : "differs" }
  }),
  ...[...there.keys()]
    .filter((file) => !here.has(file))
    .map((file): ShotComparison => ({ file, verdict: "only-there" })),
]

const VERDICT_WORDS: Readonly<Record<ShotVerdict, string>> = {
  identical: "identical",
  differs: "differs",
  "only-here": "new — no shot of this name there",
  "only-there": "there only — this run took no such shot",
}

export const countVerdicts = (
  comparisons: readonly ShotComparison[]
): Readonly<Record<ShotVerdict, number>> => {
  const counts: Record<ShotVerdict, number> = {
    identical: 0,
    differs: 0,
    "only-here": 0,
    "only-there": 0,
  }

  for (const comparison of comparisons) counts[comparison.verdict] += 1
  return counts
}

const plural = (count: number, one: string, many: string): string =>
  `${count} ${count === 1 ? one : many}`

/**
 * The one line a report can quote, and it is two numbers rather than a total.
 *
 * The sentence worth having is *"two came back identical and the third is the
 * whole claim"*, and that is what these count. A verdict with nothing in it is
 * left out, so the ordinary line names the two that mean something.
 */
export const describeTally = (comparisons: readonly ShotComparison[], ref: string): string => {
  const counts = countVerdicts(comparisons)

  const parts = [
    `${counts.identical} identical`,
    plural(counts.differs, "differs", "differ"),
    ...(counts["only-here"] > 0 ? [`${counts["only-here"]} new`] : []),
    ...(counts["only-there"] > 0 ? [`${counts["only-there"]} there only`] : []),
  ]

  return `${plural(comparisons.length, "shot", "shots")} against ${ref}: ${parts.join(", ")}`
}

/**
 * The block the command prints under its shot lines.
 *
 * It **prints and never asserts**. A moved picture is the most ordinary reason
 * to have run the harness at all, so a comparison that changed the exit code
 * would turn every deliberate visual change into a build failure
 * (0159). Which of these lines is a defect is the report's to say.
 *
 * The directory is in the output because the pictures in it are the other half
 * of the artefact: a report's *before* is a file somebody has to be able to
 * find and commit, and a comparison that printed a verdict and threw the
 * evidence away would leave the same six shell commands worth writing.
 */
export const describeAgainst = (
  ref: string,
  here: ReadonlyMap<string, string>,
  baseline: Baseline,
  baselineDir: string
): string => {
  if (!baseline.built) {
    return [
      `against ${ref}: the sheet does not build there — ${baseline.reason}`,
      "  nothing was photographed to compare against, so every shot above is new",
    ].join("\n")
  }

  const comparisons = compareSheets(here, baseline.digests)
  const missing = countVerdicts(comparisons)["only-here"] > 0
  const trouble = baseline.trouble ?? ""

  return [
    describeTally(comparisons, ref),
    ...comparisons.map(({ file, verdict }) => `  ${file}  ${VERDICT_WORDS[verdict]}`),
    ...(missing && trouble !== "" ? [`  the harness at ${ref} stopped early: ${trouble}`] : []),
    `  the pictures taken at ${ref} are in ${baselineDir}`,
  ].join("\n")
}

/**
 * The files a run produced, in the order it took them, **by name**.
 *
 * A `ShotResult` carries the path it was written to, which includes the output
 * directory — and the two sides of a comparison write into different
 * directories by construction. What they share is the name, so that is the key,
 * and taking the basename here is what keeps the pairing from silently matching
 * nothing at all.
 */
export const shotFiles = (results: readonly ShotResult[]): readonly string[] =>
  results.map((result) => basename(result.file))
