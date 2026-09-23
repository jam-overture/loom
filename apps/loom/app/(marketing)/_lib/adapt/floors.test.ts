import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import {
  buildElement,
  composeChange,
  createTree,
  defaultGatePolicy,
  fixedPolicy,
  gatePolicySchema,
  noopEventSink,
  primitiveTypeSchema,
  sequentialIdFactory,
  systemClock,
  type CompositionRuntime,
  type EditIntent,
  type LoomTree,
} from "@loom/runtime"
import { describe, expect, it } from "vitest"

import { homePageTree } from "../pages/home"
import { siteRegistry } from "../registry"
import { DEFAULT_THEME } from "../site"

import { plannedInterpreter } from "./asks"
import { FLOOR_INTERPRETER, FLOORS, probeFloors, type Floor, type FloorResult } from "./floors"
import { RAISED_BY, WEIGHT } from "./record"
import { FRONT_DOOR_POLICY, SITE_PROPS_VOCABULARY } from "./run"

/**
 * The two floors under this site, and the one thing worth proving about them.
 *
 * `probeFloors` throws unless both requests were refused, so a suite built on it
 * alone would be circular: it would pass on any deployment where *something*
 * refused them, including one where the refusal came from a rule about protected
 * bands and had nothing to do with either floor. So this file is two halves —
 * what the page is allowed to print, and what happens to the very same two
 * requests when neither floor is wired.
 */

const ORIGIN = "https://loom.example"

const frontDoor = (): LoomTree => homePageTree({ origin: ORIGIN, theme: DEFAULT_THEME })

const byId = (results: readonly FloorResult[], id: string): FloorResult => {
  const found = results.find((result) => result.id === id)

  if (found === undefined) throw new Error(`loom: no floor result for ${id}`)

  return found
}

describe("the two floors, put to the front door", () => {
  it("refuses both, which is what lets the page print them at all", async () => {
    await expect(probeFloors(frontDoor())).resolves.toHaveLength(FLOORS.length)
  })

  it("weighs both as the most serious kind there is", async () => {
    const results = await probeFloors(frontDoor())

    for (const result of results) {
      expect({ id: result.id, weight: result.weight, words: result.weighedAs }).toEqual({
        id: result.id,
        weight: "critical",
        words: WEIGHT.critical,
      })
    }
  })

  /**
   * The band prints two cards and they have to mean two different things. Both
   * are refused at the same weight, so the only thing distinguishing them is the
   * clause naming which floor caught it.
   */
  it("catches each one on its own floor and not on the other's", async () => {
    const results = await probeFloors(frontDoor())

    for (const floor of FLOORS) {
      const result = byId(results, floor.id)
      const others = FLOORS.filter((other) => other.id !== floor.id)

      expect(result.raisedBy).toContain(RAISED_BY[floor.factor])

      for (const other of others) {
        expect(result.raisedBy).not.toContain(RAISED_BY[other.factor])
      }
    }
  })

  /**
   * Every sentence the band prints about *why* comes out of the record's own
   * clauses. A run that invented a wording here would be this site saying one
   * fact two ways: the front door's panel prints these same clauses.
   */
  it("explains itself only in words the record already uses", async () => {
    const results = await probeFloors(frontDoor())
    const known = Object.values(RAISED_BY)

    for (const result of results) {
      expect(result.raisedBy.length).toBeGreaterThan(0)

      for (const clause of result.raisedBy) {
        expect(known).toContain(clause)
      }
    }
  })
})

/**
 * The guard `probeFloors` carries, exercised rather than trusted.
 *
 * It throws unless a request was refused, and on the site as it stands both
 * always are — so nothing in the suite above reaches that line, and a branch
 * deleted from it would pass every other test here. A page with no opening band
 * gives both plans nothing to work on, so neither request reaches the rules at
 * all, which is the one shape that is *not* a refusal and must not be printed as
 * one.
 */
describe("a page neither request can find anything to change on", () => {
  it("refuses to hand the band a result rather than printing a refusal nobody gave", async () => {
    const ids = sequentialIdFactory("bare")
    const bare = createTree(
      buildElement(ids, { type: "loom.page", props: {}, children: [] }),
      ids
    )

    await expect(probeFloors(bare)).rejects.toThrow(/no request gets past/)
  })
})

describe("what each refusal hands a reader to check", () => {
  it("names the piece nobody described, and no setting", async () => {
    const result = byId(await probeFloors(frontDoor()), "a-piece-nobody-described")

    expect(result.pieces).toEqual(["app.testimonial-wall"])
    expect(result.settings).toEqual([])
  })

  /**
   * The message is the declaring piece's own, quoted rather than reworded — so
   * it has to name the setting, the value that was asked for, and the values
   * that are on offer. A refusal missing any of the three is the one a repairer
   * can do nothing with, which is the whole argument 0179 makes.
   */
  it("names the setting, what was asked for, and what that piece does offer", async () => {
    const result = byId(await probeFloors(frontDoor()), "a-setting-value-nobody-allowed")

    expect(result.pieces).toEqual([])
    expect(result.settings).toHaveLength(1)

    const [setting] = result.settings

    expect(setting?.name).toBe("stature")
    expect(setting?.said).toContain("enormous")
    expect(setting?.said).toContain("standard")
    expect(setting?.said).toContain("tall")
  })

  it("quotes what a person would have typed, verbatim", async () => {
    const results = await probeFloors(frontDoor())

    expect(results.map((result) => result.asked)).toEqual(FLOORS.map((floor) => floor.utterance))
  })
})

