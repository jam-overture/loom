import type { DataRegistry, ThemeRegistry } from "@jam-overture/loom"
import type { PrimitiveRegistry } from "@jam-overture/loom/sdk"

/**
 * Connecting a model.
 *
 * The page opens by writing the interpreter interface out as a type, so a reader
 * can see how small it is. The five names in that signature are the runtime's
 * own and are re-exported here rather than restated — a type written out twice
 * is a type that can disagree with itself, and the point of showing it is that
 * it is *this* interface.
 *
 * The three registries are the deployment's, assembled at startup long before
 * anything asks a model for anything. `sources` is the third because the
 * interpreter is handed all three vocabularies and the page's recipe shows all
 * three being handed over — a reader who wires two of them gets a model that
 * can build and theme and cannot ask anybody anything.
 */

export declare const registry: PrimitiveRegistry
export declare const themes: ThemeRegistry
export declare const sources: DataRegistry

export type { EditIntent, InterpretationError, LoomTree, ProposedChange, Result } from "@jam-overture/loom"
