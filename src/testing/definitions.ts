import { createElement } from "react"
import { z } from "zod"

import type { JsonObjectView } from "../json.js"
import type { LoomPrimitive, LoomPrimitiveProps } from "../render/primitive.js"
import type { UnshownDeclaration, UnshownReading } from "../render/unshown.js"
import { definePrimitive, type PrimitiveEntry } from "../sdk/definition.js"
import { createPrimitiveRegistry, describeRegistryError, type PrimitiveRegistry } from "../sdk/registry.js"

/**
 * The primitives of `sampleTree`, declared through the §4 contract, so registry
 * and renderer tests run against real declarations rather than a stand-in for
 * them. `testPrimitives` in `primitives.ts` is the same component set without
 * declarations, which is what §3's tests need.
 *
 * `loom.card` declares its props strictly and `loom.page` does not, because both
 * are legitimate choices a primitive author makes and the render seam has to
 * behave correctly for each.
 */

/**
 * The body every well-behaved primitive in this file has: it spreads
 * `loom.editable` onto its own root, places every region it was handed in tree
 * order, and adds no element of its own to carry either.
 *
 * Shared so that the stand-in below is well-behaved in the one way that matters
 * to it — a fixture written to break a *declaration* must not also fail the §4
 * probe, or a lane cannot tell which of the two it is looking at.
 */
const hostComponent = <TProps extends JsonObjectView>(
  label: string,
  tag: string
): LoomPrimitive<TProps> => {
  const Primitive = ({ loom, props: bag, children }: LoomPrimitiveProps<TProps>) =>
    createElement(
      tag,
      { ...loom.editable, "data-props": JSON.stringify(bag) },
      children,
      Object.keys(loom.slots).map((name) => loom.slots[name])
    )

  Primitive.displayName = label

  return Primitive
}

const declared = <TProps extends JsonObjectView>(
  type: string,
  description: string,
  props: z.ZodType<TProps, z.ZodTypeDef, unknown>,
  tag: string,
  slots?: readonly string[]
): PrimitiveEntry =>
  definePrimitive({
    type,
    description,
    props,
    component: hostComponent<TProps>(`declared(${type})`, tag),
    ...(slots ? { slots } : {}),
  })

export const pageDefinition = declared(
  "loom.page",
  "The page shell; everything else lives inside it",
  z.object({ title: z.string(), subtitle: z.string().optional() }),
  "main",
  ["main"]
)

export const cardDefinition = declared(
  "loom.card",
  "A bounded block of related content",
  z.object({ variant: z.enum(["outlined", "filled"]), elevation: z.number().optional() }).strict(),
  "article"
)

export const headerDefinition = declared(
  "loom.header",
  "The banner at the top of a page",
  z.object({}),
  "header"
)

export const footerDefinition = declared(
  "loom.footer",
  "The closing band at the bottom of a page",
  z.object({}),
  "footer"
)

export const testDefinitions: readonly PrimitiveEntry[] = [
  pageDefinition,
  headerDefinition,
  cardDefinition,
  footerDefinition,
]

/**
 * Registration is fallible, and a test that wanted a registry has nothing to say
 * about a failure to build one, so this unwraps loudly rather than making every
 * caller narrow a Result it does not care about.
 */
export const registryOf = (entries: readonly PrimitiveEntry[]): PrimitiveRegistry => {
  const built = createPrimitiveRegistry(entries)
  if (!built.ok) throw new Error(`expected a registry, got ${describeRegistryError(built.error)}`)

  return built.value
}

export const testRegistry = (): PrimitiveRegistry => registryOf(testDefinitions)

/**
 * The ways a primitive's declaration of what it could not show can fail to be
 * believed, named for what the author's code did rather than for the sentence
 * the runtime writes about it.
 *
 * `throws` is the fault `UnshownFault` calls `threw`. The other six are its
 * `impossible` arm, which is one kind carrying six details — and the details
 * are what a lane demonstrating the diagnostic needs, because the kind is the
 * same word for a declaration that returned a number and one that said it
 * showed thirteen of twelve rows.
 */
const BREAKAGES = [
  "throws",
  "not-an-array",
  "not-a-reading",
  "unnamed",
  "uncountable-given",
  "uncountable-shown",
  "more-shown-than-given",
] as const

export type UnshownBreakage = (typeof BREAKAGES)[number]

