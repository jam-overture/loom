import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { type Declaration, driftOf, isComplete, lineOf, parseDeclarations } from "./declarations"
import { parseBlocks } from "./markdown"
import { COURSE_DIR, RUNTIME_SRC } from "./source"

/**
 * Every type this course prints, held against the type the runtime has.
 *
 * The module beside this one says why a fence is checkable and what is compared.
 * What belongs here is the population: which fences exist, how much each one
 * claims, and which of them print a declaration whole. All three are derived
 * from the course and then pinned, because a scan that stops finding anything
 * reports a clean sheet — and this check's whole subject is a second copy that
 * agreed with nothing.
 *
 * ## What it found on the day it was written
 *
 * One drift, in the worst available place. Lesson 11 is *the model seam*, its
 * second cut is the network boundary, and the fence that prints that boundary
 * had `complete` taking a single argument. [0140] gave it a second one on
 * 13 September and `src/interpretation/client.ts` grew it on the 20th. The lesson
 * sat six days printing the signature the runtime had stopped having, with every
 * exercise in it green — because an exercise calls `complete` through a double
 * the lesson writes itself, and a double satisfies a one-argument signature and
 * a two-argument one identically.
 *
 * That is the second time a fence in this course has gone stale this way and the
 * first time anything noticed. Lesson 09's `GateRule` was found by a reader in
 * September; this one was found by a program in the same run that wrote the
 * program, which is the difference the course is trying to buy.
 */

/** A fence that prints a declaration `src/` also has. */
type Held = {
  readonly lesson: string
  readonly name: string
  /** How many properties the fence lists — 0 for an alias, whose text is compared whole. */
  readonly members: number
  /** Whether the fence lists every member the declaration has, and is therefore held to that. */
  readonly whole: boolean
}

/**
 * The twenty fences this check reaches, and what each claims.
 *
 * `members` is the non-vacuity pin. A parser that stopped splitting members
 * would take every row to `0` and compare nothing while passing; a fence that
 * quietly lost a field would take one row down by one. Both are a red row here
 * with the lesson named, rather than a silence.
 *
 * `whole` is the reader-facing half. A fence listing every member of a
 * declaration is indistinguishable from the declaration, so the reader is
 * entitled to read it as the whole thing — and from then on a field added in
 * `src/` is this lane's to print. The three rows that are `false` abridge on
 * purpose: lesson 10 puts five outcomes on five lines and leaves out
 * `repairFailure?`, which is lesson 13's subject and not lesson 10's.
 */
const HELD: readonly Held[] = [
  { lesson: "02-ui-as-data.md", name: "ElementNode", members: 5, whole: true },
  { lesson: "02-ui-as-data.md", name: "TextNode", members: 3, whole: true },
  { lesson: "02-ui-as-data.md", name: "SlotNode", members: 4, whole: true },
  { lesson: "02-ui-as-data.md", name: "LoomNode", members: 0, whole: true },
  { lesson: "05-purity-at-the-seams.md", name: "Result", members: 4, whole: true },
  { lesson: "05-purity-at-the-seams.md", name: "CompositionRuntime", members: 8, whole: true },
  { lesson: "09-the-gate.md", name: "GateRule", members: 3, whole: true },
  { lesson: "10-the-pipeline.md", name: "CompositionOutcome", members: 16, whole: false },
  { lesson: "11-the-model-seam.md", name: "ChangeInterpreter", members: 1, whole: true },
  { lesson: "11-the-model-seam.md", name: "ModelClient", members: 1, whole: true },
  { lesson: "11-the-model-seam.md", name: "ModelCallOptions", members: 1, whole: true },
  { lesson: "14-rendering.md", name: "RenderOutput", members: 3, whole: true },
  { lesson: "14-rendering.md", name: "TreeSource", members: 1, whole: true },
  { lesson: "18-data.md", name: "DataOutcome", members: 4, whole: true },
  { lesson: "25-exhaustiveness.md", name: "GatePolicy", members: 0, whole: true },
  { lesson: "26-liveness.md", name: "HoldLiveness", members: 0, whole: true },
  { lesson: "26-liveness.md", name: "MarkedHolds", members: 2, whole: true },
  { lesson: "27-scale.md", name: "LoomPrimitiveProps", members: 3, whole: true },
  { lesson: "30-rendezvous.md", name: "BindingDeclaration", members: 2, whole: true },
  { lesson: "31-behavior.md", name: "Behavior", members: 5, whole: true },
]

/**
 * Declarations a lesson invents for its own exercise, which stand for nothing in
 * `src/` and are held to nothing.
 *
 * Ten: `Seams` in lesson 05, `Ask` in 09 and again in 19, `Ops` and `Stage` in
 * 10 and the same pair in 13, `StatProps` in 24, `Code` in 25, and `ExtraState`
 * in 29 — the last of those is the shape its own exercises pass around, and is a
 * local for the same reason the others are. They are local
 * on the strength of a name not being found, which is a fact about `src/` rather
 * than about the lesson — so the count is pinned, and the day the runtime
 * publishes a `Code` or a `Stage` this goes red and somebody decides whether the
 * lesson is now printing a copy of it.
 */
