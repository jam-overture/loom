import { nodeFileSystem } from "./filesystem.js"
import { describeCliError, runCli } from "./run.js"

/**
 * The executable entry point, and the only module here that touches the process.
 *
 * Everything it does is decide an exit code and choose a stream: usage and
 * progress go to stdout, failures to stderr. Keeping that here is what lets the
 * rest of the CLI be ordinary tested functions.
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
