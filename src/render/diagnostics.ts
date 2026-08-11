import type { NodeId } from "../ids.js"
import type { PrimitiveType } from "../primitive-type.js"
import { assertNever } from "../result.js"
import { describeThemeError, type ThemeError } from "../theme/registry.js"

import type { PropsIssue } from "./props.js"

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

export type RenderDiagnostic =
  | {
      readonly code: "unknown-primitive"
      readonly nodeId: NodeId
      readonly type: PrimitiveType
    }
  | {
      readonly code: "invalid-props"
      readonly nodeId: NodeId
      readonly type: PrimitiveType
      readonly issues: readonly PropsIssue[]
    }
  | {
      /**
       * The resolver knows this type and the validator does not, which is a
       * composition-root fault rather than anything the tree did. The node
       * still renders — one seam not recognising a type the other resolved is
       * no reason to blank the page — but the props went unchecked, and that is
       * worth saying out loud.
       */
      readonly code: "props-undeclared"
      readonly nodeId: NodeId
      readonly type: PrimitiveType
    }
  | {
      /**
       * The root names a theme and the registry refused it — an id nobody
       * registered, or a selection that is not three ids. The page renders
       * unstyled rather than not at all, which is the same bargain every other
       * diagnostic here makes.
       */
      readonly code: "theme-unresolved"
      readonly nodeId: NodeId
      readonly error: ThemeError
    }
  | {
      /** The root names a theme and this render was given no registry. */
      readonly code: "theme-unregistered"
      readonly nodeId: NodeId
    }
  | {
      /**
       * A theme below the root, which 0049 does not mount: the variables are
       * mounted once, at the render root, so a nested selection would be read
       * by nothing. Reported rather than dropped, because someone meant it.
       */
      readonly code: "theme-misplaced"
      readonly nodeId: NodeId
    }
  | {
      /** A key in the runtime's reserved namespace that the runtime does not read. */
      readonly code: "reserved-prop-unrecognised"
      readonly nodeId: NodeId
      readonly key: string
    }

const describeIssues = (issues: readonly PropsIssue[]): string =>
  issues.map((issue) => `${issue.path}: ${issue.message}`).join("; ")

export const describeRenderDiagnostic = (diagnostic: RenderDiagnostic): string => {
  switch (diagnostic.code) {
    case "unknown-primitive":
      return `no primitive is registered for "${diagnostic.type}", so node ${diagnostic.nodeId} and its subtree were omitted`
    case "invalid-props":
      return `node ${diagnostic.nodeId} does not satisfy the props declared by "${diagnostic.type}", so it and its subtree were omitted — ${describeIssues(diagnostic.issues)}`
    case "props-undeclared":
      return `no prop schema is registered for "${diagnostic.type}", so node ${diagnostic.nodeId} rendered with unchecked props`
    case "theme-unresolved":
      return `the theme named by node ${diagnostic.nodeId} could not be resolved, so the tree rendered unstyled — ${describeThemeError(diagnostic.error)}`
    case "theme-unregistered":
      return `node ${diagnostic.nodeId} names a theme and no theme registry was supplied, so the tree rendered unstyled`
    case "theme-misplaced":
      return `node ${diagnostic.nodeId} names a theme and is not the root, so it was ignored — a theme is mounted once, at the render root`
    case "reserved-prop-unrecognised":
      return `node ${diagnostic.nodeId} carries "${diagnostic.key}", which is in the runtime's reserved namespace and is read by nothing, so it was dropped`
    default:
      return assertNever(diagnostic, "describeRenderDiagnostic")
  }
}