const LOCAL_DECLARATIONS = 10

const sources = (dir: string): readonly string[] =>
  readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) return sources(path)

    return /\.tsx?$/.test(path) && !/\.test\.tsx?$/.test(path) ? [path] : []
  })

type Located = { readonly file: string; readonly declaration: Declaration }

/** Every type and interface the runtime declares, by name. Tests are excluded: a fixture is not a promise. */
const runtime = ((): ReadonlyMap<string, readonly Located[]> => {
  const byName = new Map<string, Located[]>()

  for (const file of sources(RUNTIME_SRC)) {
    for (const declaration of parseDeclarations(readFileSync(file, "utf8"))) {
      const at = byName.get(declaration.name) ?? []
      at.push({ file: file.slice(RUNTIME_SRC.length + 1), declaration })
      byName.set(declaration.name, at)
    }
  }

  return byName
})()

type Fence = { readonly lesson: string; readonly declaration: Declaration; readonly line: number }

/** Every declaration printed in a TypeScript fence anywhere in the course. */
const fences = ((): readonly Fence[] => {
  const found: Fence[] = []

  for (const lesson of readdirSync(COURSE_DIR).filter((name) => name.endsWith(".md")).sort()) {
    const markdown = readFileSync(join(COURSE_DIR, lesson), "utf8")

    for (const block of parseBlocks(markdown)) {
      if (block.kind !== "code") continue
      if (block.language !== "ts" && block.language !== "tsx") continue

      for (const declaration of parseDeclarations(block.code)) {
        found.push({ lesson, declaration, line: lineOf(markdown, declaration.name) })
      }
    }
  }

  return found
})()

const held = fences.filter((fence) => runtime.has(fence.declaration.name))

describe("the types this course prints", () => {
  it("is the population the census names", () => {
    expect(
      held.map((fence) => ({
        lesson: fence.lesson,
        name: fence.declaration.name,
        members: fence.declaration.members.length,
        whole: isComplete(fence.declaration, (runtime.get(fence.declaration.name) as readonly Located[])[0]!.declaration),
      }))
    ).toEqual(HELD)
  })

  it("counts the declarations a lesson invents for itself", () => {
    expect(fences.length - held.length).toBe(LOCAL_DECLARATIONS)
  })

  it("names one declaration each, so nothing is compared against a choice", () => {
    expect(
      held
        .map((fence) => ({
          name: fence.declaration.name,
          in: (runtime.get(fence.declaration.name) as readonly Located[]).map((at) => at.file),
        }))
        .filter((entry) => entry.in.length !== 1)
    ).toEqual([])
  })

  it.each(HELD.map((entry) => [`${entry.lesson} — ${entry.name}`, entry] as const))(
    "%s says what the runtime says",
    (_name, entry) => {
      const fence = held.find((candidate) => candidate.lesson === entry.lesson && candidate.declaration.name === entry.name)
      expect(fence, `no fence for ${entry.name} in ${entry.lesson}`).toBeDefined()

      const at = (runtime.get(entry.name) as readonly Located[])[0]!

      expect(
        driftOf((fence as Fence).declaration, at.declaration),
        `lessons/${entry.lesson}:${(fence as Fence).line} against src/${at.file}:${at.declaration.line}`
      ).toEqual([])
    }
  )
})

