import { assemble } from "./build.js"
import { describeError, describeReadiness } from "./report.js"

/**
 * `pnpm package:primitives` — assemble `packages/primitives/` and report
 * whether it is publishable, stopping one command short of publishing it.
 *
 * **It never publishes, and that is deliberate rather than unfinished.**
 * Publishing is irreversible and outward-facing, and three of its four
 * preconditions are not this repository's to satisfy: a licence, an npm
 * account, and the runtime going out first. So the command produces the
 * artifact and a table of what is and is not ready, and the last step is a
 * person reading it and typing the line it prints.
 *
 * It exits non-zero when the package would not be publishable, so it can be a
 * gate in a script rather than something somebody has to read carefully.
 */

const assembled = await assemble()

if (!assembled.ok) {
  process.stderr.write(`${describeError(assembled.error)}\n`)
  process.exit(1)
}

process.stdout.write(`${describeReadiness(assembled.value).join("\n")}\n`)
process.exit(assembled.value.license ? 0 : 1)
