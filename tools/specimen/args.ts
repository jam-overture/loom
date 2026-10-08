import { err, ok, type Result } from "../../src/result.js"

/**
 * `pnpm specimen <module> [--out <dir>] [--against <ref>]`.
 *
 * No flag says what to photograph. The temptation is a flag per viewport and a
 * flag per theme, and it is the wrong shape: what to photograph is a property of
 * the specimen, checked by the compiler and committed beside the lane that
 * cares. A flag would let one run disagree with the next about what a shot is
 * called.
 *
 * What a flag may say is **where the pictures go** and **what to compare them
 * with**, neither of which is a property of the sheet: both are facts about the
 * run, and `--against` in particular is a question one run asks and the next
 * one does not.
 */

export type SpecimenArgs = {
  /** Path to a module whose default export is a `Specimen`, relative to cwd. */
  readonly module: string
  readonly outDir: string
  /** A git revision to photograph the same sheet against, when one was asked for. */
  readonly against?: string
}

export type ArgsError =
  | { readonly code: "no-module" }
  | { readonly code: "missing-value"; readonly flag: string }
  | { readonly code: "unknown-flag"; readonly flag: string }

export const describeArgsError = (error: ArgsError): string => {
  switch (error.code) {
    case "no-module":
      return "usage: pnpm specimen <specimen-module> [--out <dir>] [--against <ref>]"
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
  let against: string | undefined

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index] ?? ""

    if (argument === "--out" || argument === "--against") {
      const value = argv[index + 1]
      if (value === undefined || value.startsWith("--")) {
        return err({ code: "missing-value", flag: argument })
      }
      if (argument === "--out") outDir = value
      else against = value
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

  if (module === undefined) return err({ code: "no-module" })
  return ok(against === undefined ? { module, outDir } : { module, outDir, against })
}
