import { assertNever, err, ok, type Result } from "../result.js"

import { DEFAULT_DIRECTORY, parseArguments } from "./args.js"
import type { FileSystem } from "./filesystem.js"
import { FRAMEWORK_NAMESPACE, hostAlternativeFor, HOST_NAMESPACE } from "./namespace.js"
import { planCommand, PRIMITIVES_DIRECTORY, type CliError } from "./plan.js"

/**
 * Parse, plan, write — in that order, and only writing once the whole plan is
 * known to be safe. A command that would clash with an existing file writes
 * nothing at all rather than leaving a directory half-scaffolded.
 */

export const CLI_USAGE = `loom — scaffolding for the Loom primitive registry

Usage:
  loom init [--dir <directory>]
  loom add primitive <type> [--dir <directory>]
  loom --help

Options:
  --dir <directory>   Where the Loom source lives (default: ${DEFAULT_DIRECTORY})

init writes a starter primitive, a generated registry, and a conformance test
into <directory>/${PRIMITIVES_DIRECTORY}. add primitive declares one more and
regenerates the registry from the directory's contents.

A type is dot-namespaced kebab-case: ${HOST_NAMESPACE}.card, commerce.product-card.
${FRAMEWORK_NAMESPACE}.* is the framework's own namespace and is refused — those
names belong to the primitives @loom/runtime already registers.`

export type CliReport = {
  readonly written: readonly string[]
  readonly notes: readonly string[]
  readonly usage: boolean
}

export const describeCliError = (error: CliError): string => {
  switch (error.code) {
    case "unknown-command":
      return `"${error.given}" is not a loom command — run loom --help`
    case "missing-argument":
      return `${error.argument} is required — run loom --help`
    case "unexpected-argument":
      return `"${error.given}" was not expected — run loom --help`
    case "invalid-primitive-type":
      return `"${error.type}" is not a valid primitive type — expected dot-namespaced kebab-case, like commerce.product-card`
    case "reserved-primitive-type":
      return `"${error.type}" is reserved: its module would overwrite the generated registry`
    case "framework-namespace":
      return `"${error.type}" is in the framework's namespace — @loom/runtime registers ${FRAMEWORK_NAMESPACE}.* and a registry refuses two definitions with one type. Try "${hostAlternativeFor(error.type)}"`
    case "already-registered":
      return `"${error.type}" is already declared — edit its definition rather than regenerating it`
    case "file-exists":
      return `${error.path} already exists; nothing was written`
    case "filesystem-failed":
      return `could not write ${error.path}: ${error.detail}`
    default:
      return assertNever(error, "describeCliError")
  }
}

export const runCli = async (
  argv: readonly string[],
  filesystem: FileSystem
): Promise<Result<CliReport, CliError>> => {
  const command = parseArguments(argv)
  if (!command.ok) return command

  if (command.value.kind === "help") {
    return ok({ written: [], notes: [CLI_USAGE], usage: true })
  }

  const listed = await filesystem.list(command.value.directory)
  if (!listed.ok) {
    return err({ code: "filesystem-failed", path: command.value.directory, detail: listed.error })
  }

  const plan = planCommand(command.value, listed.value)
  if (!plan.ok) return plan

  const written: string[] = []

  for (const file of plan.value.files) {
    const wrote = await filesystem.write(file.path, file.contents)
    if (!wrote.ok) {
      return err({ code: "filesystem-failed", path: file.path, detail: wrote.error })
    }

    written.push(file.path)
  }

  return ok({ written, notes: plan.value.notes, usage: false })
}
