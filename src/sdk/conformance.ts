import { isValidElement, type ReactNode } from "react"

import { NO_DATA } from "../data/resolution.js"
import { nodeIdSchema } from "../ids.js"
import { primitiveTypeSchema } from "../primitive-type.js"
import { LOOM_NODE_ATTRIBUTE, LOOM_TYPE_ATTRIBUTE, type EditableAttributes } from "../render/editable.js"
import { NO_SLOTS, type LoomPrimitive, type LoomPrimitiveProps } from "../render/primitive.js"
import { err, ok, type Result } from "../result.js"

/**
 * The conformance probe, inherited from 0010.
 *
 * Edit mode decorates by handing a primitive `loom.editable` and trusting it to
 * spread the attributes onto its own root element. A primitive that ignores them
 * renders perfectly and is invisible to the portal — nothing to click, no id to
 * address, and no error anywhere. 0010 asked §4 to catch that at registration
 * rather than leave it as a runtime surprise.
 *
 * This is a probe, not a proof. It calls the component once, with a synthetic
 * render context, and looks through the elements it returned for the attributes
 * it was given. That answers the common case honestly and says so when it
 * cannot answer at all:
 *
 * - a component that hands a *copy* of the decoration to another component
 *   reads as `not-decorated`, which is a false negative — identity is all there
 *   is to go on once the object has been rebuilt under a name of the
 *   primitive's choosing
 * - a component that uses hooks, or is a class, cannot be called outside a
 *   renderer and reads as `not-probeable`
 *
 * Both are reported rather than guessed at, and neither blocks registration —
 * `registry.ts` never calls a primitive. Enforcement is the host's call, which
 * is why the verdict is a value.
 */

export type ConformanceVerdict =
  | { readonly outcome: "decorates" }
  | { readonly outcome: "not-decorated" }
  | { readonly outcome: "not-probeable"; readonly reason: string }

const PROBE_NODE_ID = nodeIdSchema.parse("n_probe")
const PROBE_TYPE = primitiveTypeSchema.parse("loom.probe")
const PROBE_CHILDREN = "loom-probe-children"

const probeProps = (editable: EditableAttributes): LoomPrimitiveProps => ({
  loom: { nodeId: PROBE_NODE_ID, type: PROBE_TYPE, editable, slots: NO_SLOTS, data: NO_DATA },
  props: {},
  children: PROBE_CHILDREN,
})

/** The marker handed to a declared slot, unique per name so a miss names itself. */
const slotMarker = (name: string): string => `loom-probe-slot:${name}`

/** Whether this element, or anything it returned, carries the probe's decoration. */
const carriesDecoration = (node: ReactNode, editable: EditableAttributes): boolean => {
  if (Array.isArray(node)) return node.some((child: ReactNode) => carriesDecoration(child, editable))
  if (!isValidElement(node)) return false

  const props: Readonly<Record<string, unknown>> = node.props as Readonly<Record<string, unknown>>

  for (const [key, value] of Object.entries(props)) {
    if (key === LOOM_NODE_ATTRIBUTE && value === PROBE_NODE_ID) return true

    /**
     * A primitive that hands `loom` or `loom.editable` to another component is
     * decorating too — it has delegated its root, and the attributes will reach
     * the DOM through whatever it delegated to. Identity is the test, since a
     * rebuilt object cannot be told apart from an unrelated one.
     */
    if (value === editable) return true
    if (typeof value === "object" && value !== null && "editable" in value && value.editable === editable) {
      return true
    }
  }

  return carriesDecoration(props["children"] as ReactNode, editable)
}

/**
 * A `LoomPrimitive` is either a function component or a class, and only the
 * first can be called as a plain function. `typeof` cannot tell them apart — a
 * class is a function too — so the marker React puts on a class component's
 * prototype is what decides it.
 */
type ProbeableComponent = (props: LoomPrimitiveProps) => ReactNode

const asProbeable = (primitive: LoomPrimitive): Result<ProbeableComponent, string> => {
  if (typeof primitive !== "function") return err("not a function component")

  const prototype: unknown = (primitive as { readonly prototype?: unknown }).prototype

  if (typeof prototype === "object" && prototype !== null && "isReactComponent" in prototype) {
    return err("class components cannot be called outside a renderer")
  }

  return ok(primitive as ProbeableComponent)
}

