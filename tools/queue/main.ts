import { queueRequest, USAGE } from "./args.js"
import { linesOf, unmergedBranches, worktreeAt } from "./git.js"
import { planQueue, type Candidate } from "./plan.js"
import { describePlan } from "./report.js"

/**
 * `pnpm queue` — what order the open branches can be taken in.
 *
 * Not part of `pnpm verify`. It performs merges, it is quadratic in the number
 * of branches, and its answer is about the repository at this minute rather
 * than about the change in front of you — three reasons it does not belong on a
 * gate. It is run when somebody is about to merge, or when a lane wants to know
 * whether its tree still lands.
 *
 * Exit 1 when anything is blocked, so it can gate a merge script. A blocked
 * branch is not a defect in this repository, though, which is why nothing in
 * `verify` calls it.
 */

const readStdin = async (): Promise<readonly string[]> => {
  if (process.stdin.isTTY) return []

  const chunks: Buffer[] = []
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk))

  return linesOf(Buffer.concat(chunks).toString("utf8"))
}

const request = queueRequest(process.argv.slice(2), await readStdin())

if (request.kind === "nothing-to-measure") {
  process.stderr.write(`${USAGE}\n`)
  process.exit(2)
}

const branches =
  request.kind === "all" ? await unmergedBranches(".", request.base) : request.branches

if (branches.length === 0) {
  process.stdout.write(`nothing to merge: ${request.base} already contains every branch\n`)
  process.exit(0)
}

const candidates: readonly Candidate[] = branches.map((branch, position) => ({ branch, position }))

const { tree, close } = await worktreeAt(".", request.base)

/**
 * The exit code is decided inside the `try` and taken outside it.
 *
 * `process.exit` in the `try` skips the `finally`, so every run that found
 * something blocked — the exit-1 case, which is the usual one — left its scratch
 * worktree and its registration behind. Two of them accumulated in a single
 * afternoon of running this tool against the open queue.
 */
const blocked = await (async (): Promise<number> => {
  try {
    const plan = await planQueue(request.base, candidates, tree)
    for (const line of describePlan(plan)) process.stdout.write(`${line}\n`)

    return plan.blocked.length
  } finally {
    await close()
  }
})()

process.exit(blocked === 0 ? 0 : 1)
