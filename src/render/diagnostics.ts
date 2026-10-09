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
import { describeUnshownFault, type UnshownFault } from "./unshown.js"

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

/**
 * Which way a render came to have no answer for a node that asked for one.
 *
 * Both seams that resolve a tree's questions before the walk — data and
 * submissions — can be handed nothing at all or handed a resolution that was
 * built from some other tree. The distinction is worth carrying because it sends
 * a different person to a different line: `absent` is a composition root that
 * never resolved, and `unrelated` is one that resolved the wrong plan.
 */
export type UnresolvedResolution = "absent" | "unrelated"

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
       * A region the node filled under a name this primitive says it places
       * nowhere. The content was rendered and then mounted by nothing, and it
       * took its whole subtree with it.
       *
       * The sibling of `data-unread`, one node over: there a resolved answer is
       * dropped, and here it is authored content. It is the quieter of the two
       * and the more expensive — a binding nobody reads costs a round trip and
       * draws an empty state, and a region nobody places removes words somebody
       * wrote from a page that still looks finished. The loss is stated where a
       * slot was given its meaning (0051), and until now nothing reported it.
       *
       * Reported per name rather than per slot child: two children sharing a
       * name are both placed, so they are dropped by one mistake.
       *
       * Only ever reported when the resolver can say what a primitive places,
       * which a registry can and a plain map cannot. Not reported for an
       * unknown primitive, whose whole subtree is already omitted and said so.
       *
       * **Not** the conformance probe's *unplaced* (`sdk/conformance.ts`),
       * which is the opposite fault: a region the primitive *declared* and no
       * probed configuration drew. That one is addressed to whoever wrote the
       * component; this one is addressed to whoever wrote the tree.
       */
      readonly code: "slot-unplaced"
      readonly nodeId: NodeId
      readonly type: PrimitiveType
      readonly name: string
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
      /**
       * A node asks for data and this render has no answers for it — neither a
       * value nor a named reason there is none.
       *
       * There are two ways to arrive here and they are fixed in the same place
       * by the same person, which is why they are one code carrying which:
       * `absent`, a render given no resolution at all, and `unrelated`, a render
       * given one built from a different tree's plan. The second is the one that
       * used to say nothing: `EMPTY_DATA_RESOLUTION` answers `NO_DATA` for every
       * node, so a composition root that reached for it as a neutral "no data"
       * value got a page whose every binding vanished in silence.
       */
      readonly code: "data-unresolved"
      readonly nodeId: NodeId
      readonly resolution: UnresolvedResolution
    }
  | {
      /**
       * A binding the node asked under a name this primitive says it does not
       * read. The answer arrived and nothing will ever look at it.
       *
       * The quietest of the three ways a binding can be wrong, and until the
       * primitive declared its names it was the only one nothing could see: an
       * unregistered source is refused as `no-such-source`, params the source
       * did not declare are refused by its own schema, and a name nothing reads
       * resolves perfectly and is then dropped on the floor. The node renders —
       * the binding cost it nothing but a round trip — and what is reported is
       * that somebody asked a question whose answer has no reader.
       *
       * Only ever reported for a primitive whose author has declared `reads`.
       * Absence is not emptiness (0181), so a primitive that has said nothing
       * says nothing about the names it is given.
       */
      readonly code: "data-unread"
      readonly nodeId: NodeId
      readonly type: PrimitiveType
      readonly name: string
    }
  | {
      /**
       * An answer arrived, under a name the primitive reads, and the primitive
       * placed some of its rows and not the rest.
       *
       * The one way a binding can be wrong that is invisible from outside the
       * component: each row has a shape only the primitive knows, so only the
       * primitive can say that eleven of twelve stopped reading. A listing skips
       * the row it cannot read and names it to the reader without a count
       * (0175). There was nowhere else for it to say the count (0206).
       *
       * Both counts rather than the difference, because the sentence the author
       * needs is *eleven of twelve*. Never the rows: a diagnostic is logged and
       * a row is the host's data, the same line `data-unavailable` holds.
       *
       * Reported only when `shown < given`. An answer read whole is the ordinary
       * case and would be one line per bound region in every log.
       */
      readonly code: "data-unshown"
      readonly nodeId: NodeId
      readonly type: PrimitiveType
      readonly name: string
      readonly given: number
      readonly shown: number
    }
  | {
      /**
       * A primitive declares what it could not show and its declaration could
       * not be believed: it threw, or it returned a reading that cannot describe
       * an answer.
       *
       * The node renders exactly as it would have. A declaration is bookkeeping
       * about an answer, not part of drawing it, and a page lost to bookkeeping
       * is the worst trade available here — so the fault becomes the thing it
       * was trying to report.
       *
       * It is the one diagnostic in this union a tree cannot cause and a
       * deployment cannot cause. It is addressed to whoever wrote the component.
       */
      readonly code: "unshown-unreadable"
      readonly nodeId: NodeId
      readonly type: PrimitiveType
      readonly fault: UnshownFault
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
      /**
       * A node names an endpoint and this render has no target for it — neither
       * one nor a named reason there is none. `absent` and `unrelated` are the
       * two routes the data seam's twin describes, for the same reasons:
       * `EMPTY_SUBMISSION_RESOLUTION` answers `undefined` for every node, and a
       * form whose target went missing that way rendered a submit button
       * pointing nowhere with nothing said about it.
       */
      readonly code: "submit-unresolved"
      readonly nodeId: NodeId
      readonly resolution: UnresolvedResolution
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
       * `loom:anchor` that is not a slug a link can carry: not a string, empty,
       * longer than an anchor may be, or spelled with something that does not
       * survive a URL. The node renders exactly as it would have — an anchor
       * adds an attribute and changes nothing else — and is not a fragment
       * target.
       */
      readonly code: "anchor-unusable"
      readonly nodeId: NodeId
      readonly detail: string
    }
  | {
      /**
       * Two nodes named the same anchor, and this is the second one. The first
       * in document order keeps it, because two elements sharing an `id` is a
       * document a browser resolves by its own rule rather than by the tree's —
       * and a link that lands on whichever of the two the parser preferred is
       * worse than one node that cannot be linked to.
       */
      readonly code: "anchor-claimed"
      readonly nodeId: NodeId
      readonly anchor: string
      readonly holder: NodeId
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
  | {
      /**
       * The render was asked for values rather than references
       * (`themeValues: "literals"`) and no theme mounted, so there was nothing
       * to resolve them against and the page keeps the references it was
       * written with. Worth saying because of who asks: a caller wants values
       * when whatever it is feeding cannot resolve a reference, and in that
       * medium nothing downstream would notice they never arrived.
       *
       * On the root, because the theme is the root's (0049).
       */
      readonly code: "theme-values-unmounted"
      readonly nodeId: NodeId
    }
  | {
      /**
       * An excerpt was asked for by node id and this tree holds no such node.
       * Nothing rendered, because there is nothing to render — the one case in
       * this union where the element is null rather than a page missing a part
       * of itself.
       *
       * It is a diagnostic rather than a thrown error for the reason every
       * other one here is: the id came from somewhere — a URL, a row in a
       * review queue, a link in a record — and the node it named can have been
       * deleted by an ordinary change since. A preview of a part that is gone
       * is a thing to say, not a crash.
       */
      readonly code: "excerpt-absent"
      readonly nodeId: NodeId
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
    case "slot-unplaced":
      return `node ${diagnostic.nodeId} fills the region "${diagnostic.name}" and "${diagnostic.type}" places no region of that name, so the content and everything under it was dropped`
    case "data-misdeclared":
      return `node ${diagnostic.nodeId} declares data that is not a map of binding names to sources, so it rendered with none — ${describeBindingError(diagnostic.error)}`
    case "data-unavailable":
      return `node ${diagnostic.nodeId} binds "${diagnostic.name}" to "${diagnostic.source}" and it could not be answered — ${describeDataUnavailable(diagnostic.unavailable)}`
    case "data-unread":
      return `node ${diagnostic.nodeId} binds "${diagnostic.name}" and "${diagnostic.type}" does not read a binding of that name, so the answer was resolved and then read by nobody`
    case "data-unshown":
      return `node ${diagnostic.nodeId} was answered ${diagnostic.given} row${diagnostic.given === 1 ? "" : "s"} under "${diagnostic.name}" and "${diagnostic.type}" showed ${diagnostic.shown} of them, so the rest arrived and were not drawn`
    case "unshown-unreadable":
      return `node ${diagnostic.nodeId} is drawn by "${diagnostic.type}", which says what it could not show and could not be believed, so nothing was reported of what it dropped — ${describeUnshownFault(diagnostic.fault)}`
    case "data-unresolved":
      return diagnostic.resolution === "absent"
        ? `node ${diagnostic.nodeId} asks for data and this render was given no resolution, so it rendered with none`
        : `node ${diagnostic.nodeId} asks for data and the resolution this render was given has no answer for it, so it rendered with none — the answers came from resolving a different plan than this tree`
    case "submit-misdeclared":
      return `node ${diagnostic.nodeId} declares a submission that is not an endpoint id under \`to\`, so it rendered with no target — ${describeSubmissionError(diagnostic.error)}`
    case "submit-unavailable":
      return `node ${diagnostic.nodeId} posts to "${diagnostic.to}" and no target could be given for it — ${describeSubmissionUnavailable(diagnostic.unavailable)}`
    case "submit-unresolved":
      return diagnostic.resolution === "absent"
        ? `node ${diagnostic.nodeId} names an endpoint and this render was given no resolution, so it rendered with no target`
        : `node ${diagnostic.nodeId} names an endpoint and the resolution this render was given has no target for it, so it rendered with none — the targets came from resolving a different plan than this tree`
    case "frame-refused":
      return `node ${diagnostic.nodeId} frames "${diagnostic.prop}" and it will not be framed — ${describeFrameRefusal(diagnostic.refusal)}`
    case "frame-same-origin":
      return `node ${diagnostic.nodeId} frames "${diagnostic.prop}" from "${diagnostic.origin}", which this deployment registered as its own, so the frame's sandbox grants it nothing it did not already have`
    case "anchor-unusable":
      return `node ${diagnostic.nodeId} names an anchor a link could not carry, so it is not a fragment target — ${diagnostic.detail}`
    case "anchor-claimed":
      return `node ${diagnostic.nodeId} names the anchor "${diagnostic.anchor}" and node ${diagnostic.holder} already holds it, so only the first one is a fragment target`
    case "behaviour-unnamed":
      return `node ${diagnostic.nodeId} takes the "${diagnostic.behaviour}" behaviour and "${diagnostic.key}" resolved to nothing, so the control was left out rather than rendered with no accessible name`
    case "theme-values-unmounted":
      return `this render was asked for the theme's values and node ${diagnostic.nodeId} mounted no theme, so every reference on the page was left as written — nothing outside a browser will resolve them`
    case "excerpt-absent":
      return `an excerpt was asked for node ${diagnostic.nodeId} and this tree holds no such node, so nothing was rendered — the id may name a part a later revision removed`
    default:
      return assertNever(diagnostic, "describeRenderDiagnostic")
  }
}
