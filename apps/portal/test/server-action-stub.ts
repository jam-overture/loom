import type { Plugin } from "vitest/config"

/**
 * The client/server boundary, reproduced for a render test.
 *
 * A client component does not import a server action's implementation. It
 * imports a *reference* to one: Next replaces every `"use server"` module in the
 * client graph with a stub whose exports are opaque handles, and the code that
 * opens a database or holds an API client stays on the server where it was
 * written. That substitution is the framework's, and it is why `UndoButton` can
 * name `undoRevision` without dragging the write path into a browser.
 *
 * Vitest has no such substitution, so a render test importing the same component
 * loads the real module and everything under it. The first attempt at this
 * harness proved the point loudly: rendering one revision row reached
 * `lib/interpreter`, which constructs an Anthropic client, which refuses to
 * exist in a browser-like environment — correctly, since a key does not belong
 * in one. The failure was not a test problem to work around. It was jsdom
 * telling the truth about what had been pulled across the boundary.
 *
 * So the harness performs the same substitution the framework does, at the same
 * seam and by the same signal — the module's own `"use server"` directive. No
 * test names an action to mock, because the boundary is not a fact about any one
 * test; a rule every author has to remember is a rule one of them will forget,
 * and here forgetting it means a DOM test quietly importing the server.
 *
 * What a render test can therefore prove is that a component is wired to the
 * action it should be wired to, and what it cannot prove is what the action then
 * does. That is the right split: an action's behaviour is server behaviour, it
 * is tested where it runs, and a stub that throws when called says so at the
 * point somebody tries.
 */

const DIRECTIVE = /^\s*(?:\/\*[\s\S]*?\*\/|\/\/[^\n]*\n|\s)*["']use server["']/

/** `export const name =` and `export [async] function name` — never `export type`. */
const VALUE_EXPORT = /^export\s+(?:const\s+([A-Za-z_$][\w$]*)|(?:async\s+)?function\s+([A-Za-z_$][\w$]*))/gm

export const isServerActionModule = (code: string): boolean => DIRECTIVE.test(code)

export const serverActionExports = (code: string): readonly string[] => [
  ...new Set(
    [...code.matchAll(VALUE_EXPORT)].flatMap((match) => {
      const name = match[1] ?? match[2]

      return name === undefined ? [] : [name]
    })
  ),
]

/**
 * The replacement module: one opaque handle per value export, and nothing else.
 *
 * The handle throws rather than resolving to a benign value. A render test that
 * reaches a server action has found a real defect — a component doing work in
 * the browser that the server was supposed to do — and a stub returning
 * `undefined` would let that pass as a component whose action happened to answer
 * nothing.
 */
export const stubServerActionModule = (code: string): string | undefined => {
  if (!isServerActionModule(code)) return undefined

  const refuse = [
    "const __refuse = (name) => () => {",
    "  throw new Error(",
    '    `${name} is a server action and cannot run in a render test. Assert that the ' +
      'component names it; test what it does where it runs.`',
    "  )",
    "}",
  ].join("\n")

  return [
    refuse,
    ...serverActionExports(code).map((name) => `export const ${name} = __refuse(${JSON.stringify(name)})`),
  ].join("\n")
}

export const serverActionStubs = (): Plugin => ({
  name: "loom:server-action-stubs",
  enforce: "pre",
  transform: (code: string) => stubServerActionModule(code),
})
