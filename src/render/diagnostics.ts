import type { NodeId } from "../ids.js"
import type { PrimitiveType } from "../primitive-type.js"
import { assertNever } from "../result.js"

/**
 * Rendering is total: it always returns an element. Anything it could not
 * honour comes back beside the element as a diagnostic rather than as a thrown
 * error or an absent page.
 *
 * A tree can name a primitive the host has not registered — an AI proposed it,
 * or a deployment rolled back the code but not the tree — and blanking the
 * whole page over one unknown card serves nobody. The diagnostic is the record
 * that it happened, and it is shaped for §6 to consume.
 */

export type RenderDiagnostic = {
  readonly code: "unknown-primitive"
  readonly nodeId: NodeId
  readonly type: PrimitiveType
}

export const describeRenderDiagnostic = (diagnostic: RenderDiagnostic): string => {
  switch (diagnostic.code) {
    case "unknown-primitive":
      return `no primitive is registered for "${diagnostic.type}", so node ${diagnostic.nodeId} and its subtree were omitted`
    default:
      return assertNever(diagnostic.code, "describeRenderDiagnostic")
  }
}
