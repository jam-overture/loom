import { err, ok, type Result } from "../../src/result.js"

/**
 * `pnpm specimen <module> [--out <dir>]`.
 *
 * Two options and no more. The temptation is a flag per viewport and a flag per
 * theme, and it is the wrong shape: what to photograph is a property of the
 * specimen, checked by the compiler and committed beside the lane that cares.
 * A flag would let one run disagree with the next about what a shot is called.
 */

export type SpecimenArgs = {
  /** Path to a module whose default export is a `Specimen`, relative to cwd. */
  readonly module: string
  readonly outDir: string
}

export type ArgsError =
  | { readonly code: "no-module" }
  | { readonly code: "missing-value"; readonly flag: string }
  | { readonly code: "unknown-flag"; readonly flag: string }

export const describeArgsError = (error: ArgsError): string => {
  switch (error.code) {
    case "no-module":
      return "usage: pnpm specimen <specimen-module> [--out <dir>]"
    case "missing-value":
      return `${error.flag} takes a value`
    case "unknown-flag":
      return `unknown option ${error.flag}`
  }
}

export const DEFAULT_OUT_DIR = "reports"

export const parseSpecimenArgs = (argv: readonly string[]): Result<SpecimenArgs, ArgsError> => {
  let module: string | undefined
  let outDir = DEFAULT_OUT_DIR

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index] ?? ""

    if (argument === "--out") {
      const value = argv[index + 1]
      if (value === undefined || value.startsWith("--")) {
        return err({ code: "missing-value", flag: "--out" })
      }
      outDir = value
      index += 1
      continue
    }

    if (argument.startsWith("--")) return err({ code: "unknown-flag", flag: argument })
    if (module === undefined) {
      module = argument
      continue
    }

    return err({ code: "unknown-flag", flag: argument })
  }

  return module === undefined ? err({ code: "no-module" }) : ok({ module, outDir })
}
