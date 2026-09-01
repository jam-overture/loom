/**
 * Turning a tree into React elements.
 *
 * A total, pure projection — every node either renders or produces a diagnostic,
 * and a render never throws and never decides anything the tree did not say.
 */

export * from "./addressing.js"
export * from "./anchor.js"
/**
 * The `behaviour-*.js` controls are deliberately not re-exported. A behaviour's
 * implementation is reached by declaring it and reading `loom.behaviours`, and
 * a host that imported a control directly would get one with no registration
 * behind it — no declared name to translate, and nothing telling the Gate the
 * page now holds a target.
 */
export * from "./behaviour.js"
export * from "./decorative.js"
export * from "./diagnostics.js"
export * from "./editable.js"
export * from "./frame.js"
export * from "./primitive.js"
export * from "./props.js"
export * from "./render.js"
export * from "./request.js"
export * from "./text.js"
export * from "./theme.js"