describe("reading a declaration", () => {
  it("takes every arm of a union, not the first one", () => {
    const [outcome] = parseDeclarations(`type Outcome =
  | { readonly kind: "applied"; readonly tree: LoomTree }
  | { readonly kind: "rejected"; readonly reason: string }
`)

    expect(outcome?.members.map((member) => member.name)).toEqual(["kind", "tree", "kind", "reason"])
  })

  it("keeps a member whose type spans several lines as one member", () => {
    const [seam] = parseDeclarations(`export interface Seam {
  readonly ask: (
    question: Question,
    options?: Options
  ) => Promise<Answer>
}`)

    expect(seam?.members).toEqual([{ name: "ask", type: "( question: Question, options?: Options ) => Promise<Answer>" }])
  })

  it("keeps a member holding an object type whole", () => {
    const [shape] = parseDeclarations(`type Shape = {
  readonly at: { readonly x: number; readonly y: number }
  readonly name: string
}`)

    expect(shape?.members.map((member) => member.name)).toEqual(["at", "name"])
    expect(shape?.members[0]?.type).toBe("{ readonly x: number; readonly y: number }")
  })

  it("reads an alias with no members as its whole right-hand side", () => {
    expect(parseDeclarations(`export type Liveness = "live" | "dead" | "unknown"`)[0]).toMatchObject({
      members: [],
      alias: '"live" | "dead" | "unknown"',
    })
  })

  it("carries an optional marker into the name, because an optional made required is drift", () => {
    expect(parseDeclarations(`type Config = {\n  readonly repairer?: ChangeRepairer\n}`)[0]?.members).toEqual([
      { name: "repairer?", type: "ChangeRepairer" },
    ])
  })

  it("does not read a named import as a declaration", () => {
    expect(
      parseDeclarations(`import {
  type ChangeInterpreter,
  fixedPolicy,
} from "@jam-overture/loom"

import type { LoomNode } from "./node.js"

export type Real = { readonly a: string }`).map((declaration) => declaration.name)
    ).toEqual(["Real"])
  })

  it("does not read a re-export as a declaration", () => {
    expect(
      parseDeclarations(`export type { HoldLiveness } from "./liveness.js"\n\ntype Local = { readonly a: string }`).map(
        (declaration) => declaration.name
      )
    ).toEqual(["Local"])
  })

  it("is not stopped by a doc comment inside the body", () => {
    const [documented] = parseDeclarations(`type Documented = {
  readonly first: string

  /**
   * A paragraph about the second one.
   */
  readonly second: number
}`)

    expect(documented?.members.map((member) => member.name)).toEqual(["first", "second"])
  })

  it("stops at the next thing written at the margin", () => {
    expect(parseDeclarations(`type One = { readonly a: string }\n\nconst two = 2\n`)[0]?.members).toEqual([
      { name: "a", type: "string" },
    ])
  })
})

describe("what counts as drift", () => {
  const declaration = parseDeclarations(`type Seam = {
  readonly complete: (request: Request, options?: Options) => Promise<Reply>
  readonly name: string
  readonly extra?: number
}`)[0] as Declaration

  it("passes a fence that leaves a member out", () => {
    const fence = parseDeclarations(`type Seam = {\n  readonly name: string\n}`)[0] as Declaration

    expect(driftOf(fence, declaration)).toEqual([])
    expect(isComplete(fence, declaration)).toBe(false)
  })

  it("catches a member whose type has changed", () => {
    const fence = parseDeclarations(`type Seam = {
  readonly complete: (request: Request) => Promise<Reply>
  readonly name: string
  readonly extra?: number
}`)[0] as Declaration

    expect(driftOf(fence, declaration)).toEqual([
      {
        kind: "type",
        member: "complete",
        fence: "(request: Request) => Promise<Reply>",
        source: ["(request: Request, options?: Options) => Promise<Reply>"],
      },
    ])
  })

  it("catches a member that no longer exists", () => {
    const fence = parseDeclarations(`type Seam = {\n  readonly gone: string\n}`)[0] as Declaration

    expect(driftOf(fence, declaration)).toEqual([{ kind: "absent", member: "gone" }])
  })

  it("catches an optional that has become required", () => {
    const fence = parseDeclarations(`type Seam = {\n  readonly extra: number\n}`)[0] as Declaration

    expect(driftOf(fence, declaration)).toEqual([{ kind: "absent", member: "extra" }])
  })

  it("lets a fence elide part of a type with an ellipsis", () => {
    const fence = parseDeclarations(`type Seam = {\n  readonly complete: (request: Request, …) => Promise<Reply>\n}`)[0] as Declaration

    expect(driftOf(fence, declaration)).toEqual([])
  })

  it("holds an alias to its whole text", () => {
    const source = parseDeclarations(`type Liveness = "live" | "dead" | "unknown"`)[0] as Declaration
    const fence = parseDeclarations(`type Liveness = "live" | "dead"`)[0] as Declaration

    expect(driftOf(fence, source)).toEqual([
      { kind: "alias", fence: '"live" | "dead"', source: '"live" | "dead" | "unknown"' },
    ])
  })

  it("reports a fence that prints an object where the runtime has an alias", () => {
    const source = parseDeclarations(`type Code = StoreError["code"]`)[0] as Declaration
    const fence = parseDeclarations(`type Code = {\n  readonly code: string\n}`)[0] as Declaration

    expect(driftOf(fence, source)).toEqual([{ kind: "shape", fence: "an object", source: 'StoreError["code"]' }])
  })

  it("matches each of a union's repeated discriminants once rather than one of them five times", () => {
    const source = parseDeclarations(`type Outcome =
  | { readonly kind: "applied"; readonly tree: Tree }
  | { readonly kind: "rejected"; readonly reason: string }`)[0] as Declaration
    const fence = parseDeclarations(`type Outcome =
  | { readonly kind: "applied"; readonly tree: Tree }
  | { readonly kind: "withdrawn"; readonly reason: string }`)[0] as Declaration

    expect(driftOf(fence, source)).toEqual([
      { kind: "type", member: "kind", fence: '"withdrawn"', source: ['"rejected"'] },
    ])
  })
})
