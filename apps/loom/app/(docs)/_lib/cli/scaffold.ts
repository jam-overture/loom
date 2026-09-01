import { err, ok } from "@loom/runtime"
import { describeCliError, runCli, type CliError, type FileSystem } from "@loom/runtime/cli"

/**
 * The scaffolding page's commands, actually run.
 *
 * Every `loom …` line on that page is executed here as the page builds, against
 * an in-memory disk, through the same `runCli` the published executable calls.
 * The paths, the notes, the generated file contents and the refusal sentences
 * are all read back out of those runs, so a page that shows a command showing
 * output the CLI no longer produces is impossible: the output *is* the output.
 *
 * The alternative — pasting a terminal session into MDX — is the staleness §4c
 * exists to refuse, and it is worse here than elsewhere. A reader meets this
 * page before they have any way to tell a wrong instruction from a right one.
 *
 * Nothing here touches a real filesystem. `FileSystem` is the CLI's only impure
 * seam and it is an interface, so the honest double is two functions over a Map
 * rather than a temporary directory the build has to clean up.
 */

/** Where the CLI writes when nobody passes `--dir`. */
export const SCAFFOLD_DIRECTORY = "loom"

/** What `--dir` is shown moving it to. */
export const ALTERNATIVE_DIRECTORY = "src/loom"

/** The primitive the page adds to the scaffolded directory. */
export const ADDED_PRIMITIVE_TYPE = "commerce.product-card"

type MemoryDisk = {
  readonly filesystem: FileSystem
  /** The disk after the run, as an ordinary map. */
  readonly snapshot: () => ReadonlyMap<string, string>
}

/**
 * A disk that is a `Map`.
 *
 * `list` mirrors `nodeFileSystem`'s two behaviours the planner depends on: it is
 * recursive, and a directory nothing has been written to lists as empty rather
 * than failing — "nothing here yet" is the ordinary case for `init`.
 *
 * The map is mutated, because a filesystem is the one thing in this repository
 * that genuinely has stateful identity. It is closed over and never handed out;
 * `snapshot` copies it.
 */
const memoryDisk = (initial: ReadonlyMap<string, string> = new Map()): MemoryDisk => {
  const files = new Map(initial)

  return {
    filesystem: {
      list: async (directory) =>
        ok([...files.keys()].filter((path) => path.startsWith(`${directory}/`))),
      write: async (path, contents) => {
        files.set(path, contents)

        return ok(undefined)
      },
    },
    snapshot: () => new Map(files),
  }
}

/** What the CLI reports when the disk refuses it. Reads fine, writes do not. */
const UNWRITABLE_DETAIL = "EACCES: permission denied"

const unwritableDisk: FileSystem = {
  list: async () => ok([]),
  write: async () => err(UNWRITABLE_DETAIL),
}

export type ScaffoldStep = {
  /** The line a reader would type, `loom` included. */
  readonly command: string
  /** The paths the run wrote, in the order it wrote them. */
  readonly written: readonly string[]
  /** The CLI's own closing lines — what happened, and what to do next. */
  readonly notes: readonly string[]
}

export type ScaffoldSession = {
  readonly steps: readonly ScaffoldStep[]
  /** The directory afterwards: every path the session wrote, and its contents. */
  readonly files: ReadonlyMap<string, string>
}

const commandLine = (argv: readonly string[]): string => ["loom", ...argv].join(" ")

/**
 * The session the page walks through: scaffold, then add one primitive.
 *
 * Two commands rather than one because the second is what shows the registry
 * being *regenerated* rather than appended to, which is the part of the contract
 * a reader has to understand before they edit anything in that directory.
 */
const SESSION_ARGV: readonly (readonly string[])[] = [
  ["init"],
  ["add", "primitive", ADDED_PRIMITIVE_TYPE],
]

const runStep = async (argv: readonly string[], filesystem: FileSystem): Promise<ScaffoldStep> => {
  const report = await runCli(argv, filesystem)

  /**
   * A documented command that fails is a broken page, and the build is the right
   * place to find that out. Rendering the failure instead would put a page on
   * the site teaching a command that does not work.
   */
  if (!report.ok) {
    throw new Error(
      `loom: the documented command "${commandLine(argv)}" was refused — ${describeCliError(report.error)}`
    )
  }

  return { command: commandLine(argv), written: report.value.written, notes: report.value.notes }
}

export const scaffoldSession = async (): Promise<ScaffoldSession> => {
  const disk = memoryDisk()

  /**
   * Sequential, and it has to be: the second command's plan is a function of
   * what the first one left on the disk. `Promise.all` here would race two
   * writers over one registry and produce a different site on a slow day.
   */
  const steps: ScaffoldStep[] = []

  for (const argv of SESSION_ARGV) steps.push(await runStep(argv, disk.filesystem))

  return { steps, files: disk.snapshot() }
}

/** `loom init --dir src/loom`, on a disk of its own. */
export const directoryOptionRun = (): Promise<ScaffoldStep> =>
  runStep(["init", "--dir", ALTERNATIVE_DIRECTORY], memoryDisk().filesystem)

/** `loom --help`, so the usage on the page is the usage the command prints. */
export const helpOutput = async (): Promise<string> => {
  const step = await runStep(["--help"], memoryDisk().filesystem)
  const [usage] = step.notes

  if (usage === undefined) throw new Error("loom: --help printed nothing")

  return usage
}

type RefusalSpec = {
  readonly argv: readonly string[]
  /** Paths already on the disk when the command runs. */
  readonly existing?: readonly string[]
  /** Run against a disk that reads fine and refuses every write. */
  readonly unwritable?: true
  /** One sentence: what the refusal is protecting, in a reader's words. */
  readonly protects: string
}

