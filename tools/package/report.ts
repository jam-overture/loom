import type { Assembled, AssemblyError } from "./build.js"

/**
 * What `pnpm package:primitives` prints — the readiness table and the failures,
 * kept apart from the command that runs them so a test can read them without a
 * build happening as a side effect of the import. That is not a hypothetical
 * tidiness: the first version of this tool put its work at the top level of the
 * module a test imported, and the suite failed by *assembling the package*.
 */

export const describeError = (error: AssemblyError): string => {
  switch (error.code) {
    case "no-build":
      return "no build to package at dist/primitives — run `pnpm build` first"
    case "unmapped":
      return `these specifiers leave the build and have no entry point:\n  ${error.specifiers.join("\n  ")}`
  }
}

/**
 * The readiness table.
 *
 * Every line that is not `ready` names **who** can clear it and **why it
 * matters**, because a checklist that only says a thing is missing is a
 * checklist somebody clears by deleting the line.
 */
export const describeReadiness = ({ files, rewritten, license }: Assembled): readonly string[] => [
  `packages/primitives assembled — ${String(files)} files, ${String(rewritten)} rewritten`,
  ``,
  license
    ? `  ready     license — LICENSE copied into the package`
    : `  BLOCKED   license — there is no LICENSE at the repository root. A public package without one is a package nobody may legally use, and docs/rollout.md names this as the maintainer's decision and nothing else's`,
  `  yours     npm auth — this machine is not logged in. \`npm whoami\` must answer before a publish`,
  `  yours     the @loom scope must exist and be owned by the publishing account`,
  `  yours     @loom/runtime must be published first, at a version this package's peer range accepts — it is a peer dependency, so this resolves to nothing without it`,
  ``,
  `  verify    cd packages/primitives && npm pack --dry-run`,
  `  publish   cd packages/primitives && npm publish --access public`,
]
