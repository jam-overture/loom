/**
 * A type printed in a lesson, read as the declaration it claims to be.
 *
 * This course has three checks over its own prose and all three are about
 * *executed* code. `run.test.ts` compiles every Try it program and runs it
 * against `src/`. `transcripts.test.ts` holds what a lesson says it printed
 * against what it printed. `claims.test.ts` holds a sentence that counts a list
 * against the list. Between them they reach every number and every line of
 * output in the course, and none of them reaches a **declaration**.
 *
 * That gap has cost twice in two runs, both recorded before this module existed.
 * Lesson 09 printed a `GateRule` whose `fires` signature the runtime had stopped
 * having. Lesson 11 printed `ModelClient.complete` taking one argument, six days
 * after [0140] gave it a second one — a fence that is the whole of what a reader
 * is told the network boundary is, in the lesson whose subject is that boundary.
 * Every exercise in both lessons passed throughout, because an exercise calls a
 * function and a fence describes one.
 *
 * ## Why a fence is checkable at all
 *
 * Lesson 28's sentence, applied to this lane's own files: **a check is a
 * comparison, and a unique thing has nothing to be compared to.** A fence that
 * says `export type MarkedHolds = {…}` is not unique — `src/write/liveness.ts`
 * says it too — so the second copy already exists and nobody had written the
 * comparison. That is the cheapest of the three sources in that lesson's order
 * of preference: nothing here is registered by hand except the inventory, and
 * the inventory is itself derived and compared, which is the one thing
 * `record-claims.test.ts` cannot say about its own list.
 *
 * ## What is compared, and what is deliberately not
 *
 * A fence is held to **what it names and nothing else**. Every member it lists
 * must exist in the declaration, with the same type text; a member it leaves out
 * is a silence rather than a claim, because a lesson abridges on purpose and
 * three of them do. Where a fence lists *every* member, it is indistinguishable
 * from the declaration and is held complete from then on — so a declaration that
 * grows a field breaks the lessons that printed it whole and leaves the ones
 * that printed four of nine alone. Nothing has to be remembered for that to be
 * true, which is the point: completeness is read off the fence rather than
 * declared beside it.
 *
 * Type parameters are not compared. `LoomPrimitiveProps` is written in lesson 27
 * as `LoomPrimitiveProps<…>` over three parameters with defaults and bounds, and
 * a check that demanded them in full would make that lesson print eight lines of
 * generics to say a thing about its third field. The cost is stated rather than
 * paid: a parameter list that drifts is not reached from here.
 *
 * `export` is not compared either. Lessons write `type RenderOutput` for a type
 * the runtime exports and `type GateRule` for one it does not, and the
 * distinction a reader needs is in the *In the code* table beside the fence.
 *
 * `…` in a fence matches anything. It is how a member elides a type it is not
 * talking about, and it is the only wildcard: a fence that wants to say less
 * says so in the one character this course already uses for it.
 *
 * ## The limit worth knowing before you trust a green row
 *
 * A declaration assembled out of other declarations is not followed.
 * `RevisionPage = PageEnds & { revisions }` has `older` and `newer` in it and
 * this module cannot see them, so a fence naming either is reported as naming a
 * member that does not exist — a false red, not a false green, which is the
 * direction to be wrong in. The same goes for `Pick<TreeStore, "head">` and
 * anything else that names its members somewhere other than its own braces.
 * Every one of the course's seventeen fences prints a declaration that spells its
 * members out, so nothing in `lessons/` is affected today; a lesson that wants to
 * print an intersection will find this out immediately and loudly, which is the
 * arrangement this file would have chosen anyway.
 */

export type DeclarationKind = "type" | "interface"

/** One property of a declaration: `readonly repairer?: ChangeRepairer`. */
export type DeclarationMember = {
  /** The property name, with `?` when it is optional — an optional that became required is drift. */
  readonly name: string
  /**
   * The type text, whitespace collapsed, or `null` when the fence wrote a bare
   * name. Lesson 10 prints `{ kind: "applied"; assessment; disposition }` to put
   * five outcomes on five lines, and a bare name claims that the member exists
   * and claims nothing about its type.
   */
  readonly type: string | null
}

export type Declaration = {
  readonly kind: DeclarationKind
  readonly name: string
  /** Properties, in source order, including every arm of a union of object types. */
  readonly members: readonly DeclarationMember[]
  /**
   * The right-hand side, for a declaration with no properties at all —
   * `"live" | "dead" | "unknown"`, `Readonly<z.infer<typeof gatePolicySchema>>`.
   * Compared whole, because there is nothing smaller to compare.
   */
  readonly alias: string | null
  /** 1-based line within the text it was found in, for a failure that can be opened. */
  readonly line: number
}

