import { describe, expect, it } from "vitest"

import { registerApplication } from "@/app/(portal)/portal/new/actions"
import { submitKey } from "@/app/(portal)/portal/sign-in/actions"

/**
 * The plugin, as the render suite actually experiences it.
 *
 * `server-action-stub.test.ts` proves the transform in the abstract; this proves
 * it is wired into the project that renders, against the portal's real action
 * modules. It is a `.test.tsx` on purpose — the substitution belongs to the DOM
 * suite, and if it ever stops being applied there, the import below drags the
 * write path and an Anthropic client into a browser-like environment and this
 * file is where that is noticed.
 *
 * **The action under test changed on 13 October.** It was `undoRevision` from
 * `/portal/history/actions`, and unit 0 deleted that screen with nineteen
 * others. `registerApplication` replaces it because it is the same shape of
 * subject — a module that reaches the store and the write path from a form —
 * and because it is now the portal's primary action rather than an incidental
 * one. What is being proved is the transform, not the action.
 */
describe("the server/client boundary in the render suite", () => {
  it("hands a client a handle rather than the implementation", () => {
    expect(registerApplication).toBeTypeOf("function")
    expect(submitKey).toBeTypeOf("function")
  })

  it("refuses to run one, naming the action, rather than answering nothing", () => {
    expect(() => registerApplication(null, new FormData())).toThrowError(
      /registerApplication is a server action/
    )
  })
})
