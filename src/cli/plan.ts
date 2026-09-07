import { everyMemberOf } from "../closed-set.js"
import { primitiveTypeSchema } from "../primitive-type.js"
import { err, ok, type Result } from "../result.js"

import { HOST_NAMESPACE } from "./namespace.js"
import {
  CONFORMANCE_TEST_MODULE,
  conformanceTest,
  namesFor,
  primitiveModule,
  REGISTRY_MODULE,
  registryModule,
  type PrimitiveNames,
} from "./templates.js"

/**
 * What a command would write, decided before anything is written.
 *
 * Planning is a pure function of the command and the directory's current
 * contents, which is what makes the CLI testable without a filesystem and what
 * makes "refuse to overwrite" reliable: the decision is made once, against a
 * listing, rather than per-file midway through writing.
 */

export type CliCommand =
  | { readonly kind: "init"; readonly directory: string }
  | { readonly kind: "add-primitive"; readonly directory: string; readonly type: string }
  | { readonly kind: "help" }

export type CliError =
  | { readonly code: "unknown-command"; readonly given: string }
  | { readonly code: "missing-argument"; readonly argument: string }
  | { readonly code: "unexpected-argument"; readonly given: string }
  | { readonly code: "invalid-primitive-type"; readonly type: string }
  | { readonly code: "reserved-primitive-type"; readonly type: string }
  | { readonly code: "framework-namespace"; readonly type: string }
  | { readonly code: "already-registered"; readonly type: string }
  | { readonly code: "file-exists"; readonly path: string }
  | { readonly code: "filesystem-failed"; readonly path: string; readonly detail: string }

export type CliErrorCode = CliError["code"]

/**
 * Every way a command can refuse, as a list something can walk.
 *
 * The last of the four holes `Loom docs` filed on 2 September, and the same
 * shape as the three now closed (`TELEMETRY_EVENT_TYPES`, `WRITE_OUTCOME_KINDS`,
 * `STORE_ERROR_CODES`): a `switch` was always exhaustive, and anything wanting
 * to *walk* the codes — a page telling a reader what `loom` can say, a
 * conformance check — kept its own copy with nothing to fail when a tenth
 * landed. The documentation site keeps exactly such a copy, keyed on
 * `CliError["code"]` so it stops compiling rather than describing nine of ten,
 * which is the best a lane outside `src/` can do and is not the fix.
 *
 * In the order a run meets them: what the argument line can be wrong about,
 * then what the requested type can be wrong about, then what the directory can
 * refuse.
 */
export const CLI_ERROR_CODES: readonly CliErrorCode[] = everyMemberOf<CliErrorCode>()([
  "unknown-command",
  "missing-argument",
  "unexpected-argument",
  "invalid-primitive-type",
  "reserved-primitive-type",
  "framework-namespace",
  "already-registered",
  "file-exists",
  "filesystem-failed",
])

export type PlannedFile = {
  readonly path: string
  readonly contents: string
}

export type WritePlan = {
  readonly files: readonly PlannedFile[]
  /** Lines for the caller to print — what happened, and what to do next. */
  readonly notes: readonly string[]
}

export const PRIMITIVES_DIRECTORY = "primitives"

const join = (...segments: readonly string[]): string => segments.join("/")

const basenameOf = (path: string): string => path.slice(path.lastIndexOf("/") + 1)

/**
 * The primitive modules already in the directory, recovered from their names.
 *
 * Anything that is not a `.ts` file, and the two reserved modules, are skipped —
 * as is a name that is not a valid primitive type, so a stray file cannot make
 * the generated registry reference a module that will not compile.
 */
export const existingPrimitives = (paths: readonly string[]): readonly PrimitiveNames[] =>
  paths.flatMap((path) => {
    const basename = basenameOf(path)
    if (!basename.endsWith(".ts")) return []
    if (basename === REGISTRY_MODULE || basename === CONFORMANCE_TEST_MODULE) return []

    const type = basename.slice(0, -".ts".length)

    return primitiveTypeSchema.safeParse(type).success ? [namesFor(type)] : []
  })

/**
 * The one primitive `init` writes, named in the host's namespace rather than the
 * framework's.
 *
 * It was `loom.page` until 29 August, which is also the name of the starter
 * primitive that mounts a theme — so a host who scaffolded a project and then
 * built a registry the way *Rendering a tree* documents got
 * `duplicate-primitive-type` and a name they had not chosen. See `namespace.ts`.
 */
const STARTER_TYPE = `${HOST_NAMESPACE}.page`

const planInit = (directory: string, existing: readonly string[]): Result<WritePlan, CliError> => {
  const primitives = join(directory, PRIMITIVES_DIRECTORY)
  const starter = namesFor(STARTER_TYPE)

  const files: readonly PlannedFile[] = [
    { path: join(primitives, starter.module), contents: primitiveModule(starter) },
    { path: join(primitives, REGISTRY_MODULE), contents: registryModule([starter]) },
    { path: join(primitives, CONFORMANCE_TEST_MODULE), contents: conformanceTest() },
  ]

  /**
   * `init` refuses if any of its files exist, including the registry it would
   * otherwise own — re-running it over a populated directory would silently
   * discard every registration but the starter.
   */
  const clash = files.find((file) => existing.includes(file.path))
  if (clash) return err({ code: "file-exists", path: clash.path })

  return ok({
    files,
    notes: [
      `Scaffolded ${primitives} with one primitive, a generated registry, and a conformance test.`,
      `Wire the registry into your renderer as both the resolver and the validator, then run the test.`,
    ],
  })
}

/** The type has already been validated by `args.ts`, which is the boundary for it. */
const planAddPrimitive = (
  directory: string,
  type: string,
  existing: readonly string[]
): Result<WritePlan, CliError> => {
  const names = namesFor(type)
  const primitives = join(directory, PRIMITIVES_DIRECTORY)
  const modulePath = join(primitives, names.module)

  if (existing.includes(modulePath)) return err({ code: "already-registered", type })

  const registered = [...existingPrimitives(existing), names]

  return ok({
    files: [
      { path: modulePath, contents: primitiveModule(names) },
      { path: join(primitives, REGISTRY_MODULE), contents: registryModule(registered) },
    ],
    notes: [
      `Declared ${type} in ${modulePath}.`,
      `Regenerated ${join(primitives, REGISTRY_MODULE)} with ${registered.length} primitive${registered.length === 1 ? "" : "s"}.`,
      `Give it a description and a prop schema — the description is what a model reads when it chooses between primitives.`,
    ],
  })
}

export const planCommand = (
  command: CliCommand,
  existing: readonly string[]
): Result<WritePlan, CliError> => {
  switch (command.kind) {
    case "init":
      return planInit(command.directory, existing)
    case "add-primitive":
      return planAddPrimitive(command.directory, command.type, existing)
    case "help":
      return ok({ files: [], notes: [] })
  }
}
