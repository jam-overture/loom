import { apiEntries } from "../api/reference"

/**
 * The contract suites a host can run against its own implementation, read off
 * the generated reference rather than listed here.
 *
 * **The plain version.** Loom publishes a few ready-made test suites. You hand
 * one the thing you wrote — your own tree store, your own journal — and it
 * checks that your version keeps the promises Loom's own two versions keep.
 * *Testing what you built* lists them, and this is where the list comes from.
 *
 * Typing the list out would have been a handful of lines and would have been
 * wrong the first time another suite was published, which is the same argument
 * that makes the API reference generated (§4c). So the suites are found the way
 * a reader would find them: in the door that publishes them, by the shape of
 * their names.
 *
 * **The seam each one holds comes out of the module's own opening sentence.**
 * Every contract module in the framework opens with *"One suite, run against
 * every `TreeStore`."*, and the name in backticks is the seam. Lifting it means
 * this page says what the framework's author said rather than a second
 * paraphrase of it. A module whose sentence stops naming one is refused here, so
 * a renamed seam is a failing test rather than a blank cell.
 */

/** The door the suites are published from, and the only one this module reads. */
export const CONTRACTS_SPECIFIER = "@jam-overture/loom/testing/contracts"

/** `describeTreeStoreContract` and nothing else in the door. */
const SUITE_NAME = /^describe[A-Za-z]+Contract$/

/** The seam named in a contract module's opening sentence. */
const SEAM_IN_SUMMARY = /run against every `([A-Za-z]+)`/

export type ContractSuite = {
  /** `describeTreeStoreContract`. */
  readonly name: string
  /** `TreeStore` — the seam a host is writing its own implementation of. */
  readonly seam: string
  /** The declaration as the package publishes it, with the name taken off the front. */
  readonly call: string
}

/**
 * The call, without the `const name: ` the declaration carries.
 *
 * The name is already the row's first column, and a signature that repeats it
 * is a line wide enough to need a scrollbar on a phone for no information.
 */
const callOf = (name: string, signature: string): string => {
  const prefix = `const ${name}: `

  return signature.startsWith(prefix) ? signature.slice(prefix.length) : signature
}

/**
 * Every suite the door publishes, in alphabetical order of the seam it holds.
 *
 * Alphabetical rather than in the order a host is likely to need them. A
 * reader's order would be a judgement typed into a file, and a sixth suite
 * added tomorrow would land wherever the module list happened to put it; this
 * way it lands in one knowable place and nobody has to maintain the sequence.
 */
export const contractSuites = (): readonly ContractSuite[] => {
  const door = apiEntries.find((entry) => entry.specifier === CONTRACTS_SPECIFIER)

  if (door === undefined) {
    throw new Error(`loom-docs: the reference has no entry for ${CONTRACTS_SPECIFIER}`)
  }

  const suites = door.groups.flatMap((group) =>
    group.symbols
      .filter((symbol) => SUITE_NAME.test(symbol.name))
      .map((symbol) => {
        const named = SEAM_IN_SUMMARY.exec(group.summary)

        if (named?.[1] === undefined) {
          throw new Error(
            `loom-docs: ${group.module} does not say which seam ${symbol.name} holds`
          )
        }

        return { name: symbol.name, seam: named[1], call: callOf(symbol.name, symbol.signature) }
      })
  )

  return [...suites].sort((left, right) => left.seam.localeCompare(right.seam))
}