/**
 * Every breakage, in the order `readUnshown` refuses them, so a lane showing
 * the fault once per shape can iterate rather than keep its own list.
 *
 * The list is the type rather than a copy of it: `UnshownBreakage` is read off
 * these entries and `BROKEN_DECLARATIONS` is keyed on the type, so a member
 * added here without a declaration, or a declaration without a member, is a
 * typecheck error rather than a gap.
 *
 * **What is maintained rather than proved is the other direction** — against the
 * runtime. No construction here makes a refusal path added to `readUnshown`
 * with nothing added to this list fail a test, so this door could fall one fault
 * behind the walk it stands in for, silently. `definitions.test.ts` holds the
 * next best thing: every member is refused, no two members produce the same
 * fault, and each detail is pinned to the exact sentence the runtime writes — so
 * a message that moves goes red here and somebody looks at the list.
 */
export const UNSHOWN_BREAKAGES: readonly UnshownBreakage[] = BREAKAGES

/** The binding name the broken readings claim to have read, so a caller
 * answering under it meets a stand-in that looks like a real bound listing. */
const BROKEN_READING_BINDING = "entries"

/**
 * A declaration returning what the type forbids, which is the point rather than
 * a shortcut.
 *
 * `readUnshown` checks what its own types already promise — that the return is
 * an array, that each member is an object — because the code on the other side
 * of that guard belongs to another author and a host's JavaScript need not
 * agree with this package's types (0206). A fixture written in TypeScript
 * cannot stand in for one that was not without saying so once, here.
 */
const returning = (value: unknown): UnshownDeclaration =>
  () => value as readonly UnshownReading[]

const BROKEN_DECLARATIONS: Readonly<Record<UnshownBreakage, UnshownDeclaration>> = {
  throws: () => {
    throw new Error("the reader of this answer is not written yet")
  },
  "not-an-array": returning(undefined),
  "not-a-reading": returning([BROKEN_READING_BINDING]),
  unnamed: () => [{ name: "", given: 1, shown: 0 }],
  "uncountable-given": () => [{ name: BROKEN_READING_BINDING, given: Number.NaN, shown: 0 }],
  "uncountable-shown": () => [{ name: BROKEN_READING_BINDING, given: 2, shown: 1.5 }],
  "more-shown-than-given": () => [{ name: BROKEN_READING_BINDING, given: 1, shown: 2 }],
}

/**
 * A primitive that breaks the one declaration no tree and no deployment can
 * break for it, in whichever way the caller names.
 *
 * `unshown-unreadable` is the single member of `RenderDiagnostic` addressed to
 * whoever wrote the component (0206): the declaration lives *inside* the
 * primitive, so only a primitive can break it. Nothing in the starter library
 * does — all five that declare `unshown` compute the figure from the answer
 * they were handed, which is the whole point of declaring the function the
 * component already calls — and neither `testPrimitives` nor
 * `undecoratedPrimitive` stood in for one. So every lane wanting to demonstrate
 * the code wrote its own broken component, and `Loom docs` wrote one for *What
 * a render reports* before filing for this.
 *
 * **One parameterised stand-in rather than a catalogue of broken components**,
 * which is what the filing asked for in those words: a catalogue in the testing
 * door would be a second library to keep true.
 *
 * Well-behaved in every other respect, deliberately. It spreads
 * `loom.editable`, places what it is handed, and declares its props — so the
 * one thing wrong with it is the thing the caller asked to be wrong, and a
 * render of it raises exactly one diagnostic.
 *
 * Its props are declared **open**, where `loom.card` next door is strict, and
 * that is the one place this fixture prefers forgiveness to realism: props the
 * schema refuses omit the node altogether, which would take the declaration
 * with them and hand a lane an empty diagnostic list instead of the fault it
 * asked for. A stand-in that can be silenced by an unrelated prop is a stand-in
 * that will be.
 *
 * The type carries the breakage, so all seven can be registered together and
 * rendered in one tree. Read it off the entry rather than writing it out:
 *
 * ```ts
 * const definition = brokenUnshownDefinition("throws")
 * const registry = registryOf([definition])
 * // …then a node of `definition.type` carrying a `loom:data` declaration.
 * ```
 *
 * It declares no `reads`, and that absence is load-bearing. A declared name the
 * caller did not answer under would add `data-unread` to the render, so the
 * list a lane asserts would depend on which name it chose to answer. Silent
 * unless declared is the bargain `reads` makes, and taking it is what keeps the
 * one-diagnostic promise above true whatever the caller does.
 */
export const brokenUnshownDefinition = (breakage: UnshownBreakage): PrimitiveEntry =>
  definePrimitive({
    type: `test.unshown-${breakage}`,
    description: `A bound listing whose declaration of what it could not show is broken (${breakage}). Written to be wrong.`,
    props: z.object({}),
    unshown: BROKEN_DECLARATIONS[breakage],
    component: hostComponent(`brokenUnshown(${breakage})`, "ul"),
  })
