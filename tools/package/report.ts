import type { Assembled, AssemblyError } from "./build.js"

/**
 * What `pnpm package:primitives` prints — the readiness table and the failures,
 * kept apart from the command that runs them so a test can read them without a
 * build happening as a side effect of the import. That is not a hypothetical
 * tidiness: the first version of this tool put its work at the top level of the
 * module a test imported, and the suite failed by *assembling the package*.
 *
 * **Everything here is reported, not asserted.** The first version of this
 * table listed three preconditions as flat text — own the scope, log in, publish
 * the runtime first — and within a day two of the three were done and the table
 * still said they were not. A checklist that cannot tell whether its own items
 * are finished is a checklist people stop reading, so the facts arrive as
 * arguments and the caller is what goes and looks.
 */

export type Readiness = Assembled & {
  readonly packageName: string
  readonly peer: string
  readonly peerRange: string
  /** Who npm answers as, or `undefined` when this machine is not logged in. */
  readonly account: string | undefined
  /** The peer version the registry actually serves for the declared range. */
  readonly peerPublished: string | undefined
}

export const describeError = (error: AssemblyError): string => {
  switch (error.code) {
    case "no-build":
      return "no build to package at dist/primitives — run `pnpm build` first"
    case "unmapped":
      return `these specifiers leave the build and have no entry point:\n  ${error.specifiers.join("\n  ")}`
  }
}

const line = (ready: boolean, label: string, detail: string): string =>
  `  ${ready ? "ready  " : "BLOCKED"}   ${label} — ${detail}`

/**
 * The table. Every line that is not `ready` says **who** can clear it and **why
 * it matters**, because a checklist that only names a missing thing is a
 * checklist somebody clears by deleting the line.
 */
export const describeReadiness = (state: Readiness): readonly string[] => {
  const scope = state.packageName.startsWith("@") ? state.packageName.split("/")[0] ?? "" : ""
  const blocked = [state.license, state.account !== undefined, state.peerPublished !== undefined].some(
    (ready) => !ready
  )

  return [
    `${state.packageName}@${state.version} assembled — ${String(state.files)} files, ${String(state.rewritten)} rewritten`,
    ``,
    line(
      state.license,
      "license",
      state.license
        ? "LICENSE copied into the package, and the id read from the framework's own manifest so the two cannot disagree"
        : "there is no LICENSE at the repository root. A public package without one is a package nobody may legally use"
    ),
    line(
      state.peerPublished !== undefined,
      "the peer",
      state.peerPublished === undefined
        ? `${state.peer}@${state.peerRange} is not on the registry. It is a peer dependency, so this package resolves to nothing without it — and it has to go out first`
        : `${state.peer}@${state.peerPublished} is on the registry and satisfies ${state.peerRange}`
    ),
    line(
      state.account !== undefined,
      "npm auth",
      state.account === undefined
        ? `this machine is not logged in. \`npm whoami\` must answer, from an account that can publish under ${scope}`
        : `logged in as ${state.account}, which must be able to publish under ${scope}`
    ),
    ``,
    blocked ? `  not publishable yet — the BLOCKED lines above` : `  verify    cd packages/primitives && npm pack --dry-run`,
    blocked ? `` : `  publish   cd packages/primitives && npm publish --access public`,
  ].filter((text, index, all) => !(text === "" && all[index - 1] === ""))
}
