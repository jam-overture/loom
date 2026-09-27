import { execFile } from "node:child_process"
import { promisify } from "node:util"

import { assemble } from "./build.js"
import { describeError, describeReadiness } from "./report.js"

/**
 * `pnpm package:primitives` — assemble `packages/primitives/` and report
 * whether it is publishable, stopping one command short of publishing it.
 *
 * **It never publishes, and that is deliberate rather than unfinished.**
 * Publishing is irreversible: a version number that has gone out can never be
 * reused, and `npm unpublish` is a 72-hour window with conditions. So the
 * command produces the artifact and a table of what is and is not ready, and
 * the last step is a person reading it and typing the line it prints.
 *
 * It exits non-zero when the package would not be publishable, so it can be a
 * gate in a script rather than something somebody has to read carefully.
 */

const run = promisify(execFile)

/**
 * Two questions the registry answers and this repository cannot.
 *
 * Both are best-effort by design. A sandbox with no egress, a proxy that
 * refuses, an expired token — none of those mean the package is wrong, so a
 * lookup that fails reads as *not established* and the table says what to do
 * about it. What it must never do is report `ready` because a probe timed out.
 */
const npmAnswer = async (args: readonly string[]): Promise<string | undefined> => {
  try {
    const { stdout } = await run("npm", [...args], { timeout: 30_000 })
    const answer = stdout.trim()

    return answer === "" ? undefined : answer
  } catch {
    return undefined
  }
}

const assembled = await assemble()

if (!assembled.ok) {
  process.stderr.write(`${describeError(assembled.error)}\n`)
  process.exit(1)
}

const [account, peerPublished] = await Promise.all([
  npmAnswer(["whoami"]),
  npmAnswer(["view", `${assembled.value.peer}@${assembled.value.peerRange}`, "version"]),
])

const ready = { ...assembled.value, account, peerPublished }

process.stdout.write(`${describeReadiness(ready).join("\n")}\n`)
/**
 * The exit code is the table's own verdict rather than a second opinion. An
 * earlier version checked two of the three lines and printed "not publishable
 * yet" while exiting 0, which is the exact failure a gate exists to prevent.
 */
process.exit(describeReadiness(ready).some((text) => text.includes("BLOCKED")) ? 1 : 0)
