import type { StartState } from "./capture.js"

/**
 * The only JavaScript this harness injects into a page — as **source**, and
 * that is the decision rather than the shortcut it looks like.
 *
 * The obvious spelling is a TypeScript function handed to `addInitScript`,
 * which serialises it with `Function.prototype.toString`. It was written that
 * way first, it passed a round-trip test, and it silently did nothing in a
 * real browser: `tsx` compiles with esbuild's `keepNames`, so a function
 * containing a nested function arrives as
 *
 * ```
 * ()=>{Object.defineProperty(window,"localStorage",{…,get:__name(()=>{…},"get")})}
 * ```
 *
 * and `__name` does not exist in the page. The init script throws a
 * `ReferenceError` nobody is watching, the property is never defined, and what
 * comes back is a correct-looking photograph of the ordinary page. The
 * round-trip test did not catch it because Vitest's transform is not `tsx`'s —
 * the test was evaluating a *different string* from the one that ships.
 *
 * So the transform is taken out of the path. What is written here is what the
 * browser runs, character for character, and the tests evaluate that exact
 * string. A lane still supplies values and never a body: the data goes in
 * through `JSON.stringify`, which is the whole of
 * [0195](../../decisions/0195-a-shot-may-say-what-the-browser-started-with-and-it-says-it-as-data.md).
 */

/**
 * Put the keys there, before the first paint of every document.
 *
 * `JSON.stringify` on the map rather than string concatenation: a key or a
 * value is a lane's arbitrary text, and the one thing that must not happen is
 * a quote in a record ending the literal and turning data into program.
 */
export const seedStorageScript = (entries: Readonly<Record<string, string>>): string =>
  `(() => { const entries = ${literal(entries)};` +
  ` for (const key of Object.keys(entries)) window.localStorage.setItem(key, entries[key]) })()`

/**
 * Make the accessor throw, the way a browser does when the reader has blocked
 * site data.
 *
 * `SecurityError` on the **getter** and not on `getItem`, because that is
 * where a browser throws — and a page that guards the call and not the access
 * is precisely the page worth photographing. `configurable` so a later
 * definition can replace it: a non-configurable accessor makes the document
 * unrecoverable inside its own context, which is the instrument leaking into
 * the subject.
 */
export const BLOCK_STORAGE_SCRIPT =
  `(() => { Object.defineProperty(window, "localStorage", { configurable: true,` +
  ` get: () => { throw new DOMException("access to storage is denied for this document", "SecurityError") } }) })()`

/**
 * `JSON.stringify`, and then the two characters it is allowed to leave alone.
 *
 * U+2028 and U+2029 are legal inside a JSON string and were line terminators
 * inside a JavaScript one until ES2019. Every engine this harness will meet
 * accepts them today; they are escaped anyway because the cost is one
 * `replace` and the failure is a syntax error in a page nothing is watching.
 */
const literal = (value: unknown): string =>
  JSON.stringify(value).replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029")

/** The source a start state asks for, which is the whole of the mapping. */
export const scriptFor = (state: StartState): string =>
  "storage" in state ? seedStorageScript(state.storage) : BLOCK_STORAGE_SCRIPT