export const probeEditableDecoration = (primitive: LoomPrimitive): ConformanceVerdict => {
  const probeable = asProbeable(primitive)
  if (!probeable.ok) return { outcome: "not-probeable", reason: probeable.error }

  const editable: EditableAttributes = {
    [LOOM_NODE_ATTRIBUTE]: PROBE_NODE_ID,
    [LOOM_TYPE_ATTRIBUTE]: PROBE_TYPE,
  }

  const called = ((): Result<ReactNode, string> => {
    try {
      return ok(probeable.value(probeProps(editable)))
    } catch (thrown) {
      return err(thrown instanceof Error ? thrown.message : String(thrown))
    }
  })()

  if (!called.ok) {
    return { outcome: "not-probeable", reason: `calling it outside a renderer threw: ${called.error}` }
  }

  return carriesDecoration(called.value, editable) ? { outcome: "decorates" } : { outcome: "not-decorated" }
}

/**
 * The second probe: does a primitive place what it was handed?
 *
 * A declared slot is a promise. The catalogue tells a model the region exists,
 * a proposal puts content there, and a primitive that never reads
 * `loom.slots.aside` drops it — rendering correctly, reporting nothing, with the
 * content gone from the page and still present in the tree. That is the same
 * failure shape as ignoring `loom.editable`, and 0051 made it more likely by
 * making slots mean something: before, a region nobody placed still appeared
 * inline in `children`.
 *
 * It answers a second question at the same time, because one call can. A
 * primitive that renders no `children` is a leaf: `loom.stat` holds its value
 * and label as props, so a text node underneath it has nowhere to go and is
 * dropped just as silently. The renderer cannot tell a leaf from a container —
 * the registry records declared slots, not whether a component reads
 * `children` — but the probe can simply look, which is cheaper than asking
 * every author to declare it and impossible to get out of step with the code.
 *
 * Reported, never enforced, for the reason `audit.ts` gives: a primitive that
 * deliberately ignores a region under some prop combination is a design choice,
 * and this probe calls the component once, with no props.
 */

export type PlacementVerdict =
  | {
      readonly outcome: "probed"
      /** Declared slots whose content did not reach the output. */
      readonly unplacedSlots: readonly string[]
      /** Whether the children it was handed reached the output — a container, not a leaf. */
      readonly rendersChildren: boolean
    }
  | { readonly outcome: "not-probeable"; readonly reason: string }

/**
 * Whether the marker string appears anywhere in what the component returned.
 *
 * Every prop is searched, not only `children`: a primitive that hands a region
 * to another component as `header={loom.slots.header}` has placed it, and the
 * probe should not call that a drop because the content left through a prop it
 * did not expect.
 */
const containsMarker = (node: unknown, marker: string): boolean => {
  if (node === marker) return true
  if (Array.isArray(node)) return node.some((child: unknown) => containsMarker(child, marker))
  if (!isValidElement(node)) return false

  return Object.values(node.props as Readonly<Record<string, unknown>>).some((value) =>
    containsMarker(value, marker)
  )
}

export const probeSlotPlacement = (
  primitive: LoomPrimitive,
  declaredSlots: readonly string[]
): PlacementVerdict => {
  const probeable = asProbeable(primitive)
  if (!probeable.ok) return { outcome: "not-probeable", reason: probeable.error }

  const slots: Record<string, ReactNode> = Object.create(null) as Record<string, ReactNode>
  for (const name of declaredSlots) slots[name] = slotMarker(name)

  const called = ((): Result<ReactNode, string> => {
    try {
      return ok(
        probeable.value({
          loom: { nodeId: PROBE_NODE_ID, type: PROBE_TYPE, slots, data: NO_DATA },
          props: {},
          children: PROBE_CHILDREN,
        })
      )
    } catch (thrown) {
      return err(thrown instanceof Error ? thrown.message : String(thrown))
    }
  })()

  if (!called.ok) {
    return { outcome: "not-probeable", reason: `calling it outside a renderer threw: ${called.error}` }
  }

  return {
    outcome: "probed",
    unplacedSlots: declaredSlots.filter((name) => !containsMarker(called.value, slotMarker(name))),
    rendersChildren: containsMarker(called.value, PROBE_CHILDREN),
  }
}
