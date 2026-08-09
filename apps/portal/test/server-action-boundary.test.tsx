import { describe, expect, it } from "vitest"

import { undoRevision } from "@/app/history/actions"
import { submitKey } from "@/app/sign-in/actions"

/**
 * The plugin, as the render suite actually experiences it.
 *
 * `server-action-stub.test.ts` proves the transform in the abstract; this proves
 * it is wired into the project that renders, against the portal's real action
 * modules. It is a `.test.tsx` on purpose — the substitution belongs to the DOM
 * suite, and if it ever stops being applied there, the import below drags the
 * write path and an Anthropic client into a browser-like environment and this
 * file is where that is noticed.
 */
describe("the server/client boundary in the render suite", () => {
  it("hands a client a handle rather than the implementation", () => {
    expect(undoRevision).toBeTypeOf("function")
    expect(submitKey).toBeTypeOf("function")
  })

  it("refuses to run one, naming the action, rather than answering nothing", () => {
    expect(() => undoRevision(null, new FormData())).toThrowError(
      /undoRevision is a server action/
    )
  })
})
