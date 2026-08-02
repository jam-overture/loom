#!/usr/bin/env node
import { nodeFileSystem } from "./filesystem.js"
import { describeCliError, runCli } from "./run.js"

/**
 * The executable entry point, and the only module here that touches the process.
 *
 * Everything it does is decide an exit code and choose a stream: usage and
 * progress go to stdout, failures to stderr. Keeping that here is what lets the
 * rest of the CLI be ordinary tested functions.
 *
 * The shebang runs it through `tsx`, because this package has no build step and
 * Node's own type stripping does not resolve the `.js` import specifiers the
 * repo uses to their `.ts` sources. That makes `tsx` a real dependency of the
 * executable rather than a convenience — when a build step exists, `bin` should
 * point at the emitted entry and this line should go.
 */

const main = async (): Promise<number> => {
  const result = await runCli(process.argv.slice(2), nodeFileSystem)

  if (!result.ok) {
    process.stderr.write(`${describeCliError(result.error)}\n`)

    return 1
  }

  for (const path of result.value.written) process.stdout.write(`wrote ${path}\n`)
  for (const note of result.value.notes) process.stdout.write(`${note}\n`)

  return 0
}

process.exitCode = await main()
