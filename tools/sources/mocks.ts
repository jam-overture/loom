import { codeOnly } from "./code.js"

/**
 * A module mock whose effect depends on which file ran before it.
 *
 * `Loom marketing` filed this on 6 November, as the general version of an
 * instance it had just closed. Both suites in this repository run their node
 * half on `forks: { isolate: false }` — a worker has already loaded what the
 * previous file loaded, which is deliberate and worth keeping: those files are
 * functions of their arguments, and isolating each one cost 175s of loading
 * against 180s of testing.
 *
 * **A file that installs a module mock is exactly the file that is not a
 * function of its arguments**, and neither `vitest.config.ts` said so.
 * `vi.mock` replaces what a module resolves to *as it is evaluated*, so a
 * module some earlier file in the same worker already evaluated is not
 * replaced. The mock works, or does not, according to which files the suite
 * happened to put in that worker — so the failure arrives when an unrelated
 * lane's merge reshuffles them, which means **it arrives on `main`**, where a
 * red costs every lane a morning, without any branch having been wrong.
 * `(marketing)/_lib/serving.test.ts` has the measurement: 12 of 12 render cases
 * failed one way, 4 of 12 the other.
 *
 * `vi.doMock` is not hoisted and is order-independent **when the file resets
 * the module registry and imports again**, which is what
 * `(portal)/_lib/write.test.ts` does and explains in its own docblock. That is
 * the pattern this check asks for, and the only one it allows.
 *
 * ## Why the rule is wider than the hazard
 *
 * It covers every `*.test.ts`, including the Postgres suites, which run on
 * `pool: "threads"` with `isolate: true` and so could hold a hoisted mock
 * safely. Two reasons, both stated rather than left to be re-derived. Which
 * files those are is a list in two `vitest.config.ts` files, so a rule carved
 * to the hazard would come apart the moment a file was renamed into or out of
 * one. And the remedy costs nothing anywhere: `vi.doMock` after
 * `vi.resetModules()` is correct in an isolated worker too.
 *
 * `*.test.tsx` is **excluded, and not as an oversight**. Those run on the
 * threads pool with `isolate: true`, because Testing Library binds `screen` to
 * the document of the first file that imported it. Nine of them install module
 * mocks, none can hit this, and the isolation is load-bearing for a different
 * reason that is not going to be given up.
 */

export type HoistedMock = {
  readonly line: number
  readonly call: "vi.mock" | "vi.doMock"
  readonly reason: string
}

/**
 * A lookbehind rather than a consumed character, so `match.index` is the `v` of
 * `vi` and the line counted from it is the line the call is written on. Reading
 * the separator instead put a call after a newline on the line above — caught
 * by the first test of it.
 */
const MOCK_CALL = /(?<![\w$.])vi\.(mock|doMock)\s*\(/g

const RESET = /(?<![\w$.])vi\.resetModules\s*\(/

const HOISTED =
  "vi.mock is hoisted and replaces a module as it is evaluated, so a module an " +
  "earlier file in the same worker already loaded is not replaced — use vi.doMock " +
  "after vi.resetModules() and import again"

const UNRESET =
  "vi.doMock without vi.resetModules() above it leaves whatever the worker has " +
  "already loaded in place — reset the registry and import again"

export const orderDependentMocks = (source: string): readonly HoistedMock[] => {
  const code = codeOnly(source)

  return [...code.matchAll(MOCK_CALL)].flatMap((match): readonly HoistedMock[] => {
    const at = match.index
    const line = code.slice(0, at).split("\n").length
    const call: HoistedMock["call"] = match[1] === "mock" ? "vi.mock" : "vi.doMock"

    if (call === "vi.mock") return [{ line, call, reason: HOISTED }]

    return RESET.test(code.slice(0, at)) ? [] : [{ line, call, reason: UNRESET }]
  })
}
