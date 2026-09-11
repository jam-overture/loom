import type { ThemeRegistry } from "@loom/runtime"
import type { PrimitiveRegistry } from "@loom/runtime/sdk"

/**
 * Connecting a model.
 *
 * The page opens by writing the interpreter interface out as a type, so a reader
 * can see how small it is. The five names in that signature are the runtime's
 * own and are re-exported here rather than restated — a type written out twice
 * is a type that can disagree with itself, and the point of showing it is that
 * it is *this* interface.
 *
 * The two registries are the deployment's, assembled at startup long before
 * anything asks a model for anything.
 */

export declare const registry: PrimitiveRegistry
export declare const themes: ThemeRegistry

export type { EditIntent, InterpretationError, LoomTree, ProposedChange, Result } from "@loom/runtime"
