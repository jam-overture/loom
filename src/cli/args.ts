import { primitiveTypeSchema } from "../primitive-type.js"
import { err, ok, type Result } from "../result.js"

import { isFrameworkNamespaced } from "./namespace.js"
import type { CliCommand, CliError } from "./plan.js"
import { RESERVED_PRIMITIVE_TYPES } from "./templates.js"

/**
 * Argument parsing, by hand rather than by dependency.
 *
 * The surface is two commands and one option, and a parser for that is smaller
 * than the code needed to configure a parser library. It is also pure, so the
 * grammar is asserted directly rather than through a framework's behaviour.
 *
 * This is also where a primitive type is validated, because whether a type is
 * well-formed is a property of the string and of nothing else. Checking it here
 * means a typo is reported as a typo — a directory that cannot be read is a
 * different failure, and a mistyped type should not have to wait on one.
 */

export const DEFAULT_DIRECTORY = "loom"

const DIRECTORY_FLAG = "--dir"

type Options = {
  readonly directory: string
  readonly positional: readonly string[]
}

const parseOptions = (argv: readonly string[]): Result<Options, CliError> => {
  const positional: string[] = []
  let directory = DEFAULT_DIRECTORY

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index] as string

    if (argument === DIRECTORY_FLAG) {
      const value = argv[index + 1]
      if (value === undefined || value.startsWith("-")) {
        return err({ code: "missing-argument", argument: DIRECTORY_FLAG })
      }

      directory = value
      index += 1
      continue
    }

    if (argument.startsWith("-")) return err({ code: "unknown-command", given: argument })

    positional.push(argument)
  }

  return ok({ directory, positional })
}

export const parseArguments = (argv: readonly string[]): Result<CliCommand, CliError> => {
  const [first] = argv

  if (first === undefined || first === "--help" || first === "-h" || first === "help") {
    return ok({ kind: "help" })
  }

  const options = parseOptions(argv)
  if (!options.ok) return options

  const [command, ...rest] = options.value.positional

  if (command === "init") {
    const [unexpected] = rest
    if (unexpected !== undefined) return err({ code: "unexpected-argument", given: unexpected })

    return ok({ kind: "init", directory: options.value.directory })
  }

  if (command === "add") {
    const [subject, type, ...extra] = rest

    if (subject !== "primitive") {
      return err({ code: "unknown-command", given: `add ${subject ?? ""}`.trim() })
    }

    if (type === undefined) return err({ code: "missing-argument", argument: "<type>" })

    const [unexpected] = extra
    if (unexpected !== undefined) return err({ code: "unexpected-argument", given: unexpected })

    if (!primitiveTypeSchema.safeParse(type).success) {
      return err({ code: "invalid-primitive-type", type })
    }

    if (RESERVED_PRIMITIVE_TYPES.includes(type)) {
      return err({ code: "reserved-primitive-type", type })
    }

    /**
     * Refused here rather than at planning, because a name belonging to the
     * framework is a property of the string — the same reason a malformed type
     * is refused here. It costs a directory read the host was never going to
     * benefit from.
     */
    if (isFrameworkNamespaced(type)) {
      return err({ code: "framework-namespace", type })
    }

    return ok({ kind: "add-primitive", directory: options.value.directory, type })
  }

  return err({ code: "unknown-command", given: command ?? "" })
}
