import { dirname, join } from "node:path"

import ts from "typescript"

import type { PublishedEntry } from "./extract"
import type { ApiRequirement } from "./model"

/**
 * What a reader has to install before an import of theirs will run.
 *
 * Every other fact on a reference page is about what comes *out* of a door.
 * This is the one fact about what has to be there for the door to open at all,
 * and it is the one a reader meets first — as a stack trace, if nothing on the
 * site told them.
 *
 * On 20 September somebody importing `@loom/runtime/testing/contracts` from a
 * plain Node script got this:
 *
 *     Error: Vitest failed to access its internal state.
 *
 * That is the package behaving correctly. The suites are `describe` blocks, so
 * of course they load a test runner, and `vitest` is an optional peer
 * dependency precisely so that everybody *else* is not made to install one. The
 * only thing wrong was that the page describing that door said nothing about
 * it, and no page could have: the sentence explaining it is in the barrel's own
 * doc comment, and a barrel declares nothing, so the reference had nowhere to
 * put it.
 *
 * **So this is measured rather than lifted.** The prose in `src/` is the
 * author's account of a fact, and the fact itself is in the built package: a
 * door either loads a peer dependency or it does not. Reading the second means
 * a page that cannot fall out of step with the package the way a quoted
 * paragraph can, and it means the page is right about doors whose author never
 * wrote the sentence — `@loom/runtime/testing/contracts` reaches `drizzle-orm`
 * as well as `vitest`, which its comment mentions in passing at the very
 * bottom and no reader would take as an install instruction.
 */

/** The package a bare specifier belongs to: `drizzle-orm/pg-core` is `drizzle-orm`. */
export const packageOf = (specifier: string): string => {
  const parts = specifier.split("/")

  if (specifier.startsWith("@")) return parts.slice(0, 2).join("/")

  return parts[0] ?? specifier
}

/** A relative specifier is a file in this package; anything else names another one. */
const isRelative = (specifier: string): boolean => specifier.startsWith(".")

/** Reads a file out of the built package, or nothing where there is no such file. */
export type ReadFile = (path: string) => string | undefined

/**
 * Every other package reached by following a file's imports.
 *
 * The walk is over the **built** files rather than `src/`, because the question
 * is what a consumer's program loads and that is what a consumer's program
 * loads. It follows `export … from` as well as `import`, which is most of what
 * a barrel is made of, and it visits each file once.
 *
 * A relative import that resolves to nothing stops the generator with a
 * sentence rather than being skipped. A missing file here means the build is
 * incomplete, and the answer this function would otherwise give — *fewer
 * packages than the door really needs* — is the one shape of wrong that a
 * reader would act on.
 */
export const packagesReachedFrom = (start: string, read: ReadFile): ReadonlySet<string> => {
  const seen = new Set<string>()
  const packages = new Set<string>()
  const pending = [start]

  while (pending.length > 0) {
    const file = pending.pop() as string

    if (seen.has(file)) continue

    seen.add(file)

    const text = read(file)

    if (text === undefined) {
      throw new Error(
        `loom: ${file} is imported by the built package and is not there — run pnpm build before generating the reference`
      )
    }

    for (const { fileName } of ts.preProcessFile(text, true, true).importedFiles) {
      if (isRelative(fileName)) pending.push(join(dirname(file), fileName))
      else packages.add(packageOf(fileName))
    }
  }

  return packages
}

/** The packages a single file names directly, without following any of them. */
export const packagesNamedIn = (file: string, read: ReadFile): ReadonlySet<string> => {
  const text = read(file)

  if (text === undefined) return new Set()

  return new Set(
    ts
      .preProcessFile(text, true, true)
      .importedFiles.map(({ fileName }) => fileName)
      .filter((fileName) => !isRelative(fileName))
      .map(packageOf)
  )
}

/** A peer dependency as `package.json` states it. */
export type Peer = { readonly range: string; readonly optional: boolean }

export type Peers = Readonly<Record<string, Peer>>

type Manifest = {
  readonly peerDependencies?: Readonly<Record<string, string>>
  readonly peerDependenciesMeta?: Readonly<Record<string, { readonly optional?: boolean }>>
}

/**
 * The packages this one expects its host to bring, and which of them it can do
 * without.
 *
 * Only peer dependencies. A `dependency` arrives with the package and a reader
 * has it already, so listing it would be telling them to install something
 * their package manager installed for them — noise on every page, in the band
 * whose whole job is to be the short list of things they must act on.
 */
export const peersOf = (manifest: Manifest): Peers =>
  Object.fromEntries(
    Object.entries(manifest.peerDependencies ?? {}).map(([name, range]) => [
      name,
      { range, optional: manifest.peerDependenciesMeta?.[name]?.optional === true },
    ])
  )

/**
 * What one door needs, in the two strengths a reader has to tell apart.
 *
 * **`loaded`** is the strong one and it is transitive: the door's JavaScript
 * reaches this package, so an import of the door executes an import of it.
 * Without it installed the import throws before a line of the reader's own code
 * runs.
 *
 * **`declared`** is the weak one and it is deliberately shallow — the door's
 * own declaration file names the package, and nothing the door loads does.
 * `@loom/runtime/anthropic` is the case: `import type Anthropic from
 * "@anthropic-ai/sdk"` disappears at compile time, so the adapter runs in a
 * project that has never installed the SDK. It cannot be *used* in one, because
 * the client it adapts is the thing the host passes in, and a reader whose
 * page said nothing would find that out from their type-checker.
 *
 * Shallow on purpose: a declaration graph followed all the way reaches every
 * package any type anywhere in its neighbourhood mentions, which is how the
 * store's declarations arrive at `react`. That is a fact about a type chain and
 * not about what a reader must install, and printing it would cost the band the
 * only thing it has — that every line in it is something to act on.
 *
 * A package on both lists is `loaded`: the stronger claim is the true one and
 * a reader does not need to be told twice.
 */
export const requirementsFor = (
  entry: PublishedEntry,
  peers: Peers,
  read: ReadFile,
  root = ""
): readonly ApiRequirement[] => {
  const loaded = entry.runtime === undefined ? new Set<string>() : packagesReachedFrom(join(root, entry.runtime), read)
  const declared = packagesNamedIn(join(root, entry.types), read)

  return Object.entries(peers)
    .flatMap(([name, peer]): readonly ApiRequirement[] => {
      if (loaded.has(name)) return [{ package: name, range: peer.range, optional: peer.optional, reach: "loaded" }]
      if (declared.has(name)) return [{ package: name, range: peer.range, optional: peer.optional, reach: "declared" }]

      return []
    })
    .sort((a, b) => a.package.localeCompare(b.package))
}
