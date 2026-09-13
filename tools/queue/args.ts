/**
 * What the run was asked to measure.
 *
 * The queue is a GitHub fact and this tool is deliberately pure git, so the set
 * of branches has to come in from outside. Three ways, and the reason there are
 * three is that each answers a different question:
 *
 * - **named on the command line** — the two or three you were about to take;
 * - **piped in** — whatever listed the open pull requests, without this tool
 *   needing a token to have asked;
 * - **`--all`** — every remote branch the base does not contain, which is the
 *   repository's own answer and includes branches whose pull request was closed
 *   months ago. Honest, and usually not what you meant.
 *
 * There is no default. A run with nothing to measure says how to give it
 * something rather than quietly picking the widest reading: on this repository
 * `--all` is a hundred and forty-five abandoned branches, the strategy is
 * quadratic, and a tool whose default takes an hour is a tool nobody runs.
 */

export type QueueRequest =
  | { readonly kind: "branches"; readonly base: string; readonly branches: readonly string[] }
  | { readonly kind: "all"; readonly base: string }
  | { readonly kind: "nothing-to-measure" }

export const DEFAULT_BASE = "origin/main"

export const USAGE = [
  "pnpm queue <base> <branch>...   the branches you name",
  "pnpm queue <base> --all         every remote branch the base does not contain",
  "... | pnpm queue <base> -       branches on stdin, one per line",
].join("\n")

/**
 * `-` is the argument that means stdin, as it does for every other tool that
 * reads a list. It is spelled out rather than inferred from whether stdin
 * happens to be a pipe, because inferring it makes the same command mean two
 * things depending on how it was invoked.
 */
export const queueRequest = (argv: readonly string[], piped: readonly string[]): QueueRequest => {
  /**
   * The base is positional, so the first argument is only the base when it
   * could be a ref. `pnpm queue -` and `pnpm queue --all` name no base and mean
   * the default one; reading `-` as a branch to merge into is the mistake that
   * would fail somewhere much less obvious.
   */
  const first = argv[0]
  const isBase = first !== undefined && !first.startsWith("-")
  const base = isBase ? first : DEFAULT_BASE
  const rest = isBase ? argv.slice(1) : argv

  if (rest.includes("--all")) return { kind: "all", base }

  const named = rest.includes("-") ? [...rest.filter((arg) => arg !== "-"), ...piped] : rest
  const branches = [...new Set(named.filter((arg) => !arg.startsWith("-")))]

  return branches.length === 0 ? { kind: "nothing-to-measure" } : { kind: "branches", base, branches }
}