const REGISTRY_PATH = `${SCAFFOLD_DIRECTORY}/primitives/registry.ts`
const STARTER_PATH = `${SCAFFOLD_DIRECTORY}/primitives/app.page.ts`

/**
 * Every way the CLI says no, and the command that provokes it.
 *
 * Typed as a `Record` over `CliError["code"]` on purpose: a ninth refusal added
 * to the runtime is a **type error in the documentation** rather than a page
 * that quietly describes eight of nine. That is the same guarantee the entry
 * points table gets from `exports`, bought here from the compiler instead of a
 * test.
 *
 * The contents of `existing` are never read — planning is a function of the
 * *listing* and of nothing else, which is exactly why the empty strings are
 * honest and why the CLI can be sure of a clash before it opens anything.
 */
const REFUSAL_SPECS: Record<CliError["code"], RefusalSpec> = {
  "unknown-command": {
    argv: ["build"],
    protects: "A command the CLI does not have is a typo, not a request to guess.",
  },
  "missing-argument": {
    argv: ["add", "primitive"],
    protects: "Nothing is invented for you — an unnamed primitive is not scaffolded under a placeholder name.",
  },
  "unexpected-argument": {
    argv: ["init", "app"],
    protects: "A word in the wrong place is reported rather than ignored, so a mistyped option is never silently dropped.",
  },
  "invalid-primitive-type": {
    argv: ["add", "primitive", "ProductCard"],
    protects: "A type is checked as a string, before the disk is touched — a typo comes back as a typo.",
  },
  "reserved-primitive-type": {
    argv: ["add", "primitive", "registry"],
    protects:
      "A primitive really could be typed registry, and its module would land exactly where the generated registry lives.",
  },
  "framework-namespace": {
    argv: ["add", "primitive", "loom.card"],
    protects:
      "@loom/runtime registers the loom.* types itself, and a registry refuses two definitions of one type — so a primitive scaffolded there would be unreachable in the app that wrote it.",
  },
  "already-registered": {
    argv: ["add", "primitive", "app.page"],
    existing: [STARTER_PATH],
    protects: "Re-running the command over a primitive you have written would throw your definition away.",
  },
  "file-exists": {
    argv: ["init"],
    existing: [REGISTRY_PATH],
    protects: "Scaffolding again over a populated directory would discard every registration but the starter.",
  },
  "filesystem-failed": {
    argv: ["init"],
    unwritable: true,
    protects: "The disk itself said no, and the CLI names the path rather than the operation.",
  },
}

/**
 * Reading order for the page: the four that protect something you wrote first,
 * then the four ordinary argument mistakes.
 *
 * Held against the record by a test rather than derived from it, because the
 * order a reader wants is not the order the type was declared in and an
 * ordering nobody stated is an ordering that changes when somebody reformats.
 */
export const REFUSAL_ORDER: readonly CliError["code"][] = [
  "file-exists",
  "framework-namespace",
  "already-registered",
  "reserved-primitive-type",
  "invalid-primitive-type",
  "unknown-command",
  "missing-argument",
  "unexpected-argument",
  "filesystem-failed",
]

export type Refusal = {
  readonly code: CliError["code"]
  readonly command: string
  /** The runtime's own sentence, printed to stderr verbatim. */
  readonly message: string
  readonly protects: string
}

const refusalDiskFor = (spec: RefusalSpec): FileSystem =>
  spec.unwritable === true
    ? unwritableDisk
    : memoryDisk(new Map((spec.existing ?? []).map((path) => [path, ""]))).filesystem

const refuse = async (code: CliError["code"]): Promise<Refusal> => {
  const spec = REFUSAL_SPECS[code]
  const report = await runCli(spec.argv, refusalDiskFor(spec))

  /**
   * A documented refusal that succeeds is the more dangerous direction of the
   * same fault: the page would be warning a reader off something the CLI is
   * perfectly happy to do.
   */
  if (report.ok) {
    throw new Error(`loom: "${commandLine(spec.argv)}" was expected to be refused as ${code} and was not`)
  }

  if (report.error.code !== code) {
    throw new Error(
      `loom: "${commandLine(spec.argv)}" was expected to be refused as ${code} and was refused as ${report.error.code}`
    )
  }

  return {
    code,
    command: commandLine(spec.argv),
    message: describeCliError(report.error),
    protects: spec.protects,
  }
}

export const commandRefusals = (): Promise<readonly Refusal[]> =>
  Promise.all(REFUSAL_ORDER.map(refuse))

/**
 * What a refused `init` left behind, which is the claim worth checking rather
 * than asserting: the plan is decided against the listing before anything is
 * opened, so a clash writes **nothing at all** instead of half a directory.
 */
export const refusedInitLeaves = async (): Promise<ReadonlyMap<string, string>> => {
  const before = new Map([[REGISTRY_PATH, ""]])
  const disk = memoryDisk(before)

  await runCli(["init"], disk.filesystem)

  return disk.snapshot()
}

/**
 * Every command line the page is allowed to print, derived from the specs that
 * are executed rather than listed beside them.
 *
 * `scaffold.test.ts` reads the page's own fenced blocks and holds them against
 * this, so a `loom …` line written into the prose and never run is a red test.
 */
export const EXECUTED_COMMANDS: readonly string[] = [
  ...SESSION_ARGV.map(commandLine),
  commandLine(["init", "--dir", ALTERNATIVE_DIRECTORY]),
  commandLine(["--help"]),
  ...REFUSAL_ORDER.map((code) => commandLine(REFUSAL_SPECS[code].argv)),
]