const OPENERS = new Set(["{", "(", "["])
const CLOSERS = new Set(["}", ")", "]"])

/**
 * Comments out, strings kept.
 *
 * A member's type is routinely a string literal — `kind: "applied"` — and a doc
 * comment sits above half the members in `src/`, so the fence and the
 * declaration have to be reduced to the same thing before either can be read.
 */
const withoutComments = (text: string): string =>
  text.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, " ")).replace(/\/\/[^\n]*/g, " ")

const collapse = (text: string): string => text.replace(/\s+/g, " ").trim()

const IMPORT_OPENS = /^[\t ]*(?:import\b|export[\t ]+type[\t ]*\{|export[\t ]*\{)/
const IMPORT_CLOSES = /from[\t ]*["']|^[\t ]*\}[\t ]*;?[\t ]*$/

/**
 * Import lists out, and this is the whole of why the check is not vacuous.
 *
 * `import { type ChangeInterpreter, fixedPolicy } from "@loom/runtime"` puts the
 * words `type ChangeInterpreter` at the start of a line, and the first version of
 * this module read seventeen of them as declarations — including one in a lesson
 * fence, which it then "compared" against an import in `src/` and reported as a
 * five-member drift. A declaration and a named import are the same two tokens in
 * the same order, so nothing smaller than knowing which statement you are in
 * tells them apart.
 */
const withoutImports = (text: string): string => {
  const lines = text.split("\n")
  const kept: string[] = []
  let inside = false

  for (const line of lines) {
    if (inside) {
      if (IMPORT_CLOSES.test(line)) inside = false
      kept.push("")
      continue
    }

    if (IMPORT_OPENS.test(line)) {
      if (!/from[\t ]*["']|["'][\t ]*;?[\t ]*$/.test(line)) inside = true
      kept.push("")
      continue
    }

    kept.push(line)
  }

  return kept.join("\n")
}

const MEMBER = /^(?:readonly\s+)?([A-Za-z_$][\w$]*)(\?)?\s*(?::([\s\S]*))?$/

const memberOf = (segment: string): DeclarationMember | null => {
  const found = MEMBER.exec(collapse(segment).replace(/[,;]+$/, ""))
  if (found === null) return null

  const type = found[3] === undefined ? null : collapse(found[3])

  return { name: `${found[1] ?? ""}${found[2] ?? ""}`, type: type === "" ? null : type }
}

/**
 * The properties of a declaration body, split where a declaration splits them.
 *
 * Segments are cut at a `;` or a newline that is **directly inside an object
 * brace** — which is what makes a member whose type spans four lines inside
 * parentheses one member, and what makes each arm of a union contribute its own.
 * Nothing is cut inside a nested object, so a member holding an object type
 * stays one member and is compared by its whole text.
 */
const membersOf = (body: string): readonly DeclarationMember[] => {
  const members: DeclarationMember[] = []
  let braces = 0
  let nested = 0
  let held = ""

  const flush = (): void => {
    const member = held.trim() === "" ? null : memberOf(held)
    if (member !== null) members.push(member)
    held = ""
  }

  for (const char of body) {
    if (char === "{") {
      braces += 1
      if (braces > 1) nested += 1
      else flush()
      if (braces > 1) held += char
      continue
    }

    if (char === "}") {
      if (braces > 1) {
        nested -= 1
        held += char
      } else {
        flush()
      }
      braces -= 1
      continue
    }

    if (OPENERS.has(char)) nested += 1
    if (CLOSERS.has(char)) nested -= 1

    if (braces === 1 && nested === 0 && (char === ";" || char === "\n")) {
      flush()
      continue
    }

    if (braces >= 1) held += char
  }

  flush()

  return members
}

const DECLARATION = /^(?:export[\t ]+)?(type|interface)[\t ]+([A-Za-z_$][\w$]*)/

/**
 * A line that continues the declaration above it rather than starting the next
 * thing: a union arm, a closing brace or bracket, the `>` that ends a parameter
 * list, the `=` that follows one.
 */
const CONTINUES = /^[|&})\]>=,?:]/

/**
 * A declaration runs from its own line to the next thing written at the margin.
 *
 * Read by line rather than by counting braces, and `CompositionOutcome` is why:
 * a union of five object types closes its first brace four arms before the
 * declaration ends, so the obvious rule — stop at the brace you opened — silently
 * read one arm of five. It passed, because a fence that abridges the same union
 * abridges it the same way, and two halves of one declaration agreed with each
 * other. That is the exact failure this module exists to catch, found in the
 * module while writing it.
 */
const declarationLines = (lines: readonly string[], from: number): readonly string[] => {
  const held = [lines[from] as string]

  for (let at = from + 1; at < lines.length; at += 1) {
    const line = lines[at] as string
    if (/^\S/.test(line) && !CONTINUES.test(line)) break
    held.push(line)
  }

  return held
}

/** Every `type` and `interface` declared in a piece of TypeScript, in order. */
export const parseDeclarations = (source: string): readonly Declaration[] => {
  const lines = withoutImports(withoutComments(source)).split("\n")
  const found: Declaration[] = []

  for (let at = 0; at < lines.length; at += 1) {
    const opener = DECLARATION.exec((lines[at] as string).trimStart())
    if (opener === null) continue

    const whole = declarationLines(lines, at).join("\n")
    const brace = whole.indexOf("{")
    const members = brace === -1 ? [] : membersOf(whole.slice(brace))
    const equals = whole.indexOf("=")
    const alias =
      members.length > 0 || opener[1] === "interface" || equals === -1 ? null : collapse(whole.slice(equals + 1))

    found.push({
      kind: opener[1] as DeclarationKind,
      name: opener[2] as string,
      members,
      alias,
      line: at + 1,
    })
  }

  return found
}

/**
 * Where a declaration of this name is written in a file, 1-based.
 *
 * A fence's own line number is its line within the fence, which is not a place
 * anybody can open. The lesson is the artefact under review, so a failure names
 * the line in the lesson — found by looking for the declaration's opener in the
 * whole file rather than by threading positions through the markdown parser,
 * which would be a second reason for that parser to know about code.
 */
export const lineOf = (text: string, name: string): number => {
  const lines = text.split("\n")
  const opener = new RegExp(`^(?:export[\\t ]+)?(?:type|interface)[\\t ]+${name}\\b`)
  const at = lines.findIndex((line) => opener.test(line.trimStart()))

  return at + 1
}

/** A fence says something the declaration does not. */
export type Drift =
  | { readonly kind: "absent"; readonly member: string }
  | { readonly kind: "type"; readonly member: string; readonly fence: string; readonly source: readonly string[] }
  | { readonly kind: "alias"; readonly fence: string; readonly source: string }
  | { readonly kind: "shape"; readonly fence: string; readonly source: string }

/** `…` elides a part of a type the fence is not talking about. */
const matches = (fence: string, source: string): boolean => {
  if (!fence.includes("…")) return fence === source
  const pattern = fence
    .split("…")
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("[\\s\\S]*")

  return new RegExp(`^${pattern}$`).test(source)
}

/**
 * What a fence claims that its declaration does not say.
 *
 * Members are matched by name and consumed, so a union writing `kind` five times
 * is five separate claims rather than one checked five times over — which is how
 * lesson 10's abridged `CompositionOutcome` is held to five discriminants
 * without being held to the field it leaves out.
 */
export const driftOf = (fence: Declaration, source: Declaration): readonly Drift[] => {
  if (fence.members.length === 0 && source.members.length === 0) {
    if (fence.alias === null || source.alias === null) {
      return fence.alias === source.alias ? [] : [{ kind: "shape", fence: String(fence.alias), source: String(source.alias) }]
    }

    return matches(fence.alias, source.alias) ? [] : [{ kind: "alias", fence: fence.alias, source: source.alias }]
  }

  if (fence.members.length === 0 || source.members.length === 0) {
    return [{ kind: "shape", fence: fence.alias ?? "an object", source: source.alias ?? "an object" }]
  }

  const unclaimed = [...source.members]
  const drift: Drift[] = []

  for (const member of fence.members) {
    const byName = unclaimed.filter((candidate) => candidate.name === member.name)

    if (byName.length === 0) {
      const anywhere = source.members.some((candidate) => candidate.name === member.name)
      drift.push(
        anywhere
          ? { kind: "type", member: member.name, fence: member.type ?? "(no type)", source: [] }
          : { kind: "absent", member: member.name }
      )
      continue
    }

    const hit =
      member.type === null
        ? byName[0]
        : byName.find((candidate) => candidate.type !== null && matches(member.type as string, candidate.type))

    if (hit === undefined) {
      drift.push({
        kind: "type",
        member: member.name,
        fence: member.type ?? "(no type)",
        source: byName.map((candidate) => candidate.type ?? "(no type)"),
      })
      continue
    }

    unclaimed.splice(unclaimed.indexOf(hit), 1)
  }

  return drift
}

/**
 * Whether the fence printed the whole declaration.
 *
 * Counted rather than compared, because every member has already been held
 * against the declaration by the time this is asked: a fence with as many
 * members as the declaration, each of which matched one, is the declaration.
 */
export const isComplete = (fence: Declaration, source: Declaration): boolean =>
  fence.members.length === source.members.length && (fence.members.length > 0 || fence.alias !== null)
