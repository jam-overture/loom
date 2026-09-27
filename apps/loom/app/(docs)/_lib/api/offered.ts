import { join } from "node:path"
import { pathToFileURL } from "node:url"

import { packageRoot, type PublishedEntry } from "./extract"
import type { ApiEntry, ApiKind } from "./model"

/**
 * Whether the door the reference describes is the door the package opens.
 *
 * The API reference is generated, and the argument for generating it is that
 * nobody has to remember to update it. That argument has a hole in it, and the
 * hole is the difference between **declaring** an export and **shipping** one.
 *
 * The reference is read from `dist/*.d.ts`, which is what a consumer's
 * type-checker sees. It is not what their program sees. Those are two files
 * produced by one compiler from one source, and they agree almost always —
 * which is exactly what makes the times they do not so expensive, because
 * everything downstream is built on the assumption that they cannot differ.
 *
 * On 12 September they differed. `export type * from "../catalogue.js"` is
 * correct TypeScript: it re-exports the target module's types and, by the
 * `type` modifier, none of its values. The declaration emit copies the line
 * through verbatim, so the `.d.ts` still says `export type *` — and whatever
 * resolved that star for the generator walked into the target module and
 * reported everything it found there, `export const` included. The reference
 * then told a reader to import `catalogueFields` and `closedChoices` from
 * `@jam-overture/loom/sdk`. Both are `undefined` on that entry point. Nothing on
 * this site could have caught it: the page was produced by the generator, and
 * the only test over it asks whether the generator produced it.
 *
 * So this module asks the other question, and it asks it of the package rather
 * than of the compiler: **import the door and see what comes back.**
 *
 * That is deliberately a different instrument from a better generator. Reading
 * the `type` modifier correctly would have fixed that one morning's defect and
 * nothing else — a value the bundler dropped, a subpath whose conditions point
 * at the wrong file, a re-export of a module that was deleted, all still
 * produce a confident page. Opening the door catches the whole class, including
 * the members of it nobody has thought of yet, because the question it asks is
 * the one the reader is really asking: *if I type this import, do I get
 * something?*
 *
 * It is not a replacement for reading the declarations. The declarations are
 * where the types are, and types are most of what a reference is for; a running
 * module cannot tell you what `TreeDelta` is. The two are held against each
 * other, which is the only arrangement in which either can be trusted.
 */

/** What a published door hands back: every name on it, and what kind of thing it is. */
export type Offered = ReadonlyMap<string, string>

/**
 * The kinds of disagreement a door and its page can be in.
 *
 * Each is stated as a fact about the *reader*, because that is what decides
 * whether it matters. A reference that is merely imprecise is a smaller problem
 * than one that is wrong about whether something is there at all.
 */
export type DisagreementKind =
  /** The page offers it. The door hands back nothing under that name. */
  | "not-offered"
  /** The page says it is a function. The door hands back something else. */
  | "not-a-function"
  /** The door offers it. The page does not mention it. */
  | "not-listed"
  /** The page says it is a type. The door hands back a value under that name too. */
  | "offered-as-a-value"

export type Disagreement = {
  readonly specifier: string
  readonly name: string
  readonly kind: DisagreementKind
  /** What went wrong, in a line somebody reading a failed build can act on. */
  readonly sentence: string
}

/**
 * What each kind of export commits the door to.
 *
 * `class` sits with `function` because a class **is** a function once the types
 * are gone, and the reader's question — is there something there to call — has
 * the same answer for both.
 *
 * `type` and `interface` commit the door to handing back *nothing*, and that
 * direction is worth checking rather than skipping. A name that is a type on
 * the page and a value on the door is a name whose value nobody can find out
 * about from this site — usually because the generator met two declarations of
 * it and described the first.
 */
const COMMITS_TO: Readonly<Record<ApiKind, "a function" | "a value" | "nothing">> = {
  function: "a function",
  class: "a function",
  schema: "a value",
  value: "a value",
  type: "nothing",
  interface: "nothing",
}

/** Every symbol on an entry's page, flattened out of the groups that arrange them. */
const listedIn = (entry: ApiEntry): readonly { readonly name: string; readonly kind: ApiKind }[] =>
  entry.groups.flatMap((group) => group.symbols.map(({ name, kind }) => ({ name, kind })))

/**
 * Hold one entry point's page against one entry point's door.
 *
 * Pure, and over two plain values rather than over the filesystem, so the rules
 * above can be shown to catch what they claim to catch without anybody having
 * to break the package to find out. A guard that can only be exercised by
 * introducing the defect it guards against is a guard nobody exercises.
 */
export const disagreements = (entry: ApiEntry, offered: Offered): readonly Disagreement[] => {
  const listed = listedIn(entry)
  const faults: Disagreement[] = []

  for (const { name, kind } of listed) {
    const commitment = COMMITS_TO[kind]
    const has = offered.has(name)

    if (commitment === "nothing") {
      if (has) {
        faults.push({
          specifier: entry.specifier,
          name,
          kind: "offered-as-a-value",
          sentence: `${entry.specifier} hands back a ${offered.get(name) ?? "value"} called ${name}, and the reference describes ${name} as a ${kind}. A reader is told they may refer to it and not that they may use it.`,
        })
      }

      continue
    }

    if (!has) {
      faults.push({
        specifier: entry.specifier,
        name,
        kind: "not-offered",
        sentence: `the reference lists ${name} under ${entry.specifier} as a ${kind}, and importing ${name} from ${entry.specifier} gives nothing. The declarations promise it and the built module does not carry it.`,
      })

      continue
    }

    if (commitment === "a function" && offered.get(name) !== "function") {
      faults.push({
        specifier: entry.specifier,
        name,
        kind: "not-a-function",
        sentence: `the reference calls ${name} a ${kind} and ${entry.specifier} hands back a ${offered.get(name) ?? "value"}. A reader following the page would call something that cannot be called.`,
      })
    }
  }

  const listedNames = new Set(listed.map((symbol) => symbol.name))

  for (const [name, typeOf] of offered) {
    if (listedNames.has(name)) continue

    faults.push({
      specifier: entry.specifier,
      name,
      kind: "not-listed",
      sentence: `${entry.specifier} hands back a ${typeOf} called ${name} and no page on this site mentions it. Something is published that a reader has no way to find.`,
    })
  }

  return faults
}

/**
 * Open a door and write down what is behind it.
 *
 * The module is imported rather than parsed, because the question is what a
 * consumer gets and a consumer imports it. `Object.keys` on the namespace is
 * the same list their editor would offer them.
 *
 * Every published entry point is imported at once in the test that drives this,
 * which is a real and accepted cost: a browser-only door, a door that opens a
 * database driver, and a door that pulls in a test runner are all loaded in one
 * Node process. That is tolerable only because none of them does work when
 * loaded — and if one ever starts, this is where it will be noticed, which is
 * itself worth knowing.
 */
export const offeredBy = async (entry: PublishedEntry, root: string = packageRoot): Promise<Offered> => {
  if (entry.runtime === undefined) {
    throw new Error(
      `loom: ${entry.specifier} publishes declarations and no implementation, so there is nothing behind the door its page describes. Give the subpath a "default" condition in package.json.`
    )
  }

  const namespace = (await import(pathToFileURL(join(root, entry.runtime)).href)) as Record<string, unknown>

  return new Map(Object.keys(namespace).map((name) => [name, typeof namespace[name]]))
}
