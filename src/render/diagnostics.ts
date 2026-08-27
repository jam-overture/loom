import { describeDataUnavailable, type DataUnavailable } from "../data/adapter.js"
import { describeBindingError, type BindingError } from "../data/binding.js"
import type { BindingName, SourceId } from "../data/source.js"
import type { FrameOrigin } from "../frame/origin.js"
import { describeFrameRefusal, type FrameRefusal } from "../frame/resolution.js"
import type { NodeId } from "../ids.js"
import type { PrimitiveType } from "../primitive-type.js"
import { assertNever } from "../result.js"
import { describeSubmissionError, type SubmissionError } from "../submit/declaration.js"
import {
  describeSubmissionUnavailable,
  type EndpointId,
  type SubmissionUnavailable,
} from "../submit/endpoint.js"
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
       * A theme below the root, which is not mounted (0049): the variables are
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
  | {
      /**
       * `loom:data` that is not a map of binding names to registered sources.
       * The node renders — its props are its own and are still valid — with no
       * data at all, which is what a primitive's unavailable path is for.
       */
      readonly code: "data-misdeclared"
      readonly nodeId: NodeId
      readonly error: BindingError
    }
  | {
      /**
       * A binding that could not be answered: no such source, params the source
       * refuses, an answer that fails its own schema, or an adapter that could
       * not reach what it wraps. One region of the page is short of data; the
       * page still renders, because the alternative is a whole page lost to one
       * integration being down.
       */
      readonly code: "data-unavailable"
      readonly nodeId: NodeId
      readonly name: BindingName
      readonly source: SourceId
      readonly unavailable: DataUnavailable
    }
  | {
      /** The tree asks for data and this render was given no resolution. */
      readonly code: "data-unresolved"
      readonly nodeId: NodeId
    }
  | {
      /**
       * `loom:submit` that is not an endpoint id under `to`. The node renders —
       * its props are its own and are still valid — with no target, which is
       * what a form primitive's unavailable path is for.
       */
      readonly code: "submit-misdeclared"
      readonly nodeId: NodeId
      readonly error: SubmissionError
    }
  | {
      /**
       * A form whose endpoint could not give a target: nobody registered it,
       * it refused this visitor, or it answered with something the seam refuses.
       * The page still renders, because a page lost to one form is worse than a
       * form that says it cannot be sent right now.
       */
      readonly code: "submit-unavailable"
      readonly nodeId: NodeId
      readonly to: EndpointId
      readonly unavailable: SubmissionUnavailable
    }
  | {
      /** The tree names an endpoint and this render was given no resolution. */
      readonly code: "submit-unresolved"
      readonly nodeId: NodeId
    }
  | {
      /**
       * A framable prop whose URL will not be framed: no allowlist was wired,
       * nobody registered its origin, or it is not an absolute http(s) URL at
       * all. The node still renders — its props are its own — and what it does
       * with a refusal is the primitive's business, which for a frame is
       * usually to render the refusal rather than an empty box.
       */
      readonly code: "frame-refused"
      readonly nodeId: NodeId
      readonly prop: string
      readonly refusal: FrameRefusal
    }
  | {
      /**
       * A permitted frame whose document comes from this deployment's own
       * origin, so the primitive's `sandbox` is inert: `allow-scripts` beside
       * `allow-same-origin` is only a boundary between two origins, and between
       * one and itself it is nothing. Not a refusal — a host that registered
       * its own origin meant to — and reported anyway, because it is the one
       * thing about a frame that looks contained and is not.
       */
      readonly code: "frame-same-origin"
      readonly nodeId: NodeId
      readonly prop: string
      readonly origin: FrameOrigin
    }
  | {
      /**
       * A declared behaviour's control had no name to render under, so it was
       * left out. The registry refuses a primitive that declares a behaviour
       * and not its strings, so the way here is a dictionary that answers a
       * declared key with a blank — a translation fault, in the one place that
       * can see it, rather than an unnamed button on the page.
       */
      readonly code: "behaviour-unnamed"
      readonly nodeId: NodeId
      readonly behaviour: string
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
    case "data-misdeclared":
      return `node ${diagnostic.nodeId} declares data that is not a map of binding names to sources, so it rendered with none — ${describeBindingError(diagnostic.error)}`
    case "data-unavailable":
      return `node ${diagnostic.nodeId} binds "${diagnostic.name}" to "${diagnostic.source}" and it could not be answered — ${describeDataUnavailable(diagnostic.unavailable)}`
    case "data-unresolved":
      return `node ${diagnostic.nodeId} asks for data and this render was given no resolution, so it rendered with none`
    case "submit-misdeclared":
      return `node ${diagnostic.nodeId} declares a submission that is not an endpoint id under \`to\`, so it rendered with no target — ${describeSubmissionError(diagnostic.error)}`
    case "submit-unavailable":
      return `node ${diagnostic.nodeId} posts to "${diagnostic.to}" and no target could be given for it — ${describeSubmissionUnavailable(diagnostic.unavailable)}`
    case "submit-unresolved":
      return `node ${diagnostic.nodeId} names an endpoint and this render was given no resolution, so it rendered with no target`
    case "frame-refused":
      return `node ${diagnostic.nodeId} frames "${diagnostic.prop}" and it will not be framed — ${describeFrameRefusal(diagnostic.refusal)}`
    case "frame-same-origin":
      return `node ${diagnostic.nodeId} frames "${diagnostic.prop}" from "${diagnostic.origin}", which this deployment registered as its own, so the frame's sandbox grants it nothing it did not already have`
    case "behaviour-unnamed":
      return `node ${diagnostic.nodeId} takes the "${diagnostic.behaviour}" behaviour and "${diagnostic.key}" resolved to nothing, so the control was left out rather than rendered with no accessible name`
    default:
      return assertNever(diagnostic, "describeRenderDiagnostic")
  }
}