/**
 * The half `probeFloors` cannot check, because it is about the wiring rather
 * than about the requests.
 *
 * Both are put again, through the same interpreters and against the same page,
 * to a runtime with **neither floor wired** — which is what every deployment
 * gets by default and what this one had until today. Both go through. That is
 * the measurement behind the band: not that these two changes are bad, but that
 * nothing before this branch was in a position to say so.
 */
const unwired = gatePolicySchema.parse({
  ...defaultGatePolicy,
  policyId: "front-door-with-no-floors",
  protectedPrimitiveTypes: FRONT_DOOR_POLICY.protectedPrimitiveTypes,
})

const putUnwired = async (floor: Floor) => {
  const page = frontDoor()
  const idFactory = sequentialIdFactory("unwired")
  const runtime: CompositionRuntime = {
    interpreter: plannedInterpreter(
      {
        plan: floor.plan,
        rationale: floor.rationale,
        nothingToChange: floor.nothingToChange,
        interpreter: FLOOR_INTERPRETER,
      },
      idFactory,
      systemClock
    ),
    policySource: fixedPolicy(unwired),
    events: noopEventSink,
    clock: systemClock,
    idFactory,
  }

  const intent: EditIntent = {
    intentId: idFactory.intentId(),
    treeId: page.treeId,
    baseRevision: page.revision,
    origin: "user-instruction",
    actor: "a visitor",
    utterance: floor.utterance,
    observedAt: systemClock.now(),
  }

  return composeChange(runtime, page, intent)
}

describe("the same two requests, with neither floor wired", () => {
  it.each(FLOORS)("lets $id through, which is what this branch changed", async (floor) => {
    const composed = await putUnwired(floor)

    expect(composed.kind).toBe("applied")
  })
})

describe("what the floors are read off", () => {
  /**
   * The list the rules hold and the list the renderer resolves against are the
   * same list, derived rather than kept. A deployment where the two disagree has
   * a hole no test of either seam alone would find: the Gate refusing a piece
   * the page could have drawn, or admitting one it cannot.
   */
  it("holds every type the renderer can resolve, and nothing else", () => {
    expect([...FRONT_DOOR_POLICY.registeredPrimitiveTypes].sort()).toEqual(
      siteRegistry.primitives.map((primitive) => primitive.type).sort()
    )
  })

  it("answers for a setting exactly as the piece that declares it would", () => {
    const hero = primitiveTypeSchema.parse("loom.hero")

    expect(SITE_PROPS_VOCABULARY(hero, { stature: "tall" })).toEqual({ outcome: "valid" })
    expect(SITE_PROPS_VOCABULARY(hero, { stature: "enormous" }).outcome).toBe("invalid")
  })

  /**
   * A type nobody registered has no schema, so the props vocabulary has nothing
   * to say about it — and says so rather than guessing. That is the seam between
   * the two floors: the first catches the piece, and only then is there anything
   * for the second to check.
   */
  it("says nothing about a piece nobody described, rather than passing it", () => {
    const invented = primitiveTypeSchema.parse("app.testimonial-wall")

    expect(SITE_PROPS_VOCABULARY(invented, { tone: "surface" })).toEqual({ outcome: "undeclared" })
  })
})

/**
 * The one thing in this change no behaviour can show, asserted against the
 * source because there is nowhere else to assert it.
 *
 * This lane builds a `CompositionRuntime` in four places. The policy reaches all
 * four for free — it is a field on a shared constant — but the props vocabulary
 * is a seam each root passes for itself, and three of the four run requests that
 * could never carry a bad setting: the five buttons are computed, the undo is an
 * inverse of one of them, and the comparison puts the same five again. So a root
 * that quietly dropped it would pass every other test in this repository, and
 * the first thing to notice would be a reader looking at a hole.
 *
 * Reading the file is the idiom `globals.test.ts` established here for exactly
 * this shape — a fact nothing imports and nothing renders — and the assertion is
 * deliberately blunt: **every root names it**, found by counting the runtimes
 * rather than by naming the files, so a fifth root added tomorrow is caught by
 * the same line.
 */
const ROOTS = ["run.ts", "undo.ts", "askers.ts", "floors.ts"] as const

describe("every composition root in this lane", () => {
  it.each(ROOTS)("hands %s the same vocabulary the renderer resolves against", (file) => {
    const source = readFileSync(fileURLToPath(new URL(`./${file}`, import.meta.url)), "utf8")
    const runtimes = source.match(/CompositionRuntime = \{/g) ?? []
    const wired = source.match(/propsVocabulary: SITE_PROPS_VOCABULARY,/g) ?? []

    expect({ file, runtimes: runtimes.length, wired: wired.length }).toEqual({
      file,
      runtimes: runtimes.length,
      wired: runtimes.length,
    })
    expect(runtimes.length).toBeGreaterThan(0)
  })
})
