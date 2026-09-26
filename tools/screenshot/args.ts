import { err, ok, type Result } from "../../src/result.js"

/**
 * `pnpm shoot <shot-list.json> [--serve <application-dir>]`.
 *
 * One option, and it is the lifetime of the server rather than anything about
 * the picture: what to photograph is the shot list's, which is a file a lane
 * commits or writes beside the run, and a flag that could disagree with it is
 * the shape [0117](../../decisions/0117-one-harness-two-subjects-a-tree-it-renders-and-an-address-you-serve.md)'s
 * sibling parser already refused.
 */

export type ShootArgs = {
  readonly listPath: string
  /**
   * An application directory to start, serve the shots from, and stop again.
   * Absent leaves today's behaviour: the list's own `baseUrl`, and a server
   * somebody else is responsible for.
   */
  readonly serveDir?: string
}

export type ShootArgsError =
  | { readonly code: "no-list" }
  | { readonly code: "missing-value"; readonly flag: string }
  | { readonly code: "unknown-flag"; readonly flag: string }

export const SHOOT_USAGE = "usage: pnpm shoot <shot-list.json> [--serve <application-dir>]"

export const describeShootArgsError = (error: ShootArgsError): string => {
  switch (error.code) {
    case "no-list":
      return SHOOT_USAGE
    case "missing-value":
      return `${error.flag} takes an application directory`
    case "unknown-flag":
      return `unknown option ${error.flag}`
  }
}

export const parseShootArgs = (argv: readonly string[]): Result<ShootArgs, ShootArgsError> => {
  let listPath: string | undefined
  let serveDir: string | undefined

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index] ?? ""

    if (argument === "--serve") {
      const value = argv[index + 1]
      if (value === undefined || value.startsWith("--")) {
        return err({ code: "missing-value", flag: "--serve" })
      }
      serveDir = value
      index += 1
      continue
    }

    if (argument.startsWith("--")) return err({ code: "unknown-flag", flag: argument })
    if (listPath === undefined) {
      listPath = argument
      continue
    }

    return err({ code: "unknown-flag", flag: argument })
  }

  if (listPath === undefined) return err({ code: "no-list" })

  return ok(serveDir === undefined ? { listPath } : { listPath, serveDir })
}
