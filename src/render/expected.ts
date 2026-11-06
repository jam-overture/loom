import type { DataOutcome, NodeData } from "../data/resolution.js"
import type { JsonObject, JsonValue } from "../json.js"
import type { PrimitiveType } from "../primitive-type.js"

import { namesRead, type BindingDeclaration } from "./reads.js"

/**
 * What a primitive said it could read, and the answer that arrived instead.
 *
 * A binding has three ways of being wrong and two of them were closed when the
 * seam was built (0058): an unregistered source is refused, and a param the
 * source did not declare is refused. `reads` closed a third — a name nothing
 * reads (0181). This module closes the one left: an answer that arrives under a
 * name the primitive does read, from a source whose own schema accepted it,
 * **in a shape the primitive cannot draw**.
 *
 * The source's schema is a claim about a host's database and says nothing about
 * what can go on a page, which is 0180's reasoning for a primitive carrying its
 * own schema for what it draws. Until now that schema was private to the
 * component — `loom.feed` re-parses every answer by hand, `loom.tally` the same
 * — so nothing outside the component could tell a list bound to a figure from a
 * figure bound to a figure, and the only report of the mistake was whatever the
 * component chose to draw.
 *
 * What this adds is the declaration, not the reading. **The top-level shape is
 * the framework's question and each row stays the primitive's**, because a row's
 * shape is the one thing only the component knows (0175, 0206) and a listing
 * that skips one row is doing its job rather than failing. So an expectation
 * answers *is this the kind of answer I asked for* and never *is every row in
 * it drawable*.
 */

/** Whether an answer is the shape the primitive declared it reads. */
export type AnswerVerdict =
  | { readonly outcome: "readable" }
  | { readonly outcome: "unreadable"; readonly detail: string }

/**
 * One primitive's reading of one binding's answer, with its schema erased.
 *
 * A function rather than the Zod schema it came from, for `validate`'s reason in
 * `sdk/definition.ts`: the erasure happens once, where the schema is still in
 * hand, and nothing in the render path then depends on which schema library
 * declared it. Total — it answers for every `JsonValue` and never throws, which
 * is what lets the walk call it while rendering stays total.
 */
export type AnswerExpectation = (answer: JsonValue) => AnswerVerdict

/**
 * Which answers a primitive says it can read, asked per type.
 *
 * Structural, and detected the way `BindingReader` and `UnshownReader` are: a
 * registry built by the SDK satisfies it, and a host resolving from a plain map
 * has registered nothing that could have declared an expectation. So there is
 * nothing here to wire and nothing that can go missing.
 *
 * Keyed by the **declared** name rather than the name a node asked under, which
 * are different whenever a declaration takes its name from a prop (0184). The
 * shape a primitive draws does not change because a node renamed the binding it
 * draws it from, so the expectation belongs to the declaration and the walk is
 * what resolves one to the other.
 */
export interface AnswerReader {
  readonly answersExpectedBy: (
    type: PrimitiveType
  ) => Readonly<Record<string, AnswerExpectation>> | undefined
}

export const isAnswerReader = (value: object): value is AnswerReader =>
  typeof (value as Partial<AnswerReader>).answersExpectedBy === "function"

/** The name a declaration is keyed under: itself, or the name it falls back to. */
export const declaredName = (declaration: BindingDeclaration): string =>
  typeof declaration === "string" ? declaration : declaration.default

/** One answer this node's primitive was given and said it could not read. */
export type RefusedAnswer = {
  /** The name the node asked under, which is what a reader of the tree sees. */
  readonly name: string
  readonly detail: string
}

export type CheckedAnswers = {
  readonly data: NodeData
  readonly refused: readonly RefusedAnswer[]
}

const NOTHING_REFUSED: readonly RefusedAnswer[] = Object.freeze([])

/**
 * This node's answers with every one its primitive cannot read turned into the
 * named absence of an answer, and the list of the ones that moved.
 *
 * A refused answer becomes `unavailable` rather than being passed through with a
 * diagnostic beside it, and that is the whole point of the declaration. 0058 is
 * explicit that a binding either has an answer or has a **named reason** it does
 * not, and a primitive handed rows it declared it cannot read has no answer in
 * every sense that matters to the page. What it draws is the rendering 0180
 * already designed for that state — a declared line, announced — rather than
 * whatever a hand-written parse happened to fall through to.
 *
 * Returns the data it was given, by reference, whenever nothing was declared or
 * nothing was refused. That is the path every render takes on every node: the
 * check costs one map read per bound node and allocates nothing unless an answer
 * actually moves.
 *
 * An `unavailable` answer is not re-checked. It has no value to be the wrong
 * shape, and the reason it already carries is the more specific of the two.
 */
export const checkAnswers = (
  data: NodeData,
  declared: readonly BindingDeclaration[] | undefined,
  expectations: Readonly<Record<string, AnswerExpectation>> | undefined,
  props: JsonObject
): CheckedAnswers => {
  if (!declared || !expectations) return { data, refused: NOTHING_REFUSED }

  const asked = namesRead(declared, props)
  const refused: RefusedAnswer[] = []
  let checked: Record<string, DataOutcome> | undefined

  for (const [index, name] of asked.entries()) {
    if (!Object.hasOwn(data, name)) continue

    /**
     * Two declarations can resolve to one name — a fixed `entries` beside a
     * prop-named one that fell back to `entries`. That is a strange thing to
     * declare and the registry does not refuse it, so the first expectation
     * holding an opinion decides and the answer is not re-checked. Reading from
     * `data` rather than from the copy is what makes the guard necessary: the
     * copy has the refusal in it and the original still has the answer.
     */
    if (checked && Object.hasOwn(checked, name) && data[name] !== checked[name]) continue

    const outcome = data[name]
    if (!outcome || outcome.status !== "ready") continue

    const declaration = declared[index]
    if (!declaration) continue

    /**
     * `Object.hasOwn` before the read, and it is not belt-and-braces: a binding
     * name is an identifier and `constructor` is a valid one, so a declaration
     * map built as a plain object literal would answer every undeclared name
     * with something off `Object.prototype`. `freezeExpectations` gives the
     * registry's map no prototype, and this is the half that holds for a caller
     * handing one over directly — a probe, a test, a host assembling its own.
     * Without it an expectation nobody declared is *called*, and `Object` is not
     * a verdict, so every answer under that name would be refused.
     */
    const key = declaredName(declaration)
    if (!Object.hasOwn(expectations, key)) continue

    const expectation = expectations[key]
    if (!expectation) continue

    const verdict = expectation(outcome.value)
    if (verdict.outcome === "readable") continue

    refused.push({ name, detail: verdict.detail })

    if (!checked) {
      checked = Object.create(null) as Record<string, DataOutcome>
      for (const held in data) {
        const carried = data[held]
        if (carried) checked[held] = carried
      }
    }

    checked[name] = {
      status: "unavailable",
      unavailable: { reason: "unreadable-answer", detail: verdict.detail },
    }
  }

  if (!checked) return { data, refused: NOTHING_REFUSED }

  return { data: Object.freeze(checked), refused: Object.freeze(refused) }
}
