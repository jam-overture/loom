import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { transformSync } from "esbuild"
import { describe, expect, it } from "vitest"

import { BLOCK_STORAGE_SCRIPT, seedStorageScript } from "./start-state.js"

/**
 * A file of its own, and in the default environment, because esbuild cannot
 * run under jsdom — its `TextEncoder` is not Node's and the invariant check at
 * the top of the library refuses. The rest of `start-state`'s tests need a DOM
 * and this one needs a compiler, so they are two files rather than one file
 * that is honest about neither.
 */
describe("the source that ships, compiled the way the harness compiles it", () => {
/**
   * The defect this file was rewritten around, pinned so it cannot come back —
   * and the only assertion here that could have caught it.
   *
   * The first version handed `addInitScript` a TypeScript function and let
   * `Function.prototype.toString` serialise it. `tsx` compiles with esbuild's
   * `keepNames`, so the nested getter arrived in the page wrapped in
   * `__name(…)`, a helper that does not exist there: the init script threw a
   * `ReferenceError` nobody was watching, the property was never defined, and
   * the picture that came back was of the ordinary page. The tests passed the
   * whole time, **including a round-trip test written for exactly this**,
   * because Vitest's transform is not `tsx`'s and every one of them was
   * evaluating a different string from the one that ships.
   *
   * So this test does not ask Vitest what the module says. It compiles the
   * module the way the harness compiles it and asks *that* — which is the
   * difference between testing the code and testing the artefact. A future
   * edit that goes back to serialising a function fails here and nowhere else.
   */
  it("ships the same source when it is compiled the way the harness compiles it", () => {
    const source = readFileSync(fileURLToPath(new URL("./start-state.ts", import.meta.url)), "utf8")
    /** `keepNames` is the setting that injected `__name`; `tsx` has it on. */
    const compiled = transformSync(source, { loader: "ts", format: "cjs", keepNames: true })

    const module_: { exports: Record<string, unknown> } = { exports: {} }
    new Function("exports", "module", compiled.code)(module_.exports, module_)

    expect(module_.exports["BLOCK_STORAGE_SCRIPT"]).toBe(BLOCK_STORAGE_SCRIPT)
    const seed = module_.exports["seedStorageScript"] as (
      entries: Record<string, string>
    ) => string
    expect(seed({ a: "1" })).toBe(seedStorageScript({ a: "1" }))
    expect(String(module_.exports["BLOCK_STORAGE_SCRIPT"])).not.toMatch(/\b__\w+\b/)
  })
})
