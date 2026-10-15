/**
 * The git this repository's own tooling is allowed to assume.
 *
 * Every routine runs in a cloud container with a current git, so a tool that
 * reaches for a switch added in 2020 is green on every scheduled run and red
 * in exactly one place: the machine of the one person who runs `pnpm verify`
 * by hand before merging. His git is **2.15**. That asymmetry is why this
 * module exists — the failure cannot be found by running the suite anywhere a
 * routine runs, so it has to be found by reading the source.
 *
 * Three instances arrived before the floor was written down. `git switch` and
 * `git worktree remove` were both met from interactive sessions and worked
 * around there; `git init -b` reached `main` inside a test and failed all six
 * cases of *photographing the same sheet against a revision* on 11 October,
 * reported by the maintainer rather than by any check here.
 *
 * ## The floor is a number, not a policy
 *
 * Raising it is a line in this file and a sentence in `docs/routines.md`. What
 * it must never be is implicit: a skip guarded on the installed version would
 * make the suite pass on 2.15 by not running there, which is how the fourth
 * instance goes unnoticed for a month.
 *
 * ## Why a table of invocations and not a version probe
 *
 * Asking the local git what it supports answers for the machine the check runs
 * on, which is the machine that does not have the problem. The table answers
 * for the floor from anywhere.
 */

/** A git release, compared as a pair rather than as a string. */
export type GitVersion = {
  readonly major: number
  readonly minor: number
}

/**
 * The maintainer's git, and therefore the oldest one `pnpm verify` must pass
 * on. Named here so the two places that care — this table and the sweep over
 * the repository's own sources — cannot disagree about it.
 */
export const GIT_FLOOR: GitVersion = { major: 2, minor: 15 }

export const versionText = (version: GitVersion): string => `${version.major}.${version.minor}`

const isNewerThanFloor = (version: GitVersion): boolean =>
  version.major > GIT_FLOOR.major ||
  (version.major === GIT_FLOOR.major && version.minor > GIT_FLOOR.minor)

/**
 * One way of invoking git that the floor does not have.
 *
 * `tokens` is matched against an argv rather than against source text: the
 * first token is the subcommand and must be the argv's own subcommand, and the
 * rest must appear after it in order. So `["init", "-b"]` catches
 * `["init", "-q", "-b", "main"]` and does not catch a `-b` handed to something
 * else.
 */
export type NewerThanFloor = {
  readonly tokens: readonly [string, ...string[]]
  readonly since: GitVersion
  /** What to write instead, in the words a reader can act on without a search. */
  readonly instead: string
}

/**
 * The invocations this repository has reached for, or would plausibly reach
 * for, that postdate the floor.
 *
 * **Both spellings of the same thing are listed separately.** `init -b` and
 * `init --initial-branch` are one feature and two tokens, and a rule naming
 * one spelling is a rule that stops working the moment somebody reaches for the
 * other one — which `docs/routines.md` records as having already happened
 * twice over, once to a pipe into `tail` and once to the same pipe into `tee`.
 */
export const NEWER_THAN_FLOOR: readonly NewerThanFloor[] = [
  {
    tokens: ["init", "-b"],
    since: { major: 2, minor: 28 },
    instead: `git init -q, then git symbolic-ref HEAD refs/heads/<branch>`,
  },
  {
    tokens: ["init", "--initial-branch"],
    since: { major: 2, minor: 28 },
    instead: `git init -q, then git symbolic-ref HEAD refs/heads/<branch>`,
  },
  {
    tokens: ["worktree", "remove"],
    since: { major: 2, minor: 17 },
    instead: `remove the directory, then git worktree prune`,
  },
  {
    tokens: ["switch"],
    since: { major: 2, minor: 23 },
    instead: `git checkout, which still does both halves of what switch split up`,
  },
  {
    tokens: ["restore"],
    since: { major: 2, minor: 23 },
    instead: `git checkout -- <path>`,
  },
  {
    tokens: ["branch", "--show-current"],
    since: { major: 2, minor: 22 },
    instead: `git rev-parse --abbrev-ref HEAD`,
  },
  {
    tokens: ["sparse-checkout"],
    since: { major: 2, minor: 25 },
    instead: `write .git/info/sparse-checkout, or clone the whole tree`,
  },
  {
    tokens: ["rebase", "--rebase-merges"],
    since: { major: 2, minor: 18 },
    instead: `git rebase -p, or do not rebase a tree with merges in it`,
  },
]

/** A match: which entry an argv tripped, and the argv as it was read. */
export type Unportable = {
  readonly entry: NewerThanFloor
  readonly argv: readonly string[]
}

/**
 * `git -C <dir>` is a prefix rather than a subcommand, so it is dropped before
 * the subcommand is read. It is the only prefix this repository uses; another
 * one arriving is a reason to extend this, not to loosen the match.
 */
const withoutPrefixes = (argv: readonly string[]): readonly string[] =>
  argv[0] === "-C" ? withoutPrefixes(argv.slice(2)) : argv

const containsInOrder = (haystack: readonly string[], needles: readonly string[]): boolean => {
  const [first, ...rest] = needles
  if (first === undefined) return true

  const at = haystack.indexOf(first)
  return at === -1 ? false : containsInOrder(haystack.slice(at + 1), rest)
}

const trips = (argv: readonly string[], entry: NewerThanFloor): boolean => {
  const [subcommand, ...rest] = withoutPrefixes(argv)
  const [wanted, ...wantedRest] = entry.tokens

  return subcommand === wanted && containsInOrder(rest, wantedRest)
}

/** Every entry one argv trips, which is normally none and is never usually one. */
export const unportable = (argv: readonly string[]): readonly Unportable[] =>
  NEWER_THAN_FLOOR.filter((entry) => isNewerThanFloor(entry.since) && trips(argv, entry)).map(
    (entry) => ({ entry, argv })
  )

/**
 * The sentence a failing sweep prints.
 *
 * It names the floor, the release that would be needed and the replacement,
 * because the reader of this failure is somebody whose machine ran the test
 * green and whose change is nonetheless wrong.
 */
export const reasonText = ({ entry, argv }: Unportable): string =>
  `git ${argv.join(" ")} needs git ${versionText(entry.since)}; the floor is ${versionText(
    GIT_FLOOR
  )}. Instead: ${entry.instead}`

/**
 * The argv-shaped array literals in one TypeScript source, as tokens.
 *
 * This reads literals and nothing else, which is the whole instrument and its
 * whole limit. An element that is not a double-quoted string — a variable, a
 * template, a call — is read as `*` and matches nothing, so an argv assembled
 * at runtime is invisible here. That is the honest trade: the alternative is a
 * parser for a check whose entire job is to catch a string somebody typed.
 */
export const argvLiterals = (source: string): readonly (readonly string[])[] => {
  const arrays = source.match(/\[[^[\]{}`]*\]/g) ?? []

  return arrays
    .map((array) =>
      array
        .slice(1, -1)
        .split(",")
        .map((element) => element.trim())
        .filter((element) => element.length > 0)
        .map((element) => {
          const literal = /^"((?:[^"\\]|\\.)*)"$/.exec(element)
          return literal?.[1] ?? "*"
        })
    )
    .filter((argv) => argv.length > 0)
}

/** Whether a source runs git at all, which is what makes its argvs argvs. */
export const runsGit = (source: string): boolean => /(["'])git\1/.test(source)
