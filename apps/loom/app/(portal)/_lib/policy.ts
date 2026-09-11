import { defaultGatePolicy, type GatePolicy } from "@loom/runtime"

/**
 * The rules this deployment judges every change by.
 *
 * Lifted out of `write.ts` so that the path which *enforces* the policy and the
 * screen which *describes* it read one object rather than two copies of the same
 * import. A screen that told a reader the AI must be 70% sure while the Gate was
 * consulting something else would be worse than a screen that said nothing: it
 * is a claim about what is allowed on your pages, and the whole value of making
 * it is that it is checkable.
 *
 * It is `defaultGatePolicy` today, which is the honest state of this deployment
 * — the portal declares no protected primitives and no out-of-tree effects, so
 * stakes here are driven entirely by the shape of a change. `/portal/rules` says
 * so on the screen rather than leaving a reader to assume a fuller
 * configuration; an empty list is a fact about this deployment and not a gap in
 * the page.
 *
 * A host with two tenants resolves a policy per request through `PolicySource`
 * (0088's seam), and a portal serving one would have to say which policy it was
 * describing. This one serves one, so `fixedPolicy` is the honest spelling and
 * the screen can name the whole of it.
 */
export const portalPolicy: GatePolicy = defaultGatePolicy
